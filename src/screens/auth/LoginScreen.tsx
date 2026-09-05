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

interface LoginScreenProps {
  onNavigateToRegister: () => void;
  onLoginSuccess: () => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  onNavigateToRegister,
  onLoginSuccess,
}) => {
  const { login, isLoading } = useAuth();
  const [identifier, setIdentifier] = useState('9845012345');
  const [password, setPassword] = useState('coop@1234');
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (roleToUse: UserRole = selectedRole) => {
    let currentId = identifier;

    if (roleToUse === 'admin') {
      if (selectedRole !== 'admin') {
        currentId = '9448088990';
        setIdentifier('9448088990');
      } else {
        const cleanId = identifier.replace(/\s+/g, '').replace('+91', '');
        const isMasterAdmin =
          cleanId === '9448088990' ||
          identifier.toLowerCase().includes('lakshmi.admin') ||
          identifier.toLowerCase().includes('admin');

        if (!isMasterAdmin && identifier.trim().length > 0) {
          Alert.alert(
            'Single Admin Protocol Enforced',
            'Only the single designated Master Administrator (+91 94480 88990) is authorized to log in and control all district jobs.\n\nMultiple administrative accounts are strictly prohibited.'
          );
          return;
        }
      }
    }

    try {
      await login(roleToUse, currentId, password);
      onLoginSuccess();
    } catch (err: any) {
      Alert.alert('Sign In Denied', err.message || 'Authentication error');
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Top Header */}
        <View style={styles.header}>
          <View style={styles.logoBox}>
            <Ionicons name="people" size={32} color={colors.textInverse} />
          </View>
          <Text style={styles.title}>Welcome to Sahakar Sathi</Text>
          <Text style={styles.subtitle}>
            Cooperative Services Marketplace for Workers & Households
          </Text>
        </View>

        {/* Quick Demo Access Bar */}
        <View style={styles.demoCard}>
          <View style={styles.demoHeader}>
            <Ionicons name="flash" size={14} color={colors.accent} />
            <Text style={styles.demoTitle}>Team Demo Mode — 1-Tap Login</Text>
          </View>
          <View style={styles.demoButtonsRow}>
            <TouchableOpacity
              onPress={() => handleLogin('customer')}
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
              onPress={() => handleLogin('worker')}
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
              onPress={() => handleLogin('admin')}
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
                Admin (Sole Controller)
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Traditional Credentials Form */}
        <View style={styles.form}>
          <Text style={styles.inputLabel}>Mobile Number or Email</Text>
          <View style={styles.inputContainer}>
            <Ionicons
              name="call-outline"
              size={18}
              color={colors.textSecondary}
              style={styles.inputIcon}
            />
            <TextInput
              style={styles.input}
              placeholder="e.g. 98450 12345"
              placeholderTextColor={colors.textMuted}
              value={identifier}
              onChangeText={setIdentifier}
              keyboardType="phone-pad"
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
              onChangeText={setPassword}
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
