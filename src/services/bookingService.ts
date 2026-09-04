import { Booking, BookingStatus, Review, Invoice } from '../types';
import { mockBookings, mockReviews } from '../data';

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
          list = list.filter((b) => b.customerId === filters.customerId);
        }
        if (filters?.workerId) {
          list = list.filter((b) => b.workerId === filters.workerId);
        }
        if (filters?.status) {
          list = list.filter((b) => b.status === filters.status);
        }
        // Return latest first
        resolve(list.reverse());
      }, 200);
    });
  }

  async getBookingById(id: string): Promise<Booking | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.bookings.find((b) => b.id === id));
      }, 150);
    });
  }

  async createBooking(bookingData: Omit<Booking, 'id' | 'bookingCode' | 'createdAt' | 'statusHistory'>): Promise<Booking> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const randId = Math.floor(1000 + Math.random() * 9000);
        const newBooking: Booking = {
          ...bookingData,
          id: `bk-${Date.now()}`,
          bookingCode: `SS-BLR-${randId}`,
          createdAt: new Date().toISOString(),
          statusHistory: [
            {
              status: bookingData.status || 'requested',
              timestamp: new Date().toISOString(),
              note: 'Booking successfully confirmed via cooperative platform',
            },
          ],
        };
        this.bookings.push(newBooking);
        resolve(newBooking);
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
        const booking = this.bookings.find((b) => b.id === bookingId);
        if (!booking) return resolve(null);

        booking.status = newStatus;
        booking.statusHistory.push({
          status: newStatus,
          timestamp: new Date().toISOString(),
          note: note || `Status transitioned to ${newStatus}`,
        });

        if (newStatus === 'completed') {
          booking.paymentStatus = 'completed';
        }

        resolve({ ...booking });
      }, 300);
    });
  }

  async cancelBooking(
    bookingId: string,
    reason: string
  ): Promise<Booking | null> {
    const booking = await this.updateBookingStatus(
      bookingId,
      'cancelled',
      `Booking cancelled by customer: ${reason}`
    );

    if (booking) {
      booking.cancellationReason = reason;
    }

    return booking;
  }

  async rejectJobWithReason(
    bookingId: string,
    reason: string
  ): Promise<Booking | null> {
    const booking = await this.updateBookingStatus(
      bookingId,
      'cancelled',
      `Job declined by cooperative worker: ${reason}`
    );

    if (booking) {
      booking.rejectionReason = reason;
    }

    return booking;
  }

  generateCompletionOtp(bookingId: string): string | null {
    const booking = this.bookings.find((b) => b.id === bookingId);

    if (!booking) {
      return null;
    }

    const otp = Math.floor(1000 + Math.random() * 9000).toString();

    booking.completionOtp = otp;
    booking.completionOtpVerified = false;

    return otp;
  }

  verifyCompletionOtp(
    bookingId: string,
    otp: string
  ): boolean {
    const booking = this.bookings.find((b) => b.id === bookingId);

    if (!booking || !booking.completionOtp) {
      return false;
    }

    if (booking.completionOtp !== otp) {
      return false;
    }

    booking.completionOtpVerified = true;

    return true;
  }

  async addReview(reviewData: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newReview: Review = {
          ...reviewData,
          id: `rev-${Date.now()}`,
          createdAt: new Date().toISOString().split('T')[0],
        };
        this.reviews.unshift(newReview);
        const booking = this.bookings.find((b) => b.id === reviewData.bookingId);
        if (booking) {
          booking.hasRated = true;
        }
        resolve(newReview);
      }, 300);
    });
  }

  async getReviewsForWorker(workerId: string): Promise<Review[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.reviews.filter((r) => r.workerId === workerId));
      }, 150);
    });
  }

  generateInvoice(booking: Booking): Invoice {
    const baseFare = booking.estimatedAmount;
    const welfareCess = Math.round(baseFare * 0.05); // 5% cooperative worker welfare
    const gst = Math.round(baseFare * 0.05); // 5% GST
    const total = baseFare + welfareCess + gst;

    return {
      invoiceNumber: `INV-SS-${booking.bookingCode}`,
      bookingId: booking.id,
      issueDate: new Date().toISOString().split('T')[0],
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      customerAddress: booking.serviceLocation.addressLine,
      workerName: booking.workerName,
      cooperativeName: booking.cooperativeName,
      societyRegNo: 'DRB/LCC/1998/1472',
      serviceTitle: booking.serviceTitle,
      baseFare,
      sparePartsCost: 0,
      welfareCess,
      gstAmount: gst,
      totalAmount: total,
      paymentMethod: booking.paymentMethod?.toUpperCase() || 'UPI',
      paymentStatus: booking.paymentStatus === 'completed' ? 'paid' : 'unpaid',
    };
  }
}

export const bookingService = new BookingService();
