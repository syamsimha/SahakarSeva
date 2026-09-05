import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

interface PasswordStrengthMeterProps {
  password: string;
}

export interface PasswordRulesValidation {
  hasMinLength: boolean;
  hasUppercase: boolean;
  hasLowercase: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  isValid: boolean;
  score: number;
}

export const checkPasswordStrength = (password: string): PasswordRulesValidation => {
  const hasMinLength = password.length >= 8;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/.test(password);

  const score = [hasMinLength, hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
  const isValid = hasMinLength && hasUppercase && hasLowercase && hasNumber && hasSpecial;

  return {
    hasMinLength,
    hasUppercase,
    hasLowercase,
    hasNumber,
    hasSpecial,
    isValid,
    score,
  };
};

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  const { t } = useLanguage();
  const rules = checkPasswordStrength(password);

  if (!password) {
    return (
      <View style={styles.guidanceBox}>
        <Ionicons name="shield-outline" size={14} color={colors.primary} />
        <Text style={styles.guidanceText}>{t('pw_guide')}</Text>
      </View>
    );
  }

  const getStrengthMeta = () => {
    if (rules.score <= 2) {
      return { label: t('pw_strength_weak'), color: colors.danger, width: '25%' };
    }
    if (rules.score === 3) {
      return { label: t('pw_strength_fair'), color: '#F97316', width: '50%' };
    }
    if (rules.score === 4) {
      return { label: t('pw_strength_good'), color: '#EAB308', width: '75%' };
    }
    return { label: t('pw_strength_strong'), color: colors.success, width: '100%' };
  };

  const meta = getStrengthMeta();

  const checklist = [
    { key: 'length', text: t('pw_rule_length'), met: rules.hasMinLength },
    { key: 'uppercase', text: t('pw_rule_uppercase'), met: rules.hasUppercase },
    { key: 'lowercase', text: t('pw_rule_lowercase'), met: rules.hasLowercase },
    { key: 'number', text: t('pw_rule_number'), met: rules.hasNumber },
    { key: 'special', text: t('pw_rule_special'), met: rules.hasSpecial },
  ];

  return (
    <View style={styles.container}>
      {/* Strength Bar & Label */}
      <View style={styles.strengthHeaderRow}>
        <Text style={styles.strengthTitle}>Password Strength:</Text>
        <Text style={[styles.strengthBadge, { color: meta.color }]}>{meta.label}</Text>
      </View>

      <View style={styles.track}>
        <View style={[styles.bar, { width: meta.width as any, backgroundColor: meta.color }]} />
      </View>

      {/* Live Requirement Checklist */}
      <View style={styles.checklist}>
        {checklist.map((item) => (
          <View key={item.key} style={styles.checkItem}>
            <Ionicons
              name={item.met ? 'checkmark-circle' : 'ellipse-outline'}
              size={15}
              color={item.met ? colors.success : colors.textMuted}
            />
            <Text style={[styles.checkText, item.met && styles.checkTextMet]}>
              {item.text}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xs,
    marginBottom: spacing.sm,
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  guidanceBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    marginBottom: spacing.xs,
    paddingHorizontal: 4,
  },
  guidanceText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 15,
  },
  strengthHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  strengthTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  strengthBadge: {
    fontSize: 12,
    fontWeight: '700',
  },
  track: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  bar: {
    height: '100%',
    borderRadius: 2,
  },
  checklist: {
    gap: 5,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  checkText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  checkTextMet: {
    color: colors.success,
    fontWeight: '600',
  },
});
