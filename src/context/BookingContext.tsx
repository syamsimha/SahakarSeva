import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Booking, BookingStatus, ServiceCategoryKey, ServiceLocation } from '../types';
import { bookingService } from '../services';
import { useAuth } from './AuthContext';
import { databaseService } from '../services/db/databaseService';
import { locationService } from '../services/locationService';

interface BookingContextType {
  bookings: Booking[];
  isLoading: boolean;
  createBooking: (data: Omit<Booking, 'id' | 'bookingCode' | 'createdAt' | 'statusHistory'>) => Promise<Booking>;
  dispatchPriorityBooking: (params: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    categoryId: ServiceCategoryKey;
    serviceTitle: string;
    customerLocation: ServiceLocation;
    instructions?: string;
    estimatedAmount: number;
    welfareCessAmount?: number;
    paymentMethod?: 'upi' | 'card' | 'netbanking' | 'cash';
  }) => Promise<{ success: boolean; workerAssigned: boolean; booking?: Booking; error?: string; message?: string }>;
  updateStatus: (bookingId: string, status: BookingStatus, note?: string) => Promise<Booking | null>;
  acceptJob: (bookingId: string) => Promise<Booking | null>;
  rejectJob: (bookingId: string) => Promise<Booking | null>;
  rateBooking: (bookingId: string, workerId: string, customerId: string, customerName: string, rating: number, comment: string) => Promise<void>;
  updateWorkerLocation: (bookingId: string, latitude: number, longitude: number, workerId?: string) => Promise<Booking | null>;
  refreshBookings: () => Promise<void>;
}

const BookingContext = createContext<BookingContextType>({
  bookings: [],
  isLoading: false,
  createBooking: async () => ({} as Booking),
  dispatchPriorityBooking: async () => ({ success: false, workerAssigned: false, error: 'Not initialized' }),
  updateStatus: async () => null,
  acceptJob: async () => null,
  rejectJob: async () => null,
  rateBooking: async () => {},
  updateWorkerLocation: async () => null,
  refreshBookings: async () => {},
});

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchAll = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsLoading(true);
    try {
      const data = await bookingService.getBookings();
      setBookings(data);
    } finally {
      if (showSpinner) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll(true);

    // Cross-tab broadcast listener (BroadcastChannel & storage event)
    const unsubscribe = databaseService.onBroadcastUpdate(() => {
      fetchAll(false);
    });

    // 4-second polling interval for multi-tab / real-time updates
    const interval = setInterval(() => {
      fetchAll(false);
    }, 4000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [fetchAll]);

  // Worker-side continuous real GPS streaming whenever worker has an active job
  useEffect(() => {
    if (user?.role !== 'worker') return;

    const activeJobs = bookings.filter(
      (b) =>
        (b.status === 'on_the_way' || b.status === 'in_progress') &&
        (!b.workerId || b.workerId === user.id)
    );

    if (activeJobs.length === 0) return;

    let watchId: number | null = null;
    let intervalId: any = null;

    const reportCoords = (lat: number, lng: number) => {
      activeJobs.forEach((job) => {
        bookingService.updateWorkerLocation(job.id, lat, lng, user.id).then((updated) => {
          if (updated) {
            setBookings((prev) => prev.map((b) => (b.id === job.id ? updated : b)));
          }
        });
      });
    };

    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          reportCoords(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          console.warn('Worker GPS initial error:', err?.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          reportCoords(pos.coords.latitude, pos.coords.longitude);
        },
        (err) => {
          console.warn('Worker GPS watch error:', err?.message);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      const fetchLoc = async () => {
        try {
          const loc = await locationService.getCurrentLocation();
          if (loc && loc.latitude && loc.longitude) {
            reportCoords(loc.latitude, loc.longitude);
          }
        } catch {
          // ignore
        }
      };
      fetchLoc();
      intervalId = setInterval(fetchLoc, 8000);
    }

    return () => {
      if (watchId !== null && typeof navigator !== 'undefined' && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [bookings, user?.role, user?.id]);

  const createBooking = async (data: Omit<Booking, 'id' | 'bookingCode' | 'createdAt' | 'statusHistory'>) => {
    const created = await bookingService.createBooking(data);
    setBookings((prev) => [created, ...prev]);
    return created;
  };

  const dispatchPriorityBooking = async (params: {
    customerId: string;
    customerName: string;
    customerPhone: string;
    categoryId: ServiceCategoryKey;
    serviceTitle: string;
    customerLocation: ServiceLocation;
    instructions?: string;
    estimatedAmount: number;
    welfareCessAmount?: number;
    paymentMethod?: 'upi' | 'card' | 'netbanking' | 'cash';
  }) => {
    const result = await bookingService.dispatchPriorityBooking(params);
    if (result.success && result.booking) {
      setBookings((prev) => [result.booking!, ...prev]);
    }
    return result;
  };

  const updateStatus = async (bookingId: string, status: BookingStatus, note?: string) => {
    const updated = await bookingService.updateBookingStatus(bookingId, status, note);
    if (updated) {
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? updated : b))
      );
    }
    return updated;
  };

  const acceptJob = async (bookingId: string) => {
    return updateStatus(bookingId, 'accepted', 'Job accepted by cooperative worker');
  };

  const rejectJob = async (bookingId: string) => {
    return updateStatus(bookingId, 'cancelled', 'Job declined by cooperative worker');
  };

  const updateWorkerLocation = async (bookingId: string, latitude: number, longitude: number, workerId?: string) => {
    const updated = await bookingService.updateWorkerLocation(bookingId, latitude, longitude, workerId);
    if (updated) {
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? updated : b))
      );
    }
    return updated;
  };

  const rateBooking = async (
    bookingId: string,
    workerId: string,
    customerId: string,
    customerName: string,
    rating: number,
    comment: string
  ) => {
    await bookingService.addReview({
      bookingId,
      workerId,
      customerId,
      customerName,
      rating,
      comment,
      verifiedJob: true,
    });
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, hasRated: true } : b))
    );
  };

  return (
    <BookingContext.Provider
      value={{
        bookings,
        isLoading,
        createBooking,
        dispatchPriorityBooking,
        updateStatus,
        acceptJob,
        rejectJob,
        rateBooking,
        updateWorkerLocation,
        refreshBookings: fetchAll,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBookings = () => useContext(BookingContext);
