import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header, LanguageModal, RoleSwitcherModal } from '../../components/common';
import { Avatar, Badge, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

interface ProfileScreenProps {
  onNavigateToHelp: () => void;
  onNavigateToWelfare?: () => void;
  onNavigateToVerification?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onNavigateToHelp,
  onNavigateToWelfare,
  onNavigateToVerification,
}) => {
  const { user, role, logout } = useAuth();
  const { language } = useLanguage();
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: logout },
    ]);
  };

  return (
    <View style={styles.container}>
      <Header title="My Profile & Settings" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Avatar name={user?.name || 'Sahakar Member'} url={user?.avatarUrl} size={64} showVerifiedBadge />
          <View style={styles.profileInfo}>
            <View style={styles.nameBadgeRow}>
              <Text style={styles.userName}>{user?.name || 'Ramesh Sharma'}</Text>
              <Badge
                variant="role"
                label={role === 'customer' ? 'Customer' : role === 'worker' ? 'Worker' : 'Admin'}
                style={{
                  backgroundColor:
                    role === 'customer'
                      ? colors.customerBadge + '20'
                      : role === 'worker'
                      ? colors.workerBadge + '20'
                      : colors.adminBadge + '20',
                }}
              />
            </View>
            <Text style={styles.userPhone}>{user?.phone}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <Text style={styles.userCity}>📍 {user?.address}, {user?.city}</Text>
          </View>
        </View>

        {/* Evaluator Role Switcher Tile */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setRoleModalVisible(true)}
          style={styles.switchRoleCard}
        >
          <View style={styles.switchRoleLeft}>
            <View style={styles.switchRoleIcon}>
              <Ionicons name="swap-horizontal" size={20} color={colors.primary} />
            </View>
            <View>
              <Text style={styles.switchRoleTitle}>Switch Application Persona</Text>
              <Text style={styles.switchRoleSub}>
                Currently active: <Text style={{ fontWeight: '700' }}>{role.toUpperCase()}</Text> (Tap to test Customer / Worker / Admin)
              </Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primary} />
        </TouchableOpacity>

        {/* Role-Specific Shortcuts */}
        {role === 'worker' && (
          <View style={styles.menuGroup}>
            <Text style={styles.menuGroupTitle}>Worker Cooperative Tools</Text>
            {onNavigateToWelfare && (
              <TouchableOpacity onPress={onNavigateToWelfare} style={styles.menuItem}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                <Text style={styles.menuItemText}>Cooperative Welfare & Insurance Pass</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
            {onNavigateToVerification && (
              <TouchableOpacity onPress={onNavigateToVerification} style={styles.menuItem}>
                <Ionicons name="id-card-outline" size={20} color={colors.accent} />
                <Text style={styles.menuItemText}>Skill Certification & Verification Status</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Preferences & Settings */}
        <View style={styles.menuGroup}>
          <Text style={styles.menuGroupTitle}>Preferences & System</Text>

          <TouchableOpacity onPress={() => setLangModalVisible(true)} style={styles.menuItem}>
            <Ionicons name="language-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.menuItemText}>Language / भाषा</Text>
            <Text style={styles.menuItemValue}>{language.toUpperCase()}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity onPress={onNavigateToHelp} style={styles.menuItem}>
            <Ionicons name="help-circle-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.menuItemText}>Help, FAQs & Cooperative Support</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => Alert.alert('Privacy & Terms', 'Operating under National Cooperative Policy & Indian Labour Welfare Board statutory norms.')}
            style={styles.menuItem}
          >
            <Ionicons name="lock-closed-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.menuItemText}>Privacy Policy & Cooperative Charter</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <Button
          title="Sign Out"
          icon="log-out-outline"
          onPress={handleLogout}
          variant="outline"
          size="md"
          fullWidth
          style={styles.logoutBtn}
          textStyle={{ color: colors.danger }}
        />

        {/* Cooperative Federation Tag */}
        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>
            Sahakar Sathi v1.0 • Supported by Ministry of Cooperation & Labour Federations
          </Text>
        </View>
      </ScrollView>

      <LanguageModal
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
      />
      <RoleSwitcherModal
        visible={roleModalVisible}
        onClose={() => setRoleModalVisible(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  profileInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userName: {
    ...typography.h4,
    color: colors.text,
  },
  userPhone: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  userEmail: {
    fontSize: 11,
    color: colors.textMuted,
  },
  userCity: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 4,
  },
  switchRoleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(13, 122, 95, 0.25)',
  },
  switchRoleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  switchRoleIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.sm,
  },
  switchRoleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  switchRoleSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  menuGroup: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuGroupTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    paddingTop: spacing.md,
    paddingBottom: spacing.xs,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  menuItemText: {
    fontSize: 13,
    color: colors.text,
    flex: 1,
    marginLeft: spacing.md,
  },
  menuItemValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 6,
  },
  logoutBtn: {
    borderColor: colors.danger,
    marginTop: spacing.sm,
  },
  footerNote: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  footerNoteText: {
    fontSize: 10,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
