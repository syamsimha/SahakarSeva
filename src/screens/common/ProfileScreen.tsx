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
import { Header, LanguageModal, RoleSwitcherModal, EditProfileModal } from '../../components/common';
import { Avatar, Badge, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { pickImageFromLibrary, takePhotoWithCamera } from '../../utils/imagePicker';
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
  const { user, role, logout, updateUserProfile } = useAuth();
  const { language, t } = useLanguage();
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [editProfileModalVisible, setEditProfileModalVisible] = useState(false);
  const [showPhotoSheet, setShowPhotoSheet] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  // Photo handlers for immediate upload from Profile Card
  const handlePickFromAlbum = async () => {
    setShowPhotoSheet(false);
    const uri = await pickImageFromLibrary();
    if (uri) {
      await updateUserProfile({ avatarUrl: uri });
      Alert.alert('Photo Updated', 'Your profile photo has been updated successfully.');
    }
  };

  const handleCaptureFromCamera = async () => {
    setShowPhotoSheet(false);
    const uri = await takePhotoWithCamera();
    if (uri) {
      await updateUserProfile({ avatarUrl: uri });
      Alert.alert('Photo Updated', 'Your profile photo has been updated successfully.');
    }
  };

  const handleRemovePhoto = async () => {
    setShowPhotoSheet(false);
    await updateUserProfile({ avatarUrl: undefined });
    Alert.alert('Photo Removed', 'Your profile photo has been removed.');
  };

  const handleLogout = () => {
    setShowSignOutConfirm(true);
  };

  return (
    <View style={styles.container}>
      <Header title={t('profile_settings')} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setShowPhotoSheet(true)}
            style={styles.avatarTouchWrapper}
          >
            <Avatar name={user?.name || 'Sahakar Member'} url={user?.avatarUrl} size={68} showVerifiedBadge />
            <View style={styles.avatarCameraBadge}>
              <Ionicons name="camera" size={13} color="#FFFFFF" />
            </View>
          </TouchableOpacity>

          <View style={styles.profileInfo}>
            <View style={styles.nameBadgeRow}>
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => setEditProfileModalVisible(true)}
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 6 }}
              >
                <Text style={styles.userName} numberOfLines={1}>{user?.name || 'Ramesh Sharma'}</Text>
                <Ionicons name="pencil" size={13} color={colors.primary} style={{ marginLeft: 6 }} />
              </TouchableOpacity>
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

            <TouchableOpacity activeOpacity={0.7} onPress={() => setEditProfileModalVisible(true)}>
              <Text style={styles.userPhone}>{user?.phone}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
              <Text style={styles.userCity}>📍 {user?.address}, {user?.city}</Text>
            </TouchableOpacity>

            {/* Quick Edit Profile & Upload Photo Row */}
            <View style={styles.profileActionRow}>
              <TouchableOpacity
                style={styles.editProfileBtn}
                onPress={() => setEditProfileModalVisible(true)}
              >
                <Ionicons name="create-outline" size={13} color={colors.primary} />
                <Text style={styles.editProfileBtnText}>Edit Details</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.changePhotoSmallBtn}
                onPress={() => setShowPhotoSheet(true)}
              >
                <Ionicons name="camera-outline" size={13} color="#16A34A" />
                <Text style={styles.changePhotoSmallBtnText}>Upload Photo</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Member Details & Editable Personal Information Card */}
        <View style={styles.detailsCard}>
          <View style={styles.detailsHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.detailsHeaderTitle}>Personal Information & Details</Text>
            </View>
            <TouchableOpacity
              onPress={() => setEditProfileModalVisible(true)}
              style={styles.detailsEditAllBtn}
            >
              <Ionicons name="pencil" size={12} color={colors.primary} />
              <Text style={styles.detailsEditAllBtnText}>Edit</Text>
            </TouchableOpacity>
          </View>

          {/* Full Name Row */}
          <TouchableOpacity
            style={styles.detailRow}
            activeOpacity={0.7}
            onPress={() => setEditProfileModalVisible(true)}
          >
            <View style={styles.detailRowLeft}>
              <Text style={styles.detailLabel}>Full Name</Text>
              <Text style={styles.detailValue}>{user?.name || 'Ramesh Sharma'}</Text>
            </View>
            <View style={styles.detailEditBadge}>
              <Ionicons name="pencil" size={11} color={colors.primary} />
              <Text style={styles.detailEditText}>Change</Text>
            </View>
          </TouchableOpacity>

          {/* Phone Row */}
          <TouchableOpacity
            style={styles.detailRow}
            activeOpacity={0.7}
            onPress={() => setEditProfileModalVisible(true)}
          >
            <View style={styles.detailRowLeft}>
              <Text style={styles.detailLabel}>Mobile Phone</Text>
              <Text style={styles.detailValue}>{user?.phone || 'Not provided'}</Text>
            </View>
            <View style={styles.detailEditBadge}>
              <Ionicons name="pencil" size={11} color={colors.primary} />
              <Text style={styles.detailEditText}>Change</Text>
            </View>
          </TouchableOpacity>

          {/* Email Row */}
          <TouchableOpacity
            style={styles.detailRow}
            activeOpacity={0.7}
            onPress={() => setEditProfileModalVisible(true)}
          >
            <View style={styles.detailRowLeft}>
              <Text style={styles.detailLabel}>Email Address</Text>
              <Text style={styles.detailValue}>{user?.email || 'Not provided'}</Text>
            </View>
            <View style={styles.detailEditBadge}>
              <Ionicons name="pencil" size={11} color={colors.primary} />
              <Text style={styles.detailEditText}>Change</Text>
            </View>
          </TouchableOpacity>

          {/* Address Row */}
          <TouchableOpacity
            style={styles.detailRow}
            activeOpacity={0.7}
            onPress={() => setEditProfileModalVisible(true)}
          >
            <View style={styles.detailRowLeft}>
              <Text style={styles.detailLabel}>Address & Location</Text>
              <Text style={styles.detailValue}>
                {user?.address ? `${user.address}, ${user.city} - ${user.pincode}` : `${user?.city || 'Bengaluru'}`}
              </Text>
            </View>
            <View style={styles.detailEditBadge}>
              <Ionicons name="pencil" size={11} color={colors.primary} />
              <Text style={styles.detailEditText}>Change</Text>
            </View>
          </TouchableOpacity>

          {/* Role specific detail display */}
          {role === 'worker' && Boolean((user as any)?.primarySkill) && (
            <TouchableOpacity
              style={styles.detailRow}
              activeOpacity={0.7}
              onPress={() => setEditProfileModalVisible(true)}
            >
              <View style={styles.detailRowLeft}>
                <Text style={styles.detailLabel}>Skill & Hourly Rate</Text>
                <Text style={styles.detailValue}>
                  {(user as any).primarySkill} • ₹{(user as any).hourlyRate}/hr ({(user as any).experienceYears} yrs)
                </Text>
              </View>
              <View style={styles.detailEditBadge}>
                <Ionicons name="pencil" size={11} color={colors.primary} />
                <Text style={styles.detailEditText}>Change</Text>
              </View>
            </TouchableOpacity>
          )}

          {role === 'admin' && Boolean((user as any)?.adminDesignation) && (
            <TouchableOpacity
              style={styles.detailRow}
              activeOpacity={0.7}
              onPress={() => setEditProfileModalVisible(true)}
            >
              <View style={styles.detailRowLeft}>
                <Text style={styles.detailLabel}>Designation & Zone</Text>
                <Text style={styles.detailValue}>
                  {(user as any).adminDesignation} • {(user as any).zoneAssigned}
                </Text>
              </View>
              <View style={styles.detailEditBadge}>
                <Ionicons name="pencil" size={11} color={colors.primary} />
                <Text style={styles.detailEditText}>Change</Text>
              </View>
            </TouchableOpacity>
          )}
        </View>

        {/* Role-Based Access Control Security Card (Enforced for all roles) */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => setRoleModalVisible(true)}
          style={[
            styles.switchRoleCard,
            { borderColor: '#DBEAFE', backgroundColor: '#EFF6FF' },
          ]}
        >
          <View style={styles.switchRoleLeft}>
            <View style={[styles.switchRoleIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="shield-checkmark" size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Text style={styles.switchRoleTitle}>Role Security (RBAC Active)</Text>
                <View style={{ backgroundColor: '#DCFCE7', paddingHorizontal: 6, paddingVertical: 1, borderRadius: 10 }}>
                  <Text style={{ fontSize: 9, fontWeight: '800', color: '#15803D' }}>ENFORCED</Text>
                </View>
              </View>
              <Text style={styles.switchRoleSub}>
                {role === 'customer'
                  ? 'Access Level: Customer Member • Worker & Admin dashboards locked'
                  : role === 'worker'
                  ? 'Access Level: Verified Worker • Customer & Admin dashboards locked'
                  : 'Access Level: Cooperative Administrator • Customer & Worker dashboards locked'}
              </Text>
            </View>
          </View>
          <Ionicons name="lock-closed" size={16} color={colors.textMuted} />
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
          <Text style={styles.menuGroupTitle}>Profile & Preferences</Text>

          {/* Edit Profile & Photo Actions */}
          <TouchableOpacity onPress={() => setEditProfileModalVisible(true)} style={styles.menuItem}>
            <Ionicons name="create-outline" size={20} color={colors.primary} />
            <Text style={styles.menuItemText}>Edit Profile & Contact Details</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setShowPhotoSheet(true)} style={styles.menuItem}>
            <Ionicons name="camera-outline" size={20} color="#16A34A" />
            <Text style={styles.menuItemText}>Upload Photo (Camera / Album)</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

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

      <EditProfileModal
        visible={editProfileModalVisible}
        onClose={() => setEditProfileModalVisible(false)}
      />

      {/* Guaranteed Cross-Platform Sign Out Confirmation Modal */}
      <Modal
        visible={showSignOutConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSignOutConfirm(false)}
      >
        <View style={styles.confirmOverlay}>
          <View style={styles.confirmCard}>
            <View style={styles.confirmIconBox}>
              <Ionicons name="log-out-outline" size={32} color={colors.danger} />
            </View>
            <Text style={styles.confirmTitle}>Confirm Sign Out</Text>
            <Text style={styles.confirmMessage}>
              Are you sure you want to sign out of Sahakar Sathi? You will be redirected to the login screen.
            </Text>

            <View style={styles.confirmActionsRow}>
              <TouchableOpacity
                style={styles.confirmCancelBtn}
                onPress={() => setShowSignOutConfirm(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.confirmLogoutBtn}
                onPress={async () => {
                  setShowSignOutConfirm(false);
                  await logout();
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="log-out" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                <Text style={styles.confirmLogoutText}>Sign Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Quick Photo Upload Action Sheet Modal */}
      <Modal
        visible={showPhotoSheet}
        transparent
        animationType="fade"
        onRequestClose={() => setShowPhotoSheet(false)}
      >
        <TouchableOpacity
          style={styles.sheetOverlay}
          activeOpacity={1}
          onPress={() => setShowPhotoSheet(false)}
        >
          <View style={styles.sheetContainer}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>Upload Profile Photo</Text>
            <Text style={styles.sheetSubtitle}>Choose photo source from your device</Text>

            {/* Camera Option */}
            <TouchableOpacity
              style={styles.sheetOption}
              onPress={handleCaptureFromCamera}
            >
              <View style={[styles.sheetOptionIconBox, { backgroundColor: '#EFF6FF' }]}>
                <Ionicons name="camera" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetOptionText}>Take Photo with Camera</Text>
                <Text style={styles.sheetOptionSub}>Use device camera to capture new photo</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Album / Library Option */}
            <TouchableOpacity
              style={styles.sheetOption}
              onPress={handlePickFromAlbum}
            >
              <View style={[styles.sheetOptionIconBox, { backgroundColor: '#F0FDF4' }]}>
                <Ionicons name="images" size={22} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetOptionText}>Choose from Album / Gallery</Text>
                <Text style={styles.sheetOptionSub}>Browse images stored on your device</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Remove Photo Option */}
            {Boolean(user?.avatarUrl) && (
              <TouchableOpacity
                style={styles.sheetOption}
                onPress={handleRemovePhoto}
              >
                <View style={[styles.sheetOptionIconBox, { backgroundColor: '#FEF2F2' }]}>
                  <Ionicons name="trash-outline" size={22} color={colors.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sheetOptionText, { color: colors.danger }]}>
                    Remove Current Photo
                  </Text>
                  <Text style={styles.sheetOptionSub}>Restore default name avatar</Text>
                </View>
              </TouchableOpacity>
            )}

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.sheetCancelBtn}
              onPress={() => setShowPhotoSheet(false)}
            >
              <Text style={styles.sheetCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
  avatarTouchWrapper: {
    position: 'relative',
  },
  avatarCameraBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: colors.primary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    ...typography.shadowSm,
  },
  profileActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 8,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
  },
  editProfileBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  changePhotoSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F0FDF4',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
  },
  changePhotoSmallBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },

  // Action sheet styles
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xxl,
    ...typography.shadowLg,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
  },
  sheetSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    marginTop: 2,
  },
  sheetOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: borderRadius.md,
    marginBottom: 8,
  },
  sheetOptionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  sheetOptionText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  sheetOptionSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  sheetCancelBtn: {
    backgroundColor: colors.background,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetCancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  detailsCard: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.xs,
  },
  detailsHeaderTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  detailsEditAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: borderRadius.sm,
  },
  detailsEditAllBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  detailRowLeft: {
    flex: 1,
    marginRight: 10,
  },
  detailLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 13,
    color: colors.text,
    fontWeight: '700',
  },
  detailEditBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.background,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailEditText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  confirmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  confirmCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...typography.shadowLg,
  },
  confirmIconBox: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.xl,
  },
  confirmActionsRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmCancelBtn: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  confirmCancelText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  confirmLogoutBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: colors.danger,
    borderRadius: borderRadius.md,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmLogoutText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
