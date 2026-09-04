import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { Avatar, Badge, Button, MapPlaceholder } from '../../components/ui';
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

const statusSteps: Array<{ key: BookingStatus; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'requested', label: 'Requested', icon: 'paper-plane-outline' },
  { key: 'accepted', label: 'Accepted', icon: 'checkmark-circle-outline' },
  { key: 'on_the_way', label: 'On The Way', icon: 'bicycle-outline' },
  { key: 'in_progress', label: 'In Progress', icon: 'construct-outline' },
  { key: 'completed', label: 'Completed', icon: 'checkmark-done-circle-outline' },
];

export const BookingDetailsScreen: React.FC<BookingDetailsScreenProps> = ({
  bookingId,
  onNavigateToInvoice,
  onNavigateToRate,
  onNavigateToHelp,
  onBack,
}) => {
  const { t } = useLanguage();
  const { bookings, updateStatus, updateWorkerLocation } = useBookings();
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
        <Header title="Booking Details" showBack onBack={onBack} />
        <View style={styles.center}>
          <Text style={styles.notFoundText}>Booking not found</Text>
        </View>
      </View>
    );
  }

  const getStepIndex = (status: BookingStatus) => {
    return statusSteps.findIndex((s) => s.key === status);
  };

  const currentStepIdx = getStepIndex(booking.status);

  // Demo status progression for evaluator
  const handleSimulateNextStatus = () => {
    if (currentStepIdx < statusSteps.length - 1) {
      const nextStatus = statusSteps[currentStepIdx + 1].key;
      updateStatus(booking.id, nextStatus, `Simulated status update: ${nextStatus}`);
    }
  };

  return (
    <View style={styles.container}>
      <Header title={t('booking_details_title')} showBack onBack={onBack} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Header Card */}
        <View style={styles.topCard}>
          <View style={styles.topRow}>
            <View>
              <Text style={styles.codeText}>{booking.bookingCode}</Text>
              <Text style={styles.serviceTitle}>{booking.serviceTitle}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Badge status={booking.status} />
              {booking.isPriority && (
                <View style={styles.priorityBadgeSmall}>
                  <Ionicons name="flash" size={10} color={colors.danger} />
                  <Text style={styles.priorityBadgeTextSmall}>{t('priority_badge')}</Text>
                </View>
              )}
            </View>
          </View>
          <Text style={styles.dateText}>
            {booking.status === 'completed'
              ? t('completed_on', {
                  date: formatCompletedDate(
                    booking.completedAt ||
                      booking.statusHistory?.find((s) => s.status === 'completed')?.timestamp
                  ),
                })
              : `${booking.scheduledDate} • ${booking.scheduledTimeSlot}`}
          </Text>
        </View>

        {/* Interactive Status Progression Timeline */}
        <View style={styles.timelineCard}>
          <View style={styles.timelineHeader}>
            <Text style={styles.cardTitle}>{t('live_status_progression')}</Text>
            {currentStepIdx < statusSteps.length - 1 && (
              <TouchableOpacity onPress={handleSimulateNextStatus} style={styles.simBtn}>
                <Ionicons name="play-forward" size={12} color={colors.primary} />
                <Text style={styles.simBtnText}>{t('advance_status_demo')}</Text>
              </TouchableOpacity>
            )}
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
                      color={isPast ? colors.textInverse : colors.textMuted}
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

        {/* Real Live Worker Tracking Section */}
        {isTrackingActive && (
          <View style={styles.mapSection}>
            <View style={styles.trackingHeaderRow}>
              <View style={styles.pulseRedDot} />
              <Text style={styles.sectionTitle}>
                {booking.status === 'on_the_way'
                  ? t('live_dispatch_worker_approaching')
                  : t('live_service_in_progress')}
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
                    <Text style={styles.metricLabel}>{t('real_distance')}</Text>
                    <Text style={styles.metricValue}>
                      {liveDistance != null ? `${liveDistance} km` : '--'}
                    </Text>
                  </View>

                  <View style={styles.metricDivider} />

                  <View style={styles.metricItem}>
                    <Ionicons name="time-outline" size={16} color={colors.info} />
                    <Text style={styles.metricLabel}>{t('estimated_arrival')}</Text>
                    <Text style={styles.metricValue}>
                      {liveEtaMinutes != null ? `~${liveEtaMinutes} mins` : '--'}
                    </Text>
                  </View>

                  <View style={styles.metricDivider} />

                  <View style={styles.metricItem}>
                    <Ionicons name="sync-outline" size={16} color={colors.textMuted} />
                    <Text style={styles.metricLabel}>{t('last_updated')}</Text>
                    <Text style={styles.metricValue}>
                      {workerCoords.updatedAt ? formatTimeAgo(workerCoords.updatedAt) : 'Just now'}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.unavailableBox}>
                <Ionicons name="location-outline" size={32} color={colors.textMuted} />
                <Text style={styles.unavailableTitle}>{t('worker_location_unavailable')}</Text>
                <Text style={styles.unavailableSub}>
                  {t('worker_location_unavailable_desc')}
                </Text>
                <TouchableOpacity onPress={handleRefreshLocation} style={styles.refreshBtn}>
                  <Ionicons name="refresh" size={14} color={colors.primary} />
                  <Text style={styles.refreshBtnText}>{t('refresh_location')}</Text>
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
                {booking.status === 'completed' ? t('job_completed') : t('job_cancelled')}
              </Text>
              <Text style={styles.completedNoticeSub}>
                {t('location_sharing_ended')}
              </Text>
            </View>
          </View>
        )}

        {/* Assigned Worker Details Card */}
        <View style={styles.workerCard}>
          <Text style={styles.cardTitle}>{t('assigned_worker')}</Text>
          <View style={styles.workerRow}>
            <Avatar name={booking.workerName} size={50} showVerifiedBadge />
            <View style={styles.workerInfo}>
              <Text style={styles.workerName}>{booking.workerName}</Text>
              <Text style={styles.workerSkill}>{booking.workerSkill}</Text>
              <Text style={styles.coopName}>{booking.cooperativeName}</Text>
            </View>
          </View>

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
                  {t('call_worker_phone', { phone: phoneInfo.display })}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.callBtnDisabled}>
                <Ionicons name="call-outline" size={15} color={colors.textMuted} />
                <Text style={styles.callBtnTextDisabled}>
                  {t('worker_phone_unavailable')}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Service Address & Notes */}
        <View style={styles.detailsBox}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs }}>
            <Text style={styles.cardTitle}>{t('service_address_notes')}</Text>
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

        {/* Pricing & Invoice */}
        <View style={styles.pricingCard}>
          <Text style={styles.cardTitle}>{t('confirm_booking')}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>{t('estimated_fair_wage')}</Text>
            <Text style={styles.priceVal}>₹{booking.estimatedAmount}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Payment Mode</Text>
            <Text style={styles.priceVal}>{booking.paymentMethod?.toUpperCase() || 'UPI'}</Text>
          </View>

          <View style={styles.actionBtnsRow}>
            <Button
              title={t('view_invoice')}
              icon="receipt-outline"
              onPress={() => onNavigateToInvoice(booking.id)}
              variant="outline"
              size="sm"
              style={{ flex: 1, marginRight: 8 }}
            />
            {booking.status === 'completed' && (
              <Button
                title={t('rate_service')}
                icon="star"
                onPress={() => onNavigateToRate(booking.id)}
                variant="secondary"
                size="sm"
                style={{ flex: 1 }}
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
              <Text style={styles.needHelpText}>{t('need_help_with_booking')}</Text>
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
  codeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  serviceTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: 2,
  },
  dateText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: spacing.sm,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  simBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
  },
  simBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 4,
  },
  stepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepCol: {
    alignItems: 'center',
    flex: 1,
  },
  stepIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepIconBoxPast: {
    backgroundColor: colors.primary,
  },
  stepIconBoxCurrent: {
    backgroundColor: colors.accent,
    transform: [{ scale: 1.15 }],
  },
  stepLabel: {
    fontSize: 9,
    color: colors.textMuted,
    textAlign: 'center',
    fontWeight: '500',
  },
  stepLabelPast: {
    color: colors.text,
  },
  stepLabelCurrent: {
    color: colors.accentDark,
    fontWeight: '700',
  },
  mapSection: {
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: 13,
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
    fontWeight: '600',
  },
  coopName: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  contactRow: {
    marginTop: spacing.md,
  },
  callBtn: {
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
    marginLeft: 8,
  },
  callBtnDisabled: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
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
    marginLeft: 8,
  },
  detailsBox: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
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
  metaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing.sm,
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  pricingCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  priceLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  priceVal: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  actionBtnsRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
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
