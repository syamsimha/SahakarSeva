import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, typography } from '../../theme';
import { BookingStatus, WorkerVerificationStatus } from '../../types';

interface BadgeProps {
  label?: string;
  variant?: 'status' | 'verified' | 'role' | 'emergency' | 'cooperative';
  status?: BookingStatus | WorkerVerificationStatus;
  style?: ViewStyle;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  variant = 'status',
  status,
  style,
}) => {
  let bgColor = colors.primaryLight;
  let textColor = colors.primary;
  let iconName: keyof typeof Ionicons.glyphMap | undefined;
  let displayLabel = label;

  if (variant === 'verified') {
    bgColor = colors.successLight;
    textColor = colors.success;
    iconName = 'shield-checkmark';
    displayLabel = displayLabel || 'Verified Cooperative Worker';
  } else if (variant === 'emergency') {
    bgColor = colors.dangerLight;
    textColor = colors.danger;
    iconName = 'flash';
    displayLabel = displayLabel || '24x7 Priority Emergency';
  } else if (variant === 'cooperative') {
    bgColor = colors.accentLight;
    textColor = colors.accentDark;
    iconName = 'people';
    displayLabel = displayLabel || 'Cooperative Society';
  } else if (status) {
    switch (status) {
      case 'requested':
        bgColor = colors.warningLight;
        textColor = colors.warning;
        iconName = 'time-outline';
        displayLabel = displayLabel || 'Requested';
        break;
      case 'accepted':
        bgColor = colors.infoLight;
        textColor = colors.info;
        iconName = 'checkmark-circle-outline';
        displayLabel = displayLabel || 'Accepted';
        break;
      case 'on_the_way':
        bgColor = '#E0F2FE';
        textColor = '#0284C7';
        iconName = 'bicycle-outline';
        displayLabel = displayLabel || 'On The Way';
        break;
      case 'in_progress':
        bgColor = '#F3E8FF';
        textColor = '#7E22CE';
        iconName = 'construct-outline';
        displayLabel = displayLabel || 'In Progress';
        break;
      case 'completed':
        bgColor = colors.successLight;
        textColor = colors.success;
        iconName = 'checkmark-done-circle';
        displayLabel = displayLabel || 'Completed';
        break;
      case 'cancelled':
        bgColor = colors.dangerLight;
        textColor = colors.danger;
        iconName = 'close-circle-outline';
        displayLabel = displayLabel || 'Cancelled';
        break;
      case 'verified':
        bgColor = colors.successLight;
        textColor = colors.success;
        iconName = 'shield-checkmark';
        displayLabel = displayLabel || 'Verified';
        break;
      case 'under_review':
      case 'pending':
        bgColor = colors.warningLight;
        textColor = colors.warning;
        iconName = 'hourglass-outline';
        displayLabel = displayLabel || 'Under Review';
        break;
      case 'changes_required':
      case 'rejected':
        bgColor = colors.dangerLight;
        textColor = colors.danger;
        iconName = 'alert-circle-outline';
        displayLabel = displayLabel || 'Action Needed';
        break;
    }
  }

  return (
    <View style={[styles.badge, { backgroundColor: bgColor }, style]}>
      {iconName && (
        <Ionicons
          name={iconName}
          size={12}
          color={textColor}
          style={styles.icon}
        />
      )}
      <Text style={[styles.text, { color: textColor }]}>{displayLabel}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    alignSelf: 'flex-start',
  },
  icon: {
    marginRight: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '600',
  },
});
