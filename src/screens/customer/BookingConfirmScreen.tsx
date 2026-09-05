import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Button, Badge } from '../../components/ui';
import { Booking } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface BookingConfirmScreenProps {
  booking: Booking;
  onViewMyBookings: () => void;
  onGoHome: () => void;
}

export const BookingConfirmScreen: React.FC<BookingConfirmScreenProps> = ({
  booking,
  onViewMyBookings,
  onGoHome,
}) => {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Success Circle */}
        <View style={styles.successBox}>
          <View style={styles.circle}>
            <Ionicons name="checkmark-done" size={48} color={colors.textInverse} />
          </View>
          <Text style={styles.confirmedTitle}>Booking Confirmed!</Text>
          <Text style={styles.confirmedSubtitle}>
            Your request has been dispatched to {booking.cooperativeName}
          </Text>
          <View style={styles.codePill}>
            <Text style={styles.codeText}>Booking ID: {booking.bookingCode}</Text>
          </View>
        </View>

        {/* Booking Details Card */}
        <View style={styles.detailsCard}>
          <Text style={styles.cardHeader}>Booking Summary</Text>

          <View style={styles.itemRow}>
            <Text style={styles.itemLabel}>Service</Text>
            <Text style={styles.itemValue}>{booking.serviceTitle}</Text>
          </View>

          <View style={styles.itemRow}>
            <Text style={styles.itemLabel}>Assigned Worker</Text>
            <Text style={styles.itemValue}>
              {booking.workerName
                ? `${booking.workerName} (${booking.workerSkill || 'Cooperative Worker'})`
                : 'Awaiting Cooperative Dispatch'}
            </Text>
          </View>

          <View style={styles.itemRow}>
            <Text style={styles.itemLabel}>Cooperative Society</Text>
            <Text style={styles.itemValue}>{booking.cooperativeName}</Text>
          </View>

          <View style={styles.itemRow}>
            <Text style={styles.itemLabel}>Schedule</Text>
            <Text style={styles.itemValue}>
              {booking.scheduledDate} • {booking.scheduledTimeSlot}
            </Text>
          </View>

          <View style={styles.itemRow}>
            <Text style={styles.itemLabel}>Service Address</Text>
            <Text style={styles.itemValue} numberOfLines={2}>
              {booking.serviceLocation.addressLine}
            </Text>
          </View>

          <View style={styles.itemRow}>
            <Text style={styles.itemLabel}>Estimated Fair Fare</Text>
            <Text style={[styles.itemValue, { color: colors.primary, fontWeight: '700' }]}>
              ₹{booking.estimatedAmount}
            </Text>
          </View>

          <View style={[styles.itemRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.itemLabel}>Current Status</Text>
            <Badge status={booking.status} />
          </View>
        </View>

        {/* Cooperative Transparency Notice */}
        <View style={styles.trustBanner}>
          <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
          <Text style={styles.trustBannerText}>
            5% of this service directly funds worker accidental coverage & health welfare benefits.
          </Text>
        </View>

        {/* Navigation Buttons */}
        <View style={styles.buttonsCol}>
          <Button
            title="View in My Bookings"
            icon="receipt"
            onPress={onViewMyBookings}
            variant="primary"
            size="lg"
            fullWidth
          />

          <Button
            title="Return to Home"
            onPress={onGoHome}
            variant="outline"
            size="md"
            fullWidth
            style={{ marginTop: spacing.sm }}
          />
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
  scrollContent: {
    padding: spacing.xl,
    paddingTop: spacing.xxl,
    alignItems: 'center',
  },
  successBox: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  circle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  confirmedTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
  },
  confirmedSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    maxWidth: 290,
  },
  codePill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.round,
    marginTop: spacing.md,
  },
  codeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  detailsCard: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: spacing.lg,
  },
  cardHeader: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  itemLabel: {
    fontSize: 12,
    color: colors.textMuted,
  },
  itemValue: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    maxWidth: 190,
    textAlign: 'right',
  },
  trustBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.xl,
    width: '100%',
  },
  trustBannerText: {
    fontSize: 11,
    color: colors.primaryDark,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
    fontWeight: '500',
  },
  buttonsCol: {
    width: '100%',
  },
});
