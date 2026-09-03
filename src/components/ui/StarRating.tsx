import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';

interface StarRatingProps {
  rating: number; // 0 to 5
  count?: number;
  size?: number;
  showCount?: boolean;
  style?: ViewStyle;
}

export const StarRating: React.FC<StarRatingProps> = ({
  rating,
  count,
  size = 14,
  showCount = true,
  style,
}) => {
  const stars = [1, 2, 3, 4, 5];

  return (
    <View style={[styles.container, style]}>
      <View style={styles.starsRow}>
        {stars.map((i) => {
          let icon: keyof typeof Ionicons.glyphMap = 'star-outline';
          if (rating >= i) {
            icon = 'star';
          } else if (rating >= i - 0.5) {
            icon = 'star-half';
          }
          return (
            <Ionicons
              key={i}
              name={icon}
              size={size}
              color="#F59E0B"
              style={{ marginRight: 2 }}
            />
          );
        })}
      </View>
      <Text style={[styles.score, { fontSize: size }]}>{rating > 0 ? rating.toFixed(1) : 'New'}</Text>
      {showCount && count !== undefined && (
        <Text style={[styles.count, { fontSize: size * 0.9 }]}>({count})</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 4,
  },
  score: {
    fontWeight: '700',
    color: colors.text,
    marginRight: 3,
  },
  count: {
    color: colors.textSecondary,
  },
});
