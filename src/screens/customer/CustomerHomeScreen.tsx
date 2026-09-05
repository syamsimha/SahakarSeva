import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header, SearchBar } from '../../components/common';
import { ServiceCategoryCard, WorkerCard, BookingCard } from '../../components/cards';
import { Button, MapPlaceholder } from '../../components/ui';
import { serviceCategories, emergencyServices } from '../../data';
import { useAuth } from '../../context/AuthContext';
import { useBookings } from '../../context/BookingContext';
import { useLanguage } from '../../context/LanguageContext';
import { useNotifications } from '../../context/NotificationContext';
import { useLocation } from '../../context/LocationContext';
import { workerService } from '../../services';
import { WorkerProfile } from '../../types';
import { Ionicons } from '@expo/vector-icons';

interface CustomerHomeScreenProps {
  onNavigateToServices: (categoryId?: string) => void;
  onNavigateToWorkerProfile: (workerId: string) => void;
  onNavigateToBookingFlow: (workerId?: string, serviceId?: string) => void;
  onNavigateToBookings: () => void;
  onNavigateToEmergency: () => void;
  onNavigateToNotifications: () => void;
}

export const CustomerHomeScreen: React.FC<CustomerHomeScreenProps> = ({
  onNavigateToServices,
  onNavigateToWorkerProfile,
  onNavigateToBookingFlow,
  onNavigateToBookings,
  onNavigateToEmergency,
  onNavigateToNotifications,
}) => {
  const { user } = useAuth();
  const { bookings } = useBookings();
  const { unreadCount } = useNotifications();
  const { t } = useLanguage();
  const { currentLocation, openLocationModal, detectLiveGPS, isLocating } = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);

  React.useEffect(() => {
    workerService.getWorkers({ availableOnly: true }).then((data) => setWorkers(data.slice(0, 3)));
  }, []);

  // Active / Current Booking
  const activeBooking = bookings.find(
    (b) => b.status === 'in_progress' || b.status === 'on_the_way' || b.status === 'accepted'
  );

  return (
    <View style={styles.container}>
      <Header
        showLocation
        onNotificationPress={onNavigateToNotifications}
        unreadNotificationsCount={unreadCount}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Welcome & Search Bar */}
        <View style={styles.welcomeSection}>
          <Text style={styles.greetingText}>{t('greeting')}, {user?.name.split(' ')[0] || 'Member'} 👋</Text>
          <Text style={styles.heroSubtitle}>{t('hero_subtitle')}</Text>

          {/* Quick Location Bar with GPS Fix & Modify Place */}
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={openLocationModal}
            style={styles.locationBar}
          >
            <View style={styles.locationBarLeft}>
              <Ionicons
                name={currentLocation.isGPS ? 'navigate' : 'pin'}
                size={16}
                color={currentLocation.isGPS ? colors.success : colors.primary}
              />
              <View style={{ flex: 1, marginLeft: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Text style={styles.locationBarPlace} numberOfLines={1}>
                    {currentLocation.placeName || currentLocation.city}
                  </Text>
                  {currentLocation.isGPS && (
                    <Text style={styles.locationGpsBadge}>GPS ACTIVE</Text>
                  )}
                </View>
                <Text style={styles.locationBarAddress} numberOfLines={1}>
                  {currentLocation.address}
                </Text>
              </View>
            </View>
            <View style={styles.locationModifyBtn}>
              <Text style={styles.locationModifyBtnText}>Modify</Text>
              <Ionicons name="chevron-forward" size={12} color={colors.primary} />
            </View>
          </TouchableOpacity>

          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('search_placeholder')}
            onFilterPress={() => onNavigateToServices()}
            style={{ marginTop: spacing.sm }}
          />
        </View>

        {/* Emergency 24x7 Banner */}
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onNavigateToEmergency}
          style={styles.emergencyBanner}
        >
          <View style={styles.emergencyIconBox}>
            <Ionicons name="flash" size={24} color={colors.danger} />
          </View>
          <View style={styles.emergencyTexts}>
            <View style={styles.emergencyBadge}>
              <Text style={styles.emergencyBadgeText}>{t('priority_247')}</Text>
            </View>
            <Text style={styles.emergencyTitle}>{t('emergency_banner_title')}</Text>
            <Text style={styles.emergencySubtitle}>{t('emergency_banner_subtitle')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.danger} />
        </TouchableOpacity>

        {/* Active Booking Tracker (if any) */}
        {activeBooking && (
          <View style={styles.activeBookingSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.activeTitleRow}>
                <View style={styles.pulseGreenDot} />
                <Text style={styles.sectionTitle}>{t('active_booking_tracking')}</Text>
              </View>
              <TouchableOpacity onPress={onNavigateToBookings}>
                <Text style={styles.seeAllText}>{t('view_details')}</Text>
              </TouchableOpacity>
            </View>

            <BookingCard
              booking={activeBooking}
              onPress={onNavigateToBookings}
              onTrack={onNavigateToBookings}
            />
          </View>
        )}

        {/* 10 Cooperative Service Categories */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('categories_title')}</Text>
            <TouchableOpacity onPress={() => onNavigateToServices()}>
              <Text style={styles.seeAllText}>{t('view_all')}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.categoriesGrid}>
            {serviceCategories.slice(0, 6).map((cat) => (
              <ServiceCategoryCard
                key={cat.id}
                category={cat}
                onPress={() => onNavigateToServices(cat.id)}
              />
            ))}
          </View>

          <TouchableOpacity
            style={styles.viewMoreServicesBtn}
            onPress={() => onNavigateToServices()}
          >
            <Text style={styles.viewMoreText}>{t('view_more_categories')}</Text>
          </TouchableOpacity>
        </View>

        {/* Cooperative Map Geo-Spatial Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('workers_near_zone')}</Text>
            <TouchableOpacity onPress={openLocationModal} style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
              <Ionicons name={currentLocation.isGPS ? 'navigate' : 'location'} size={12} color={colors.primary} />
              <Text style={styles.zoneText}>{currentLocation.placeName || currentLocation.city} Cluster</Text>
            </TouchableOpacity>
          </View>
          <MapPlaceholder
            height={160}
            locationName={`${currentLocation.placeName || currentLocation.city} (${currentLocation.isGPS ? '🛰️ Live GPS' : '📍 Active Zone'})`}
            workerCount={8}
          />
        </View>

        {/* Nearby Verified Workers */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('nearby_workers')}</Text>
            <TouchableOpacity onPress={() => onNavigateToServices()}>
              <Text style={styles.seeAllText}>{t('view_all')}</Text>
            </TouchableOpacity>
          </View>

          {workers.map((worker) => (
            <WorkerCard
              key={worker.id}
              worker={worker}
              onPress={() => onNavigateToWorkerProfile(worker.id)}
              onBookNow={() => onNavigateToBookingFlow(worker.id)}
            />
          ))}
        </View>

        {/* Fair Wage Cooperative Guarantee Card */}
        <View style={styles.guaranteeCard}>
          <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
          <View style={styles.guaranteeContent}>
            <Text style={styles.guaranteeTitle}>{t('cooperative_promise_title')}</Text>
            <Text style={styles.guaranteeText}>{t('cooperative_promise_desc')}</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xxxl,
  },
  welcomeSection: {
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  greetingText: {
    ...typography.h2,
    color: colors.text,
  },
  heroSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  emergencyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerLight,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1.5,
    borderColor: 'rgba(220, 38, 38, 0.3)',
  },
  emergencyIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  emergencyTexts: {
    flex: 1,
  },
  emergencyBadge: {
    backgroundColor: colors.danger,
    alignSelf: 'flex-start',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
    marginBottom: 2,
  },
  emergencyBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textInverse,
  },
  emergencyTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
  },
  emergencySubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 1,
  },
  section: {
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  activeBookingSection: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  activeTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulseGreenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
    marginRight: 6,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  zoneText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '500',
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  viewMoreServicesBtn: {
    paddingVertical: spacing.sm,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  viewMoreText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  guaranteeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(13, 122, 95, 0.25)',
  },
  guaranteeContent: {
    flex: 1,
    marginLeft: spacing.md,
  },
  guaranteeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  guaranteeText: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 15,
  },
  locationBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  locationBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  locationBarPlace: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  locationGpsBadge: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.success,
    backgroundColor: colors.successLight,
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: borderRadius.xs,
  },
  locationBarAddress: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 1,
  },
  locationModifyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.round,
    gap: 2,
  },
  locationModifyBtnText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.primary,
  },
});
