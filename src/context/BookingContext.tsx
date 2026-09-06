import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

import {
  Booking,
  BookingStatus,
  WorkerProfile,
  ServiceCategoryKey,
  ServiceLocation,
} from '../types';
import {
  bookingService,
  notificationService,
  workerService,
} from '../services';
import { isTradeMatching, getWorkerActiveJob } from '../utils/workerMatching';
import { useAuth } from './AuthContext';
import { databaseService } from '../services/db/databaseService';
import { locationService } from '../services/locationService';

interface BookingContextType {
  bookings: Booking[];
  isLoading: boolean;
  createBooking: (
    data: Omit<
      Booking,
      'id' | 'bookingCode' | 'createdAt' | 'statusHistory'
    >
  ) => Promise<Booking>;

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
  }) => Promise<{
    success: boolean;
    workerAssigned: boolean;
    booking?: Booking;
    error?: string;
    message?: string;
  }>;

  updateStatus: (
    bookingId: string,
    status: BookingStatus,
    note?: string
  ) => Promise<Booking | null>;
  acceptJob: (bookingId: string) => Promise<Booking | null>;

  rejectJob: (bookingId: string) => Promise<Booking | null>;
  rejectJobWithReason: (
    bookingId: string,
    reason: string
  ) => Promise<Booking | null>;

  cancelBooking: (
    bookingId: string,
    reason: string
  ) => Promise<Booking | null>;

  generateCompletionOtp: (bookingId: string) => string | null;

  verifyCompletionOtp: (
    bookingId: string,
    otp: string
  ) => boolean;

  rateBooking: (
    bookingId: string,
    workerId: string,
    customerId: string,
    customerName: string,
    rating: number,
    comment: string
  ) => Promise<void>;

  updateWorkerLocation: (
    bookingId: string,
    latitude: number,
    longitude: number,
    workerId?: string
  ) => Promise<Booking | null>;

  assignJobToWorker: (
    bookingId: string,
    worker: WorkerProfile
  ) => Promise<Booking | null>;
  refreshBookings: () => Promise<void>;
}

const BookingContext = createContext<BookingContextType>({
  bookings: [],
  isLoading: false,

  createBooking: async () => ({} as Booking),
  dispatchPriorityBooking: async () => ({
    success: false,
    workerAssigned: false,
    error: 'Not initialized',
  }),
  updateStatus: async () => null,
  acceptJob: async () => null,
  rejectJob: async () => null,
  rejectJobWithReason: async () => null,
  cancelBooking: async () => null,
  generateCompletionOtp: () => null,
  verifyCompletionOtp: () => false,
  rateBooking: async () => {},
  updateWorkerLocation: async () => null,
  assignJobToWorker: async () => null,
  refreshBookings: async () => {},
});

