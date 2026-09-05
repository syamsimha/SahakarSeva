import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ServiceCategory } from '../../types';
import { colors, borderRadius, spacing, typography } from '../../theme';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../../context/LanguageContext';

interface ServiceCategoryCardProps {
  category: ServiceCategory;
  onPress: () => void;
  variant?: 'grid' | 'compact' | 'horizontal';
}

export const ServiceCategoryCard: React.FC<ServiceCategoryCardProps> = ({
  category,
  onPress,
  variant = 'grid',
}) => {
  const { language, t } = useLanguage();

  const getTitle = () => {
    if (language === 'hi' && category.hindiTitle) return category.hindiTitle;
    if (language === 'te' && category.teluguTitle) return category.teluguTitle;
    return t(category.title);
  };

  if (variant === 'horizontal') {
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={onPress}
        style={styles.horizontalCard}
      >
        <View style={styles.horizontalIconBox}>
          <Ionicons
            name={(category.iconName as any) || 'construct-outline'}
            size={22}
            color={colors.primary}
          />
        </View>
        <View style={styles.horizontalContent}>
          <Text style={styles.horizontalTitle}>{getTitle()}</Text>
          <Text style={styles.horizontalDesc} numberOfLines={1}>{category.description}</Text>
          <Text style={styles.horizontalPrice}>₹{category.basePrice}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.gridCard}
    >
      <View style={styles.iconCircle}>
        <Ionicons
          name={(category.iconName as any) || 'construct-outline'}
          size={24}
          color={colors.primary}
        />
      </View>
      <Text style={styles.gridTitle} numberOfLines={2}>
        {getTitle()}
      </Text>
      <Text style={styles.gridPrice}>From ₹{category.basePrice}</Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  gridCard: {
    width: '30%',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xs,
    alignItems: 'center',
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  gridTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    minHeight: 30,
  },
  gridPrice: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
  },
  horizontalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  horizontalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  horizontalContent: {
    flex: 1,
  },
  horizontalTitle: {
    ...typography.h4,
    color: colors.text,
  },
  horizontalDesc: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  horizontalPrice: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 3,
  },
});
