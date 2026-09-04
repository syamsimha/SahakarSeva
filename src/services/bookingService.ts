import { Booking, BookingStatus, Review, Invoice, ServiceCategoryKey, ServiceLocation } from '../types';
import { databaseService } from './db/databaseService';
import { workerService } from './workerService';
import { locationService } from './locationService';

class BookingService {
  async getBookings(filters?: {
    customerId?: string;
    workerId?: string;
    status?: BookingStatus;
  }): Promise<Booking[]> {
    const all = await databaseService.getBookings();
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
    return databaseService.getBookingById(id);
  }

  async createBooking(bookingData: Omit<Booking, 'id' | 'bookingCode' | 'createdAt' | 'statusHistory'>): Promise<Booking> {
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

    const welfareCess = params.welfareCessAmount ?? Math.round(params.estimatedAmount * 0.05);

    // 3. If no suitable available worker exists, still create ONE real priority booking in 'requested' state, without fake workers
    if (validCandidates.length === 0) {
      const unassignedBooking = await this.createBooking({
        customerId: params.customerId,
        customerName: params.customerName,
        customerPhone: params.customerPhone,
        workerId: '',
        workerName: 'Awaiting Cooperative Dispatch',
        workerSkill: params.serviceTitle,
        workerPhone: '',
        cooperativeName: 'SahakarSeva Cooperative Federation',
        categoryId: params.categoryId,
        serviceTitle: params.serviceTitle,
        scheduledDate: 'Immediate Dispatch (Priority 24/7)',
        scheduledTimeSlot: 'Urgent On-Call Dispatch',
        status: 'requested', // Real status: requested! Recorded in queue.
        serviceLocation: params.customerLocation,
        instructions: params.instructions || 'Priority 24/7 Cooperative Rapid Response',
        estimatedAmount: params.estimatedAmount,
        welfareCessAmount: welfareCess,
        isEmergency: true,
        isPriority: true,
        paymentMethod: params.paymentMethod || 'cash',
        paymentStatus: 'pending',
      });

      return {
        success: true,
        workerAssigned: false,
        booking: unassignedBooking,
        message: 'No available cooperative worker is currently available. Your priority request has been recorded.',
      };
    }

    // 4. Sort by real distance if available (closest first), then by rating
    validCandidates.sort((a, b) => {
      const distA = a.distanceKm ?? 9999;
      const distB = b.distanceKm ?? 9999;
      if (distA !== distB) return distA - distB;
      return b.rating - a.rating;
    });

    const assignedWorker = validCandidates[0];

    // 5. Create real priority booking in 'requested' state (awaiting worker acceptance)
    const newBooking = await this.createBooking({
      customerId: params.customerId,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
      workerId: assignedWorker.id,
      workerName: assignedWorker.name,
      workerSkill: assignedWorker.primarySkill,
      workerPhone: assignedWorker.phone,
      cooperativeName: assignedWorker.cooperativeName,
      categoryId: params.categoryId,
      serviceTitle: params.serviceTitle,
      scheduledDate: 'Immediate Dispatch (Priority 24/7)',
      scheduledTimeSlot: 'Urgent On-Call Dispatch',
      status: 'requested', // Real status: requested! Awaiting worker acceptance.
      serviceLocation: params.customerLocation,
      instructions: params.instructions || 'Priority 24/7 Cooperative Rapid Response',
      estimatedAmount: params.estimatedAmount,
      welfareCessAmount: welfareCess,
      isEmergency: true,
      isPriority: true,
      paymentMethod: params.paymentMethod || 'cash',
      paymentStatus: 'pending',
    });

    return {
      success: true,
      workerAssigned: true,
      booking: newBooking,
      message: `Priority emergency request dispatched to ${assignedWorker.name} (${assignedWorker.primarySkill}). Awaiting worker acceptance.`,
    };
  }

  async updateBookingStatus(
    bookingId: string,
    newStatus: BookingStatus,
    note?: string
  ): Promise<Booking | null> {
    const booking = await databaseService.getBookingById(bookingId);
    if (!booking) return null;

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
      booking.completedAt = nowIso;
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

    // Security check: Only the assigned worker (or system) can update location
    if (workerId && booking.workerId !== workerId) {
      console.warn(`[Security Alert] Unauthorized worker ${workerId} attempted to update location for booking ${bookingId}`);
      return null;
    }

    // Stop tracking if booking is completed or cancelled
    if (booking.status === 'completed' || booking.status === 'cancelled') {
      return booking;
    }

    return databaseService.updateBookingWorkerLocation(bookingId, latitude, longitude);
  }

  async getBookingWorkerLocation(
    bookingId: string,
    requestingUserId?: string
  ): Promise<{ latitude: number; longitude: number; updatedAt?: string } | null> {
    const booking = await databaseService.getBookingById(bookingId);
    if (!booking) return null;

    // Security check: Only customer or assigned worker can access live location
    if (
      requestingUserId &&
      booking.customerId !== requestingUserId &&
      booking.workerId !== requestingUserId
    ) {
      console.warn(`[Security Alert] User ${requestingUserId} unauthorized to track booking ${bookingId}`);
      return null;
    }

    // Only return live location when tracking is active
    if (booking.status !== 'on_the_way' && booking.status !== 'in_progress') {
      return null;
    }

    return booking.workerLocation || null;
  }

  async addReview(reviewData: Omit<Review, 'id' | 'createdAt'>): Promise<Review> {
    const newReview: Review = {
      ...reviewData,
      id: `rev-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0],
    };
    await databaseService.addReview(newReview);
    const booking = await databaseService.getBookingById(reviewData.bookingId);
    if (booking) {
      booking.hasRated = true;
      await databaseService.saveBooking(booking);
    }
    return newReview;
  }

  async getReviewsForWorker(workerId: string): Promise<Review[]> {
    const reviews = await databaseService.getReviews();
    return reviews.filter((r) => r.workerId === workerId);
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
      paymentStatus: booking.paymentStatus === 'completed' || booking.status === 'completed' ? 'paid' : 'unpaid',
    };
  }
}

export const bookingService = new BookingService();
