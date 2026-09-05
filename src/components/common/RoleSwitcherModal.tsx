import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Alert,
} from 'react-native';
import { colors, borderRadius, spacing, typography } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface RoleSwitcherModalProps {
  visible: boolean;
  onClose: () => void;
}

export const RoleSwitcherModal: React.FC<RoleSwitcherModalProps> = ({ visible, onClose }) => {
  const { user, role, switchRole, logout } = useAuth();

  const handleSelect = async (r: UserRole) => {
    if (user && user.role !== r) {
      const currentLabel = user.role === 'customer' ? 'Customer' : user.role === 'worker' ? 'Worker' : 'Administrator';
      const targetLabel = r === 'customer' ? 'Customer' : r === 'worker' ? 'Worker' : 'Administrator';
      Alert.alert(
        'Access Denied (RBAC Protected)',
        `Role-Based Access Control: You are authenticated as a ${currentLabel}.\n\nAccess to the ${targetLabel} dashboard is strictly restricted.\n\nTo access ${targetLabel} features, please Sign Out and log in with verified credentials.`
      );
      return;
    }
    await switchRole(r);
    onClose();
  };

  const roles: Array<{
    id: UserRole;
    title: string;
    description: string;
    icon: keyof typeof Ionicons.glyphMap;
    badgeColor: string;
  }> = [
    {
      id: 'customer',
      title: 'Customer (Household / Business)',
      description: 'Book verified cooperative workers, track active jobs, fair pricing.',
      icon: 'person',
      badgeColor: colors.customerBadge,
    },
    {
      id: 'worker',
      title: 'Cooperative Worker',
      description: 'View job dispatches, update live progress, check earnings & welfare.',
      icon: 'construct',
      badgeColor: colors.workerBadge,
    },
    {
      id: 'admin',
      title: 'Cooperative Administrator',
      description: 'Verify workers, monitor district demand, inspect AI forecasts.',
      icon: 'shield-checkmark',
      badgeColor: colors.adminBadge,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.content}>
              <View style={styles.header}>
                <View>
                  <Text style={styles.title}>Role-Based Access Control</Text>
                  <Text style={styles.subtitle}>
                    {user
                      ? `Authenticated: ${user.role.toUpperCase()} (Restricted Access)`
                      : 'Role Access Control'}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.list}>
                {roles.map((item) => {
                  const isSelected = role === item.id;
                  const isRestricted = Boolean(user && user.role !== item.id);

                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.7}
                      onPress={() => handleSelect(item.id)}
                      style={[
                        styles.roleItem,
                        isSelected && styles.roleItemSelected,
                        isRestricted && styles.roleItemRestricted,
                      ]}
                    >
                      <View style={[styles.iconCircle, { backgroundColor: `${item.badgeColor}18` }]}>
                        <Ionicons name={item.icon} size={22} color={item.badgeColor} />
                      </View>
                      <View style={styles.roleTexts}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={[styles.roleTitle, isSelected && { color: item.badgeColor }]}>
                            {item.title}
                          </Text>
                          {isRestricted && (
                            <View style={styles.restrictedBadge}>
                              <Ionicons name="lock-closed" size={10} color={colors.danger} />
                              <Text style={styles.restrictedBadgeText}>LOCKED</Text>
                            </View>
                          )}
                        </View>
                        <Text style={styles.roleDesc}>
                          {isRestricted
                            ? `Restricted: ${user?.role.toUpperCase()} cannot access ${item.id} dashboard.`
                            : item.description}
                        </Text>
                      </View>
                      {isSelected && (
                        <Ionicons name="radio-button-on" size={20} color={item.badgeColor} />
                      )}
                      {isRestricted && !isSelected && (
                        <Ionicons name="lock-closed-outline" size={18} color={colors.textMuted} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Instant Sign Out Option for Role Switch */}
              {user && (
                <View style={styles.signOutBox}>
                  <Text style={styles.signOutBoxText}>
                    Signed in as {user.role === 'customer' ? 'Customer' : user.role === 'worker' ? 'Worker' : 'Administrator'}. Cross-dashboard access is restricted by RBAC policy.
                  </Text>
                  <TouchableOpacity
                    style={styles.signOutBtn}
                    onPress={async () => {
                      onClose();
                      await logout();
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="log-out-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.signOutBtnText}>Sign Out to Switch Dashboard</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  title: {
    ...typography.h4,
    color: colors.text,
  },
  subtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  list: {
    gap: spacing.sm,
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  roleItemSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  roleItemRestricted: {
    opacity: 0.65,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  restrictedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.round,
  },
  restrictedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.danger,
    letterSpacing: 0.5,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  roleTexts: {
    flex: 1,
    marginRight: spacing.xs,
  },
  roleTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  roleDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  signOutBox: {
    marginTop: spacing.md,
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    alignItems: 'center',
  },
  signOutBoxText: {
    fontSize: 11,
    color: '#991B1B',
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 15,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.danger,
    borderRadius: borderRadius.md,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    width: '100%',
  },
  signOutBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
