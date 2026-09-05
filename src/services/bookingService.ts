import {
  Booking,
  BookingStatus,
  Review,
  Invoice,
  WorkerProfile,
  ServiceCategoryKey,
  ServiceLocation,
} from '../types';
import { mockBookings, mockReviews } from '../data';
import { isTradeMatching, getWorkerActiveJob } from '../utils/workerMatching';
import { databaseService } from './db/databaseService';
import { workerService } from './workerService';
import { locationService } from './locationService';

class BookingService {
  private bookings: Booking[] = [...mockBookings];
  private reviews: Review[] = [...mockReviews];

  async getBookings(filters?: {
    customerId?: string;
    workerId?: string;
    status?: BookingStatus;
  }): Promise<Booking[]> {
    const all = await databaseService.getBookings();
    this.bookings = all;
    let list = [...all];
    if (filters?.customerId) {
      list = list.filter((b) => b.customerId === filters.customerId);
    }
    if (filters?.workerId) {
      list = list.filter((b) => b.workerId === filters.workerId);
    }
    if (filters?.status) {
      list = list.filter((b) => b.status === filters.status);
    }
    return list;
  }

  async getBookingById(id: string): Promise<Booking | undefined> {
    const booking = await databaseService.getBookingById(id);
    if (booking) return booking;
    return this.bookings.find((b) => b.id === id);
  }

