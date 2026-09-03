import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { WorkerProfile } from '../../types';
import { colors, borderRadius, spacing, typography } from '../../theme';
import { Avatar, StarRating, Badge, Button } from '../ui';
import { Ionicons } from '@expo/vector-icons';

interface WorkerCardProps {
  worker: WorkerProfile;
  onPress: () => void;
  onBookNow?: () => void;
}

export const WorkerCard: React.FC<WorkerCardProps> = ({
  worker,
  onPress,
  onBookNow,
}) => {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.container}
    >
      <View style={styles.topRow}>
        <Avatar
          name={worker.name}
          url={worker.avatarUrl}
          size={54}
          showVerifiedBadge={worker.verificationStatus === 'verified'}
        />
        <View style={styles.infoCol}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {worker.name}
            </Text>
            {worker.isAvailable ? (
              <View style={styles.availableBadge}>
                <View style={styles.greenDot} />
                <Text style={styles.availableText}>Available</Text>
              </View>
            ) : (
              <View style={styles.busyBadge}>
                <Text style={styles.busyText}>Busy</Text>
              </View>
            )}
          </View>

          <Text style={styles.skill}>{worker.primarySkill}</Text>
          
          <Text style={styles.cooperative} numberOfLines={1}>
            <Ionicons name="shield-checkmark" size={11} color={colors.primary} /> {worker.cooperativeName}
          </Text>
        </View>
      </View>

      {/* Metrics Row */}
      <View style={styles.metricsRow}>
        <StarRating rating={worker.rating} count={worker.reviewCount} size={13} />
        <View style={styles.metricItem}>
          <Ionicons name="briefcase-outline" size={12} color={colors.textSecondary} />
          <Text style={styles.metricText}>{worker.experienceYears} yrs exp</Text>
        </View>
        {worker.distanceKm !== undefined && (
          <View style={styles.metricItem}>
            <Ionicons name="navigate-outline" size={12} color={colors.textSecondary} />
            <Text style={styles.metricText}>{worker.distanceKm} km</Text>
          </View>
        )}
      </View>

      {/* Footer / Pricing & Actions */}
      <View style={styles.footerRow}>
        <View style={styles.pricing}>
          <Text style={styles.rateLabel}>Fair Wage Rate</Text>
          <Text style={styles.rateValue}>₹{worker.hourlyRate}<Text style={styles.rateUnit}>/hr</Text></Text>
        </View>

        <View style={styles.actionButtons}>
          <Button
            title="View Profile"
            onPress={onPress}
            variant="outline"
            size="sm"
            style={{ marginRight: 6 }}
          />
          {onBookNow && (
            <Button
              title="Book"
              onPress={onBookNow}
              variant="primary"
              size="sm"
            />
          )}
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
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoCol: {
    flex: 1,
    marginLeft: spacing.md,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    ...typography.h4,
    color: colors.text,
    flex: 1,
    marginRight: 6,
  },
  skill: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 1,
  },
  cooperative: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  availableBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
    marginRight: 4,
  },
  availableText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
  },
  busyBadge: {
    backgroundColor: colors.border,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.round,
  },
  busyText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    marginTop: spacing.md,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: 3,
    fontWeight: '500',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
    paddingTop: spacing.xs,
  },
  pricing: {
    flexDirection: 'column',
  },
  rateLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  rateValue: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  rateUnit: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.textSecondary,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
