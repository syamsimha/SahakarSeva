import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { Badge, Button, Avatar, MapPlaceholder } from '../../components/ui';
import { useBookings } from '../../context/BookingContext';
import { useLanguage } from '../../context/LanguageContext';
import { locationService } from '../../services/locationService';
import { formatTimeAgo, formatCompletedDate } from '../../utils/dateTime';
import { BookingStatus, WorkerProfile } from '../../types';
import { Ionicons } from '@expo/vector-icons';
import { normalizePhoneNumber, triggerPhoneCall } from '../../utils/phone';
import { workerService } from '../../services/workerService';

interface BookingDetailsScreenProps {
  bookingId: string;
  onNavigateToInvoice: (bookingId: string) => void;
  onNavigateToRate: (bookingId: string) => void;
  onNavigateToHelp?: (bookingId: string) => void;
  onBack: () => void;
}

const statusSteps: Array<{
  key: BookingStatus;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  {
    key: 'requested',
    label: 'Requested',
    icon: 'paper-plane-outline',
  },
  {
    key: 'accepted',
    label: 'Accepted',
    icon: 'checkmark-circle-outline',
  },
  {
    key: 'on_the_way',
    label: 'On The Way',
    icon: 'bicycle-outline',
  },
  {
    key: 'in_progress',
    label: 'In Progress',
    icon: 'construct-outline',
  },
  {
    key: 'completed',
    label: 'Completed',
    icon: 'shield-checkmark-outline',
  },
];

