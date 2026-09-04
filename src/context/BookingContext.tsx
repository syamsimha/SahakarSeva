import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from 'react';

import { Booking, BookingStatus } from '../types';
import { bookingService } from '../services';

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

  // --------------------------------------------------
  // GENERIC STATUS UPDATE
  // --------------------------------------------------

  const updateStatus = async (
    bookingId: string,
    status: BookingStatus,
    note?: string
  ): Promise<Booking | null> => {
    const updated = await bookingService.updateBookingStatus(
      bookingId,
      status,
      note
    );

    if (updated) {
      setBookings((prev) =>
        prev.map((booking) =>
          booking.id === bookingId ? updated : booking
        )
      );
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
  ): Promise<void> => {
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
      prev.map((booking) =>
        booking.id === bookingId
          ? {
            ...booking,
            hasRated: true,
          }
          : booking
      )
    );
  };

  // --------------------------------------------------
  // PROVIDER
  // --------------------------------------------------

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

        refreshBookings: fetchAll,
      }}
    >
      {children}
    </BookingContext.Provider>
  );
};

export const useBookings = () =>
  useContext(BookingContext);