import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { colors, borderRadius, spacing, typography } from '../../theme';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { LanguageModal } from './LanguageModal';
import { RoleSwitcherModal } from './RoleSwitcherModal';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  showLocation?: boolean;
  locationName?: string;
  onNotificationPress?: () => void;
  unreadNotificationsCount?: number;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  subtitle,
  showBack = false,
  onBack,
  showLocation = false,
  locationName = 'Indiranagar, Bengaluru',
  onNotificationPress,
  unreadNotificationsCount = 2,
}) => {
  const { role } = useAuth();
  const { language } = useLanguage();
  const [langModalVisible, setLangModalVisible] = useState(false);
  const [roleModalVisible, setRoleModalVisible] = useState(false);

  const getRoleLabel = () => {
    switch (role) {
      case 'worker':
        return 'Worker';
      case 'admin':
        return 'Admin';
      default:
        return 'Customer';
    }
  };

  const getRoleColor = () => {
    switch (role) {
      case 'worker':
        return colors.workerBadge;
      case 'admin':
        return colors.adminBadge;
      default:
        return colors.customerBadge;
    }
  };

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
            <View style={styles.locationContainer}>
              <View style={styles.locationHeaderRow}>
                <Ionicons name="location" size={14} color={colors.primary} />
                <Text style={styles.locationLabel}>Current Location</Text>
                <Ionicons name="chevron-down" size={12} color={colors.textSecondary} />
              </View>
              <Text style={styles.locationValue} numberOfLines={1}>
                {locationName}
              </Text>
            </View>
          ) : (
            <View style={styles.brandRow}>
              <View style={styles.brandLogoBox}>
                <Ionicons name="people" size={16} color={colors.textInverse} />
              </View>
              <View>
                <Text style={styles.brandTitle}>{title || 'Sahakar Sathi'}</Text>
                {subtitle && <Text style={styles.brandSubtitle}>{subtitle}</Text>}
              </View>
            </View>
          )}
        </View>

        {/* Right Actions: Role pill, Lang pill, Notification bell */}
        <View style={styles.rightContainer}>
          {/* Quick Role Switcher Pill */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setRoleModalVisible(true)}
            style={[styles.rolePill, { borderColor: getRoleColor() }]}
          >
            <View style={[styles.roleDot, { backgroundColor: getRoleColor() }]} />
            <Text style={[styles.roleText, { color: getRoleColor() }]}>
              {getRoleLabel()}
            </Text>
          </TouchableOpacity>

          {/* Language Selector Button */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => setLangModalVisible(true)}
            style={styles.langBtn}
          >
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
        </View>
      </View>

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
    gap: 6,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    borderWidth: 1,
    backgroundColor: colors.background,
  },
  roleDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 4,
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
  },
  langBtn: {
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
});
