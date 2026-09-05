import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { Avatar, Badge, Button, MapPlaceholder } from '../../components/ui';
import { useBookings } from '../../context/BookingContext';
import { BookingStatus } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface BookingDetailsScreenProps {
  bookingId: string;
  onNavigateToInvoice: (bookingId: string) => void;
  onNavigateToRate: (bookingId: string) => void;
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
      icon: 'checkmark-done-circle-outline',
    },
  ];

export const BookingDetailsScreen: React.FC<BookingDetailsScreenProps> = ({
  bookingId,
  onNavigateToInvoice,
  onNavigateToRate,
  onBack,
}) => {
  const {
    bookings,
    updateStatus,
    cancelBooking,
  } = useBookings();

  const booking = bookings.find((b) => b.id === bookingId);

  if (!booking) {
    return (
      <View style={styles.container}>
        <Header
          title="Booking Details"
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
   * Demo status progression.
   */
  const handleSimulateNextStatus = async () => {
    if (booking.status === 'cancelled') {
      return;
    }

    if (
      currentStepIdx >= 0 &&
      currentStepIdx < statusSteps.length - 1
    ) {
      const nextStatus =
        statusSteps[currentStepIdx + 1].key;

      await updateStatus(
        booking.id,
        nextStatus,
        `Simulated status update: ${nextStatus}`
      );
    }
  };

  /*
   * Actually cancel the booking.
   *
   * IMPORTANT:
   * On localhost/web we use window.confirm/window.alert
   * because React Native Alert can behave differently
   * inside the Expo web preview.
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
      console.log(
        'Attempting to cancel booking:',
        booking.id
      );

      const updated = await cancelBooking(
        booking.id,
        'Booking cancelled by customer'
      );

      if (updated) {
        console.log(
          'Booking cancelled successfully:',
          updated
        );

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
        console.error(
          'Cancellation failed: service returned null'
        );

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
   *
   * WEB:
   * Uses browser confirm().
   *
   * MOBILE:
   * Uses React Native Alert.
   */
  const handleCancelBooking = () => {
    console.log(
      'CANCEL BUTTON PRESSED:',
      booking.id,
      booking.status
    );

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
        console.log(
          'Customer chose to keep the booking.'
        );
        return;
      }

      // User confirmed cancellation
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
   * Call worker.
   */
  const handleCallWorker = async () => {
    const phone = booking.workerPhone?.trim();

    if (!phone) {
      if (typeof window !== 'undefined') {
        window.alert(
          'Worker phone number is not available.'
        );
      } else {
        Alert.alert(
          'Phone Number Unavailable',
          'Worker phone number is not available.'
        );
      }

      return;
    }

    const phoneUrl = `tel:${phone}`;

    try {
      const supported =
        await Linking.canOpenURL(phoneUrl);

      if (supported) {
        await Linking.openURL(phoneUrl);
      } else {
        if (typeof window !== 'undefined') {
          window.alert(
            `Please call ${phone} manually.`
          );
        } else {
          Alert.alert(
            'Unable to Call',
            `Please call ${phone} manually.`
          );
        }
      }
    } catch (error) {
      console.error(
        'Call worker error:',
        error
      );

      if (typeof window !== 'undefined') {
        window.alert(
          `Please call ${phone} manually.`
        );
      } else {
        Alert.alert(
          'Unable to Call',
          `Please call ${phone} manually.`
        );
      }
    }
  };

  /*
   * Cancellation is available only for:
   * requested
   * accepted
   */
  const canCancel =
    booking.status === 'requested' ||
    booking.status === 'accepted';

  const isCompleted =
    booking.status === 'completed';

  const isCancelled =
    booking.status === 'cancelled';

  return (
    <View style={styles.container}>
      <Header
        title="Booking Status"
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

            <Badge status={booking.status} />
          </View>

          <Text style={styles.dateText}>
            {booking.scheduledDate} •{' '}
            {booking.scheduledTimeSlot}
          </Text>
        </View>

        {/* =========================
            STATUS TIMELINE
        ========================== */}

        {!isCancelled && (
          <View style={styles.timelineCard}>
            <View style={styles.timelineHeader}>
              <Text style={styles.cardTitle}>
                Live Status Progression
              </Text>

              {currentStepIdx >= 0 &&
                currentStepIdx <
                statusSteps.length - 1 && (
                  <TouchableOpacity
                    onPress={
                      handleSimulateNextStatus
                    }
                    style={styles.simBtn}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="play-forward"
                      size={12}
                      color={colors.primary}
                    />

                    <Text
                      style={styles.simBtnText}
                    >
                      Advance Status (Demo)
                    </Text>
                  </TouchableOpacity>
                )}
            </View>

            <View style={styles.stepsRow}>
              {statusSteps.map(
                (step, idx) => {
                  const isPast =
                    idx <= currentStepIdx;

                  const isCurrent =
                    idx === currentStepIdx;

                  return (
                    <View
                      key={step.key}
                      style={styles.stepCol}
                    >
                      <View
                        style={[
                          styles.stepIconBox,
                          isPast &&
                          styles.stepIconBoxPast,
                          isCurrent &&
                          styles.stepIconBoxCurrent,
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
                          isPast &&
                          styles.stepLabelPast,
                          isCurrent &&
                          styles.stepLabelCurrent,
                        ]}
                      >
                        {step.label}
                      </Text>
                    </View>
                  );
                }
              )}
            </View>
          </View>
        )}

        {/* =========================
            CANCELLED MESSAGE
        ========================== */}

        {isCancelled && (
          <View style={styles.cancelledCard}>
            <View style={styles.cancelledIcon}>
              <Ionicons
                name="close-circle"
                size={28}
                color={colors.danger}
              />
            </View>

            <View style={styles.cancelledContent}>
              <Text style={styles.cancelledTitle}>
                Booking Cancelled
              </Text>

              <Text style={styles.cancelledText}>
                This booking has been cancelled
                and no further action is required.
              </Text>
            </View>
          </View>
        )}

        {/* =========================
            WORKER LOCATION
        ========================== */}

        {!isCancelled &&
          (
            booking.status === 'on_the_way' ||
            booking.status === 'in_progress'
          ) && (
            <View style={styles.mapSection}>
              <Text style={styles.sectionTitle}>
                Worker Approaching
              </Text>

              <MapPlaceholder
                height={180}
                locationName={
                  booking.serviceLocation
                    .addressLine
                }
              />
            </View>
          )}

        {/* =========================
            WORKER DETAILS
        ========================== */}

        <View style={styles.workerCard}>
          <Text style={styles.cardTitle}>
            Assigned Cooperative Worker
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
              <TouchableOpacity
                onPress={handleCallWorker}
                style={styles.callBtn}
                activeOpacity={0.8}
              >
                <Ionicons
                  name="call"
                  size={15}
                  color={colors.primary}
                />

                <Text style={styles.callBtnText}>
                  Call {booking.workerPhone}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* =========================
            SERVICE ADDRESS
        ========================== */}

        <View style={styles.detailsBox}>
          <Text style={styles.cardTitle}>
            Service Address & Notes
          </Text>

          <View style={styles.metaRow}>
            <Ionicons
              name="location-outline"
              size={16}
              color={colors.primary}
            />

            <Text style={styles.metaText}>
              {booking.serviceLocation.addressLine}
            </Text>
          </View>

          {booking.instructions && (
            <View
              style={[
                styles.metaRow,
                {
                  marginTop: spacing.sm,
                },
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={16}
                color={colors.accent}
              />

              <Text style={styles.metaText}>
                "{booking.instructions}"
              </Text>
            </View>
          )}
        </View>

        {/* =========================
            PAYMENT DETAILS
        ========================== */}

        <View style={styles.pricingCard}>
          <Text style={styles.cardTitle}>
            Payment Details
          </Text>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              Estimated Fair Fare
            </Text>

            <Text style={styles.priceVal}>
              ₹{booking.estimatedAmount}
            </Text>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>
              Payment Mode
            </Text>

            <Text style={styles.priceVal}>
              {booking.paymentMethod?.toUpperCase() ||
                'UPI'}
            </Text>
          </View>

          {/* =========================
              ACTION BUTTONS

              ONLY ONE CANCEL BUTTON
          ========================== */}

          <View style={styles.actionBtnsRow}>
            <Button
              title="View Invoice"
              icon="receipt-outline"
              onPress={() => onNavigateToInvoice(booking.id)}
              variant="outline"
              size="sm"
              style={{ flex: 1, marginRight: 8 }}
            />
            {booking.status === 'completed' && (
              <Button
                title={booking.hasRated ? 'Rated ★' : 'Rate Worker'}
                icon="star"
                onPress={() => onNavigateToRate(booking.id)}
                variant={booking.hasRated ? 'outline' : 'secondary'}
                disabled={Boolean(booking.hasRated)}
                size="sm"
                style={{ flex: 1 }}
              />
            )}
          </View>
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
    paddingRight: spacing.sm,
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
    transform: [
      {
        scale: 1.15,
      },
    ],
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

  cancelledCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.danger,
    flexDirection: 'row',
    alignItems: 'center',
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
    marginTop: 3,
    lineHeight: 18,
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
    paddingVertical: 8,
    borderRadius: borderRadius.md,
  },

  callBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
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
    gap: spacing.sm,
  },

  actionButton: {
    flex: 1,
  },
});