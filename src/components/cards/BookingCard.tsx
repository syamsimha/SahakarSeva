import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Booking } from '../../types';
import { colors, borderRadius, spacing, typography } from '../../theme';
import { Badge, Button } from '../ui';
import { Ionicons } from '@expo/vector-icons';
import { formatCompletedDate } from '../../utils/dateTime';
import { useLanguage } from '../../context/LanguageContext';

interface BookingCardProps {
  booking: Booking;
  onPress: () => void;
  onViewInvoice?: () => void;
  onRate?: () => void;
  onTrack?: () => void;
}

export const BookingCard: React.FC<BookingCardProps> = ({
  booking,
  onPress,
  onViewInvoice,
  onRate,
  onTrack,
}) => {
  const { t } = useLanguage();
  const isEmergency = booking.isEmergency;
  const isCompleted = booking.status === 'completed';
  const isActive =
    booking.status === 'accepted' ||
    booking.status === 'on_the_way' ||
    booking.status === 'in_progress';

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[styles.container, isEmergency && styles.emergencyBorder]}
    >
      {/* Header with Code & Status */}
      <View style={styles.headerRow}>
        <View style={styles.codeRow}>
          {isEmergency && (
            <Ionicons name="flash" size={14} color={colors.danger} style={{ marginRight: 4 }} />
          )}
          <Text style={styles.bookingCode}>{booking.bookingCode}</Text>
          {booking.isPriority && (
            <View style={styles.priorityPill}>
              <Text style={styles.priorityPillText}>PRIORITY 24/7</Text>
            </View>
          )}
        </View>
        <Badge status={booking.status} />
      </View>

      {/* Service Title & Cooperative Details */}
      <Text style={styles.serviceTitle}>{booking.serviceTitle}</Text>
      
      <View style={styles.workerRow}>
        <Ionicons name="person-circle-outline" size={16} color={colors.primary} />
        <Text style={styles.workerName}>{booking.workerName}</Text>
        <Text style={styles.coopDot}>•</Text>
        <Text style={styles.workerSkill}>{booking.workerSkill}</Text>
      </View>

      <Text style={styles.coopName} numberOfLines={1}>
        <Ionicons name="shield-checkmark" size={12} color={colors.textSecondary} /> {booking.cooperativeName}
      </Text>

      {/* Schedule & Location */}
      <View style={styles.metaBox}>
        <View style={styles.metaRow}>
          <Ionicons
            name={isCompleted ? "checkmark-circle-outline" : "calendar-outline"}
            size={13}
            color={isCompleted ? colors.success : colors.textSecondary}
          />
          <Text style={[styles.metaText, isCompleted && { color: colors.text, fontWeight: '600' }]}>
            {isCompleted
              ? t('completed_on', {
                  date: formatCompletedDate(
                    booking.completedAt ||
                      booking.statusHistory?.find((s) => s.status === 'completed')?.timestamp
                  ),
                })
              : `${booking.scheduledDate} (${booking.scheduledTimeSlot})`}
          </Text>
        </View>
        <View style={[styles.metaRow, { marginTop: 4 }]}>
          <Ionicons name="location-outline" size={13} color={colors.textSecondary} />
          <Text style={styles.metaText} numberOfLines={1}>{booking.serviceLocation.addressLine}</Text>
        </View>
      </View>

      {/* Footer / Price & Dynamic Actions */}
      <View style={styles.footerRow}>
        <View style={styles.priceCol}>
          <Text style={styles.priceLabel}>{t('estimated_fair_wage')}</Text>
          <Text style={styles.priceAmount}>₹{booking.estimatedAmount}</Text>
        </View>

        <View style={styles.actionsRow}>
          {isActive && onTrack && (
            <Button
              title={t('track')}
              icon="navigate"
              onPress={onTrack}
              variant="primary"
              size="sm"
              style={{ marginRight: 6 }}
            />
          )}

          {isCompleted && !booking.hasRated && onRate && (
            <Button
              title={t('rate_service')}
              icon="star"
              onPress={onRate}
              variant="secondary"
              size="sm"
              style={{ marginRight: 6 }}
            />
          )}

          {isCompleted && onViewInvoice && (
            <Button
              title={t('view_invoice')}
              icon="receipt-outline"
              onPress={onViewInvoice}
              variant="outline"
              size="sm"
              style={{ marginRight: 6 }}
            />
          )}

          <Button
            title={t('details')}
            onPress={onPress}
            variant="outline"
            size="sm"
          />
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  emergencyBorder: {
    borderColor: colors.danger,
    borderLeftWidth: 4,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  codeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bookingCode: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  serviceTitle: {
    ...typography.h4,
    color: colors.text,
    marginTop: 2,
  },
  workerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
  },
  workerName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 4,
  },
  coopDot: {
    marginHorizontal: 6,
    color: colors.textMuted,
  },
  workerSkill: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '500',
  },
  coopName: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 3,
  },
  metaBox: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    marginTop: spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 6,
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  priceCol: {
    flexDirection: 'column',
  },
  priceLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  priceAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  priorityPill: {
    backgroundColor: colors.dangerLight,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.xs,
    marginLeft: 6,
    borderWidth: 1,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  priorityPillText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.danger,
  },
});
