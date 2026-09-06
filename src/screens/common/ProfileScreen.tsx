import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Switch,
  Platform,
  ActivityIndicator,
  Image,
  Alert,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header, LanguageModal, RoleSwitcherModal } from '../../components/common';
import { Avatar, Badge, Button } from '../../components/ui';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { useLocation } from '../../context/LocationContext';
import { pickProfileImage, ADMIN_AVATAR_PRESETS } from '../../utils';
import { EditProfileModal, AddressManageModal } from '../../components/customer';
import { Customer } from '../../types';

interface ProfileScreenProps {
  onNavigateToHelp: () => void;
  onNavigateToWelfare?: () => void;
  onNavigateToVerification?: () => void;
  onNavigateToBookings?: () => void;
  onNavigateToForecast?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onNavigateToHelp,
  onNavigateToWelfare,
  onNavigateToVerification,
  onNavigateToBookings,
  onNavigateToForecast,
}) => {
  const { user, role, logout, updateUser, updateCustomerProfile } = useAuth();
  const { language, t } = useLanguage();
  const { currentLocation, federationName, cooperativeAct, apexBankName, clusterName } = useLocation();

  // Modals state
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [addressModalVisible, setAddressModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Role-specific modals
  const [bankModalVisible, setBankModalVisible] = useState(false);
  const [societiesModalVisible, setSocietiesModalVisible] = useState(false);
  const [auditModalVisible, setAuditModalVisible] = useState(false);
  const [addressesModalVisible, setAddressesModalVisible] = useState(false);
  const [contributionsModalVisible, setContributionsModalVisible] = useState(false);

  // Edit profile form state
  const [editName, setEditName] = useState(user?.name || '');
  const [editPhone, setEditPhone] = useState(user?.phone || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [editAddress, setEditAddress] = useState(user?.address || currentLocation.address || '');
  const [editCity, setEditCity] = useState(user?.city || currentLocation.city || 'Visakhapatnam');
  const [editAvatarUrl, setEditAvatarUrl] = useState(user?.avatarUrl || '');
  const [isUploadingPic, setIsUploadingPic] = useState(false);

  // Admin-specific credentials (strictly controlled by RBAC)
  const [editDesignation, setEditDesignation] = useState(
    (user as any)?.adminDesignation || 'District Registrar & Operations Secretary'
  );
  const [editFederation, setEditFederation] = useState(
    (user as any)?.federationName || federationName
  );
  const [editZone, setEditZone] = useState(
    (user as any)?.zoneAssigned || clusterName
  );
  const [editRegNo, setEditRegNo] = useState(
    (user as any)?.societyRegistrationNo || 'DRB/LCC/1998/1472'
  );
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false);

  // Notification toggles
  const [smsEnabled, setSmsEnabled] = useState(true);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [whatsAppEnabled, setWhatsAppEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Saved addresses for customer
  const [savedAddresses, setSavedAddresses] = useState([
    { id: '1', title: 'Home', address: 'Flat 402, Green Glen Layout, Bellandur, Bengaluru - 560103', isDefault: true },
    { id: '2', title: 'Office', address: 'Building 4B, Ecospace Tech Park, Marathahalli-Sarjapur ORR', isDefault: false },
  ]);

  const handleOpenEditProfile = () => {
    setEditName(user?.name || '');
    setEditPhone(user?.phone || '');
    setEditEmail(user?.email || '');
    setEditAddress(user?.address || currentLocation.address || '');
    setEditCity(user?.city || currentLocation.city || 'District');
    setEditAvatarUrl(user?.avatarUrl || '');
    if (role === 'admin') {
      setEditDesignation((user as any)?.adminDesignation || 'District Registrar & Operations Secretary');
      setEditFederation((user as any)?.federationName || federationName);
      setEditZone((user as any)?.zoneAssigned || clusterName);
      setEditRegNo((user as any)?.societyRegistrationNo || 'DRB/LCC/1998/1472');
    }
    setProfileSaveSuccess(false);
    setEditProfileVisible(true);
  };

  const handlePickAndUploadPic = async () => {
    setIsUploadingPic(true);
    try {
      const pickedUri = await pickProfileImage();
      if (pickedUri) {
        setEditAvatarUrl(pickedUri);
      }
    } catch (err) {
      console.warn('Image picker error:', err);
    } finally {
      setIsUploadingPic(false);
    }
  };

  const handleSaveProfile = async () => {
    const payload: any = {
      name: editName.trim() || user?.name,
      phone: editPhone.trim() || user?.phone,
      email: editEmail.trim() || user?.email,
      address: editAddress.trim() || user?.address,
      city: editCity.trim() || user?.city || currentLocation.city,
      avatarUrl: editAvatarUrl || undefined,
    };

    if (role === 'admin') {
      payload.adminDesignation = editDesignation.trim() || 'District Registrar & Operations Secretary';
      payload.federationName = editFederation.trim() || federationName;
      payload.zoneAssigned = editZone.trim() || clusterName;
      payload.societyRegistrationNo = editRegNo.trim() || 'DRB/LCC/1998/1472';
      payload.role = 'admin';
    }

    if (updateUser) {
      await updateUser(payload);
    } else if (updateCustomerProfile) {
      await updateCustomerProfile(payload);
    }
    setProfileSaveSuccess(true);
    setTimeout(() => {
      setEditProfileVisible(false);
      setProfileSaveSuccess(false);
    }, 800);
  };

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
      <Header title={t('profile_title') || t('nav_profile') || 'My Profile'} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card with Edit Action */}
        <View style={styles.profileCard}>
          <TouchableOpacity activeOpacity={0.8} onPress={handleOpenEditProfile} style={styles.avatarContainer}>
            <Avatar name={user?.name || 'Sahakar Member'} url={user?.avatarUrl} size={64} showVerifiedBadge />
            <View style={styles.avatarEditBadge}>
              <Ionicons name="pencil" size={12} color="#FFF" />
            </View>
          </TouchableOpacity>

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
            <Text style={styles.userPhone}>{user?.phone || '+91 98765 43210'}</Text>
            <Text style={styles.userEmail}>{user?.email || 'member@sahakarsathi.coop'}</Text>
            <Text style={styles.userCity}>📍 {user?.address ? `${user.address}, ` : ''}{user?.city || currentLocation.city || currentLocation.placeName}</Text>

            <TouchableOpacity onPress={handleOpenEditProfile} style={styles.editProfileBtn}>
              <Ionicons name="create-outline" size={14} color={colors.primary} />
              <Text style={styles.editProfileBtnText}>Edit Profile Details</Text>
            </TouchableOpacity>
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

       

        {/* WORKER SPECIFIC SHORTCUTS */}
        {role === 'worker' && (
          <View style={styles.menuGroup}>
            <Text style={styles.menuGroupTitle}>Worker Cooperative Tools</Text>
            {onNavigateToWelfare ? (
              <TouchableOpacity onPress={onNavigateToWelfare} style={styles.menuItem}>
                <Ionicons name="shield-checkmark-outline" size={20} color={colors.primary} />
                <Text style={styles.menuItemText}>Cooperative Welfare & Insurance Pass</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}

            {onNavigateToVerification ? (
              <TouchableOpacity onPress={onNavigateToVerification} style={styles.menuItem}>
                <Ionicons name="id-card-outline" size={20} color={colors.accent} />
                <Text style={styles.menuItemText}>Skill Certification & Verification Status</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity onPress={() => setBankModalVisible(true)} style={styles.menuItem}>
              <Ionicons name="cash-outline" size={20} color={colors.success} />
              <Text style={styles.menuItemText}>Linked Cooperative Bank & Direct Payouts</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* ADMIN SPECIFIC SHORTCUTS */}
        {role === 'admin' && (
          <View style={styles.menuGroup}>
            <Text style={styles.menuGroupTitle}>Federation Administration Controls</Text>
            {onNavigateToVerification && (
              <TouchableOpacity onPress={onNavigateToVerification} style={styles.menuItem}>
                <Ionicons name="id-card-outline" size={20} color={colors.warning} />
                <Text style={styles.menuItemText}>Worker Verification & Admissions Queue</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}

            {onNavigateToForecast && (
              <TouchableOpacity onPress={onNavigateToForecast} style={styles.menuItem}>
                <Ionicons name="bar-chart-outline" size={20} color={colors.accent} />
                <Text style={styles.menuItemText}>AI Demand Forecasting & Ward Allocation</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}

            {onNavigateToBookings && (
              <TouchableOpacity onPress={onNavigateToBookings} style={styles.menuItem}>
                <Ionicons name="receipt-outline" size={20} color={colors.primary} />
                <Text style={styles.menuItemText}>District Master Bookings Roster</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            )}

            <TouchableOpacity onPress={() => setSocietiesModalVisible(true)} style={styles.menuItem}>
              <Ionicons name="business-outline" size={20} color={colors.info} />
              <Text style={styles.menuItemText}>Affiliated Labour Cooperative Societies (14)</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setAuditModalVisible(true)} style={styles.menuItem}>
              <Ionicons name="ribbon-outline" size={20} color={colors.success} />
              <Text style={styles.menuItemText}>Labour Federation Statutory Compliance Audit</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* CUSTOMER SPECIFIC SHORTCUTS */}
        {role === 'customer' && (
          <View style={styles.menuGroup}>
            <Text style={styles.menuGroupTitle}>Customer Account Tools</Text>
            <TouchableOpacity onPress={() => setAddressesModalVisible(true)} style={styles.menuItem}>
              <Ionicons name="location-outline" size={20} color={colors.primary} />
              <Text style={styles.menuItemText}>Saved Service Addresses ({savedAddresses.length})</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setContributionsModalVisible(true)} style={styles.menuItem}>
              <Ionicons name="heart-outline" size={20} color={colors.accent} />
              <Text style={styles.menuItemText}>My 5% Welfare Cess Contributions Ledger</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Preferences & System Menu */}
        <View style={styles.menuGroup}>
          <Text style={styles.menuGroupTitle}>Preferences & System</Text>

          <TouchableOpacity onPress={() => setLangModalVisible(true)} style={styles.menuItem}>
            <Ionicons name="language-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.menuItemText}>{t('language_setting') || t('language')} / भाषा</Text>
            <Text style={styles.menuItemValue}>{language.toUpperCase()}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity onPress={onNavigateToHelp} style={styles.menuItem}>
            <Ionicons name="help-circle-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.menuItemText}>Help, FAQs & Cooperative Support</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setNotificationModalVisible(true)} style={styles.menuItem}>
            <Ionicons name="notifications-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.menuItemText}>Notification & Communication Preferences</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setPrivacyModalVisible(true)} style={styles.menuItem}>
            <Ionicons name="shield-checkmark-outline" size={20} color={colors.textSecondary} />
            <Text style={styles.menuItemText}>Privacy Policy & Cooperative Charter</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Sign Out Button */}
        <Button
          title={t('sign_out') || t('logout') || 'Sign Out'}
          icon="log-out-outline"
          onPress={() => setLogoutModalVisible(true)}
          variant="outline"
          size="md"
          fullWidth
          style={styles.logoutBtn}
          textStyle={{ color: colors.danger }}
        />

        {/* Cooperative Federation Tag */}
        <View style={styles.footerNote}>
          <Text style={styles.footerNoteText}>
            Sahakar Sathi v1.2.0 • Supported by Ministry of Cooperation & Labour Federations
          </Text>
        </View>
      </ScrollView>

      {/* 1. Language Modal */}
      <LanguageModal visible={langModalVisible} onClose={() => setLangModalVisible(false)} />

      {/* 2. Customer Specific Modals */}
      {role === 'customer' && (
        <>
          <EditProfileModal
            visible={editProfileVisible}
            customer={user as Customer}
            onClose={() => setEditProfileVisible(false)}
            onSave={(updates) => updateCustomerProfile ? updateCustomerProfile(updates) : updateUser(updates)}
          />
          <AddressManageModal
            visible={addressModalVisible}
            customer={user as Customer}
            onClose={() => setAddressModalVisible(false)}
            onUpdateAddresses={(savedAddresses) => updateCustomerProfile ? updateCustomerProfile({ savedAddresses }) : updateUser({ savedAddresses } as any)}
          />
        </>
      )}

      {/* 3. Role Switcher Modal (Non-admin only) */}
      {role !== 'admin' && (
        <RoleSwitcherModal visible={roleModalVisible} onClose={() => setRoleModalVisible(false)} />
      )}
      <Modal visible={editProfileVisible} transparent animationType="slide" onRequestClose={() => setEditProfileVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '90%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>
                  {role === 'admin' ? 'Edit Administrator Profile' : 'Edit Profile Information'}
                </Text>
                <Text style={styles.modalSub}>
                  {role === 'admin' ? 'Update administrator credentials & photo' : 'Update your contact and location details'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditProfileVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {profileSaveSuccess ? (
                <View style={styles.saveSuccessCard}>
                  <Ionicons name="checkmark-circle" size={36} color={colors.success} />
                  <Text style={styles.saveSuccessText}>Profile Updated Successfully!</Text>
                </View>
              ) : null}

              {/* Profile Photo Uploader Section */}
              <View style={styles.avatarUploaderSection}>
                <View style={styles.avatarPreviewWrapper}>
                  <Avatar
                    name={editName || user?.name || 'Member'}
                    url={editAvatarUrl}
                    size={72}
                    showVerifiedBadge
                  />
                  {isUploadingPic && (
                    <View style={styles.avatarLoadingOverlay}>
                      <ActivityIndicator size="small" color="#FFF" />
                    </View>
                  )}
                </View>

                <View style={styles.avatarButtonColumn}>
                  <Text style={styles.avatarSectionTitle}>Profile Photo</Text>
                  <Text style={styles.avatarSectionSub}>
                    {role === 'admin'
                      ? 'Visible to federation workers & public registry'
                      : 'Visible on your service orders & bookings'}
                  </Text>

                  <View style={styles.avatarActionsRow}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handlePickAndUploadPic}
                      style={styles.pickImageBtn}
                      disabled={isUploadingPic}
                    >
                      <Ionicons name="cloud-upload" size={14} color="#FFF" style={{ marginRight: 4 }} />
                      <Text style={styles.pickImageBtnText}>
                        {isUploadingPic ? 'Uploading...' : 'Upload Picture'}
                      </Text>
                    </TouchableOpacity>

                    {Boolean(editAvatarUrl) && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => setEditAvatarUrl('')}
                        style={styles.removeImageBtn}
                      >
                        <Ionicons name="trash-outline" size={13} color={colors.danger} />
                        <Text style={styles.removeImageBtnText}>Remove</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>

              {/* Curated Presets for Quick Selection */}
              <View style={styles.presetSection}>
                <Text style={styles.presetSectionLabel}>Or choose a curated photo preset:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.presetsRow}>
                  {ADMIN_AVATAR_PRESETS.map((p) => {
                    const isSelected = editAvatarUrl === p.url;
                    return (
                      <TouchableOpacity
                        key={p.id}
                        activeOpacity={0.7}
                        onPress={() => setEditAvatarUrl(p.url)}
                        style={[styles.presetThumbBox, isSelected && styles.presetThumbBoxActive]}
                      >
                        <Image source={{ uri: p.url }} style={styles.presetThumbImage} />
                        {isSelected && (
                          <View style={styles.presetCheckBadge}>
                            <Ionicons name="checkmark" size={10} color="#FFF" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.formDivider} />

              <Text style={styles.formSectionHeading}>1. Contact Information</Text>

              <Text style={styles.formLabel}>Full Legal Name</Text>
              <TextInput
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter full name"
                placeholderTextColor={colors.textMuted}
                style={styles.formInput}
              />

              <Text style={styles.formLabel}>Mobile Number</Text>
              <TextInput
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Enter 10-digit mobile"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
                style={styles.formInput}
              />

              <Text style={styles.formLabel}>Email Address</Text>
              <TextInput
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="Enter email address"
                placeholderTextColor={colors.textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.formInput}
              />

              {/* STRICT RBAC: Administrator Specific Credentials Section */}
              {role === 'admin' && (
                <>
                  <Text style={[styles.formSectionHeading, { marginTop: spacing.md }]}>
                    2. Federation Secretariat Credentials
                  </Text>

                  <Text style={styles.formLabel}>Officer Designation / Title</Text>
                  <TextInput
                    value={editDesignation}
                    onChangeText={setEditDesignation}
                    placeholder="e.g. District Registrar & Operations Secretary"
                    placeholderTextColor={colors.textMuted}
                    style={styles.formInput}
                  />

                  <Text style={styles.formLabel}>Federation / Department Name</Text>
                  <TextInput
                    value={editFederation}
                    onChangeText={setEditFederation}
                    placeholder={`e.g. ${federationName}`}
                    placeholderTextColor={colors.textMuted}
                    style={styles.formInput}
                  />

                  <Text style={styles.formLabel}>Society Registration Number</Text>
                  <TextInput
                    value={editRegNo}
                    onChangeText={setEditRegNo}
                    placeholder="e.g. DRB/LCC/1998/1472"
                    placeholderTextColor={colors.textMuted}
                    style={styles.formInput}
                  />

                  <Text style={styles.formLabel}>Jurisdiction / Zone Assigned</Text>
                  <TextInput
                    value={editZone}
                    onChangeText={setEditZone}
                    placeholder={`e.g. ${clusterName}`}
                    placeholderTextColor={colors.textMuted}
                    style={styles.formInput}
                  />
                </>
              )}

              <Text style={[styles.formSectionHeading, { marginTop: spacing.md }]}>
                {role === 'admin' ? '3. Secretariat Location' : '2. Location & Address'}
              </Text>

              <Text style={styles.formLabel}>City / Urban Cluster</Text>
              <TextInput
                value={editCity}
                onChangeText={setEditCity}
                placeholder={`e.g. ${currentLocation.city || 'District'}, State`}
                placeholderTextColor={colors.textMuted}
                style={styles.formInput}
              />

              <Text style={styles.formLabel}>
                {role === 'admin' ? 'Office / Directorate Address' : 'Service Address'}
              </Text>
              <TextInput
                value={editAddress}
                onChangeText={setEditAddress}
                placeholder="House / Flat / Office No, Street, Ward"
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                style={[styles.formInput, { height: 65, textAlignVertical: 'top' }]}
              />

              <Button
                title="Save Profile Changes"
                icon="save-outline"
                onPress={handleSaveProfile}
                variant="primary"
                size="md"
                fullWidth
                style={{ marginTop: spacing.md }}
              />
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* 4. Worker Bank Details Modal */}
      <Modal visible={bankModalVisible} transparent animationType="fade" onRequestClose={() => setBankModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Cooperative Bank Settlement</Text>
                <Text style={styles.modalSub}>Direct fair-wage escrow payout account</Text>
              </View>
              <TouchableOpacity onPress={() => setBankModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.bankCardBox}>
              <View style={styles.bankCardHeader}>
                <Ionicons name="business" size={24} color={colors.primary} />
                <Badge label="Active Verified" variant="verified" />
              </View>
              <Text style={styles.bankName}>{apexBankName}</Text>
              <Text style={styles.bankAcc}>A/C: ••••••••• 9182</Text>
              <Text style={styles.bankIfsc}>IFSC: APEX0001002 ({currentLocation.placeName || currentLocation.city} Branch)</Text>
              <Text style={styles.bankPayout}>Instant Same-Day Settlement • 0% Commission Fee</Text>
            </View>

            <View style={styles.bankBenefitRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.bankBenefitText}>RBI-monitored escrow protection for all wage earnings</Text>
            </View>
            <View style={styles.bankBenefitRow}>
              <Ionicons name="checkmark-circle" size={16} color={colors.success} />
              <Text style={styles.bankBenefitText}>Automated 5% pension deposit into state welfare account</Text>
            </View>

            <Button
              title="Close"
              onPress={() => setBankModalVisible(false)}
              variant="outline"
              size="sm"
              fullWidth
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </Modal>

      {/* 5. Affiliated Cooperative Societies Modal (Admin) */}
      <Modal visible={societiesModalVisible} transparent animationType="fade" onRequestClose={() => setSocietiesModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Affiliated Labor Cooperatives</Text>
                <Text style={styles.modalSub}>14 registered district guilds in {clusterName}</Text>
              </View>
              <TouchableOpacity onPress={() => setSocietiesModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { name: `${currentLocation.city || 'District'} Electricians Guild`, reg: `REG-${(currentLocation.state || currentLocation.city).slice(0, 3).toUpperCase()}-7721`, workers: 42, health: '100% Active' },
                { name: `${currentLocation.placeName || currentLocation.city} Plumbers Union`, reg: `REG-${(currentLocation.state || currentLocation.city).slice(0, 3).toUpperCase()}-4019`, workers: 36, health: '98% Active' },
                { name: `${currentLocation.state || currentLocation.city} Carpenters Society`, reg: `REG-${(currentLocation.state || currentLocation.city).slice(0, 3).toUpperCase()}-8832`, workers: 28, health: '95% Active' },
                { name: `${currentLocation.city || 'Central'} Painters Cooperative`, reg: `REG-${(currentLocation.state || currentLocation.city).slice(0, 3).toUpperCase()}-5510`, workers: 22, health: '100% Active' },
              ].map((s, idx) => (
                <View key={idx} style={styles.societyItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.societyName}>{s.name}</Text>
                    <Text style={styles.societyReg}>{s.reg} • {s.workers} active guild workers</Text>
                  </View>
                  <Badge label={s.health} variant="verified" />
                </View>
              ))}
            </ScrollView>

            <Button
              title="Close Directory"
              onPress={() => setSocietiesModalVisible(false)}
              variant="outline"
              size="sm"
              fullWidth
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </Modal>

      {/* 6. Statutory Audit Records Modal (Admin) */}
      <Modal visible={auditModalVisible} transparent animationType="fade" onRequestClose={() => setAuditModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Labour Federation Audit</Text>
                <Text style={styles.modalSub}>Statutory compliance & fairness certification</Text>
              </View>
              <TouchableOpacity onPress={() => setAuditModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.auditScoreCard}>
              <Text style={styles.auditScoreVal}>99.4%</Text>
              <Text style={styles.auditScoreLabel}>Fair Wage Disbursement Compliance Index</Text>
            </View>

            <View style={{ gap: 8, marginVertical: spacing.md }}>
              <View style={styles.auditItem}>
                <Ionicons name="shield-checkmark" size={18} color={colors.success} />
                <Text style={styles.auditItemText}>Zero Aggregator Commission audited by Labor Board</Text>
              </View>
              <View style={styles.auditItem}>
                <Ionicons name="shield-checkmark" size={18} color={colors.success} />
                <Text style={styles.auditItemText}>100% Aadhaar-verified labor guild members</Text>
              </View>
              <View style={styles.auditItem}>
                <Ionicons name="shield-checkmark" size={18} color={colors.success} />
                <Text style={styles.auditItemText}>RBI Cooperative Escrow Fund Account Verified</Text>
              </View>
            </View>

            <Button
              title="Close Compliance Report"
              onPress={() => setAuditModalVisible(false)}
              variant="primary"
              size="sm"
              fullWidth
            />
          </View>
        </View>
      </Modal>

      {/* 7. Saved Addresses Modal (Customer) */}
      <Modal visible={addressesModalVisible} transparent animationType="fade" onRequestClose={() => setAddressesModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Saved Service Addresses</Text>
                <Text style={styles.modalSub}>Quick delivery points for technician dispatch</Text>
              </View>
              <TouchableOpacity onPress={() => setAddressesModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {savedAddresses.map((addr) => (
              <View key={addr.id} style={styles.addressCard}>
                <View style={styles.addressTop}>
                  <Text style={styles.addressTitle}>📍 {addr.title}</Text>
                  {addr.isDefault && <Badge label="Default" variant="verified" />}
                </View>
                <Text style={styles.addressBody}>{addr.address}</Text>
              </View>
            ))}

            <Button
              title="Add New Address"
              icon="add-circle-outline"
              onPress={() => {
                const newId = String(savedAddresses.length + 1);
                setSavedAddresses([
                  ...savedAddresses,
                  { id: newId, title: 'Parents Home', address: '12th Main, 4th Block, Jayanagar, Bengaluru', isDefault: false },
                ]);
              }}
              variant="outline"
              size="sm"
              fullWidth
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </Modal>

      {/* 8. Welfare Contributions Ledger (Customer) */}
      <Modal visible={contributionsModalVisible} transparent animationType="fade" onRequestClose={() => setContributionsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Welfare Cess Impact</Text>
                <Text style={styles.modalSub}>Your 5% contribution to labor welfare fund</Text>
              </View>
              <TouchableOpacity onPress={() => setContributionsModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.impactBox}>
              <Text style={styles.impactVal}>₹385.00</Text>
              <Text style={styles.impactLabel}>Cumulative Welfare Cess Contributed</Text>
            </View>

            <Text style={styles.impactDesc}>
              Every rupee of your 5% welfare cess directly sponsors PMJJBY life insurance, health checkups, and pension funds for registered local tradespeople.
            </Text>

            <Button
              title="Close Statement"
              onPress={() => setContributionsModalVisible(false)}
              variant="primary"
              size="sm"
              fullWidth
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </Modal>

      {/* 9. Notification Preferences Modal */}
      <Modal visible={notificationModalVisible} transparent animationType="fade" onRequestClose={() => setNotificationModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Notification Settings</Text>
                <Text style={styles.modalSub}>Manage your communication channels</Text>
              </View>
              <TouchableOpacity onPress={() => setNotificationModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Push Notifications</Text>
                <Text style={styles.toggleSub}>Booking status, technician GPS arrival</Text>
              </View>
              <Switch value={pushEnabled} onValueChange={setPushEnabled} trackColor={{ true: colors.primary, false: colors.border }} />
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>SMS Booking Updates</Text>
                <Text style={styles.toggleSub}>Arrival OTPs and dispatch confirmations</Text>
              </View>
              <Switch value={smsEnabled} onValueChange={setSmsEnabled} trackColor={{ true: colors.primary, false: colors.border }} />
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>WhatsApp Notifications</Text>
                <Text style={styles.toggleSub}>Invoice receipts and direct technician chat</Text>
              </View>
              <Switch value={whatsAppEnabled} onValueChange={setWhatsAppEnabled} trackColor={{ true: colors.primary, false: colors.border }} />
            </View>

            <View style={styles.toggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>In-App Sounds & Vibration</Text>
                <Text style={styles.toggleSub}>Audio tone on booking accept</Text>
              </View>
              <Switch value={soundEnabled} onValueChange={setSoundEnabled} trackColor={{ true: colors.primary, false: colors.border }} />
            </View>

            <Button
              title="Save Preferences"
              onPress={() => setNotificationModalVisible(false)}
              variant="primary"
              size="sm"
              fullWidth
              style={{ marginTop: spacing.md }}
            />
          </View>
        </View>
      </Modal>

      {/* 10. Privacy Policy & Cooperative Charter Modal */}
      <Modal visible={privacyModalVisible} transparent animationType="slide" onRequestClose={() => setPrivacyModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: '85%' }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Cooperative Charter & Policy</Text>
                <Text style={styles.modalSub}>National Cooperative Policy & Member Bylaws</Text>
              </View>
              <TouchableOpacity onPress={() => setPrivacyModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ marginVertical: spacing.sm }}>
              <Text style={styles.charterHeading}>1. Non-Profit Member Ownership</Text>
              <Text style={styles.charterText}>
                Sahakar Sathi operates under the {cooperativeAct}. 100% of base fares belong to the registered worker. The platform takes zero corporate commission.
              </Text>

              <Text style={styles.charterHeading}>2. Fair Wages & Social Security</Text>
              <Text style={styles.charterText}>
                The statutory 5% welfare cess is directly audited by the Department of Cooperation and disbursed to state insurance schemes (PMJJBY/PMSBY) and pension pools.
              </Text>

              <Text style={styles.charterHeading}>3. Consumer Protection & Privacy</Text>
              <Text style={styles.charterText}>
                Customer data is strictly encrypted and used solely for booking logistics and safety validation. No personal information is sold or shared with commercial marketing third parties.
              </Text>

              <Text style={styles.charterHeading}>4. Dispute Resolution by Ombudsman</Text>
              <Text style={styles.charterText}>
                All disputes are arbitrated by the independent Cooperative Ombudsman tribunal, guaranteeing a fair statutory hearing within 24 hours.
              </Text>
            </ScrollView>

            <Button
              title="I Acknowledge & Agree"
              onPress={() => setPrivacyModalVisible(false)}
              variant="primary"
              size="md"
              fullWidth
            />
          </View>
        </View>
      </Modal>

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
            <Text style={styles.logoutModalTitle}>{t('sign_out') || 'Sign Out'}</Text>
            <Text style={styles.logoutModalSubtitle}>
              {t('sign_out_confirm') || 'Are you sure you want to log out of your cooperative account?'}
            </Text>
            <View style={styles.logoutActions}>
              <Button
                title={t('cancel') || 'Cancel'}
                variant="outline"
                size="md"
                onPress={() => setLogoutModalVisible(false)}
                style={{ flex: 1, marginRight: spacing.sm }}
                disabled={isLoggingOut}
              />
              <Button
                title={isLoggingOut ? '...' : (t('sign_out') || 'Sign Out')}
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
  avatarContainer: {
    position: 'relative',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.surface,
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
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  editProfileBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  switchRoleBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(30, 64, 175, 0.2)',
  },
  switchRoleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  switchRoleIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchRoleTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 450,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  modalSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textSecondary,
    marginBottom: 4,
    marginTop: spacing.sm,
  },
  formInput: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    fontSize: 12,
    color: colors.text,
  },
  saveSuccessCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.sm,
    gap: 8,
  },
  saveSuccessText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.success,
  },
  bankCardBox: {
    backgroundColor: colors.primaryLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginVertical: spacing.sm,
  },
  bankCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  bankName: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  bankAcc: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 2,
  },
  bankIfsc: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 1,
  },
  bankPayout: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.success,
    marginTop: 6,
  },
  bankBenefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  bankBenefitText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  societyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  societyName: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  societyReg: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  auditScoreCard: {
    alignItems: 'center',
    backgroundColor: colors.successLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
  },
  auditScoreVal: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.success,
  },
  auditScoreLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.success,
    marginTop: 2,
  },
  auditItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  auditItemText: {
    fontSize: 11,
    color: colors.text,
  },
  addressCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addressTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  addressTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  addressBody: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  impactBox: {
    alignItems: 'center',
    backgroundColor: colors.accentLight,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  impactVal: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.accentDark,
  },
  impactLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.accentDark,
    marginTop: 2,
  },
  impactDesc: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    textAlign: 'center',
    marginVertical: spacing.sm,
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  toggleTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  toggleSub: {
    fontSize: 10,
    color: colors.textSecondary,
    marginTop: 2,
  },
  charterHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginTop: spacing.sm,
  },
  charterText: {
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 16,
    marginTop: 2,
    marginBottom: 4,
  },

  avatarUploaderSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
  },
  avatarPreviewWrapper: {
    position: 'relative',
  },
  avatarLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarButtonColumn: {
    flex: 1,
    marginLeft: spacing.md,
  },
  avatarSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  avatarSectionSub: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.xs,
  },
  avatarActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  pickImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  pickImageBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFF',
  },
  removeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.danger + '40',
  },
  removeImageBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.danger,
    marginLeft: 3,
  },
  presetSection: {
    marginBottom: spacing.sm,
  },
  presetSectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  presetsRow: {
    flexDirection: 'row',
  },
  presetThumbBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    position: 'relative',
  },
  presetThumbBoxActive: {
    borderColor: colors.primary,
  },
  presetThumbImage: {
    width: '100%',
    height: '100%',
  },
  presetCheckBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.primary,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  formSectionHeading: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
