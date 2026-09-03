import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { colors, borderRadius, spacing } from '../../theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  variant?: 'elevated' | 'outlined' | 'flat';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  onPress,
  variant = 'elevated',
}) => {
  const getCardStyle = (): ViewStyle => {
    const base: ViewStyle = {
      backgroundColor: colors.surface,
      borderRadius: borderRadius.lg,
      padding: spacing.lg,
    };

    if (variant === 'elevated') {
      base.shadowColor = colors.shadow;
      base.shadowOffset = { width: 0, height: 2 };
      base.shadowOpacity = 0.06;
      base.shadowRadius = 8;
      base.elevation = 2;
      base.borderWidth = 1;
      base.borderColor = colors.border;
    } else if (variant === 'outlined') {
      base.borderWidth = 1.5;
      base.borderColor = colors.border;
    } else {
      base.backgroundColor = colors.primarySurface;
    }

    return base;
  };

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={onPress}
        style={[getCardStyle(), style]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[getCardStyle(), style]}>{children}</View>;
};
