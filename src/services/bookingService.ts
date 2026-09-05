import { Booking, BookingStatus, Review, Invoice, WorkerProfile } from '../types';
import { mockBookings, mockReviews } from '../data';
import { isTradeMatching, getWorkerActiveJob } from '../utils/workerMatching';

class BookingService {
  private bookings: Booking[] = [...mockBookings];
  private reviews: Review[] = [...mockReviews];

  async getBookings(filters?: {
    customerId?: string;
    workerId?: string;
    status?: BookingStatus;
  }): Promise<Booking[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        let list = [...this.bookings];

        if (filters?.customerId) {
          list = list.filter(
            (b) => b.customerId === filters.customerId
          );
        }

        if (filters?.workerId) {
          list = list.filter(
            (b) => b.workerId === filters.workerId
          );
        }

        if (filters?.status) {
          list = list.filter(
            (b) => b.status === filters.status
          );
        }

        resolve([...list].reverse());
      }, 200);
    });
  }

  async getBookingById(
    id: string
  ): Promise<Booking | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(
          this.bookings.find((b) => b.id === id)
        );
      }, 150);
    });
  }

  async createBooking(
    bookingData: Omit<
      Booking,
      'id' | 'bookingCode' | 'createdAt' | 'statusHistory'
    >
  ): Promise<Booking> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const randId = Math.floor(
          1000 + Math.random() * 9000
        );

        const now = new Date().toISOString();

        const newBooking: Booking = {
          ...bookingData,
          id: `bk-${Date.now()}`,
          bookingCode: `SS-BLR-${randId}`,
          createdAt: now,
          statusHistory: [
            {
              status: bookingData.status || 'requested',
              timestamp: now,
              note:
                'Booking successfully confirmed via cooperative platform',
            },
          ],
        };

        this.bookings.push(newBooking);

        resolve({ ...newBooking });
      }, 400);
    });
  }

  async updateBookingStatus(
    bookingId: string,
    newStatus: BookingStatus,
    note?: string
  ): Promise<Booking | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = this.bookings.findIndex(
          (b) => b.id === bookingId
        );

        if (index === -1) {
          console.error(
            'Booking not found:',
            bookingId
          );
          resolve(null);
          return;
        }

        const booking = this.bookings[index];

        const now = new Date().toISOString();

        const updatedBooking: Booking = {
          ...booking,
          status: newStatus,
          statusHistory: [
            ...(booking.statusHistory || []),
            {
              status: newStatus,
              timestamp: now,
              note:
                note ||
                `Status transitioned to ${newStatus}`,
            },
          ],
        };

        if (newStatus === 'completed') {
          updatedBooking.paymentStatus = 'completed';
        }

        this.bookings[index] = updatedBooking;

        console.log(
          `Booking ${bookingId} status changed to ${newStatus}`
        );

        resolve({ ...updatedBooking });
      }, 300);
    });
  }

  async assignWorkerToBooking(
    bookingId: string,
    worker: WorkerProfile
  ): Promise<Booking | null> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const index = this.bookings.findIndex((b) => b.id === bookingId);
        if (index === -1) {
          resolve(null);
          return;
        }

        const targetBooking = this.bookings[index];

        // 1. Validate profession matching
        if (!isTradeMatching(targetBooking.categoryId, targetBooking.serviceTitle, worker)) {
          const err = new Error(
            `Skill Mismatch: This job (${targetBooking.serviceTitle}) requires a ${targetBooking.categoryId || 'trade'} specialist, but ${worker.name} is certified as "${worker.primarySkill}".`
          );
          reject(err);
          return;
        }

        // 2. Validate one worker to one active work concurrency
        const activeJob = getWorkerActiveJob(worker.id, this.bookings, bookingId);
        if (activeJob) {
          const err = new Error(
            `Worker Concurrency Limit: ${worker.name} already has an ongoing assignment #${activeJob.bookingCode} (${activeJob.serviceTitle} - ${activeJob.status.replace('_', ' ').toUpperCase()}). A worker can only be assigned to one active job at a time.`
          );
          reject(err);
          return;
        }

        const now = new Date().toISOString();
        const updatedBooking: Booking = {
          ...targetBooking,
          workerId: worker.id,
          workerName: worker.name,
          workerSkill: worker.primarySkill,
          workerPhone: worker.phone,
          cooperativeName: worker.cooperativeName,
          status: 'accepted',
          statusHistory: [
            ...(targetBooking.statusHistory || []),
            {
              status: 'accepted',
              timestamp: now,
              note: `Directly dispatched to verified worker ${worker.name} (${worker.primarySkill}) by Cooperative Admin`,
            },
          ],
        };

        this.bookings[index] = updatedBooking;
        resolve({ ...updatedBooking });
      }, 150);
    });
  }

  /*
   * CUSTOMER CANCELLATION
   */
  async cancelBooking(
    bookingId: string,
    reason: string
  ): Promise<Booking | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = this.bookings.findIndex(
          (b) => b.id === bookingId
        );

        if (index === -1) {
          console.error(
            'Cancel failed - booking not found:',
            bookingId
          );

          resolve(null);
          return;
        }

        const existingBooking = this.bookings[index];

        /*
         * Customer can cancel only before
         * the worker starts travelling.
         */
        if (
          existingBooking.status !== 'requested' &&
          existingBooking.status !== 'accepted'
        ) {
          console.warn(
            'Cancel rejected because booking status is:',
            existingBooking.status
          );

          resolve(null);
          return;
        }

        const now = new Date().toISOString();

        const cancelledBooking: Booking = {
          ...existingBooking,

          status: 'cancelled',

          statusHistory: [
            ...(existingBooking.statusHistory || []),
            {
              status: 'cancelled',
              timestamp: now,
              note:
                reason ||
                'Booking cancelled by customer',
            },
          ],

          cancellationReason:
            reason || 'Booking cancelled by customer',
        };

        /*
         * IMPORTANT:
         * Replace the actual stored booking.
         */
        this.bookings[index] = cancelledBooking;

        console.log(
          'BOOKING CANCELLED:',
          cancelledBooking.id,
          cancelledBooking.status
        );

        resolve({ ...cancelledBooking });
      }, 300);
    });
  }

  /*
   * WORKER REJECTION
   */
  async rejectJobWithReason(
    bookingId: string,
    reason: string
  ): Promise<Booking | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const index = this.bookings.findIndex(
          (b) => b.id === bookingId
        );

        if (index === -1) {
          resolve(null);
          return;
        }

        const existingBooking = this.bookings[index];
        const now = new Date().toISOString();

        const rejectedBooking: Booking = {
          ...existingBooking,

          status: 'cancelled',

          statusHistory: [
            ...(existingBooking.statusHistory || []),
            {
              status: 'cancelled',
              timestamp: now,
              note:
                reason ||
                'Job declined by cooperative worker',
            },
          ],

          rejectionReason:
            reason ||
            'Job declined by cooperative worker',
        };

        this.bookings[index] = rejectedBooking;

        resolve({ ...rejectedBooking });
      }, 300);
    });
  }

  /*
   * COMPLETION OTP
   */
  generateCompletionOtp(
    bookingId: string
  ): string | null {
    const booking = this.bookings.find(
      (b) => b.id === bookingId
    );

    if (!booking) {
      return null;
    }

    const otp = Math.floor(
      1000 + Math.random() * 9000
    ).toString();

    booking.completionOtp = otp;
    booking.completionOtpVerified = false;

    return otp;
  }

  verifyCompletionOtp(
    bookingId: string,
    otp: string
  ): boolean {
    const booking = this.bookings.find(
      (b) => b.id === bookingId
    );

    if (!booking || !booking.completionOtp) {
      return false;
    }

    if (booking.completionOtp !== otp) {
      return false;
    }

    booking.completionOtpVerified = true;

    return true;
  }

  /*
   * REVIEWS
   */
  async addReview(
    reviewData: Omit<Review, 'id' | 'createdAt'>
  ): Promise<Review> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newReview: Review = {
          ...reviewData,
          id: `rev-${Date.now()}`,
          createdAt:
            new Date().toISOString().split('T')[0],
        };

        this.reviews.unshift(newReview);

        const booking = this.bookings.find(
          (b) => b.id === reviewData.bookingId
        );

        if (booking) {
          booking.hasRated = true;
        }

        resolve({ ...newReview });
      }, 300);
    });
  }

  async getReviewsForWorker(
    workerId: string
  ): Promise<Review[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(
          this.reviews.filter(
            (r) => r.workerId === workerId
          )
        );
      }, 150);
    });
  }

  /*
   * INVOICE
   */
  generateInvoice(
    booking: Booking
  ): Invoice {
    const baseFare =
      booking.estimatedAmount;

    const welfareCess = Math.round(
      baseFare * 0.05
    );

    const gst = Math.round(
      baseFare * 0.05
    );

    const total =
      baseFare +
      welfareCess +
      gst;

    return {
      invoiceNumber:
        `INV-SS-${booking.bookingCode}`,

      bookingId:
        booking.id,

      issueDate:
        new Date()
          .toISOString()
          .split('T')[0],

      customerName:
        booking.customerName,

      customerPhone:
        booking.customerPhone,

      customerAddress:
        booking.serviceLocation.addressLine,

      workerName:
        booking.workerName,

      cooperativeName:
        booking.cooperativeName,

      societyRegNo:
        'DRB/LCC/1998/1472',

      serviceTitle:
        booking.serviceTitle,

      baseFare,

      sparePartsCost: 0,

      welfareCess,

      gstAmount: gst,

      totalAmount: total,

      paymentMethod:
        booking.paymentMethod?.toUpperCase() ||
        'UPI',

      paymentStatus:
        booking.paymentStatus === 'completed'
          ? 'paid'
          : 'unpaid',
    };
  }
}

export const bookingService =
  new BookingService();