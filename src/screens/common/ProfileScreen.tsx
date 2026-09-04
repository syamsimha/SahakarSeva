import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header, LanguageModal } from '../../components/common';
import { Avatar, Badge, Button } from '../../components/ui';
import { EditProfileModal, AddressManageModal } from '../../components/customer';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Customer } from '../../types';
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
  const { user, role, logout, updateCustomerProfile } = useAuth();
  const { language, t } = useLanguage();
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = () => {
    setLogoutModalVisible(true);
  };

  const confirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      setLogoutModalVisible(false);
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <View style={styles.container}>
      <Header title={t('profile_title')} />

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

        {/* Customer-Specific Shortcuts */}
        {role === 'customer' && (
          <View style={styles.menuGroup}>
            <Text style={styles.menuGroupTitle}>Customer Account & Addresses</Text>
            <TouchableOpacity onPress={() => setEditProfileVisible(true)} style={styles.menuItem}>
              <Ionicons name="create-outline" size={20} color={colors.primary} />
              <Text style={styles.menuItemText}>Edit Profile Details</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setAddressModalVisible(true)} style={styles.menuItem}>
              <Ionicons name="map-outline" size={20} color={colors.primary} />
              <Text style={styles.menuItemText}>Manage Saved Addresses</Text>
              <Text style={styles.menuItemValue}>
                {(user as Customer)?.savedAddresses?.length || 0}
              </Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

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
            <Text style={styles.menuItemText}>{t('language_setting')} / भाषा</Text>
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
          title={t('sign_out')}
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
      {role === 'customer' && (
        <>
          <EditProfileModal
            visible={editProfileVisible}
            customer={user as Customer}
            onClose={() => setEditProfileVisible(false)}
            onSave={updateCustomerProfile}
          />
          <AddressManageModal
            visible={addressModalVisible}
            customer={user as Customer}
            onClose={() => setAddressModalVisible(false)}
            onUpdateAddresses={(savedAddresses) => updateCustomerProfile({ savedAddresses })}
          />
        </>
      )}

      {/* Cross-platform Sign Out Modal */}
      <Modal
        visible={logoutModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalVisible(false)}
      >
        <View style={styles.logoutModalBackdrop}>
          <View style={styles.logoutModalCard}>
            <View style={styles.logoutIconBox}>
              <Ionicons name="log-out" size={28} color={colors.danger} />
            </View>
            <Text style={styles.logoutModalTitle}>{t('sign_out')}</Text>
            <Text style={styles.logoutModalSubtitle}>
              {t('sign_out_confirm')}
            </Text>
            <View style={styles.logoutActions}>
              <Button
                title={t('cancel')}
                variant="outline"
                size="md"
                onPress={() => setLogoutModalVisible(false)}
                style={{ flex: 1, marginRight: spacing.sm }}
                disabled={isLoggingOut}
              />
              <Button
                title={isLoggingOut ? '...' : t('sign_out')}
                variant="danger"
                size="md"
                loading={isLoggingOut}
                onPress={confirmLogout}
                style={{ flex: 1, marginLeft: spacing.sm }}
              />
            </View>
          </View>
        </View>
      </Modal>
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
  logoutModalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  logoutModalCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  logoutIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.dangerLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  logoutModalTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  logoutModalSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 18,
  },
  logoutActions: {
    flexDirection: 'row',
    width: '100%',
  },
});
