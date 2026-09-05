import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Button } from '../../components/ui';
import { LanguageModal } from '../../components/common';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

interface LoginScreenProps {
  onNavigateToRegister: () => void;
  onNavigateToForgotPassword: () => void;
  onLoginSuccess: () => void;
  registrationSuccessMessage?: string | null;
  onClearRegistrationSuccessMessage?: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onNavigateToRegister,
  onNavigateToForgotPassword,
  onLoginSuccess,
  registrationSuccessMessage,
  onClearRegistrationSuccessMessage,
}) => {
  const { loginWithEmail, isLoading, authError, clearError } = useAuth();
  const { language, t } = useLanguage();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<'identifier' | 'password' | null>(null);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [langModalVisible, setLangModalVisible] = useState(false);

  const handleIdentifierChange = (text: string) => {
    if (authError) clearError();
    if (fieldError) setFieldError(null);
    if (onClearRegistrationSuccessMessage) onClearRegistrationSuccessMessage();
    setIdentifier(text);
  };

  const handlePasswordChange = (text: string) => {
    if (authError) clearError();
    if (fieldError) setFieldError(null);
    if (onClearRegistrationSuccessMessage) onClearRegistrationSuccessMessage();
    setPassword(text);
  };

  const handleLogin = async () => {
    const trimmedId = identifier.trim();
    if (!trimmedId || !password) {
      setFieldError(t('login_required_fields'));
      return;
    }

    try {
      await loginWithEmail(trimmedId, password);
      onLoginSuccess();
    } catch (e: any) {
      // Error message is set in AuthContext and shown via activeError
    }
  };

  const activeError = fieldError || authError;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Utility Bar: Language Selector */}
        <View style={styles.topUtilityBar}>
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setLangModalVisible(true)}
            style={styles.languagePill}
          >
            <Ionicons name="globe-outline" size={15} color={colors.primary} />
            <Text style={styles.languagePillText}>
              {language === 'en' ? 'English' : language === 'hi' ? 'हिंदी' : 'తెలుగు'}
            </Text>
            <Ionicons name="chevron-down" size={12} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Brand Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Ionicons name="people" size={32} color={colors.textInverse} />
          </View>
          <Text style={styles.title}>{t('login_title')}</Text>
          <Text style={styles.subtitle}>{t('login_subtitle')}</Text>
        </View>

        {/* Credentials Form */}
        <View style={styles.formCard}>
          {/* Registration Success Banner */}
          {registrationSuccessMessage && !activeError && (
            <View style={styles.successBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#16A34A" />
              <Text style={styles.successBannerText}>{registrationSuccessMessage}</Text>
              <TouchableOpacity
                onPress={() => {
                  if (onClearRegistrationSuccessMessage) onClearRegistrationSuccessMessage();
                }}
              >
                <Ionicons name="close" size={16} color="#16A34A" />
              </TouchableOpacity>
            </View>
          )}

          {/* Error Banner */}
          {activeError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.errorBannerText}>{activeError}</Text>
              <TouchableOpacity
                onPress={() => {
                  setFieldError(null);
                  clearError();
                }}
              >
                <Ionicons name="close" size={16} color={colors.danger} />
              </TouchableOpacity>
            </View>
          )}

          {/* Email / Identifier Field */}
          <Text style={styles.inputLabel}>{t('email_or_phone')}</Text>
          <View
            style={[
              styles.inputContainer,
              focusedField === 'identifier' && styles.inputContainerFocused,
              Boolean(activeError && !identifier) && styles.inputContainerError,
            ]}
          >
            <Ionicons
              name="mail-outline"
              size={18}
              color={focusedField === 'identifier' ? colors.primary : colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={[
                styles.input,
                Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
              ]}
              placeholder={t('email_or_phone_placeholder')}
              placeholderTextColor={colors.textMuted}
              value={identifier}
              onChangeText={handleIdentifierChange}
              onFocus={() => setFocusedField('identifier')}
              onBlur={() => setFocusedField(null)}
              autoCapitalize="none"
              keyboardType="default"
            />
          </View>

          {/* Password Field */}
          <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>{t('password')}</Text>
          <View
            style={[
              styles.inputContainer,
              focusedField === 'password' && styles.inputContainerFocused,
              Boolean(activeError && !password) && styles.inputContainerError,
            ]}
          >
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={focusedField === 'password' ? colors.primary : colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={[
                styles.input,
                Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
              ]}
              placeholder={t('password_placeholder')}
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={handlePasswordChange}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity
            style={styles.forgotBtn}
            onPress={() => {
              clearError();
              onNavigateToForgotPassword();
            }}
          >
            <Text style={styles.forgotText}>{t('forgot_password')}</Text>
          </TouchableOpacity>

          {/* Sign In Button */}
          <Button
            title={isLoading ? t('signing_in') : t('sign_in')}
            onPress={handleLogin}
            loading={isLoading}
            variant="primary"
            size="lg"
            fullWidth
            style={{ marginTop: spacing.lg }}
          />

          {/* Register Link */}
          <View style={styles.registerRow}>
            <Text style={styles.registerText}>{t('no_account')} </Text>
            <TouchableOpacity onPress={() => { clearError(); onNavigateToRegister(); }}>
              <Text style={styles.registerLink}>{t('register_now')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cooperative Trust Badge */}
        <View style={styles.trustBadge}>
          <Ionicons name="shield-checkmark" size={18} color={colors.primary} />
          <Text style={styles.trustText}>{t('cooperative_trust')}</Text>
        </View>
      </ScrollView>

      {/* Language Selector Modal */}
      <LanguageModal
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContainer: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    justifyContent: 'center',
    minHeight: '100%',
  },
  topUtilityBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginBottom: spacing.md,
  },
  languagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: borderRadius.round,
    gap: 5,
    borderWidth: 1,
    borderColor: 'rgba(13, 122, 95, 0.25)',
  },
  languagePillText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoBox: {
    width: 68,
    height: 68,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
    lineHeight: 18,
  },
  formCard: {
    marginBottom: spacing.xl,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    marginBottom: spacing.md,
    gap: 8,
  },
  successBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '500',
    lineHeight: 16,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginBottom: spacing.md,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: colors.danger,
    fontWeight: '500',
    lineHeight: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 50,
  },
  inputContainerFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
  },
  inputContainerError: {
    borderColor: colors.danger,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
    paddingVertical: 4,
  },
  forgotText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  registerText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  registerLink: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  trustBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F8FAFC',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 8,
  },
  trustText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
    flex: 1,
    lineHeight: 15,
  },
});
