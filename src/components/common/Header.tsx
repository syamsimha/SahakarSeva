import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { colors, borderRadius, spacing, typography } from '../../theme';
import { useLanguage } from '../../context/LanguageContext';
import { useLocation } from '../../context/LocationContext';
import { Ionicons } from '@expo/vector-icons';
import { LanguageModal } from './LanguageModal';
import { LocationSelectorModal } from './LocationSelectorModal';
import { Avatar } from '../ui';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  showLocation?: boolean;
  locationName?: string;
  onLocationPress?: () => void;
  onNotificationPress?: () => void;
  unreadNotificationsCount?: number;
  onProfilePress?: () => void;
  avatarUrl?: string;
  userName?: string;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  showLocation = false,
  locationName,
  onLocationPress,
  onNotificationPress,
  unreadNotificationsCount = 2,
  onProfilePress,
  avatarUrl,
  userName,
}) => {
  const { language, t } = useLanguage();
  const {
    currentLocation,
    isLocating,
    isLocationModalOpen,
    openLocationModal,
    closeLocationModal,
  } = useLocation();
  const [langModalVisible, setLangModalVisible] = useState(false);

  const displayLocation = locationName || currentLocation.placeName || currentLocation.city;

  return (
    <View style={styles.container}>
      <View style={styles.topRow}>
        {/* Left Side: Back button or Brand / Location */}
        <View style={styles.leftContainer}>
          {showBack ? (
            <TouchableOpacity onPress={onBack} style={styles.backBtn}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
          ) : showLocation ? (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onLocationPress || openLocationModal}
              style={styles.locationContainer}
              accessibilityLabel="Change or modify location"
            >
              <View style={styles.locationHeaderRow}>
                <Ionicons
                  name={currentLocation.isGPS ? 'navigate' : 'location'}
                  size={14}
                  color={currentLocation.isGPS ? colors.success : colors.primary}
                />
                <Text style={styles.locationLabel}>
                  {currentLocation.isGPS ? '🛰️ LIVE GPS' : t('current_location')}
                </Text>
                {isLocating ? (
                  <ActivityIndicator size="small" color={colors.primary} style={{ marginLeft: 3, transform: [{ scale: 0.6 }] }} />
                ) : (
                  <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
                )}
              </View>
              <Text style={styles.locationValue} numberOfLines={1}>
                {displayLocation}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.brandRow}>
              <View style={styles.brandLogoBox}>
                <Ionicons name="people" size={16} color={colors.textInverse} />
              </View>
              <View>
                <Text style={styles.brandTitle}>{title || t('app_name')}</Text>
                {subtitle && <Text style={styles.brandSubtitle}>{subtitle}</Text>}
              </View>
            </View>
          )}
        </View>

        {/* Right Actions: Lang pill, Notification bell */}
        <View style={styles.rightContainer}>
          {/* Language Selector Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setLangModalVisible(true)}
            style={styles.langBtn}
          >
            <Ionicons name="language-outline" size={14} color={colors.primary} style={{ marginRight: 3 }} />
            <Text style={styles.langText}>{language.toUpperCase()}</Text>
          </TouchableOpacity>

          {/* Notifications Button */}
          {onNotificationPress && (
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={onNotificationPress}
              style={styles.notifBtn}
            >
              <Ionicons name="notifications-outline" size={20} color={colors.text} />
              {unreadNotificationsCount > 0 && (
                <View style={styles.badgeCount}>
                  <Text style={styles.badgeText}>{unreadNotificationsCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* User / Officer Profile Avatar Button */}
          {onProfilePress && (
            <TouchableOpacity
              activeOpacity={0.75}
              onPress={onProfilePress}
              style={styles.profileHeaderBtn}
              accessibilityLabel="View or Edit Profile"
            >
              <Avatar
                name={userName || 'Admin'}
                url={avatarUrl}
                size={34}
                showVerifiedBadge
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <LanguageModal
        visible={langModalVisible}
        onClose={() => setLangModalVisible(false)}
      />

      <LocationSelectorModal
        visible={isLocationModalOpen}
        onClose={closeLocationModal}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  backBtn: {
    padding: 6,
    marginRight: spacing.sm,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandLogoBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  brandTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
  },
  brandSubtitle: {
    fontSize: 10,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  locationContainer: {
    flexDirection: 'column',
  },
  locationHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    marginLeft: 3,
    marginRight: 3,
    textTransform: 'uppercase',
  },
  locationValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
    marginTop: 1,
  },
  rightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  langBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    backgroundColor: colors.primaryLight,
  },
  langText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  notifBtn: {
    padding: 6,
    position: 'relative',
  },
  badgeCount: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.danger,
    width: 15,
    height: 15,
    borderRadius: 7.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 9,
    color: colors.textInverse,
    fontWeight: '700',
  },
  profileHeaderBtn: {
    marginLeft: 4,
    padding: 1,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
});
