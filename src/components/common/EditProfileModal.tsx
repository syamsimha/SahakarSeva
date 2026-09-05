import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Platform,
} from 'react-native';
import { colors, spacing, borderRadius, typography } from '../../theme';
import { Button, Avatar } from '../ui';
import { useAuth } from '../../context/AuthContext';
import { WorkerProfile, CooperativeAdmin } from '../../types';
import { pickImageFromLibrary, takePhotoWithCamera } from '../../utils/imagePicker';
import { Ionicons } from '@expo/vector-icons';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
}) => {
  const { user, role, updateUserProfile } = useAuth();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(undefined);

  // Worker & Admin specific profile details
  const [primarySkill, setPrimarySkill] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [experienceYears, setExperienceYears] = useState('');
  const [serviceArea, setServiceArea] = useState('');
  const [about, setAbout] = useState('');
  const [designation, setDesignation] = useState('');
  const [zoneAssigned, setZoneAssigned] = useState('');

  const [showPhotoSheet, setShowPhotoSheet] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize fields when modal opens or user changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setEmail(user.email || '');
      setAddress(user.address || '');
      setCity(user.city || '');
      setPincode(user.pincode || '');
      setAvatarUrl(user.avatarUrl);

      if (user.role === 'worker') {
        const w = user as WorkerProfile;
        setPrimarySkill(w.primarySkill || '');
        setHourlyRate(w.hourlyRate ? String(w.hourlyRate) : '');
        setExperienceYears(w.experienceYears ? String(w.experienceYears) : '');
        setServiceArea(w.serviceArea || '');
        setAbout(w.about || '');
      } else if (user.role === 'admin') {
        const a = user as CooperativeAdmin;
        setDesignation(a.adminDesignation || '');
        setZoneAssigned(a.zoneAssigned || '');
      }
    }
  }, [user, visible]);

  // Handle Photo Picker from Album
  const handlePickFromAlbum = async () => {
    setShowPhotoSheet(false);
    const uri = await pickImageFromLibrary();
    if (uri) {
      setAvatarUrl(uri);
    }
  };

  // Handle Capture Photo from Camera
  const handleCaptureFromCamera = async () => {
    setShowPhotoSheet(false);
    const uri = await takePhotoWithCamera();
    if (uri) {
      setAvatarUrl(uri);
    }
  };

  // Handle Remove Photo
  const handleRemovePhoto = () => {
    setShowPhotoSheet(false);
    setAvatarUrl(undefined);
  };

  // Save profile changes
  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required Field', 'Please enter your name.');
      return;
    }
    if (!phone.trim() || phone.replace(/\D/g, '').length < 10) {
      Alert.alert('Invalid Phone', 'Please provide a valid 10-digit phone number.');
      return;
    }

    setIsSaving(true);
    try {
      const updatePayload: any = {
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        address: address.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        avatarUrl,
      };

      if (role === 'worker') {
        if (primarySkill) updatePayload.primarySkill = primarySkill.trim();
        if (hourlyRate) updatePayload.hourlyRate = Number(hourlyRate) || 0;
        if (experienceYears) updatePayload.experienceYears = Number(experienceYears) || 0;
        if (serviceArea) updatePayload.serviceArea = serviceArea.trim();
        if (about) updatePayload.about = about.trim();
      } else if (role === 'admin') {
        if (designation) updatePayload.adminDesignation = designation.trim();
        if (zoneAssigned) updatePayload.zoneAssigned = zoneAssigned.trim();
      }

      await updateUserProfile(updatePayload);

      Alert.alert('Profile Updated', 'Your profile details and photo have been updated successfully.');
      onClose();
    } catch (err) {
      Alert.alert('Update Failed', 'Failed to update profile details. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Top Header */}
          <View style={styles.headerRow}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Ionicons name="create-outline" size={20} color={colors.primary} />
              <Text style={styles.headerTitle}>Edit Member Profile</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {/* Profile Avatar with Camera Overlay */}
            <View style={styles.avatarSection}>
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowPhotoSheet(true)}
                style={styles.avatarWrapper}
              >
                <Avatar name={name || 'User'} url={avatarUrl} size={88} />
                <View style={styles.cameraBadge}>
                  <Ionicons name="camera" size={18} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setShowPhotoSheet(true)}
                style={styles.changePhotoBtn}
              >
                <Ionicons name="cloud-upload-outline" size={14} color={colors.primary} />
                <Text style={styles.changePhotoBtnText}>
                  {avatarUrl ? 'Change Photo' : 'Upload Profile Photo'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.photoHint}>Tap to choose from photo album or take a new photo</Text>
            </View>

            {/* Input Form Fields */}
            <View style={styles.formSection}>
              <Text style={styles.fieldLabel}>Full Legal Name *</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Enter full name"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.fieldLabel}>Mobile Number *</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                placeholder="+91 98450 12345"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.fieldLabel}>Email Address</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                placeholder="example@mail.com"
                placeholderTextColor={colors.textSecondary}
              />

              <Text style={styles.fieldLabel}>Address / Flat / Street</Text>
              <TextInput
                style={[styles.input, { height: 64, textAlignVertical: 'top' }]}
                value={address}
                onChangeText={setAddress}
                placeholder="Door/Flat No, Apartment, Street"
                placeholderTextColor={colors.textSecondary}
                multiline
              />

              <View style={styles.rowTwoCols}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.fieldLabel}>City</Text>
                  <TextInput
                    style={styles.input}
                    value={city}
                    onChangeText={setCity}
                    placeholder="City / District"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={styles.fieldLabel}>PIN Code</Text>
                  <TextInput
                    style={styles.input}
                    value={pincode}
                    onChangeText={setPincode}
                    keyboardType="number-pad"
                    maxLength={6}
                    placeholder="560038"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
              </View>

              {/* Worker Specific Professional Details */}
              {role === 'worker' && (
                <>
                  <Text style={[styles.fieldLabel, { marginTop: 16, color: colors.primary }]}>
                    PRIMARY TRADE / SKILL
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={primarySkill}
                    onChangeText={setPrimarySkill}
                    placeholder="e.g. Master Electrician, Plumber"
                    placeholderTextColor={colors.textSecondary}
                  />

                  <View style={styles.rowTwoCols}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.fieldLabel}>Hourly Rate (₹)</Text>
                      <TextInput
                        style={styles.input}
                        value={hourlyRate}
                        onChangeText={setHourlyRate}
                        keyboardType="numeric"
                        placeholder="e.g. 299"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={styles.fieldLabel}>Experience (Yrs)</Text>
                      <TextInput
                        style={styles.input}
                        value={experienceYears}
                        onChangeText={setExperienceYears}
                        keyboardType="numeric"
                        placeholder="e.g. 7"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </View>
                  </View>

                  <Text style={styles.fieldLabel}>Service Area / Neighborhood</Text>
                  <TextInput
                    style={styles.input}
                    value={serviceArea}
                    onChangeText={setServiceArea}
                    placeholder="e.g. Indiranagar, Koramangala, HSR Layout"
                    placeholderTextColor={colors.textSecondary}
                  />

                  <Text style={styles.fieldLabel}>Professional Bio / About</Text>
                  <TextInput
                    style={[styles.input, { height: 60, textAlignVertical: 'top' }]}
                    value={about}
                    onChangeText={setAbout}
                    placeholder="Brief description of your cooperative expertise and skills..."
                    placeholderTextColor={colors.textSecondary}
                    multiline
                  />
                </>
              )}

              {/* Admin Specific Governance Details */}
              {role === 'admin' && (
                <>
                  <Text style={[styles.fieldLabel, { marginTop: 16, color: colors.primary }]}>
                    ADMIN DESIGNATION
                  </Text>
                  <TextInput
                    style={styles.input}
                    value={designation}
                    onChangeText={setDesignation}
                    placeholder="e.g. Senior Registrar, Regional Officer"
                    placeholderTextColor={colors.textSecondary}
                  />

                  <Text style={styles.fieldLabel}>Assigned Zone / Cluster</Text>
                  <TextInput
                    style={styles.input}
                    value={zoneAssigned}
                    onChangeText={setZoneAssigned}
                    placeholder="e.g. North Zone - Karnataka State"
                    placeholderTextColor={colors.textSecondary}
                  />
                </>
              )}
            </View>
          </ScrollView>

          {/* Bottom Action Buttons */}
          <View style={styles.footerRow}>
            <Button
              title="Cancel"
              variant="outline"
              onPress={onClose}
              style={{ flex: 1, marginRight: 10 }}
            />
            <Button
              title={isSaving ? 'Saving...' : 'Save Profile Changes'}
              variant="primary"
              loading={isSaving}
              onPress={handleSave}
              style={{ flex: 2 }}
            />
          </View>
        </View>
      </View>

      {/* Photo Selection Action Sheet Modal */}
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
            <Text style={styles.sheetSubtitle}>Choose an option to update your cooperative photo</Text>

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
                <Text style={styles.sheetOptionSub}>Use your device camera to snap a portrait</Text>
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
                <Text style={styles.sheetOptionSub}>Browse photos stored on your device</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Remove Photo Option (if exists) */}
            {Boolean(avatarUrl) && (
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
                  <Text style={styles.sheetOptionSub}>Revert to name initials avatar</Text>
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
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    maxHeight: '92%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
    ...typography.shadowLg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  scroll: {
    marginBottom: spacing.sm,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    marginBottom: spacing.md,
  },
  avatarWrapper: {
    position: 'relative',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: '#FFFFFF',
    ...typography.shadowSm,
  },
  changePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: borderRadius.round,
    marginTop: 12,
  },
  changePhotoBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
  photoHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
  formSection: {
    paddingVertical: spacing.xs,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: 14,
    color: colors.text,
  },
  rowTwoCols: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerRow: {
    flexDirection: 'row',
    marginTop: spacing.md,
    paddingTop: spacing.xs,
  },

  // Action Sheet styles
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
});
