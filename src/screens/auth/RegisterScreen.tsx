import React, { useState, useRef, useEffect } from 'react';
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
import {
  PasswordStrengthMeter,
  checkPasswordStrength,
  DocumentUploader,
  AttachedDocument,
} from '../../components/auth';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { UserRole } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface RegisterScreenProps {
  onNavigateToLogin: () => void;
  onRegisterSuccess: () => void;
}

export const RegisterScreen: React.FC<RegisterScreenProps> = ({
  onNavigateToLogin,
  onRegisterSuccess,
}) => {
  const { register, isLoading, authError, clearError } = useAuth();
  const { language, t } = useLanguage();

  const isSubmittingRef = useRef(false);
  const [step, setStep] = useState<'role' | 'form' | 'success'>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [langModalVisible, setLangModalVisible] = useState(false);

  // Common Fields — Initially empty, never prefilled
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');

  // Worker-specific Fields & Real Documents
  const [primarySkill, setPrimarySkill] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [cooperativeSociety, setCooperativeSociety] = useState('');
  const [identityDoc, setIdentityDoc] = useState<AttachedDocument | null>(null);
  const [skillCertDoc, setSkillCertDoc] = useState<AttachedDocument | null>(null);
  const [docErrors, setDocErrors] = useState<{ identity?: string; skill?: string; adminAuth?: string }>({});

  // Admin-specific Fields & Real Documents
  const [adminDesignation, setAdminDesignation] = useState('');
  const [societyRegNo, setSocietyRegNo] = useState('');
  const [federationName, setFederationName] = useState('');
  const [officialPhone, setOfficialPhone] = useState('');
  const [officialEmail, setOfficialEmail] = useState('');
  const [adminAuthDoc, setAdminAuthDoc] = useState<AttachedDocument | null>(null);

  // Focus tracking for web styling
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const resetFormState = () => {
    setFullName('');
    setPhone('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setShowPassword(false);
    setShowConfirmPassword(false);
    setAddress('');
    setCity('');
    setPincode('');
    setPrimarySkill('');
    setExperienceYears('');
    setCooperativeSociety('');
    setIdentityDoc(null);
    setSkillCertDoc(null);
    setDocErrors({});
    setAdminDesignation('');
    setSocietyRegNo('');
    setFederationName('');
    setOfficialPhone('');
    setOfficialEmail('');
    setAdminAuthDoc(null);
    setValidationError(null);
    setFocusedField(null);
    clearError();
  };

  // Initialize clean state on mount
  useEffect(() => {
    resetFormState();
  }, []);

  const handleRoleSelect = (role: UserRole) => {
    resetFormState();
    setSelectedRole(role);
    setStep('form');
  };

  const validateForm = (): boolean => {
    setDocErrors({});

    // 1. Personal Info Validation
    if (!fullName.trim()) {
      setValidationError('Please enter your full name.');
      return false;
    }
    if (!phone.trim()) {
      setValidationError('Please enter your mobile number.');
      return false;
    }
    if (!email.trim() || !email.includes('@')) {
      setValidationError('Please enter a valid email address.');
      return false;
    }
    if (!address.trim()) {
      setValidationError('Please enter your address / locality.');
      return false;
    }

    // 2. City & Pincode Validation (Manual entry required, no default hardcoding)
    if (!city.trim()) {
      setValidationError(t('city_required'));
      return false;
    }
    const cleanPincode = pincode.trim();
    if (!cleanPincode || !/^[1-9][0-9]{5}$/.test(cleanPincode)) {
      setValidationError(t('invalid_pincode'));
      return false;
    }

    // 3. Strong Password Validation
    const pwCheck = checkPasswordStrength(password);
    if (!pwCheck.isValid) {
      setValidationError('Please create a strong password satisfying all 5 checklist requirements.');
      return false;
    }

    // 4. Confirm Password Validation
    if (!confirmPassword) {
      setValidationError('Please confirm your password.');
      return false;
    }
    if (password !== confirmPassword) {
      setValidationError(t('pw_mismatch'));
      return false;
    }

    // 5. Worker-specific Validation & Mandatory Real Documents
    if (selectedRole === 'worker') {
      if (!primarySkill.trim()) {
        setValidationError('Please enter your primary skill / trade.');
        return false;
      }
      if (!cooperativeSociety.trim()) {
        setValidationError('Please enter your affiliated cooperative society name.');
        return false;
      }
      let hasDocError = false;
      const newDocErrors: { identity?: string; skill?: string } = {};

      if (!identityDoc) {
        newDocErrors.identity = t('missing_identity_doc');
        hasDocError = true;
      }
      if (!skillCertDoc) {
        newDocErrors.skill = t('missing_skill_doc');
        hasDocError = true;
      }

      if (hasDocError) {
        setDocErrors(newDocErrors);
        setValidationError(newDocErrors.identity || newDocErrors.skill || 'Please attach all mandatory verification documents.');
        return false;
      }
    }

    // 6. Admin-specific Institutional Verification
    if (selectedRole === 'admin') {
      if (!adminDesignation.trim() || !societyRegNo.trim() || !federationName.trim()) {
        setValidationError(t('missing_society_info'));
        return false;
      }
      if (!officialPhone.trim() || !officialEmail.trim()) {
        setValidationError('Please enter both official contact phone and official email.');
        return false;
      }
      if (!adminAuthDoc) {
        setDocErrors({ adminAuth: t('missing_admin_doc') });
        setValidationError(t('missing_admin_doc'));
        return false;
      }
    }

    setValidationError(null);
    return true;
  };

  const handleSubmit = async () => {
    if (isLoading || isSubmittingRef.current) return;
    if (!validateForm()) return;

    isSubmittingRef.current = true;
    try {
      await register({
        role: selectedRole,
        fullName: fullName.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
        address: address.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        primarySkill: selectedRole === 'worker' ? primarySkill.trim() : undefined,
        experienceYears: selectedRole === 'worker' ? parseInt(experienceYears, 10) || 1 : undefined,
        cooperativeName: selectedRole === 'worker' ? cooperativeSociety.trim() : undefined,
        identityDoc: selectedRole === 'worker' && identityDoc ? identityDoc : undefined,
        skillCertDoc: selectedRole === 'worker' && skillCertDoc ? skillCertDoc : undefined,
        adminDesignation: selectedRole === 'admin' ? adminDesignation.trim() : undefined,
        societyRegNo: selectedRole === 'admin' ? societyRegNo.trim() : undefined,
        federationName: selectedRole === 'admin' ? federationName.trim() : undefined,
        adminAuthDoc: selectedRole === 'admin' && adminAuthDoc ? adminAuthDoc : undefined,
      });
      resetFormState();
      onRegisterSuccess?.();
    } catch (e: any) {
      console.error('[RegisterScreen.handleSubmit] Registration submission error:', e?.message || e);
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const rawAuthError = authError;
  const isRateLimitError = Boolean(
    rawAuthError &&
      (rawAuthError.toLowerCase().includes('too many') ||
        rawAuthError.toLowerCase().includes('60 seconds') ||
        rawAuthError.toLowerCase().includes('rate limit'))
  );
  const activeAuthError = !isRateLimitError ? rawAuthError : null;
  const activeError = validationError || activeAuthError;
  const isPasswordsMatching = confirmPassword.length > 0 && password === confirmPassword;
  const isPasswordsMismatched = confirmPassword.length > 0 && password !== confirmPassword;

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
                resetFormState();
                if (step === 'form') {
                  setStep('role');
                } else {
                  onNavigateToLogin();
                }
              }}
              style={styles.backBtn}
            >
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
          )}

          <Text style={styles.screenTitle}>
            {step === 'success' ? t('reg_success_title') : t('create_account')}
          </Text>

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

        {step === 'success' ? (
          /* ==========================================================
             REGISTRATION SUCCESSFUL SCREEN (NO AUTO-LOGIN)
             ========================================================== */
          <View style={styles.successContainer}>
            <View style={styles.successIconCircle}>
              <Ionicons name="checkmark" size={48} color={colors.textInverse} />
            </View>

            <Text style={styles.successTitle}>{t('reg_success_title')}</Text>
            <Text style={styles.successSubtitle}>{t('reg_success_subtitle')}</Text>

            {/* Account Details Box */}
            <View style={styles.accountCard}>
              <View style={styles.accountCardRow}>
                <Text style={styles.accountLabel}>{t('full_name')}:</Text>
                <Text style={styles.accountValue}>{fullName}</Text>
              </View>
              <View style={styles.accountCardRow}>
                <Text style={styles.accountLabel}>{t('registering_as')}:</Text>
                <Text style={[styles.accountValue, { fontWeight: '700', color: colors.primary }]}>
                  {selectedRole === 'worker' ? t('worker') : selectedRole === 'admin' ? t('admin') : t('customer')}
                </Text>
              </View>
              <View style={styles.accountCardRow}>
                <Text style={styles.accountLabel}>{t('email_address')}:</Text>
                <Text style={styles.accountValue}>{email}</Text>
              </View>
              <View style={styles.accountCardRow}>
                <Text style={styles.accountLabel}>{t('city')}:</Text>
                <Text style={styles.accountValue}>{city} ({pincode})</Text>
              </View>
            </View>

            {/* Go to Sign In Button */}
            <Button
              title={t('go_to_sign_in')}
              onPress={() => {
                resetFormState();
                onNavigateToLogin();
              }}
              variant="primary"
              size="lg"
              fullWidth
              style={{ marginTop: spacing.xl }}
            />
          </View>
        ) : step === 'role' ? (
          /* ==========================================================
             STEP 1: ROLE SELECTION
             ========================================================== */
          <View style={styles.roleSelectionStep}>
            <Text style={styles.questionTitle}>{t('select_role_title')}</Text>
            <Text style={styles.questionSubtitle}>{t('select_role_subtitle')}</Text>

            <View style={styles.rolesList}>
              {/* Customer Option */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleRoleSelect('customer')}
                style={styles.roleCard}
              >
                <View style={[styles.roleIconBox, { backgroundColor: colors.customerBadge + '18' }]}>
                  <Ionicons name="person" size={26} color={colors.customerBadge} />
                </View>
                <View style={styles.roleInfo}>
                  <Text style={styles.roleTitle}>{t('customer')}</Text>
                  <Text style={styles.roleSubtitle}>{t('customer_role_desc')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Worker Option */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleRoleSelect('worker')}
                style={styles.roleCard}
              >
                <View style={[styles.roleIconBox, { backgroundColor: colors.workerBadge + '18' }]}>
                  <Ionicons name="construct" size={26} color={colors.workerBadge} />
                </View>
                <View style={styles.roleInfo}>
                  <Text style={styles.roleTitle}>{t('worker')}</Text>
                  <Text style={styles.roleSubtitle}>{t('worker_role_desc')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Admin Option */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => handleRoleSelect('admin')}
                style={styles.roleCard}
              >
                <View style={[styles.roleIconBox, { backgroundColor: colors.adminBadge + '18' }]}>
                  <Ionicons name="shield-checkmark" size={26} color={colors.adminBadge} />
                </View>
                <View style={styles.roleInfo}>
                  <Text style={styles.roleTitle}>{t('admin')}</Text>
                  <Text style={styles.roleSubtitle}>{t('admin_role_desc')}</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.loginHintRow}>
              <Text style={styles.loginHintText}>{t('already_registered')} </Text>
              <TouchableOpacity onPress={() => { resetFormState(); onNavigateToLogin(); }}>
                <Text style={styles.loginHintLink}>{t('sign_in_here')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* ==========================================================
             STEP 2: TAILORED REGISTRATION FORM
             ========================================================== */
          <View style={styles.formContainer}>
            {/* Role Header Badge */}
            <View style={styles.roleHeaderBadge}>
              <Text style={styles.roleHeaderBadgeText}>
                {t('registering_as')}:{' '}
                {selectedRole === 'worker'
                  ? t('worker').toUpperCase()
                  : selectedRole === 'admin'
                  ? t('admin').toUpperCase()
                  : t('customer').toUpperCase()}
              </Text>
            </View>

            {/* Error Banner */}
            {activeError && (
              <View style={styles.errorBanner}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.errorBannerText}>{activeError}</Text>
                <TouchableOpacity
                  onPress={() => {
                    setValidationError(null);
                    clearError();
                  }}
                >
                  <Ionicons name="close" size={16} color={colors.danger} />
                </TouchableOpacity>
              </View>
            )}

            {/* SECTION 1: PERSONAL INFORMATION */}
            <Text style={styles.sectionHeader}>{t('personal_info')}</Text>

            <Text style={styles.inputLabel}>{t('full_name')} *</Text>
            <TextInput
              style={[
                styles.input,
                focusedField === 'fullName' && styles.inputFocused,
                Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
              ]}
              placeholder={t('full_name_placeholder')}
              placeholderTextColor={colors.textMuted}
              value={fullName}
              onChangeText={(t) => {
                setFullName(t);
                setValidationError(null);
              }}
              onFocus={() => setFocusedField('fullName')}
              onBlur={() => setFocusedField(null)}
            />

            <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>
              {t('mobile_number')} *
            </Text>
            <TextInput
              style={[
                styles.input,
                focusedField === 'phone' && styles.inputFocused,
                Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
              ]}
              placeholder={t('mobile_placeholder')}
              placeholderTextColor={colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={(t) => {
                setPhone(t);
                setValidationError(null);
              }}
              onFocus={() => setFocusedField('phone')}
              onBlur={() => setFocusedField(null)}
            />

            <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>
              {t('email_address')} *
            </Text>
            <TextInput
              style={[
                styles.input,
                focusedField === 'email' && styles.inputFocused,
                Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
              ]}
              placeholder={t('email_placeholder')}
              placeholderTextColor={colors.textMuted}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={(t) => {
                setEmail(t);
                setValidationError(null);
              }}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />

            <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>
              {t('address_locality')} *
            </Text>
            <TextInput
              style={[
                styles.input,
                focusedField === 'address' && styles.inputFocused,
                Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
              ]}
              placeholder={t('address_placeholder')}
              placeholderTextColor={colors.textMuted}
              value={address}
              onChangeText={(t) => {
                setAddress(t);
                setValidationError(null);
              }}
              onFocus={() => setFocusedField('address')}
              onBlur={() => setFocusedField(null)}
            />

            {/* City & Pincode — Clean manual entry, no hardcoded defaults */}
            <View style={styles.twoColumnRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>{t('city')} *</Text>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'city' && styles.inputFocused,
                    Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                  ]}
                  placeholder={t('city_placeholder')}
                  placeholderTextColor={colors.textMuted}
                  value={city}
                  onChangeText={(t) => {
                    setCity(t);
                    setValidationError(null);
                  }}
                  onFocus={() => setFocusedField('city')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>{t('pincode')} *</Text>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'pincode' && styles.inputFocused,
                    Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                  ]}
                  placeholder={t('pincode_placeholder')}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  maxLength={6}
                  value={pincode}
                  onChangeText={(t) => {
                    setPincode(t);
                    setValidationError(null);
                  }}
                  onFocus={() => setFocusedField('pincode')}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* SECTION 2: STRONG PASSWORD & CONFIRM PASSWORD */}
            <Text style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
              {t('create_strong_password')}
            </Text>

            <Text style={styles.inputLabel}>{t('password')} *</Text>
            <View
              style={[
                styles.passwordContainer,
                focusedField === 'password' && styles.inputFocused,
              ]}
            >
              <TextInput
                style={[
                  styles.passwordInput,
                  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                ]}
                placeholder={t('password_placeholder')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={(t) => {
                  setPassword(t);
                  setValidationError(null);
                }}
                onFocus={() => setFocusedField('password')}
                onBlur={() => setFocusedField(null)}
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

            {/* Live 5-Point Password Strength Checklist */}
            <PasswordStrengthMeter password={password} />

            {/* Confirm Password Field with Live Real-time Matching */}
            <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>
              {t('confirm_password')} *
            </Text>
            <View
              style={[
                styles.passwordContainer,
                focusedField === 'confirmPassword' && styles.inputFocused,
                isPasswordsMatching && styles.inputContainerSuccess,
                isPasswordsMismatched && styles.inputContainerError,
              ]}
            >
              <TextInput
                style={[
                  styles.passwordInput,
                  Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                ]}
                placeholder={t('confirm_password_placeholder')}
                placeholderTextColor={colors.textMuted}
                secureTextEntry={!showConfirmPassword}
                value={confirmPassword}
                onChangeText={(t) => {
                  setConfirmPassword(t);
                  setValidationError(null);
                }}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
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

            {/* SECTION 3: WORKER SPECIFIC DETAILS & MANDATORY REAL DOCUMENTS */}
            {selectedRole === 'worker' && (
              <>
                <Text style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
                  {t('worker_details')}
                </Text>

                <Text style={styles.inputLabel}>{t('primary_skill')} *</Text>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'skill' && styles.inputFocused,
                    Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                  ]}
                  placeholder={t('primary_skill_placeholder')}
                  placeholderTextColor={colors.textMuted}
                  value={primarySkill}
                  onChangeText={(t) => {
                    setPrimarySkill(t);
                    setValidationError(null);
                  }}
                  onFocus={() => setFocusedField('skill')}
                  onBlur={() => setFocusedField(null)}
                />

                <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>
                  {t('experience_years')}
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'exp' && styles.inputFocused,
                    Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                  ]}
                  placeholder={t('experience_placeholder')}
                  placeholderTextColor={colors.textMuted}
                  keyboardType="numeric"
                  value={experienceYears}
                  onChangeText={setExperienceYears}
                  onFocus={() => setFocusedField('exp')}
                  onBlur={() => setFocusedField(null)}
                />

                <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>
                  {t('cooperative_society')} *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'coop' && styles.inputFocused,
                    Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                  ]}
                  placeholder={t('cooperative_placeholder')}
                  placeholderTextColor={colors.textMuted}
                  value={cooperativeSociety}
                  onChangeText={(t) => {
                    setCooperativeSociety(t);
                    setValidationError(null);
                  }}
                  onFocus={() => setFocusedField('coop')}
                  onBlur={() => setFocusedField(null)}
                />

                {/* Mandatory Real Document Collection */}
                <Text style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
                  {t('worker_docs_title')}
                </Text>
                <Text style={styles.sectionSubtitle}>{t('worker_docs_subtitle')}</Text>

                <DocumentUploader
                  title={t('identity_doc_title')}
                  required
                  value={identityDoc}
                  onChange={(doc) => {
                    setIdentityDoc(doc);
                    setDocErrors((prev) => ({ ...prev, identity: undefined }));
                    setValidationError(null);
                  }}
                  error={docErrors.identity}
                />

                <DocumentUploader
                  title={t('skill_cert_title')}
                  required
                  value={skillCertDoc}
                  onChange={(doc) => {
                    setSkillCertDoc(doc);
                    setDocErrors((prev) => ({ ...prev, skill: undefined }));
                    setValidationError(null);
                  }}
                  error={docErrors.skill}
                />
              </>
            )}

            {/* SECTION 4: ADMIN INSTITUTIONAL VERIFICATION */}
            {selectedRole === 'admin' && (
              <>
                <Text style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
                  {t('admin_details')}
                </Text>

                <Text style={styles.inputLabel}>{t('admin_designation')} *</Text>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'designation' && styles.inputFocused,
                    Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                  ]}
                  placeholder={t('admin_designation_placeholder')}
                  placeholderTextColor={colors.textMuted}
                  value={adminDesignation}
                  onChangeText={(t) => {
                    setAdminDesignation(t);
                    setValidationError(null);
                  }}
                  onFocus={() => setFocusedField('designation')}
                  onBlur={() => setFocusedField(null)}
                />

                <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>
                  {t('federation_name')} *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'fed' && styles.inputFocused,
                    Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                  ]}
                  placeholder={t('federation_placeholder')}
                  placeholderTextColor={colors.textMuted}
                  value={federationName}
                  onChangeText={(t) => {
                    setFederationName(t);
                    setValidationError(null);
                  }}
                  onFocus={() => setFocusedField('fed')}
                  onBlur={() => setFocusedField(null)}
                />

                <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>
                  {t('society_reg_no')} *
                </Text>
                <TextInput
                  style={[
                    styles.input,
                    focusedField === 'reg' && styles.inputFocused,
                    Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                  ]}
                  placeholder={t('society_reg_placeholder')}
                  placeholderTextColor={colors.textMuted}
                  value={societyRegNo}
                  onChangeText={(t) => {
                    setSocietyRegNo(t);
                    setValidationError(null);
                  }}
                  onFocus={() => setFocusedField('reg')}
                  onBlur={() => setFocusedField(null)}
                />

                <View style={styles.twoColumnRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Official Phone *</Text>
                    <TextInput
                      style={[
                        styles.input,
                        focusedField === 'offPhone' && styles.inputFocused,
                        Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                      ]}
                      placeholder="+91 80 2234 5678"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="phone-pad"
                      value={officialPhone}
                      onChangeText={(t) => {
                        setOfficialPhone(t);
                        setValidationError(null);
                      }}
                      onFocus={() => setFocusedField('offPhone')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Official Email *</Text>
                    <TextInput
                      style={[
                        styles.input,
                        focusedField === 'offEmail' && styles.inputFocused,
                        Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : null,
                      ]}
                      placeholder="admin@federation.coop"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={officialEmail}
                      onChangeText={(t) => {
                        setOfficialEmail(t);
                        setValidationError(null);
                      }}
                      onFocus={() => setFocusedField('offEmail')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                {/* Mandatory Official Authorization Document */}
                <Text style={[styles.sectionHeader, { marginTop: spacing.xl }]}>
                  {t('admin_auth_doc_title')}
                </Text>
                <Text style={styles.sectionSubtitle}>{t('admin_docs_subtitle')}</Text>

                <DocumentUploader
                  title={t('admin_auth_doc_title')}
                  required
                  value={adminAuthDoc}
                  onChange={(doc) => {
                    setAdminAuthDoc(doc);
                    setDocErrors((prev) => ({ ...prev, adminAuth: undefined }));
                    setValidationError(null);
                  }}
                  error={docErrors.adminAuth}
                />
              </>
            )}

            {/* Complete Registration Button */}
            <Button
              title={isLoading ? t('registering') : t('complete_registration')}
              onPress={handleSubmit}
              loading={isLoading}
              disabled={isLoading}
              variant="primary"
              size="lg"
              fullWidth
              style={{ marginTop: spacing.xl }}
            />
          </View>
        )}
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
    marginBottom: spacing.md,
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
  roleSelectionStep: {
    marginTop: spacing.sm,
  },
  questionTitle: {
    ...typography.h2,
    color: colors.text,
  },
  questionSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
    lineHeight: 18,
  },
  rolesList: {
    gap: spacing.md,
  },
  roleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  roleIconBox: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  roleInfo: {
    flex: 1,
    marginRight: spacing.xs,
  },
  roleTitle: {
    ...typography.h4,
    color: colors.text,
  },
  roleSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 3,
    lineHeight: 16,
  },
  loginHintRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.xxl,
  },
  loginHintText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  loginHintLink: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  formContainer: {
    marginTop: spacing.xs,
  },
  roleHeaderBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
    marginBottom: spacing.md,
  },
  roleHeaderBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 6,
    marginBottom: spacing.md,
  },
  sectionSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: spacing.md,
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
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
    fontSize: 14,
    color: colors.text,
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  passwordInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
    height: '100%',
  },
  eyeBtn: {
    padding: 6,
  },
  matchingNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 6,
    marginBottom: spacing.xs,
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
  twoColumnRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  successContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
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
    marginBottom: spacing.xl,
  },
  accountCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
  },
  accountCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  accountValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  verifyNoteBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(13, 122, 95, 0.25)',
    gap: 10,
    width: '100%',
  },
  verifyNoteText: {
    fontSize: 12,
    color: colors.primaryDark,
    flex: 1,
    lineHeight: 16,
  },
});
