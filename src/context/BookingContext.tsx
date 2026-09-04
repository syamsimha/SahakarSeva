import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Booking, BookingStatus } from '../types';
import { bookingService, notificationService, workerService } from '../services';

interface BookingContextType {
  bookings: Booking[];
  isLoading: boolean;
  createBooking: (data: Omit<Booking, 'id' | 'bookingCode' | 'createdAt' | 'statusHistory'>) => Promise<Booking>;
  updateStatus: (bookingId: string, status: BookingStatus, note?: string) => Promise<Booking | null>;
  acceptJob: (bookingId: string) => Promise<Booking | null>;
  rejectJob: (bookingId: string) => Promise<Booking | null>;
  rateBooking: (bookingId: string, workerId: string, customerId: string, customerName: string, rating: number, comment: string) => Promise<void>;
  refreshBookings: () => Promise<void>;
}

const BookingContext = createContext<BookingContextType>({
  bookings: [],
  isLoading: false,
  createBooking: async () => ({} as Booking),
  updateStatus: async () => null,
  acceptJob: async () => null,
  rejectJob: async () => null,
  rateBooking: async () => {},
  refreshBookings: async () => {},
});

export const BookingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchAll = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await bookingService.getBookings();
      setBookings(data);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const createBooking = async (data: Omit<Booking, 'id' | 'bookingCode' | 'createdAt' | 'statusHistory'>) => {
    const created = await bookingService.createBooking(data);
    setBookings((prev) => [created, ...prev]);
    return created;
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

  const acceptJob = async (bookingId: string) => {
    return updateStatus(bookingId, 'accepted', 'Job accepted by cooperative worker');
  };

  const rejectJob = async (bookingId: string) => {
    return updateStatus(bookingId, 'cancelled', 'Job declined by cooperative worker');
  };

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

  return (
    <BookingContext.Provider
      value={{
        bookings,
        isLoading,
        createBooking,
        updateStatus,
        acceptJob,
        rejectJob,
        rateBooking,
        refreshBookings: fetchAll,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBookings = () => useContext(BookingContext);
