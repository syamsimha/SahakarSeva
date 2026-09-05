import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header, LanguageModal } from '../../components/common';
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
  const { language, t } = useLanguage();
  const [langModalVisible, setLangModalVisible] = useState(false);

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      try {
        await logout();
      } catch (e) {
        console.warn('Logout error:', e);
      }
      return;
    }
    Alert.alert(t('logout'), 'Are you sure you want to sign out?', [
      { text: t('cancel'), style: 'cancel' },
      { text: t('logout'), style: 'destructive', onPress: logout },
    ]);
  };

  const getRoleBadgeLabel = () => {
    switch (role) {
      case 'worker':
        return t('worker');
      case 'admin':
        return t('admin');
      default:
        return t('customer');
    }
  };

  return (
    <View style={styles.container}>
      <Header title={t('nav_profile')} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Avatar name={user?.name || 'Sahakar Member'} url={user?.avatarUrl} size={64} showVerifiedBadge />
          <View style={styles.profileInfo}>
            <View style={styles.nameBadgeRow}>
              <Text style={styles.userName}>{user?.name || 'Sahakar Member'}</Text>
              <Badge
                variant="role"
                label={getRoleBadgeLabel()}
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
            <Text style={styles.userPhone}>{user?.phone || 'Mobile not registered'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            <Text style={styles.userCity}>📍 {user?.address ? `${user.address}, ` : ''}{user?.city || 'Bengaluru'}</Text>
          </View>
        </View>

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
            <Text style={styles.menuItemText}>{t('language')}</Text>
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
          title={t('logout')}
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
            Sahakar Sathi • Supported by Ministry of Cooperation & Labour Federations
          </Text>
        </View>
      </ScrollView>

      <LanguageModal
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
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
