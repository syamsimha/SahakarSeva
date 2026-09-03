import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Booking } from '../../types';
import { colors, borderRadius, spacing, typography } from '../../theme';
import { Button } from '../ui';
import { Ionicons } from '@expo/vector-icons';

interface JobRequestCardProps {
  booking: Booking;
  onAccept: () => void;
  onReject: () => void;
  onViewDetails?: () => void;
}

export const JobRequestCard: React.FC<JobRequestCardProps> = ({
  booking,
  onAccept,
  onReject,
  onViewDetails,
}) => {
  return (
    <View style={styles.container}>
      {/* Top Banner */}
      <View style={styles.topRow}>
        <View style={styles.newBadge}>
          <View style={styles.pulseDot} />
          <Text style={styles.newBadgeText}>New Request</Text>
        </View>
        <Text style={styles.timestamp}>Expires in 15m</Text>
      </View>

      {/* Service & Customer */}
      <Text style={styles.serviceTitle}>{booking.serviceTitle}</Text>
      
      <View style={styles.customerRow}>
        <Ionicons name="person-outline" size={15} color={colors.primary} />
        <Text style={styles.customerName}>{booking.customerName}</Text>
        <Text style={styles.phoneText}>({booking.customerPhone})</Text>
      </View>

      {/* Details Box */}
      <View style={styles.detailsBox}>
        <View style={styles.detailItem}>
          <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.detailText} numberOfLines={2}>
            {booking.serviceLocation.addressLine}
          </Text>
        </View>

        <View style={[styles.detailItem, { marginTop: 6 }]}>
          <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
          <Text style={styles.detailText}>
            {booking.scheduledDate} • {booking.scheduledTimeSlot}
          </Text>
        </View>

        {booking.instructions && (
          <View style={[styles.detailItem, { marginTop: 6 }]}>
            <Ionicons name="information-circle-outline" size={14} color={colors.accent} />
            <Text style={[styles.detailText, { fontStyle: 'italic' }]}>
              "{booking.instructions}"
            </Text>
          </View>
        )}
      </View>

      {/* Payment & Actions */}
      <View style={styles.footerRow}>
        <View style={styles.paymentCol}>
          <Text style={styles.payLabel}>Estimated Payment</Text>
          <Text style={styles.payAmount}>₹{booking.estimatedAmount}</Text>
        </View>

        <View style={styles.actionsRow}>
          <Button
            title="Decline"
            onPress={onReject}
            variant="outline"
            size="sm"
            style={styles.declineBtn}
            textStyle={{ color: colors.danger }}
          />
          <Button
            title="Accept Job"
            icon="checkmark-circle"
            onPress={onAccept}
            variant="primary"
            size="sm"
            style={styles.acceptBtn}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.accentLight,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  newBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.round,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    marginRight: 5,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.accentDark,
    textTransform: 'uppercase',
  },
  timestamp: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  serviceTitle: {
    ...typography.h4,
    color: colors.text,
    marginTop: 4,
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  customerName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 4,
  },
  phoneText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 4,
  },
  detailsBox: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  paymentCol: {
    flexDirection: 'column',
  },
  payLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  payAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primary,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  declineBtn: {
    borderColor: colors.danger,
    marginRight: 8,
  },
  acceptBtn: {
    backgroundColor: colors.primary,
  },
});