export const BookingDetailsScreen: React.FC<BookingDetailsScreenProps> = ({
  bookingId,
  onNavigateToInvoice,
  onNavigateToRate,
  onNavigateToHelp,
  onBack,
}) => {
  const { t } = useLanguage();
  const {
    bookings,
    updateStatus,
    cancelBooking,
  } = useBookings();

  const booking = bookings.find((b) => b.id === bookingId);

  const custLat = booking?.serviceLocation?.latitude;
  const custLng = booking?.serviceLocation?.longitude;

  const [workerCoords, setWorkerCoords] = useState<{ latitude: number; longitude: number; updatedAt?: string } | null>(
    booking?.workerLocation && typeof booking.workerLocation.latitude === 'number' && typeof booking.workerLocation.longitude === 'number'
      ? {
          latitude: booking.workerLocation.latitude,
          longitude: booking.workerLocation.longitude,
          updatedAt: booking.workerLocation.updatedAt || new Date().toISOString(),
        }
      : null
  );

  const isTrackingActive = Boolean(
    booking && (booking.status === 'on_the_way' || booking.status === 'in_progress')
  );

  const isCompletedOrCancelled = Boolean(
    booking && (booking.status === 'completed' || booking.status === 'cancelled')
  );

  // Worker phone retrieval and normalization
  const [workerRecord, setWorkerRecord] = useState<WorkerProfile | null>(null);

  useEffect(() => {
    if (booking?.workerId && !booking?.workerPhone) {
      workerService.getWorkerById(booking.workerId).then((w) => {
        if (w) setWorkerRecord(w);
      });
    }
  }, [booking?.workerId, booking?.workerPhone]);

  const rawWorkerPhone = booking?.workerPhone || workerRecord?.phone;
  const phoneInfo = normalizePhoneNumber(rawWorkerPhone);

  const handleCallWorker = async () => {
    if (!phoneInfo.isValid || !phoneInfo.telUrl) {
      Alert.alert(
        'Phone Unavailable',
        t('worker_phone_unavailable') || 'Worker phone number unavailable.'
      );
      return;
    }

    const res = await triggerPhoneCall(phoneInfo.normalized);
    if (!res.success && res.error) {
      Alert.alert('Phone Call', res.error);
    }
  };

  const liveDistance =
    custLat != null && custLng != null && workerCoords != null
      ? locationService.calculateDistance(
          custLat,
          custLng,
          workerCoords.latitude,
          workerCoords.longitude
        )
      : null;
  const liveEtaMinutes = liveDistance != null ? Math.max(1, Math.round(liveDistance * 4)) : null;

  // Poll for genuine worker location updates every 3 seconds while tracking is active
  useEffect(() => {
    if (!isTrackingActive) return;

    const interval = setInterval(() => {
      const current = bookings.find((b) => b.id === bookingId);
      if (
        current?.workerLocation &&
        typeof current.workerLocation.latitude === 'number' &&
        typeof current.workerLocation.longitude === 'number'
      ) {
        setWorkerCoords({
          latitude: current.workerLocation.latitude,
          longitude: current.workerLocation.longitude,
          updatedAt: current.workerLocation.updatedAt || new Date().toISOString(),
        });
      } else {
        setWorkerCoords(null);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isTrackingActive, bookingId, bookings]);

  // Sync state when booking changes
  useEffect(() => {
    if (
      booking?.workerLocation &&
      typeof booking.workerLocation.latitude === 'number' &&
      typeof booking.workerLocation.longitude === 'number'
    ) {
      setWorkerCoords({
        latitude: booking.workerLocation.latitude,
        longitude: booking.workerLocation.longitude,
        updatedAt: booking.workerLocation.updatedAt,
      });
    } else {
      setWorkerCoords(null);
    }
  }, [booking?.workerLocation]);

  const handleRefreshLocation = () => {
    const current = bookings.find((b) => b.id === bookingId);
    if (
      current?.workerLocation &&
      typeof current.workerLocation.latitude === 'number' &&
      typeof current.workerLocation.longitude === 'number'
    ) {
      setWorkerCoords({
        latitude: current.workerLocation.latitude,
        longitude: current.workerLocation.longitude,
        updatedAt: current.workerLocation.updatedAt || new Date().toISOString(),
      });
    }
  };

  if (!booking) {
    return (
      <View style={styles.container}>
        <Header
          title={t('booking_details_title') || 'Booking Details'}
          showBack
          onBack={onBack}
        />

        <View style={styles.center}>
          <Text style={styles.notFoundText}>
            Booking not found
          </Text>
        </View>
      </View>
    );
  }

  const getStepIndex = (status: BookingStatus) => {
    return statusSteps.findIndex(
      (step) => step.key === status
    );
  };

  const currentStepIdx = getStepIndex(booking.status);

  /*
   * Actually cancel the booking.
   */
  const performCancelBooking = async () => {
    if (
      booking.status !== 'requested' &&
      booking.status !== 'accepted'
    ) {
      if (typeof window !== 'undefined') {
        window.alert(
          'This booking can no longer be cancelled.'
        );
      } else {
        Alert.alert(
          'Cannot Cancel',
          'This booking can no longer be cancelled.'
        );
      }

      return;
    }

    try {
      const updated = await cancelBooking(
        booking.id,
        'Booking cancelled by customer'
      );

      if (updated) {
        if (typeof window !== 'undefined') {
          window.alert(
            'Booking cancelled successfully.'
          );
        } else {
          Alert.alert(
            'Booking Cancelled',
            'Your booking has been cancelled successfully.'
          );
        }
      } else {
        if (typeof window !== 'undefined') {
          window.alert(
            'Unable to cancel this booking. Please try again.'
          );
        } else {
          Alert.alert(
            'Cancellation Failed',
            'Unable to cancel this booking. Please try again.'
          );
        }
      }
    } catch (error) {
      console.error(
        'Cancel booking error:',
        error
      );

      if (typeof window !== 'undefined') {
        window.alert(
          'Something went wrong while cancelling the booking.'
        );
      } else {
        Alert.alert(
          'Cancellation Failed',
          'Something went wrong while cancelling the booking.'
        );
      }
    }
  };

  /*
   * Confirmation before cancellation.
   */
  const handleCancelBooking = () => {
    if (
      booking.status !== 'requested' &&
      booking.status !== 'accepted'
    ) {
      if (typeof window !== 'undefined') {
        window.alert(
          'This booking can no longer be cancelled.'
        );
      } else {
        Alert.alert(
          'Cannot Cancel',
          'This booking can no longer be cancelled.'
        );
      }

      return;
    }

    // WEB PREVIEW
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(
        'Are you sure you want to cancel this booking?'
      );

      if (!confirmed) {
        return;
      }

      void performCancelBooking();
      return;
    }

    // NATIVE MOBILE
    Alert.alert(
      'Cancel Booking?',
      'Are you sure you want to cancel this booking?',
      [
        {
          text: 'Keep Booking',
          style: 'cancel',
        },
        {
          text: 'Cancel Booking',
          style: 'destructive',
          onPress: () => {
            void performCancelBooking();
          },
        },
      ]
    );
  };

  /*
   * Cancellation is available only for:
   * requested
   * accepted
   */
  const canCancel =
    booking.status === 'requested' ||
    booking.status === 'accepted';

  const isCancelled =
    booking.status === 'cancelled';

  return (
    <View style={styles.container}>
      <Header
        title={t('booking_details_title') || 'Booking Status'}
        showBack
        onBack={onBack}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* =========================
            TOP BOOKING CARD
        ========================== */}
        <View style={styles.topCard}>
          <View style={styles.topRow}>
            <View style={styles.topInfo}>
              <Text style={styles.codeText}>
                {booking.bookingCode}
              </Text>

              <Text style={styles.serviceTitle}>
                {booking.serviceTitle}
              </Text>
            </View>

            <View style={{ alignItems: 'flex-end' }}>
              <Badge status={booking.status} />
              {booking.isPriority && (
                <View style={styles.priorityBadgeSmall}>
                  <Ionicons name="flash" size={10} color={colors.danger} />
                  <Text style={styles.priorityBadgeTextSmall}>{t('priority_badge') || 'PRIORITY'}</Text>
                </View>
              )}
            </View>
          </View>

          <Text style={styles.scheduleText}>
            {booking.status === 'completed'
              ? (t('completed_on', {
                  date: formatCompletedDate(
                    booking.completedAt ||
                      booking.statusHistory?.find((s) => s.status === 'completed')?.timestamp
                  ),
                }) || `Completed: ${booking.scheduledDate}`)
              : `${booking.scheduledDate} • ${booking.scheduledTimeSlot}`}
          </Text>
        </View>

        {/* Cancellation Notice Card */}
        {isCancelled && (
          <View style={styles.cancelledCard}>
            <View style={styles.cancelledIcon}>
              <Ionicons
                name="alert-circle"
                size={24}
                color={colors.danger}
              />
            </View>

            <View style={styles.cancelledContent}>
              <Text style={styles.cancelledTitle}>
                {t('job_cancelled') || 'Booking Cancelled'}
              </Text>

              <Text style={styles.cancelledText}>
                This booking has been cancelled and cannot be modified.
              </Text>
            </View>
          </View>
        )}

        {/* Interactive Status Progression Timeline */}
        {!isCancelled && (
          <View style={styles.timelineCard}>
            <View style={styles.timelineHeader}>
              <Text style={styles.cardTitle}>{t('live_status_progression') || 'Live Status Progression'}</Text>
            </View>

            <View style={styles.stepsRow}>
              {statusSteps.map((step, idx) => {
                const isPast = idx <= currentStepIdx;
                const isCurrent = idx === currentStepIdx;
                const stepLabel = t(('status_' + step.key) as any) || step.label;

                return (
                  <View key={step.key} style={styles.stepCol}>
                    <View
                      style={[
                        styles.stepIconBox,
                        isPast && styles.stepIconBoxPast,
                        isCurrent && styles.stepIconBoxCurrent,
                      ]}
                    >
                      <Ionicons
                        name={step.icon}
                        size={14}
                        color={
                          isPast
                            ? colors.textInverse
                            : colors.textMuted
                        }
                      />
                    </View>

                    <Text
                      style={[
                        styles.stepLabel,
                        isPast && styles.stepLabelPast,
                        isCurrent && styles.stepLabelCurrent,
                      ]}
                    >
                      {stepLabel}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Real 4-Digit Job Completion Verification Code */}
        {booking.status === 'in_progress' && (
          <View style={styles.otpCard}>
            <View style={styles.otpHeaderRow}>
              <View style={styles.otpIconBadge}>
                <Ionicons name="key" size={18} color="#059669" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.otpCardTitle}>
                  Job Completion Verification Code
                </Text>
                <Text style={styles.otpCardSub}>
                  Share this 4-digit code with the worker after the work is completed.
                </Text>
              </View>
            </View>

            <View style={styles.otpDisplayContainer}>
              <Text style={styles.otpDigits}>
                {booking.completionOtp || '----'}
              </Text>
            </View>

            <View style={styles.otpFooterRow}>
              <Ionicons name="shield-checkmark" size={14} color="#059669" />
              <Text style={styles.otpFooterText}>
                For your safety, only share this code once the job has been completed to your satisfaction.
              </Text>
            </View>
          </View>
        )}

        {/* Verified Status Banner for Completed Booking */}
        {booking.status === 'completed' && booking.completionOtpVerified && (
          <View style={styles.otpCompletedBox}>
            <Ionicons name="checkmark-circle" size={18} color="#059669" />
            <Text style={styles.otpCompletedText}>
              {`Service verified & completed with 4-digit customer code (${booking.completionOtp || '••••'})`}
            </Text>
          </View>
        )}

        {/* Real Live Worker Tracking Section */}
        {isTrackingActive && (
          <View style={styles.mapSection}>
            <View style={styles.trackingHeaderRow}>
              <View style={styles.pulseRedDot} />
              <Text style={styles.sectionTitle}>
                {booking.status === 'on_the_way'
                  ? (t('live_dispatch_worker_approaching') || 'Worker Approaching')
                  : (t('live_service_in_progress') || 'Service In Progress')}
              </Text>
            </View>

            {workerCoords ? (
              <>
                <MapPlaceholder
                  height={220}
                  latitude={custLat}
                  longitude={custLng}
                  locationName={booking.serviceLocation.addressLine}
                  isGps={true}
                  trackingWorker={{
                    name: booking.workerName,
                    skill: booking.workerSkill,
                    latitude: workerCoords.latitude,
                    longitude: workerCoords.longitude,
                    updatedAt: workerCoords.updatedAt,
                  }}
                />

                {/* Live Metrics Card */}
                <View style={styles.trackingMetricsCard}>
                  <View style={styles.metricItem}>
                    <Ionicons name="navigate-outline" size={16} color={colors.primary} />
                    <Text style={styles.metricLabel}>{t('real_distance') || 'Distance'}</Text>
                    <Text style={styles.metricValue}>
                      {liveDistance != null ? `${liveDistance} km` : '--'}
                    </Text>
                  </View>

                  <View style={styles.metricDivider} />

                  <View style={styles.metricItem}>
                    <Ionicons name="time-outline" size={16} color={colors.info} />
                    <Text style={styles.metricLabel}>{t('estimated_arrival') || 'ETA'}</Text>
                    <Text style={styles.metricValue}>
                      {liveEtaMinutes != null ? `~${liveEtaMinutes} mins` : '--'}
                    </Text>
                  </View>

                  <View style={styles.metricDivider} />

                  <View style={styles.metricItem}>
                    <Ionicons name="sync-outline" size={16} color={colors.textMuted} />
                    <Text style={styles.metricLabel}>{t('last_updated') || 'Updated'}</Text>
                    <Text style={styles.metricValue}>
                      {workerCoords.updatedAt ? formatTimeAgo(workerCoords.updatedAt) : 'Just now'}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.unavailableBox}>
                <Ionicons name="location-outline" size={32} color={colors.textMuted} />
                <Text style={styles.unavailableTitle}>{t('worker_location_unavailable') || 'Live Tracking Initializing'}</Text>
                <Text style={styles.unavailableSub}>
                  {t('worker_location_unavailable_desc') || 'Worker location signal is connecting. Please refresh in a moment.'}
                </Text>
                <TouchableOpacity onPress={handleRefreshLocation} style={styles.refreshBtn}>
                  <Ionicons name="refresh" size={14} color={colors.primary} />
                  <Text style={styles.refreshBtnText}>{t('refresh_location') || 'Refresh Location'}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Tracking Termination for Completed/Cancelled Bookings */}
        {isCompletedOrCancelled && (
          <View style={styles.completedNoticeBox}>
            <Ionicons
              name={booking.status === 'completed' ? 'checkmark-circle' : 'close-circle'}
              size={20}
              color={booking.status === 'completed' ? colors.success : colors.danger}
            />
            <View style={{ marginLeft: 8, flex: 1 }}>
              <Text style={styles.completedNoticeTitle}>
                {booking.status === 'completed' ? (t('job_completed') || 'Job Completed') : (t('job_cancelled') || 'Job Cancelled')}
              </Text>
              <Text style={styles.completedNoticeSub}>
                {t('location_sharing_ended') || 'Live tracking session has ended.'}
              </Text>
            </View>
          </View>
        )}

        {/* =========================
            WORKER DETAILS
        ========================== */}
        <View style={styles.workerCard}>
          <Text style={styles.cardTitle}>
            {t('assigned_worker') || 'Assigned Cooperative Worker'}
          </Text>

          <View style={styles.workerRow}>
            <Avatar
              name={booking.workerName}
              size={50}
              showVerifiedBadge
            />

            <View style={styles.workerInfo}>
              <Text style={styles.workerName}>
                {booking.workerName}
              </Text>

              <Text style={styles.workerSkill}>
                {booking.workerSkill}
              </Text>

              <Text style={styles.coopName}>
                {booking.cooperativeName}
              </Text>
            </View>
          </View>

          {!isCancelled && (
            <View style={styles.contactRow}>
              {phoneInfo.isValid ? (
                <TouchableOpacity
                  onPress={handleCallWorker}
                  style={styles.callBtn}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel={`Call ${booking.workerName} at ${phoneInfo.display}`}
                >
                  <Ionicons name="call" size={15} color={colors.primary} />
                  <Text style={styles.callBtnText}>
                    {t('call_worker_phone', { phone: phoneInfo.display }) || `Call ${phoneInfo.display}`}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.callBtnDisabled}>
                  <Ionicons name="call-outline" size={15} color={colors.textMuted} />
                  <Text style={styles.callBtnTextDisabled}>
                    {t('worker_phone_unavailable') || 'Phone Unavailable'}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Service Address & Notes */}
        <View style={styles.detailsBox}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
            <Text style={styles.cardTitle}>{t('service_address_notes') || 'Service Address & Notes'}</Text>
            <View style={[
              styles.locationModeBadge,
              booking.serviceLocation.locationMode === 'MANUAL' ? styles.locationModeBadgeManual : styles.locationModeBadgeGps
            ]}>
              <Ionicons
                name={booking.serviceLocation.locationMode === 'MANUAL' ? 'create-outline' : 'navigate'}
                size={11}
                color={booking.serviceLocation.locationMode === 'MANUAL' ? colors.primary : colors.info}
                style={{ marginRight: 3 }}
              />
              <Text style={[
                styles.locationModeBadgeText,
                booking.serviceLocation.locationMode === 'MANUAL' ? styles.locationModeBadgeTextManual : styles.locationModeBadgeTextGps
              ]}>
                {booking.serviceLocation.locationMode === 'MANUAL' ? 'MANUAL ENTRY' : 'GPS LOCATION'}
              </Text>
            </View>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={16} color={colors.primary} />
            <Text style={styles.metaText}>{booking.serviceLocation.addressLine}</Text>
          </View>
          {booking.instructions && (
            <View style={[styles.metaRow, { marginTop: spacing.sm }]}>
              <Ionicons name="document-text-outline" size={16} color={colors.accent} />
              <Text style={styles.metaText}>"{booking.instructions}"</Text>
            </View>
          )}
        </View>

        {/* =========================
            PAYMENT & ACTIONS
        ========================== */}
        <View style={styles.pricingCard}>
          <Text style={styles.cardTitle}>{t('confirm_booking') || 'Payment Details'}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t('estimated_fair_wage') || 'Estimated Fair Fare'}</Text>
            <Text style={styles.priceVal}>₹{booking.estimatedAmount}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t('payment_method_label') || 'Payment Mode'}</Text>
            <Text style={styles.priceVal}>{booking.paymentMethod?.toUpperCase() || 'UPI'}</Text>
          </View>

          <View style={styles.actionBtnsRow}>
            <Button
              title={t('view_invoice') || 'View Invoice'}
              icon="receipt-outline"
              onPress={() => onNavigateToInvoice(booking.id)}
              variant="outline"
              size="sm"
              style={{ flex: 1, marginRight: 8 }}
            />
            {booking.status === 'completed' && (
              <Button
                title={booking.hasRated ? 'Rated ★' : (t('rate_service') || 'Rate Worker')}
                icon="star"
                onPress={() => onNavigateToRate(booking.id)}
                variant={booking.hasRated ? 'outline' : 'secondary'}
                disabled={Boolean(booking.hasRated)}
                size="sm"
                style={{ flex: 1 }}
              />
            )}
            {canCancel && (
              <Button
                title={t('cancel') || 'Cancel Booking'}
                icon="close-circle-outline"
                onPress={handleCancelBooking}
                variant="danger"
                size="sm"
                style={{ flex: 1, marginLeft: 8 }}
              />
            )}
          </View>

          {onNavigateToHelp && (
            <TouchableOpacity
              onPress={() => onNavigateToHelp(booking.id)}
              style={styles.needHelpBtn}
              activeOpacity={0.8}
            >
              <Ionicons name="help-circle-outline" size={16} color={colors.primary} />
              <Text style={styles.needHelpText}>{t('need_help_with_booking') || 'Need Help with this Booking?'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  notFoundText: {
    fontSize: 14,
    color: colors.textSecondary,
  },

  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },

  topCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },

  topInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },

  codeText: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 2,
  },

  serviceTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },

  scheduleText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },

  cancelledCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  cancelledIcon: {
    marginRight: spacing.sm,
  },
  cancelledContent: {
    flex: 1,
  },
  cancelledTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.danger,
  },
  cancelledText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },

  timelineCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },

  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },

  otpCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: '#86EFAC',
  },
  otpHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  otpIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#065F46',
  },
  otpCardSub: {
    fontSize: 12,
    color: '#047857',
    marginTop: 2,
    lineHeight: 16,
  },
  otpDisplayContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.xs,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  otpDigits: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: 10,
    color: '#047857',
  },
  otpFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  otpFooterText: {
    fontSize: 11,
    color: '#065F46',
    marginLeft: 6,
    flex: 1,
  },
  otpCompletedBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  otpCompletedText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#065F46',
    marginLeft: 8,
    flex: 1,
  },

  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },

  stepCol: {
    alignItems: 'center',
    flex: 1,
  },

  stepIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },

  stepIconBoxPast: {
    backgroundColor: colors.primary,
  },

  stepIconBoxCurrent: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.primaryLight,
  },

  stepLabel: {
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
  },

  stepLabelPast: {
    color: colors.primary,
  },

  stepLabelCurrent: {
    color: colors.primary,
    fontWeight: '700',
  },

  mapSection: {
    marginBottom: spacing.md,
  },

  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xs,
  },

  workerCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },

  workerInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },

  workerName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },

  workerSkill: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 1,
  },

  coopName: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },

  contactRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },

  callBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(13, 122, 95, 0.25)',
  },

  callBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 6,
  },

  callBtnDisabled: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  callBtnTextDisabled: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.textMuted,
    marginLeft: 6,
  },

  detailsBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },

  metaText: {
    fontSize: 12,
    color: colors.text,
    marginLeft: spacing.xs,
    flex: 1,
  },

  pricingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
  },

  priceLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },

  priceVal: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },

  actionBtnsRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
  },

  actionButton: {
    flex: 1,
  },

  locationModeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
  },
  locationModeBadgeGps: {
    backgroundColor: 'rgba(37, 99, 235, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.3)',
  },
  locationModeBadgeManual: {
    backgroundColor: 'rgba(13, 122, 95, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(13, 122, 95, 0.3)',
  },
  locationModeBadgeText: {
    fontSize: 9,
    fontWeight: '800',
  },
  locationModeBadgeTextGps: {
    color: colors.info,
  },
  locationModeBadgeTextManual: {
    color: colors.primary,
  },

  priorityBadgeSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    marginTop: 4,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  priorityBadgeTextSmall: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.danger,
    marginLeft: 3,
  },
  trackingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  pulseRedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
    marginRight: 6,
  },
  trackingMetricsCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
  },
  metricValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginTop: 1,
  },
  metricDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.divider,
  },
  unavailableBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  unavailableTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  unavailableSub: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: spacing.md,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primaryLight,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: 'rgba(13, 122, 95, 0.2)',
  },
  refreshBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 6,
  },
  completedNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  completedNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  completedNoticeSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  needHelpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  needHelpText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
});
