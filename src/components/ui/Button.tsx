import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing } from '../../theme';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'danger' | 'emergency';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: keyof typeof Ionicons.glyphMap;
  iconPosition?: 'left' | 'right';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  loading = false,
  disabled = false,
  style,
  textStyle,
  fullWidth = false,
}) => {
  const getContainerStyle = (): ViewStyle => {
    const base: ViewStyle = {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: borderRadius.md,
    };

    // Sizes
    if (size === 'sm') {
      base.paddingVertical = 8;
      base.paddingHorizontal = 12;
    } else if (size === 'lg') {
      base.paddingVertical = 16;
      base.paddingHorizontal = 24;
    } else {
      base.paddingVertical = 12;
      base.paddingHorizontal = 18;
    }

    // Variants
    if (variant === 'primary') {
      base.backgroundColor = colors.primary;
    } else if (variant === 'secondary') {
      base.backgroundColor = colors.accent;
    } else if (variant === 'danger') {
      base.backgroundColor = colors.danger;
    } else if (variant === 'emergency') {
      base.backgroundColor = colors.danger;
      base.shadowColor = colors.danger;
      base.shadowOffset = { width: 0, height: 4 };
      base.shadowOpacity = 0.3;
      base.shadowRadius = 8;
      base.elevation = 4;
    } else if (variant === 'outline') {
      base.backgroundColor = 'transparent';
      base.borderWidth = 1.5;
      base.borderColor = colors.primary;
    }

    if (disabled) {
      base.opacity = 0.5;
    }

    if (fullWidth) {
      base.width = '100%';
    }

    return base;
  };

  const getTextStyle = (): TextStyle => {
    const base: TextStyle = {
      fontWeight: '600',
      textAlign: 'center',
    };

    if (size === 'sm') base.fontSize = 13;
    else if (size === 'lg') base.fontSize = 16;
    else base.fontSize = 14;

    if (variant === 'outline') {
      base.color = colors.primary;
    } else {
      base.color = colors.textInverse;
    }

    return base;
  };

  const iconColor = variant === 'outline' ? colors.primary : colors.textInverse;
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 20 : 18;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || loading}
      style={[getContainerStyle(), style]}
    >
      {loading ? (
        <ActivityIndicator color={iconColor} size="small" />
      ) : (
        <View style={styles.contentRow}>
          {icon && iconPosition === 'left' && (
            <Ionicons name={icon} size={iconSize} color={iconColor} style={{ marginRight: 6 }} />
          )}
          <Text style={[getTextStyle(), textStyle]}>{title}</Text>
          {icon && iconPosition === 'right' && (
            <Ionicons name={icon} size={iconSize} color={iconColor} style={{ marginLeft: 6 }} />
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
