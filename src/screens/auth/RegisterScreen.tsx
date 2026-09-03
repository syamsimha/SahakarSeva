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
import { useAuth } from '../../context/AuthContext';
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
  const { login } = useAuth();
  const [step, setStep] = useState<'role' | 'form'>('role');
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');

  // Common Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Bengaluru');

  // Worker-specific Fields
  const [primarySkill, setPrimarySkill] = useState('Electrical');
  const [experienceYears, setExperienceYears] = useState('5');
  const [cooperativeSociety, setCooperativeSociety] = useState('Nagarika Seva Sahakari Samiti');
  const [aadhaarUploaded, setAadhaarUploaded] = useState(false);
  const [certUploaded, setCertUploaded] = useState(false);

  // Admin-specific Fields
  const [adminDesignation, setAdminDesignation] = useState('District Cooperative Officer');
  const [societyRegNo, setSocietyRegNo] = useState('DRB/LCC/2024/098');

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setStep('form');
  };

  const handleSubmit = async () => {
    await login(selectedRole);
    onRegisterSuccess();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (step === 'form') setStep('role');
              else onNavigateToLogin();
            }}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={22} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Create Account</Text>
        </View>

        {step === 'role' ? (
          /* STEP 1: How do you want to use Sahakar Sathi? */
          <View style={styles.roleSelectionStep}>
            <Text style={styles.questionTitle}>How do you want to use Sahakar Sathi?</Text>
            <Text style={styles.questionSubtitle}>
              Select your primary role to access tailored cooperative features
            </Text>

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
                  <Text style={styles.roleTitle}>Customer</Text>
                  <Text style={styles.roleSubtitle}>
                    I want to hire verified electricians, plumbers, carpenters & domestic workers
                  </Text>
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
                  <Text style={styles.roleTitle}>Cooperative Worker</Text>
                  <Text style={styles.roleSubtitle}>
                    I am a skilled artisan / worker seeking fair wages, health cover & steady jobs
                  </Text>
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
                  <Text style={styles.roleTitle}>Cooperative Administrator</Text>
                  <Text style={styles.roleSubtitle}>
                    I manage a Labour Cooperative Federation, Society verification & analytics
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.loginHintRow}>
              <Text style={styles.loginHintText}>Already registered? </Text>
              <TouchableOpacity onPress={onNavigateToLogin}>
                <Text style={styles.loginHintLink}>Sign In here</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* STEP 2: Tailored Registration Form */
          <View style={styles.formContainer}>
            <View style={styles.roleHeaderBadge}>
              <Text style={styles.roleHeaderBadgeText}>
                Registering as: {selectedRole.toUpperCase()}
              </Text>
            </View>

            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Anand Kumar"
              value={fullName}
              onChangeText={setFullName}
            />

            <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Mobile Number</Text>
            <TextInput
              style={styles.input}
              placeholder="+91 98765 43210"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />

            <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Email Address</Text>
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Address / Locality</Text>
            <TextInput
              style={styles.input}
              placeholder="House, Street, Area"
              value={address}
              onChangeText={setAddress}
            />

            {/* Role-specific additions */}
            {selectedRole === 'worker' && (
              <>
                <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Primary Skill / Trade</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Electrician, Plumber, Carpenter"
                  value={primarySkill}
                  onChangeText={setPrimarySkill}
                />

                <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Years of Experience</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 6"
                  keyboardType="numeric"
                  value={experienceYears}
                  onChangeText={setExperienceYears}
                />

                <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Affiliated Cooperative Society</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Nagarika Seva Sahakari Samiti"
                  value={cooperativeSociety}
                  onChangeText={setCooperativeSociety}
                />

                <Text style={[styles.inputLabel, { marginTop: spacing.lg }]}>Identity & Skill Documents</Text>
                <View style={styles.docUploadBox}>
                  <TouchableOpacity
                    onPress={() => setAadhaarUploaded(true)}
                    style={[styles.uploadPill, aadhaarUploaded && styles.uploadPillSuccess]}
                  >
                    <Ionicons
                      name={aadhaarUploaded ? 'checkmark-circle' : 'cloud-upload-outline'}
                      size={18}
                      color={aadhaarUploaded ? colors.success : colors.primary}
                    />
                    <Text
                      style={[styles.uploadPillText, aadhaarUploaded && styles.uploadPillTextSuccess]}
                    >
                      {aadhaarUploaded ? 'Aadhaar Card Attached' : 'Attach Aadhaar Card'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setCertUploaded(true)}
                    style={[styles.uploadPill, certUploaded && styles.uploadPillSuccess]}
                  >
                    <Ionicons
                      name={certUploaded ? 'checkmark-circle' : 'cloud-upload-outline'}
                      size={18}
                      color={certUploaded ? colors.success : colors.primary}
                    />
                    <Text
                      style={[styles.uploadPillText, certUploaded && styles.uploadPillTextSuccess]}
                    >
                      {certUploaded ? 'Skill / ITI Certificate Attached' : 'Attach Skill / ITI Certificate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            {selectedRole === 'admin' && (
              <>
                <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Admin Designation</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. District Registrar"
                  value={adminDesignation}
                  onChangeText={setAdminDesignation}
                />

                <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Society Registration Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. DRB/LCC/1998/1472"
                  value={societyRegNo}
                  onChangeText={setSocietyRegNo}
                />
              </>
            )}

            <Button
              title="Complete Registration"
              onPress={handleSubmit}
              variant="primary"
              size="lg"
              fullWidth
              style={{ marginTop: spacing.xl }}
            />
          </View>
        )}
      </ScrollView>
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
    paddingVertical: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backBtn: {
    padding: 6,
    marginRight: spacing.sm,
  },
  screenTitle: {
    ...typography.h3,
    color: colors.text,
  },
  roleSelectionStep: {
    marginTop: spacing.md,
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
    marginTop: 2,
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
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
    fontSize: 14,
    color: colors.text,
  },
  docUploadBox: {
    gap: spacing.sm,
  },
  uploadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    borderRadius: borderRadius.md,
    padding: spacing.md,
  },
  uploadPillSuccess: {
    backgroundColor: colors.successLight,
    borderColor: colors.success,
    borderStyle: 'solid',
  },
  uploadPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: 8,
  },
  uploadPillTextSuccess: {
    color: colors.success,
  },
});
