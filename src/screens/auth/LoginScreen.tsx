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
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface LoginScreenProps {
  onNavigateToRegister: () => void;
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onNavigateToRegister,
  onLoginSuccess,
}) => {
  const { login, loginWithEmail, isLoading, authError, clearError, isBackendConnected } = useAuth();
  const [identifier, setIdentifier] = useState('customer@sahakar.in');
  const [password, setPassword] = useState('coop@1234');
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const [showPassword, setShowPassword] = useState(false);

  const handleIdentifierChange = (text: string) => {
    if (authError) clearError();
    setIdentifier(text);
  };

  const handlePasswordChange = (text: string) => {
    if (authError) clearError();
    setPassword(text);
  };

  const handleLogin = async (roleToUse: UserRole = selectedRole) => {
    try {
      if (identifier.includes('@')) {
        await loginWithEmail(identifier, password);
      } else {
        await login(roleToUse, identifier, password);
      }
      onLoginSuccess();
    } catch (e) {
      // Handled in AuthContext authError
    }
  };

  const handleQuickDemoLogin = async (roleToUse: UserRole) => {
    setSelectedRole(roleToUse);
    try {
      await login(roleToUse);
      onLoginSuccess();
    } catch (e) {
      // Handled in AuthContext
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Ionicons name="people" size={32} color={colors.textInverse} />
          </View>
          <Text style={styles.title}>Welcome to Sahakar Sathi</Text>
          <Text style={styles.subtitle}>
            Cooperative Services Marketplace for Workers & Households
          </Text>

          {/* Backend Status Indicator */}
          <View style={[styles.statusPill, isBackendConnected ? styles.statusPillLive : styles.statusPillDemo]}>
            <Ionicons
              name={isBackendConnected ? 'cloud-done' : 'information-circle'}
              size={13}
              color={isBackendConnected ? colors.success : colors.accent}
            />
            <Text style={[styles.statusText, isBackendConnected ? styles.statusTextLive : styles.statusTextDemo]}>
              {isBackendConnected ? 'Supabase Auth Connected' : 'Demo & Offline Mode Active'}
            </Text>
          </View>
        </View>

        {/* Quick Demo Access Bar */}
        <View style={styles.demoCard}>
          <View style={styles.demoHeader}>
            <Ionicons name="flash" size={14} color={colors.accent} />
            <Text style={styles.demoTitle}>Team Demo Mode — 1-Tap Login</Text>
          </View>
          <View style={styles.demoButtonsRow}>
            <TouchableOpacity
              onPress={() => handleQuickDemoLogin('customer')}
              style={[
                styles.demoBtn,
                selectedRole === 'customer' && styles.demoBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.demoBtnText,
                  selectedRole === 'customer' && styles.demoBtnTextActive,
                ]}
              >
                Customer
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleQuickDemoLogin('worker')}
              style={[
                styles.demoBtn,
                selectedRole === 'worker' && styles.demoBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.demoBtnText,
                  selectedRole === 'worker' && styles.demoBtnTextActive,
                ]}
              >
                Worker
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleQuickDemoLogin('admin')}
              style={[
                styles.demoBtn,
                selectedRole === 'admin' && styles.demoBtnActive,
              ]}
            >
              <Text
                style={[
                  styles.demoBtnText,
                  selectedRole === 'admin' && styles.demoBtnTextActive,
                ]}
              >
                Admin
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Traditional Credentials Form */}
        <View style={styles.form}>
          {/* Error Banner */}
          {authError && (
            <View style={styles.errorBanner}>
              <Ionicons name="alert-circle" size={18} color={colors.danger} />
              <Text style={styles.errorBannerText}>{authError}</Text>
              <TouchableOpacity onPress={clearError}>
                <Ionicons name="close" size={16} color={colors.danger} />
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.inputLabel}>Email Address or Mobile Number</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="mail-outline"
              size={18}
              color={colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="e.g. user@sahakar.in or 98450 12345"
              placeholderTextColor={colors.textMuted}
              value={identifier}
              onChangeText={handleIdentifierChange}
              autoCapitalize="none"
              keyboardType="email-address"
            />
          </View>

          <Text style={[styles.inputLabel, { marginTop: spacing.md }]}>Password</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="lock-closed-outline"
              size={18}
              color={colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={handlePasswordChange}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity
              onPress={() => setShowPassword(!showPassword)}
              style={styles.eyeBtn}
            >
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={18}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.forgotBtn}>
            <Text style={styles.forgotText}>Forgot Password?</Text>
          </TouchableOpacity>

          <Button
            title="Sign In"
            onPress={() => handleLogin(selectedRole)}
            loading={isLoading}
            variant="primary"
            size="lg"
            fullWidth
            style={{ marginTop: spacing.lg }}
          />

          <View style={styles.registerRow}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={onNavigateToRegister}>
              <Text style={styles.registerLink}>Register</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Cooperative Trust Badge */}
        <View style={styles.trustBadge}>
          <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
          <Text style={styles.trustText}>
            Operated by Registered State Labour Cooperative Federations
          </Text>
        </View>
      </ScrollView>
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
    paddingVertical: spacing.xxl,
    justifyContent: 'center',
    minHeight: '100%',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    ...typography.h2,
    color: colors.text,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
    maxWidth: 280,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 10,
    gap: 5,
  },
  statusPillLive: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
  },
  statusPillDemo: {
    backgroundColor: 'rgba(234, 88, 12, 0.1)',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextLive: {
    color: colors.success,
  },
  statusTextDemo: {
    color: colors.accent,
  },
  demoCard: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(13, 122, 95, 0.2)',
  },
  demoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  demoTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryDark,
    marginLeft: 6,
  },
  demoButtonsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  demoBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  demoBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  demoBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  demoBtnTextActive: {
    color: colors.textInverse,
  },
  form: {
    marginBottom: spacing.xl,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    marginBottom: spacing.md,
    gap: 8,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: colors.danger,
    fontWeight: '500',
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
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: colors.text,
  },
  eyeBtn: {
    padding: 4,
  },
  forgotBtn: {
    alignSelf: 'flex-end',
    marginTop: spacing.sm,
  },
  forgotText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  registerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
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
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
  },
  trustText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
    marginLeft: 6,
    textAlign: 'center',
  },
});
