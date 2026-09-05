import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

import { Booking, BookingStatus, WorkerProfile } from '../types';
import { bookingService, notificationService, workerService } from '../services';
import { isTradeMatching, getWorkerActiveJob } from '../utils/workerMatching';

interface BookingContextType {
  bookings: Booking[];
  isLoading: boolean;

  createBooking: (
    data: Omit<
      Booking,
      'id' | 'bookingCode' | 'createdAt' | 'statusHistory'
    >
  ) => Promise<Booking>;

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

  updateStatus: async () => null,

  acceptJob: async () => null,

  rejectJob: async () => null,

  rejectJobWithReason: async () => null,

  cancelBooking: async () => null,

  generateCompletionOtp: () => null,

  verifyCompletionOtp: () => false,

  rateBooking: async () => { },

  assignJobToWorker: async () => null,

  refreshBookings: async () => { },
});

export const BookingProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // --------------------------------------------------
  // LOAD BOOKINGS
  // --------------------------------------------------

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

  // --------------------------------------------------
  // CREATE BOOKING
  // --------------------------------------------------

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
  // ACCEPT JOB
  // --------------------------------------------------

  const acceptJob = async (
    bookingId: string
  ): Promise<Booking | null> => {
    return updateStatus(
      bookingId,
      'accepted',
      'Job accepted by cooperative worker'
    );
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

        updateStatus,

        acceptJob,

        rejectJob,

        rejectJobWithReason,

        cancelBooking,

        generateCompletionOtp,

        verifyCompletionOtp,

        rateBooking,

        assignJobToWorker,

        refreshBookings: fetchAll,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBookings = () =>
  useContext(BookingContext);