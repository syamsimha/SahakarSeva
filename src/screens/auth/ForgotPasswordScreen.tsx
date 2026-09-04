import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Button } from '../../components/ui';
import { LanguageModal } from '../../components/common';
import { PasswordStrengthMeter, checkPasswordStrength } from '../../components/auth';
import { authService, mapFriendlyAuthError } from '../../services/authService';
import { useLanguage } from '../../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

interface ForgotPasswordScreenProps {
  onNavigateToLogin: () => void;
  initialStep?: RecoveryStep;
}

type RecoveryStep = 'identifier' | 'otp' | 'new_password' | 'success';

export const ForgotPasswordScreen: React.FC<ForgotPasswordScreenProps> = ({
  onNavigateToLogin,
  initialStep = 'identifier',
}) => {
  const { language, t } = useLanguage();

  const [step, setStep] = useState<RecoveryStep>(initialStep);
  const [identifier, setIdentifier] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [requestCooldown, setRequestCooldown] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [resendCountdown, setResendCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  // Independent attempt counter allowing at least 3 attempts before temporary blocking
  const [otpAttempts, setOtpAttempts] = useState(0);
  const [verifyAttempts, setVerifyAttempts] = useState(0);
  const MAX_OTP_ATTEMPTS = 3;

  // Synchronous guard against double-clicks or rapid duplicate requests
  const isSubmittingRef = useRef(false);

  // Clear in-memory reset token and reset independent timers on mount / unmount
  useEffect(() => {
    setRequestCooldown(0);
    setResendCountdown(60);
    setCanResend(false);
    setOtpAttempts(0);
    setVerifyAttempts(0);
    setErrorMsg(null);
    setSuccessNotice(null);
    return () => {
      authService.clearResetToken();
    };
  }, []);

  // Step 1 request cooldown timer (only active AFTER 3 allowed attempts are exhausted)
  useEffect(() => {
    let timer: any;
    if (requestCooldown > 0) {
      timer = setInterval(() => {
        setRequestCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            // Reset attempts once the cooldown is complete
            setOtpAttempts(0);
            setVerifyAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [requestCooldown > 0]);

  // Step 2 Resend Countdown Timer
  useEffect(() => {
    let timer: any;
    if (step === 'otp' && resendCountdown > 0) {
      setCanResend(false);
      timer = setInterval(() => {
        setResendCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, resendCountdown > 0]);

  // STEP 1: Send Recovery Email (Allows at least 3 attempts before rate limit)
  const handleSendOtp = async () => {
    if (isSubmittingRef.current || isLoading) return;

    // Only block if user has actually exhausted 3 allowed attempts
    if (otpAttempts >= MAX_OTP_ATTEMPTS && requestCooldown > 0) {
      setErrorMsg('Too many attempts. Please wait 60 seconds before trying again.');
      return;
    }

    const trimmed = identifier.trim().toLowerCase();
    if (!trimmed) {
      setErrorMsg(t('identifier_required'));
      return;
    }
    if (!trimmed.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    isSubmittingRef.current = true;
    setIsLoading(true);
    setErrorMsg(null);

    const nextAttempt = otpAttempts + 1;
    setOtpAttempts(nextAttempt);

    try {
      const res = await authService.sendPasswordResetEmail(trimmed);
      setSuccessNotice(res.message || t('otp_sent_success'));
      setResendCountdown(60);
      setCanResend(false);
      // Note: Do not set requestCooldown here so Step 1 is clean if user returns
      setStep('otp');
    } catch (err: any) {
      const friendly = mapFriendlyAuthError(err);
      if (nextAttempt >= MAX_OTP_ATTEMPTS) {
        // Enforce rate limit and 60-second cooldown only after allowed attempts are exhausted
        setRequestCooldown(60);
        setErrorMsg('Too many attempts. Please wait 60 seconds before trying again.');
      } else {
        // Attempts 1 and 2: allow retry without locking down
        const isRateLimit =
          err?.status === 429 ||
          friendly.toLowerCase().includes('too many') ||
          friendly.toLowerCase().includes('rate limit') ||
          friendly.toLowerCase().includes('60 seconds');

        if (isRateLimit) {
          setErrorMsg(`Unable to send recovery email. Please try again (Attempt ${nextAttempt} of ${MAX_OTP_ATTEMPTS}).`);
        } else {
          setErrorMsg(friendly);
        }
      }
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // Resend Recovery Email (Allows up to 3 attempts before cooldown)
  const handleResendOtp = async () => {
    if (isSubmittingRef.current || !canResend || isLoading) return;

    if (otpAttempts >= MAX_OTP_ATTEMPTS && requestCooldown > 0) {
      setErrorMsg('Too many attempts. Please wait 60 seconds before trying again.');
      return;
    }

    isSubmittingRef.current = true;
    setIsLoading(true);
    setErrorMsg(null);

    const nextAttempt = otpAttempts + 1;
    setOtpAttempts(nextAttempt);

    try {
      const res = await authService.sendPasswordResetEmail(identifier.trim().toLowerCase());
      setSuccessNotice(res.message || t('otp_sent_success'));
      setResendCountdown(60);
      setCanResend(false);
    } catch (err: any) {
      const friendly = mapFriendlyAuthError(err);
      if (nextAttempt >= MAX_OTP_ATTEMPTS) {
        setRequestCooldown(60);
        setResendCountdown(60);
        setCanResend(false);
        setErrorMsg('Too many attempts. Please wait 60 seconds before trying again.');
      } else {
        const isRateLimit =
          err?.status === 429 ||
          friendly.toLowerCase().includes('too many') ||
          friendly.toLowerCase().includes('rate limit') ||
          friendly.toLowerCase().includes('60 seconds');

        if (isRateLimit) {
          setErrorMsg(`Unable to send recovery email. Please try again (Attempt ${nextAttempt} of ${MAX_OTP_ATTEMPTS}).`);
        } else {
          setErrorMsg(friendly);
        }
        setResendCountdown(30);
        setCanResend(false);
      }
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // STEP 2: Verify Recovery Code (Allows at least 3 verification attempts)
  const handleVerifyOtp = async () => {
    if (isSubmittingRef.current || isLoading) return;

    if (verifyAttempts >= MAX_OTP_ATTEMPTS && requestCooldown > 0) {
      setErrorMsg('Too many attempts. Please wait 60 seconds before trying again.');
      return;
    }

    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length !== 6 || !/^[0-9]{6}$/.test(cleanOtp)) {
      setErrorMsg('Please enter a valid 6-digit verification code.');
      return;
    }

    isSubmittingRef.current = true;
    setIsLoading(true);
    setErrorMsg(null);

    const nextVerify = verifyAttempts + 1;
    setVerifyAttempts(nextVerify);

    try {
      await authService.verifyRecoveryOtp(identifier.trim().toLowerCase(), cleanOtp);
      setStep('new_password');
    } catch (err: any) {
      if (nextVerify >= MAX_OTP_ATTEMPTS) {
        setRequestCooldown(60);
        setErrorMsg('Too many attempts. Please wait 60 seconds before trying again.');
      } else {
        setErrorMsg(mapFriendlyAuthError(err) || t('otp_invalid'));
      }
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  // STEP 3: Submit New Password
  const handleUpdatePassword = async () => {
    if (isSubmittingRef.current || isLoading) return;
    setErrorMsg(null);

    const check = checkPasswordStrength(newPassword);
    if (!check.isValid) {
      setErrorMsg('Password does not meet the 5 security requirements.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg(t('pw_mismatch'));
      return;
    }

    isSubmittingRef.current = true;
    setIsLoading(true);
    try {
      await authService.updatePassword(newPassword);
      setStep('success');
    } catch (err: any) {
      setErrorMsg(mapFriendlyAuthError(err));
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const isPasswordsMatching = confirmPassword.length > 0 && newPassword === confirmPassword;
  const isPasswordsMismatched = confirmPassword.length > 0 && newPassword !== confirmPassword;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Header Bar */}
        <View style={styles.topBar}>
          {step !== 'success' && (
            <TouchableOpacity
              onPress={() => {
                authService.clearResetToken();
                if (step === 'otp') {
                  setStep('identifier');
                  setErrorMsg(null);
                  setSuccessNotice(null);
                  // Only retain cooldown if allowed attempts were exhausted
                  if (otpAttempts < MAX_OTP_ATTEMPTS) {
                    setRequestCooldown(0);
                  }
                } else if (step === 'new_password') {
                  setStep('otp');
                  setErrorMsg(null);
                } else {
                  setRequestCooldown(0);
                  setErrorMsg(null);
                  setSuccessNotice(null);
                  onNavigateToLogin();
                }
              }}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
          )}

          <Text style={styles.screenTitle}>{t('forgot_password')}</Text>

          {/* Language Selector Pill */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setLangModalVisible(true)}
            style={styles.languagePill}
          >
            <Ionicons name="globe-outline" size={14} color={colors.primary} />
            <Text style={styles.languagePillText}>{language.toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {/* Error Banner */}
        {errorMsg && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={colors.danger} />
            <Text style={styles.errorBannerText}>{errorMsg}</Text>
            <TouchableOpacity onPress={() => setErrorMsg(null)}>
              <Ionicons name="close" size={16} color={colors.danger} />
            </TouchableOpacity>
          </View>
        )}

        {/* Success Notice Banner */}
        {successNotice && step === 'otp' && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.successBannerText}>{successNotice}</Text>
          </View>
        )}

        {/* ==========================================================
            STEP 1: ENTER EMAIL OR MOBILE
            ========================================================== */}
        {step === 'identifier' && (
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="key-outline" size={32} color={colors.primary} />
            </View>

            <Text style={styles.stepTitle}>{t('reset_password_title')}</Text>
            <Text style={styles.stepSubtitle}>{t('reset_password_subtitle')}</Text>

            <Text style={styles.inputLabel}>{t('email_address')}</Text>
            <View
              style={[
                styles.inputBox,
                focusedField === 'id' && styles.inputFocused,
              ]}
            >
              <Ionicons name="mail-outline" size={18} color={colors.textSecondary} style={{ marginRight: 8 }} />
              <TextInput
                style={[
                  styles.input,
                  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                ]}
                placeholder={t('email_placeholder')}
                placeholderTextColor={colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
                value={identifier}
                onChangeText={(t) => {
                  setIdentifier(t);
                  setErrorMsg(null);
                }}
                onFocus={() => setFocusedField('id')}
                returnKeyType="send"
                onSubmitEditing={handleSendOtp}
              />
            </View>

            <Button
              title={
                isLoading
                  ? t('sending_otp')
                  : (otpAttempts >= MAX_OTP_ATTEMPTS && requestCooldown > 0)
                  ? `${t('send_otp')} (${requestCooldown}s)`
                  : t('send_otp')
              }
              onPress={handleSendOtp}
              loading={isLoading}
              disabled={isLoading || (otpAttempts >= MAX_OTP_ATTEMPTS && requestCooldown > 0)}
              variant="primary"
              size="lg"
              fullWidth
              style={{ marginTop: spacing.lg }}
            />

            <TouchableOpacity
              onPress={() => {
                authService.clearResetToken();
                setRequestCooldown(0);
                setErrorMsg(null);
                setSuccessNotice(null);
                onNavigateToLogin();
              }}
              style={styles.backLink}
            >
              <Text style={styles.backLinkText}>{t('back_to_login')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ==========================================================
            STEP 2: ENTER OTP CODE
            ========================================================== */}
        {step === 'otp' && (
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="shield-checkmark-outline" size={32} color={colors.primary} />
            </View>

            <Text style={styles.stepTitle}>{t('enter_verification_code')}</Text>
            <Text style={styles.stepSubtitle}>
              {t('enter_otp_subtitle')} <Text style={{ fontWeight: '700', color: colors.text }}>{identifier}</Text>.
              {'\n'}Click the link in the recovery email or enter the verification code below.
            </Text>

            <Text style={styles.inputLabel}>{t('enter_verification_code')}</Text>
            <View
              style={[
                styles.inputBox,
                styles.otpInputBox,
                focusedField === 'otp' && styles.inputFocused,
              ]}
            >
              <TextInput
                style={[
                  styles.otpInput,
                  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                ]}
                placeholder="• • • • • •"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                maxLength={6}
                value={otp}
                onChangeText={(t) => {
                  setOtp(t);
                  setErrorMsg(null);
                }}
                onFocus={() => setFocusedField('otp')}
                onBlur={() => setFocusedField(null)}
              />
            </View>

            <Button
              title={isLoading ? t('verifying_otp') : t('verify_otp')}
              onPress={handleVerifyOtp}
              loading={isLoading}
              disabled={isLoading}
              variant="primary"
              size="lg"
              fullWidth
              style={{ marginTop: spacing.lg }}
            />

            {/* Resend OTP Section with Countdown */}
            <View style={styles.resendRow}>
              {canResend ? (
                <TouchableOpacity onPress={handleResendOtp} disabled={isLoading}>
                  <Text style={styles.resendActiveText}>{t('resend_otp')}</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.resendWaitText}>
                  {t('resend_in_seconds')} {resendCountdown} {t('seconds')}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* ==========================================================
            STEP 3: CREATE NEW PASSWORD
            ========================================================== */}
        {step === 'new_password' && (
          <View style={styles.card}>
            <View style={styles.iconCircle}>
              <Ionicons name="lock-closed-outline" size={32} color={colors.primary} />
            </View>

            <Text style={styles.stepTitle}>{t('create_new_password')}</Text>
            <Text style={styles.stepSubtitle}>{t('create_new_password_subtitle')}</Text>

            {/* New Password */}
            <Text style={styles.inputLabel}>{t('new_password')} *</Text>
            <View
              style={[
                styles.inputBox,
                focusedField === 'newPw' && styles.inputFocused,
              ]}
            >
              <TextInput
                style={[
                  styles.input,
                  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                ]}
                placeholder={t('password_placeholder')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showNewPassword}
                value={newPassword}
                onChangeText={(t) => {
                  setNewPassword(t);
                  setErrorMsg(null);
                }}
                onFocus={() => setFocusedField('newPw')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowNewPassword(!showNewPassword)}>
                <Ionicons
                  name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Reusable Live 5-Point Password Strength Meter */}
            <PasswordStrengthMeter password={newPassword} />

            {/* Confirm New Password */}
            <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>
              {t('confirm_new_password')} *
            </Text>
            <View
              style={[
                styles.inputBox,
                focusedField === 'confirmPw' && styles.inputFocused,
                isPasswordsMatching && styles.inputContainerSuccess,
                isPasswordsMismatched && styles.inputContainerError,
              ]}
            >
              <TextInput
                style={[
                  styles.input,
                  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                ]}
                placeholder={t('confirm_password_placeholder')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  setErrorMsg(null);
                }}
                onFocus={() => setFocusedField('confirmPw')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={18}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Real-time Matching Feedback */}
            {isPasswordsMatching && (
              <View style={styles.matchingNotice}>
                <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                <Text style={styles.matchingTextSuccess}>{t('pw_match')}</Text>
              </View>
            )}
            {isPasswordsMismatched && (
              <View style={styles.matchingNotice}>
                <Ionicons name="close-circle" size={14} color={colors.danger} />
                <Text style={styles.matchingTextError}>{t('pw_mismatch')}</Text>
              </View>
            )}

            <Button
              title={isLoading ? t('updating_password') : t('update_password')}
              onPress={handleUpdatePassword}
              loading={isLoading}
              disabled={isLoading}
              variant="primary"
              size="lg"
              fullWidth
              style={{ marginTop: spacing.lg }}
            />
          </View>
        )}

        {/* ==========================================================
            STEP 4: PASSWORD RESET SUCCESSFUL
            ========================================================== */}
        {step === 'success' && (
          <View style={styles.successCard}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={48} color={colors.textInverse} />
            </View>

            <Text style={styles.successTitle}>{t('password_reset_success_title')}</Text>
            <Text style={styles.successSubtitle}>{t('password_reset_success_desc')}</Text>

            <Button
              title={t('go_to_sign_in')}
              onPress={() => {
                authService.clearResetToken();
                onNavigateToLogin();
              }}
              variant="primary"
              size="lg"
              fullWidth
              style={{ marginTop: spacing.xl }}
            />
          </View>
        )}
      </ScrollView>

      <LanguageModal
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
      />
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  backBtn: {
    padding: 6,
  },
  screenTitle: {
    ...typography.h3,
    color: colors.text,
    flex: 1,
    marginLeft: spacing.sm,
  },
  languagePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
    gap: 4,
    borderWidth: 1,
    borderColor: 'rgba(13, 122, 95, 0.2)',
  },
  languagePillText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  card: {
    paddingTop: spacing.sm,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  stepTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  stepSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 18,
    paddingHorizontal: spacing.sm,
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
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#86EFAC',
    marginBottom: spacing.md,
    gap: 8,
  },
  successBannerText: {
    flex: 1,
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 50,
  },
  inputFocused: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },
  inputContainerSuccess: {
    borderColor: colors.success,
    backgroundColor: '#F0FDF4',
  },
  inputContainerError: {
    borderColor: colors.danger,
    backgroundColor: '#FEF2F2',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    height: '100%',
  },
  otpInputBox: {
    justifyContent: 'center',
  },
  otpInput: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 8,
    textAlign: 'center',
    width: '100%',
  },
  resendRow: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  resendActiveText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  resendWaitText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  backLink: {
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingVertical: 4,
  },
  backLinkText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  matchingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
  },
  matchingTextSuccess: {
    fontSize: 12,
    color: colors.success,
    fontWeight: '600',
  },
  matchingTextError: {
    fontSize: 12,
    color: colors.danger,
    fontWeight: '500',
    lineHeight: 16,
  },
  successCard: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.sm,
  },
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    shadowColor: colors.success,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  successTitle: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  successSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 20,
  },
});
