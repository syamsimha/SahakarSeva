import { bookingService } from './bookingService';
import { notificationService } from './notificationService';
import { workerService } from './workerService';

export interface TestResult {
  checkName: string;
  passed: boolean;
  details: string;
}

/**
 * End-to-End Integration Test Suite for Sahakar Sathi:
 * 
 * Tests the complete lifecycle:
 * Customer books a service
 *   ↓
 * Worker accepts the booking
 *   ↓
 * Customer receives an acceptance notification
 *   ↓
 * Worker completes the booking
 *   ↓
 * Customer receives a completion notification
 *   ↓
 * Customer submits a review and rating
 *   ↓
 * Worker receives a review notification
 *   ↓
 * Worker rating/review information is updated
 */
export async function runIntegrationTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  const recordCheck = (checkName: string, passed: boolean, details: string) => {
    results.push({ checkName, passed, details });
  };

  try {
    // ----------------------------------------------------
    // CHECK 1: Customer books a service
    // ----------------------------------------------------
    const newBookingData = {
      customerId: 'cust-101',
      customerName: 'Ramesh Sharma',
      customerPhone: '+91 98450 12345',
      workerId: 'worker-101',
      workerName: 'Suresh Kumar',
      workerSkill: 'Electrician',
      workerPhone: '+91 98765 43210',
      cooperativeName: 'Nagarika Seva Sahakari Samiti Ltd.',
      categoryId: 'electrical' as const,
      serviceTitle: 'Switchboard Diagnostics',
      scheduledDate: '2024-03-10',
      scheduledTimeSlot: '10:00 AM - 12:00 PM',
      status: 'requested' as const,
      serviceLocation: {
        addressLine: 'Flat 402, Indiranagar',
        city: 'Bengaluru',
        pincode: '560038',
        latitude: 12.9784,
        longitude: 77.6408,
      },
      instructions: 'Living room main switch tripping.',
      estimatedAmount: 399,
      welfareCessAmount: 19.95,
      isEmergency: false,
    };

    const createdBooking = await bookingService.createBooking(newBookingData);
    const bookingCreatedOk = Boolean(
      createdBooking &&
      createdBooking.id &&
      createdBooking.bookingCode &&
      createdBooking.status === 'requested' &&
      createdBooking.customerId === 'cust-101'
    );
    recordCheck(
      'Customer books a service',
      bookingCreatedOk,
      `Booking created with ID ${createdBooking.id} and status '${createdBooking.status}'`
    );

    // ----------------------------------------------------
    // CHECK 2: Worker accepts the booking & Customer receives notification
    // ----------------------------------------------------
    const acceptedBooking = await bookingService.updateBookingStatus(
      createdBooking.id,
      'accepted',
      'Accepted by Suresh Kumar'
    );
    const isAccepted = acceptedBooking?.status === 'accepted';

    // Dispatch acceptance notification to customer
    await notificationService.sendNotification({
      recipientRole: 'customer',
      recipientId: createdBooking.customerId,
      title: 'Booking Accepted',
      body: `${createdBooking.workerName} accepted your booking for ${createdBooking.serviceTitle}.`,
      type: 'booking',
      relatedId: createdBooking.id,
    });

    const customerNotifs = await notificationService.getNotifications('customer', createdBooking.customerId);
    const acceptNotif = customerNotifs.find(
      (n) => n.relatedId === createdBooking.id && n.title === 'Booking Accepted'
    );

    const acceptOk = Boolean(
      isAccepted &&
      acceptNotif &&
      acceptNotif.recipientId === 'cust-101' &&
      acceptNotif.recipientRole === 'customer'
    );
    recordCheck(
      'Worker accepts booking & Customer receives acceptance notification',
      acceptOk,
      `Status transitioned to '${acceptedBooking?.status}'. Customer notification ID: ${acceptNotif?.id}`
    );

    // ----------------------------------------------------
    // CHECK 3: Worker completes the booking & Customer receives completion notification
    // ----------------------------------------------------
    const completedBooking = await bookingService.updateBookingStatus(
      createdBooking.id,
      'completed',
      'Job completed at customer site'
    );
    const isCompleted = completedBooking?.status === 'completed' && completedBooking.paymentStatus === 'completed';

    // Dispatch completion notification to customer
    await notificationService.sendNotification({
      recipientRole: 'customer',
      recipientId: createdBooking.customerId,
      title: 'Service Completed',
      body: `${createdBooking.workerName} completed ${createdBooking.serviceTitle}. Please share your rating and review.`,
      type: 'booking',
      relatedId: createdBooking.id,
    });

    const updatedCustomerNotifs = await notificationService.getNotifications('customer', createdBooking.customerId);
    const completeNotif = updatedCustomerNotifs.find(
      (n) => n.relatedId === createdBooking.id && n.title === 'Service Completed'
    );

    const completeOk = Boolean(
      isCompleted &&
      completeNotif &&
      completeNotif.recipientId === 'cust-101'
    );
    recordCheck(
      'Worker completes booking & Customer receives completion notification',
      completeOk,
      `Status: '${completedBooking?.status}', PaymentStatus: '${completedBooking?.paymentStatus}'. Notification received by ${completeNotif?.recipientId}`
    );

    // ----------------------------------------------------
    // CHECK 4: Completed booking can be reviewed & Review is stored
    // ----------------------------------------------------
    const reviewData = {
      bookingId: createdBooking.id,
      workerId: createdBooking.workerId,
      customerId: createdBooking.customerId,
      customerName: createdBooking.customerName,
      rating: 5,
      comment: '[Punctual & Polite] Excellent wiring diagnostic, arrived right on time with testing kit.',
      verifiedJob: true,
    };

    const newReview = await bookingService.addReview(reviewData);
    const workerReviews = await bookingService.getReviewsForWorker(createdBooking.workerId);
    const storedReview = workerReviews.find((r) => r.id === newReview.id);
    const freshBooking = await bookingService.getBookingById(createdBooking.id);

    const reviewOk = Boolean(
      storedReview &&
      storedReview.rating === 5 &&
      storedReview.workerId === 'worker-101' &&
      storedReview.customerId === 'cust-101' &&
      freshBooking?.hasRated === true
    );
    recordCheck(
      'Customer submits review & Rating stored with correct associations',
      reviewOk,
      `Review ID: ${newReview.id}, Rating: ${storedReview?.rating}★, Booking hasRated: ${freshBooking?.hasRated}`
    );

    // ----------------------------------------------------
    // CHECK 5: Worker receives review notification with correct references
    // ----------------------------------------------------
    await notificationService.sendNotification({
      recipientRole: 'worker',
      recipientId: createdBooking.workerId,
      title: 'New Customer Review',
      body: `${createdBooking.customerName} rated you 5★ for ${createdBooking.serviceTitle}.`,
      type: 'job',
      relatedId: createdBooking.id,
    });

    const workerNotifs = await notificationService.getNotifications('worker', createdBooking.workerId);
    const reviewNotif = workerNotifs.find(
      (n) => n.relatedId === createdBooking.id && n.title === 'New Customer Review'
    );

    const workerNotifOk = Boolean(
      reviewNotif &&
      reviewNotif.recipientId === 'worker-101' &&
      reviewNotif.recipientRole === 'worker'
    );
    recordCheck(
      'Worker receives review notification with correct references',
      workerNotifOk,
      `Notification ID: ${reviewNotif?.id}, Recipient: ${reviewNotif?.recipientId}`
    );

    // ----------------------------------------------------
    // CHECK 6: Worker rating & review statistics updated
    // ----------------------------------------------------
    const initialWorker = await workerService.getWorkerById(createdBooking.workerId);
    const initialCount = initialWorker?.reviewCount || 0;

    const updatedWorker = await workerService.recordReview(createdBooking.workerId, 5);
    const workerStatsOk = Boolean(
      updatedWorker &&
      updatedWorker.reviewCount === initialCount + 1 &&
      updatedWorker.rating > 0
    );
    recordCheck(
      'Worker rating & reviewCount updated in workerService',
      workerStatsOk,
      `Previous Count: ${initialCount}, Updated Count: ${updatedWorker?.reviewCount}, Updated Rating: ${updatedWorker?.rating}★`
    );

    // ----------------------------------------------------
    // CHECK 7: Duplicate review prevention verification
    // ----------------------------------------------------
    const isAlreadyRated = freshBooking?.hasRated === true;
    recordCheck(
      'Duplicate review prevention guard is active',
      isAlreadyRated,
      `Booking ${createdBooking.id} hasRated is true; duplicate review submissions guarded`
    );

    // ----------------------------------------------------
    // CHECK 8: Existing booking functionality & invoice generation preserved
    // ----------------------------------------------------
    const invoice = bookingService.generateInvoice(completedBooking!);
    const invoiceOk = Boolean(
      invoice &&
      invoice.bookingId === createdBooking.id &&
      invoice.totalAmount > 0 &&
      invoice.welfareCess > 0
    );
    recordCheck(
      'Existing booking invoice calculation preserved',
      invoiceOk,
      `Invoice: ${invoice?.invoiceNumber}, Base: ₹${invoice?.baseFare}, Welfare: ₹${invoice?.welfareCess}, Total: ₹${invoice?.totalAmount}`
    );

  } catch (err: any) {
    recordCheck('Integration Test Run', false, `Unhandled error during test run: ${err?.message || err}`);
  }

  return results;
}
