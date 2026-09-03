import React from 'react';
import { View, Text, Image, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '../../theme';

interface AvatarProps {
  name: string;
  url?: string;
  size?: number;
  showVerifiedBadge?: boolean;
  style?: ViewStyle;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  url,
  size = 48,
  showVerifiedBadge = false,
  style,
}) => {
  const getInitials = (n: string) => {
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  return (
    <View style={[{ width: size, height: size }, style]}>
      {url ? (
        <Image
          source={{ uri: url }}
          style={[
            styles.image,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        />
      ) : (
        <View
          style={[
            styles.fallback,
            { width: size, height: size, borderRadius: size / 2 },
          ]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.38 }]}>
            {getInitials(name)}
          </Text>
        </View>
      )}
      {showVerifiedBadge && (
        <View
          style={[
            styles.verifiedCheck,
            {
              width: size * 0.34,
              height: size * 0.34,
              borderRadius: (size * 0.34) / 2,
            },
          ]}
        >
          <Ionicons name="checkmark" size={size * 0.22} color={colors.textInverse} />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  image: {
    backgroundColor: colors.border,
  },
  fallback: {
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  initials: {
    fontWeight: '700',
    color: colors.primary,
  },
  verifiedCheck: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