export const BookingProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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

  const createBooking = async (
    data: Omit<
      Booking,
      'id' | 'bookingCode' | 'createdAt' | 'statusHistory'
    >
  ): Promise<Booking> => {
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

      if (status === 'accepted') {
        await notificationService.sendNotification({
          recipientRole: 'customer',
          recipientId: updated.customerId,
          title: 'Booking Accepted',
          body: `${updated.workerName} accepted your booking for ${updated.serviceTitle}.`,
          type: 'booking',
          relatedId: updated.id,
        });
      } else if (status === 'in_progress') {
        await notificationService.sendNotification({
          recipientRole: 'customer',
          recipientId: updated.customerId,
          title: 'Service In Progress',
          body: `${updated.workerName} has started work on ${updated.serviceTitle}.`,
          type: 'booking',
          relatedId: updated.id,
        });
      } else if (status === 'completed') {
        await notificationService.sendNotification({
          recipientRole: 'customer',
          recipientId: updated.customerId,
          title: 'Service Completed',
          body: `${updated.workerName} completed ${updated.serviceTitle}. Please share your rating and review.`,
          type: 'booking',
          relatedId: updated.id,
        });
      } else if (status === 'cancelled') {
        await notificationService.sendNotification({
          recipientRole: 'customer',
          recipientId: updated.customerId,
          title: 'Booking Cancelled',
          body: `Your booking for ${updated.serviceTitle} was cancelled or declined.`,
          type: 'booking',
          relatedId: updated.id,
        });
      }
    }
    return updated;
  };

  // --------------------------------------------------
  // ACCEPT JOB (WORKER ACCEPTANCE)
  // --------------------------------------------------

  const acceptJob = async (
    bookingId: string
  ): Promise<Booking | null> => {
    if (!user) {
      throw new Error('Please sign in as a worker to accept service jobs.');
    }

    if (user.role !== 'worker') {
      throw new Error('Only registered cooperative workers are authorized to accept jobs.');
    }

    const worker = user as WorkerProfile;

    if (worker.verificationStatus !== 'verified') {
      throw new Error(
        'Admin verification required: Your profile must be verified by Admin before accepting jobs.'
      );
    }

    const updated = await bookingService.acceptJobByWorker(bookingId, worker);

    if (updated) {
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? updated : b))
      );
    }

    return updated;
  };

  // --------------------------------------------------
  // SIMPLE REJECT
  // --------------------------------------------------

  const rejectJob = async (
    bookingId: string
  ): Promise<Booking | null> => {
    return updateStatus(
      bookingId,
      'cancelled',
      'Job declined by cooperative worker'
    );
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


  // --------------------------------------------------
  // REJECT JOB WITH REASON
  // --------------------------------------------------

  const rejectJobWithReason = async (
    bookingId: string,
    reason: string
  ): Promise<Booking | null> => {
    const updated = await bookingService.rejectJobWithReason(
      bookingId,
      reason
    );

    if (updated) {
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId ? updated : booking
        )
      );

      await notificationService.sendNotification({
        recipientRole: 'customer',
        recipientId: updated.customerId,
        title: 'Booking Cancelled',
        body: `Your booking for ${updated.serviceTitle} was cancelled or declined.`,
        type: 'booking',
        relatedId: updated.id,
      });
    }

    return updated;
  };

  // --------------------------------------------------
  // CANCEL BOOKING
  // --------------------------------------------------

  const cancelBooking = async (
    bookingId: string,
    reason: string
  ): Promise<Booking | null> => {
    const updated = await bookingService.cancelBooking(
      bookingId,
      reason
    );

    if (updated) {
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId ? updated : booking
        )
      );

      await notificationService.sendNotification({
        recipientRole: 'customer',
        recipientId: updated.customerId,
        title: 'Booking Cancelled',
        body: `Your booking for ${updated.serviceTitle} was cancelled or declined.`,
        type: 'booking',
        relatedId: updated.id,
      });
    }

    return updated;
  };

  // --------------------------------------------------
  // GENERATE COMPLETION OTP
  // --------------------------------------------------

  const generateCompletionOtp = (
    bookingId: string
  ): string | null => {
    const otp = bookingService.generateCompletionOtp(
      bookingId
    );

    if (otp) {
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId
            ? {
              ...booking,
              completionOtp: otp,
              completionOtpVerified: false,
            }
            : booking
        )
      );
    }

    return otp;
  };

  // --------------------------------------------------
  // VERIFY COMPLETION OTP
  // --------------------------------------------------

  const verifyCompletionOtp = (
    bookingId: string,
    otp: string
  ): boolean => {
    const verified = bookingService.verifyCompletionOtp(
      bookingId,
      otp
    );

    if (verified) {
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId
            ? {
              ...booking,
              completionOtpVerified: true,
            }
            : booking
        )
      );
    }

    return verified;
  };

  // --------------------------------------------------
  // RATE BOOKING
  // --------------------------------------------------

  const rateBooking = async (
    bookingId: string,
    workerId: string,
    customerId: string,
    customerName: string,
    rating: number,
    comment: string
  ) => {
    // Prevent duplicate reviews for the same booking
    const existing = bookings.find((b) => b.id === bookingId);
    if (existing?.hasRated) {
      return;
    }

    await bookingService.addReview({
      bookingId,
      workerId,
      customerId,
      customerName,
      rating,
      comment,
      verifiedJob: true,
    });

    await workerService.recordReview(workerId, rating);

    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, hasRated: true } : b))
    );

    const serviceName = existing?.serviceTitle || 'service';
    const previewComment = comment.length > 50 ? `${comment.substring(0, 47)}...` : comment;

    await notificationService.sendNotification({
      recipientRole: 'worker',
      recipientId: workerId,
      title: 'New Customer Review',
      body: `${customerName} rated you ${rating}★ for ${serviceName}: "${previewComment}"`,
      type: 'job',
      relatedId: bookingId,
    });
  };

  // --------------------------------------------------
  // ASSIGN JOB TO WORKER (ADMIN DISPATCH)
  // --------------------------------------------------

  const assignJobToWorker = async (
    bookingId: string,
    worker: WorkerProfile
  ): Promise<Booking | null> => {
    const targetBooking = bookings.find((b) => b.id === bookingId);
    if (!targetBooking) {
      throw new Error('Target booking record could not be found.');
    }

    // 1. Enforce profession / trade matching
    if (!isTradeMatching(targetBooking.categoryId, targetBooking.serviceTitle, worker)) {
      throw new Error(
        `Skill Mismatch: "${targetBooking.serviceTitle}" (${targetBooking.categoryId || 'trade'}) requires a certified trade professional. ${worker.name} is registered as "${worker.primarySkill}".`
      );
    }

    // 2. Enforce one active job per worker concurrency limit
    const activeJob = getWorkerActiveJob(worker.id, bookings, bookingId);
    if (activeJob) {
      throw new Error(
        `Worker Concurrency Limit: ${worker.name} already has an ongoing assignment #${activeJob.bookingCode} (${activeJob.serviceTitle} - ${activeJob.status.replace('_', ' ').toUpperCase()}). A worker can only be assigned to one active job at a time.`
      );
    }

    const updated = await bookingService.assignWorkerToBooking(bookingId, worker);
    if (updated) {
      setBookings((prev) =>
        prev.map((b) => (b.id === bookingId ? updated : b))
      );

      // Notify the worker
      await notificationService.sendNotification({
        recipientRole: 'worker',
        recipientId: worker.id,
        title: 'New Cooperative Job Assigned',
        body: `Admin dispatched you to "${updated.serviceTitle}" for ${updated.customerName}. Scheduled on ${updated.scheduledDate} at ${updated.scheduledTimeSlot}.`,
        type: 'job',
        relatedId: updated.id,
      });

      // Notify the customer
      await notificationService.sendNotification({
        recipientRole: 'customer',
        recipientId: updated.customerId,
        title: 'Verified Worker Assigned!',
        body: `Cooperative assigned ${worker.name} (${worker.primarySkill}) for your ${updated.serviceTitle} request.`,
        type: 'booking',
        relatedId: updated.id,
      });
    }
    return updated;
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

        rejectJobWithReason,

        cancelBooking,

        generateCompletionOtp,

        verifyCompletionOtp,

        rateBooking,
        assignJobToWorker,
        updateWorkerLocation,
        refreshBookings: fetchAll,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBookings = () =>
  useContext(BookingContext);