  async createBooking(
    bookingData: Omit<Booking, 'id' | 'bookingCode' | 'createdAt' | 'statusHistory'>
  ): Promise<Booking> {
    const randId = Math.floor(1000 + Math.random() * 9000);
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
          note: 'Booking successfully confirmed via cooperative platform',
        },
      ],
    };
    this.bookings.push(newBooking);
    return databaseService.saveBooking(newBooking);
  }

  /**
   * Real Priority 24/7 Dispatch Engine
   * Matches real available workers for the requested trade and customer service location.
   * If no suitable available worker is found, records the booking in queue without fake assignments.
   */
  async dispatchPriorityBooking(params: {
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
  }): Promise<{ success: boolean; workerAssigned: boolean; booking?: Booking; error?: string; message?: string }> {
    const hasCoords =
      params.customerLocation.latitude != null &&
      params.customerLocation.longitude != null &&
      !isNaN(params.customerLocation.latitude) &&
      !isNaN(params.customerLocation.longitude);

    // 1. Query real available workers matching the requested service trade
    const availableWorkers = await workerService.getWorkers({
      category: params.categoryId,
      availableOnly: true,
      customerCoords: hasCoords
        ? {
            latitude: params.customerLocation.latitude!,
            longitude: params.customerLocation.longitude!,
          }
        : undefined,
    });

    // 2. Filter workers who are genuinely available (isAvailable === true)
    const validCandidates = availableWorkers.filter((w) => w.isAvailable);

    if (validCandidates.length === 0) {
      // Create priority ticket in unassigned queue so admin/system can dispatch
      const unassignedBooking = await this.createBooking({
        customerId: params.customerId,
        customerName: params.customerName,
        customerPhone: params.customerPhone,
        workerId: 'unassigned',
        workerName: 'Pending Assignment',
        workerSkill: params.categoryId,
        workerPhone: '',
        cooperativeName: 'Sahakar Seva Cooperative Federation',
        serviceLocation: params.customerLocation,
        categoryId: params.categoryId,
        serviceTitle: `[PRIORITY 24/7] ${params.serviceTitle}`,
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTimeSlot: 'Immediate Dispatch',
        isEmergency: true,
        isPriority: true,
        status: 'requested',
        estimatedAmount: params.estimatedAmount,
        welfareCessAmount: params.welfareCessAmount ?? Math.round(params.estimatedAmount * 0.05),
        paymentMethod: params.paymentMethod || 'upi',
        paymentStatus: 'pending',
        instructions: params.instructions
          ? `[24/7 Emergency Request] ${params.instructions}`
          : '[24/7 Emergency Request] Immediate response required.',
      });

      return {
        success: true,
        workerAssigned: false,
        booking: unassignedBooking,
        message: 'Priority request logged to cooperative emergency queue. Searching nearest responders.',
      };
    }

    // 3. Select nearest worker with highest rating & shortest ETA
    const sorted = [...validCandidates].sort((a, b) => {
      const distA = a.distanceKm ?? 999;
      const distB = b.distanceKm ?? 999;
      if (distA !== distB) return distA - distB;
      return (b.rating || 0) - (a.rating || 0);
    });

    const chosenWorker = sorted[0];

    // 4. Create instantly assigned emergency booking with real worker
    const now = new Date().toISOString();
    const randId = Math.floor(1000 + Math.random() * 9000);
    const assignedBooking: Booking = {
      id: `bk-${Date.now()}`,
      bookingCode: `SS-EMG-${randId}`,
      customerId: params.customerId,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      serviceLocation: params.customerLocation,
      categoryId: params.categoryId,
      serviceTitle: `[PRIORITY 24/7] ${params.serviceTitle}`,
      workerId: chosenWorker.id,
      workerName: chosenWorker.name,
      workerPhone: chosenWorker.phone,
      workerSkill: chosenWorker.primarySkill,
      cooperativeName: chosenWorker.cooperativeName,
      workerLocation: chosenWorker.latitude && chosenWorker.longitude
        ? { latitude: chosenWorker.latitude, longitude: chosenWorker.longitude, updatedAt: now }
        : undefined,
      scheduledDate: new Date().toISOString().split('T')[0],
      scheduledTimeSlot: 'Immediate Dispatch',
      isEmergency: true,
      isPriority: true,
      status: 'accepted',
      estimatedAmount: params.estimatedAmount,
      welfareCessAmount: params.welfareCessAmount ?? Math.round(params.estimatedAmount * 0.05),
      paymentMethod: params.paymentMethod || 'upi',
      paymentStatus: 'pending',
      instructions: params.instructions
        ? `[24/7 Emergency Request] ${params.instructions}`
        : '[24/7 Emergency Request] Worker dispatched immediately.',
      createdAt: now,
      statusHistory: [
        {
          status: 'requested',
          timestamp: now,
          note: 'Emergency 24/7 service requested by customer',
        },
        {
          status: 'accepted',
          timestamp: new Date(Date.now() + 1000).toISOString(),
          note: `Auto-dispatched nearest verified worker ${chosenWorker.name} (${chosenWorker.primarySkill}, ${chosenWorker.distanceKm ? chosenWorker.distanceKm + ' km' : 'nearby'})`,
        },
      ],
    };

    const saved = await databaseService.saveBooking(assignedBooking);
    this.bookings.push(saved);
    return {
      success: true,
      workerAssigned: true,
      booking: saved,
      message: `Verified worker ${chosenWorker.name} assigned. Estimated arrival ${chosenWorker.distanceKm ? Math.max(5, Math.round(chosenWorker.distanceKm * 4)) + ' mins' : '15 mins'}.`,
    };
  }

  async updateBookingStatus(
    bookingId: string,
    newStatus: BookingStatus,
    note?: string
  ): Promise<Booking | null> {
    const booking = await databaseService.getBookingById(bookingId);
    if (!booking) {
      const idx = this.bookings.findIndex((b) => b.id === bookingId);
      if (idx === -1) return null;
      const b = this.bookings[idx];
      b.status = newStatus;
      b.statusHistory = b.statusHistory || [];
      b.statusHistory.push({
        status: newStatus,
        timestamp: new Date().toISOString(),
        note: note || `Status transitioned to ${newStatus}`,
      });
      if (newStatus === 'completed') {
        b.paymentStatus = 'completed';
      }
      return databaseService.saveBooking(b);
    }

    booking.status = newStatus;
    if (!booking.statusHistory) {
      booking.statusHistory = [];
    }
    const nowIso = new Date().toISOString();
    booking.statusHistory.push({
      status: newStatus,
      timestamp: nowIso,
      note: note || `Status transitioned to ${newStatus}`,
    });

    if (newStatus === 'completed') {
      booking.paymentStatus = 'completed';
    }

    const idx = this.bookings.findIndex((b) => b.id === bookingId);
    if (idx !== -1) {
      this.bookings[idx] = booking;
    } else {
      this.bookings.push(booking);
    }

    return databaseService.saveBooking(booking);
  }

  async updateWorkerLocation(
    bookingId: string,
    latitude: number,
    longitude: number,
    workerId?: string
  ): Promise<Booking | null> {
    const booking = await databaseService.getBookingById(bookingId);
    if (!booking) return null;

    if (workerId && booking.workerId !== workerId) {
      console.warn(`[Security] Worker ${workerId} is not assigned to booking ${bookingId}`);
      return null;
    }

    if (booking.status === 'completed' || booking.status === 'cancelled') {
      return booking;
    }

    booking.workerLocation = { latitude, longitude };
    await databaseService.saveBooking(booking);
    return booking;
  }

  async getBookingWorkerLocation(
    bookingId: string
  ): Promise<{ latitude: number; longitude: number } | null> {
    const booking = await databaseService.getBookingById(bookingId);
    if (!booking) return null;

    if (
      booking.workerLocation &&
      booking.workerLocation.latitude != null &&
      booking.workerLocation.longitude != null &&
      !isNaN(booking.workerLocation.latitude) &&
      !isNaN(booking.workerLocation.longitude)
    ) {
      return booking.workerLocation;
    }

    if (booking.status !== 'on_the_way' && booking.status !== 'in_progress') {
      return null;
    }

    return booking.workerLocation || null;
  }

  async assignWorkerToBooking(
    bookingId: string,
    worker: WorkerProfile
  ): Promise<Booking | null> {
    const all = await databaseService.getBookings();
    this.bookings = all;
    const index = this.bookings.findIndex((b) => b.id === bookingId);
    if (index === -1) {
      return null;
    }

    const targetBooking = this.bookings[index];

    // 1. Validate profession matching
    if (!isTradeMatching(targetBooking.categoryId, targetBooking.serviceTitle, worker)) {
      throw new Error(
        `Skill Mismatch: This job (${targetBooking.serviceTitle}) requires a ${targetBooking.categoryId || 'trade'} specialist, but ${worker.name} is certified as "${worker.primarySkill}".`
      );
    }

    // 2. Validate one worker to one active work concurrency
    const activeJob = getWorkerActiveJob(worker.id, this.bookings, bookingId);
    if (activeJob) {
      throw new Error(
        `Worker Concurrency Limit: ${worker.name} already has an ongoing assignment #${activeJob.bookingCode} (${activeJob.serviceTitle} - ${activeJob.status.replace('_', ' ').toUpperCase()}). A worker can only be assigned to one active job at a time.`
      );
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
    await databaseService.saveBooking(updatedBooking);
    return updatedBooking;
  }

  /*
   * CUSTOMER CANCELLATION
   */
  async cancelBooking(
    bookingId: string,
    reason: string
  ): Promise<Booking | null> {
    const all = await databaseService.getBookings();
    this.bookings = all;
    const index = this.bookings.findIndex((b) => b.id === bookingId);

    if (index === -1) {
      console.error('Cancel failed - booking not found:', bookingId);
      return null;
    }

    const existingBooking = this.bookings[index];

    if (
      existingBooking.status !== 'requested' &&
      existingBooking.status !== 'accepted'
    ) {
      console.warn('Cancel rejected because booking status is:', existingBooking.status);
      return null;
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
          note: reason || 'Booking cancelled by customer',
        },
      ],
      cancellationReason: reason || 'Booking cancelled by customer',
    };

    this.bookings[index] = cancelledBooking;
    await databaseService.saveBooking(cancelledBooking);
    return cancelledBooking;
  }

  /*
   * WORKER REJECTION
   */
  async rejectJobWithReason(
    bookingId: string,
    reason: string
  ): Promise<Booking | null> {
    const all = await databaseService.getBookings();
    this.bookings = all;
    const index = this.bookings.findIndex((b) => b.id === bookingId);

    if (index === -1) {
      return null;
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
          note: reason || 'Job declined by cooperative worker',
        },
      ],
      rejectionReason: reason || 'Job declined by cooperative worker',
    };

    this.bookings[index] = rejectedBooking;
    await databaseService.saveBooking(rejectedBooking);
    return rejectedBooking;
  }

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

  async addReview(reviewData: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
    const newReview: Review = {
      ...reviewData,
      id: `rev-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    await databaseService.addReview(newReview);
    this.reviews.push(newReview);
    const booking = await databaseService.getBookingById(reviewData.bookingId);
    if (booking) {
      booking.hasRated = true;
      await databaseService.saveBooking(booking);
      const idx = this.bookings.findIndex((b) => b.id === reviewData.bookingId);
      if (idx !== -1) {
        this.bookings[idx] = booking;
      }
    }
    return newReview;
  }

  async getReviewsForWorker(workerId: string): Promise<Review[]> {
    const reviews = await databaseService.getReviews();
    if (reviews && reviews.length > 0) {
      return reviews.filter((r) => r.workerId === workerId);
    }
    return this.reviews.filter((r) => r.workerId === workerId);
  }

  generateInvoice(booking: Booking): Invoice {
    const baseFare = booking.estimatedAmount;
    const welfareCess = booking.welfareCessAmount ?? Math.round(baseFare * 0.05); // 5% cooperative worker welfare
    const gst = Math.round(baseFare * 0.05); // 5% GST
    const total = booking.finalAmount ?? (baseFare + welfareCess + gst);
    const dynamicIssueDate = booking.completedAt
      ? booking.completedAt.split('T')[0]
      : new Date().toISOString().split('T')[0];

    return {
      invoiceNumber: `INV-SS-${booking.bookingCode || booking.id}`,
      bookingId: booking.id,
      issueDate: dynamicIssueDate,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      customerAddress: booking.serviceLocation.addressLine,
      workerName: booking.workerName || 'Cooperative Assigned Professional',
      cooperativeName: booking.cooperativeName,
      societyRegNo: 'DRB/LCC/1998/1472',
      serviceTitle: booking.serviceTitle,
      baseFare,
      sparePartsCost: 0,
      welfareCess,
      gstAmount: gst,
      totalAmount: total,
      paymentMethod: booking.paymentMethod?.toUpperCase() || 'UPI',
      paymentStatus:
        booking.paymentStatus === 'completed' || booking.status === 'completed'
          ? 'paid'
          : 'unpaid',
    };
  }
}

export const bookingService = new BookingService();
