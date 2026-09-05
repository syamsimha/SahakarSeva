import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { Header } from '../../components/common';
import { Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { Ionicons } from '@expo/vector-icons';

interface AccessDeniedScreenProps {
  requiredRole: 'worker' | 'admin';
  onReturnToCustomer?: () => void;
}

export const AccessDeniedScreen: React.FC<AccessDeniedScreenProps> = ({
  requiredRole,
  onReturnToCustomer,
}) => {
  const { user, logout, switchRole } = useAuth();

  const portalName = requiredRole === 'admin' ? 'Cooperative Admin Portal' : 'Worker Dispatch Dashboard';

  const handleReturn = async () => {
    if (onReturnToCustomer) {
      onReturnToCustomer();
    } else {
      await switchRole('customer');
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Access Control" showBack={false} />

      <View style={styles.content}>
        {/* Security Shield Icon */}
        <View style={styles.iconCircle}>
          <Ionicons name="lock-closed" size={48} color={colors.danger} />
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>RBAC SECURITY LEVEL 403</Text>
        </View>

        <Text style={styles.title}>Access Restricted</Text>
        <Text style={styles.subtitle}>
          You are signed in as a <Text style={styles.boldText}>{user?.name || 'Customer'}</Text> with{' '}
          <Text style={styles.boldText}>Customer Role</Text> permissions.
        </Text>

        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Ionicons name="shield-outline" size={18} color={colors.danger} />
            <Text style={styles.infoText}>
              The <Text style={{ fontWeight: '700' }}>{portalName}</Text> requires verified{' '}
              {requiredRole.toUpperCase()} credentials.
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Ionicons name="information-circle-outline" size={18} color={colors.textSecondary} />
            <Text style={styles.infoSubText}>
              Under cooperative security bylaws, customers cannot access internal worker dispatch queues,
              welfare fund payouts, or administrative management tools.
            </Text>
          </View>
        </View>

        <View style={styles.actionsBox}>
          <Button
            title="Return to Customer Dashboard"
            icon="home-outline"
            variant="primary"
            fullWidth
            onPress={handleReturn}
            style={{ marginBottom: 12 }}
          />

          <Button
            title="Sign Out & Switch Account"
            icon="log-out-outline"
            variant="outline"
            fullWidth
            onPress={logout}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: '#FCA5A5',
  },
  badge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: spacing.sm,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.danger,
    letterSpacing: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  boldText: {
    fontWeight: '700',
    color: colors.text,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    width: '100%',
    marginBottom: spacing.xl,
    ...typography.shadowSm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  infoText: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
    lineHeight: 18,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  infoSubText: {
    fontSize: 11,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 16,
  },
  actionsBox: {
    width: '100%',
  },
});
