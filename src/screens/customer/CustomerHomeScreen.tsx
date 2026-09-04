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
import { workerService } from '../../services';
import { LocationCoords } from '../../services/locationService';
import { WorkerProfile, ServiceCategory } from '../../types';
import { CategoryDetailsModal } from '../../components/customer';
import { Ionicons } from '@expo/vector-icons';

interface CustomerHomeScreenProps {
  activeLocationName?: string;
  currentLocation?: LocationCoords | null;
  locationStatus?: 'detecting' | 'ready' | 'denied' | 'error' | 'manual';
  locationErrorMessage?: string | null;
  onRetryGps?: () => void;
  onLocationPress?: () => void;
  onNavigateToServices: (categoryId?: string, searchQuery?: string) => void;
  onNavigateToWorkerProfile: (workerId: string) => void;
  onNavigateToBookingFlow: (workerId?: string, serviceId?: string) => void;
  onNavigateToBookings: () => void;
  onNavigateToEmergency: () => void;
  onNavigateToNotifications: () => void;
}

export const CustomerHomeScreen: React.FC<CustomerHomeScreenProps> = ({
  activeLocationName,
  currentLocation,
  locationStatus = 'ready',
  locationErrorMessage,
  onRetryGps,
  onLocationPress,
  onNavigateToServices,
  onNavigateToWorkerProfile,
  onNavigateToBookingFlow,
  onNavigateToBookings,
  onNavigateToEmergency,
  onNavigateToNotifications,
}) => {
  const { user } = useAuth();
  const { bookings } = useBookings();
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState('');
  const [workers, setWorkers] = useState<WorkerProfile[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCategoryForDetails, setSelectedCategoryForDetails] = useState<ServiceCategory | null>(null);

  // Dynamic live search query + radius filtering
  React.useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      const hasCoords =
        currentLocation &&
        typeof currentLocation.latitude === 'number' &&
        typeof currentLocation.longitude === 'number' &&
        currentLocation.coordinatesAvailable !== false;

      const coords = hasCoords
        ? { latitude: currentLocation!.latitude!, longitude: currentLocation!.longitude! }
        : undefined;

      const isSearchActive = Boolean(searchQuery.trim());

      workerService
        .getWorkers({
          searchQuery: isSearchActive ? searchQuery : undefined,
          availableOnly: !isSearchActive, // In search mode show all matching workers with their real availability status
          customerCoords: coords,
        })
        .then((data) => {
          setWorkers(isSearchActive ? data : data.slice(0, 4));
          setIsSearching(false);
        });
    }, 120);

    return () => clearTimeout(timer);
  }, [searchQuery, currentLocation]);

  // Active / Current Booking (Real customer bookings only, filtering out legacy 2024 mocks)
  const activeBooking = bookings.find(
    (b) =>
      !b.id.startsWith('bk-2024-') &&
      (!user || b.customerId === user.id) &&
      (b.status === 'in_progress' || b.status === 'on_the_way' || b.status === 'accepted')
  );

  return (
    <View style={styles.container}>
      <Header
        showLocation
        locationName={
          locationStatus === 'detecting'
            ? t('detecting_location')
            : activeLocationName || (locationStatus === 'denied' ? t('location_disabled') : t('select_location'))
        }
        onLocationPress={onLocationPress}
        onNotificationPress={onNavigateToNotifications}
        unreadNotificationsCount={2}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Welcome & Search Bar */}
        <View style={styles.welcomeSection}>
          <Text style={styles.greetingText}>{t('greeting')}, {user?.name.split(' ')[0] || 'Member'} 👋</Text>
          <Text style={styles.heroSubtitle}>Find certified cooperative workers in your area</Text>

          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('search_placeholder')}
            onFilterPress={() => onNavigateToServices(undefined, searchQuery)}
            onClear={() => setSearchQuery('')}
            style={{ marginTop: spacing.md }}
          />
        </View>

        {/* When search query is active, display matching workers immediately beneath the search bar */}
        {searchQuery.trim().length > 0 ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {t('results_count', { count: workers.length })}
              </Text>
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Text style={styles.seeAllText}>{t('clear_search')}</Text>
              </TouchableOpacity>
            </View>

            {workers.length === 0 ? (
              <View style={styles.noWorkersBox}>
                <Ionicons name="search-outline" size={32} color={colors.textMuted} />
                <Text style={styles.noWorkersTitle}>{t('no_workers_found')}</Text>
                <Text style={styles.noWorkersText}>
                  {t('workers_matching', { query: searchQuery })}
                </Text>
              </View>
            ) : (
              workers.map((worker) => (
                <WorkerCard
                  key={worker.id}
                  worker={worker}
                  onPress={() => onNavigateToWorkerProfile(worker.id)}
                  onBookNow={() => onNavigateToBookingFlow(worker.id)}
                />
              ))
            )}
          </View>
        ) : (
          <>
            {/* Location Status Notice if GPS is not enabled */}
            {(locationStatus === 'denied' || locationStatus === 'error') && (
              <View style={styles.locationAlertBanner}>
                <Ionicons name="location-outline" size={22} color={colors.warning} style={{ marginRight: 10 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.locationAlertTitle}>{t('unable_determine_location')}</Text>
                  <Text style={styles.locationAlertText}>
                    {locationErrorMessage || t('gps_not_granted')}
                  </Text>
                  <View style={styles.alertActionsRow}>
                    {onRetryGps && (
                      <TouchableOpacity onPress={onRetryGps} style={styles.alertGpsBtn} activeOpacity={0.8}>
                        <Ionicons name="navigate" size={13} color="#FFFFFF" style={{ marginRight: 4 }} />
                        <Text style={styles.alertGpsBtnText}>{t('retry_gps')}</Text>
                      </TouchableOpacity>
                    )}
                    {onLocationPress && (
                      <TouchableOpacity onPress={onLocationPress} style={styles.alertManualBtn} activeOpacity={0.8}>
                        <Ionicons name="create-outline" size={13} color={colors.primary} style={{ marginRight: 4 }} />
                        <Text style={styles.alertManualBtnText}>{t('enter_location_manually')}</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            )}

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
                  <Text style={styles.emergencyBadgeText}>{t('priority_badge')}</Text>
                </View>
                <Text style={styles.emergencyTitle}>{t('emergency_title')}</Text>
                <Text style={styles.emergencySubtitle}>{t('emergency_desc')}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.danger} />
            </TouchableOpacity>

            {/* Active Booking Tracker (if any) */}
            {activeBooking && (
              <View style={styles.activeBookingSection}>
                <View style={styles.sectionHeader}>
                  <View style={styles.activeTitleRow}>
                    <View style={styles.pulseGreenDot} />
                    <Text style={styles.sectionTitle}>{t('current_active_booking')}</Text>
                  </View>
                  <TouchableOpacity onPress={onNavigateToBookings}>
                    <Text style={styles.seeAllText}>{t('track')}</Text>
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
                    onPress={() => setSelectedCategoryForDetails(cat)}
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
                <Text style={styles.sectionTitle}>{t('zone_workers_title')}</Text>
                <Text style={styles.zoneText}>
                  {currentLocation?.isGps
                    ? t('live_gps_cluster')
                    : activeLocationName
                    ? activeLocationName.split(',')[0] + ' ' + t('local_zone')
                    : t('local_zone')}
                </Text>
              </View>
              <MapPlaceholder
                height={190}
                locationName={activeLocationName}
                latitude={currentLocation?.latitude}
                longitude={currentLocation?.longitude}
                isGps={currentLocation?.isGps}
                isLoadingLocation={locationStatus === 'detecting'}
                locationError={locationErrorMessage}
                onRetryGps={onRetryGps}
                onSelectManualLocation={onLocationPress}
                onWorkerSelect={(wId) => onNavigateToWorkerProfile(wId)}
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

              {/* Requirement 11: If manual address has NO coordinates, show informative notice */}
              {currentLocation?.locationMode === 'MANUAL' && currentLocation.coordinatesAvailable === false && (
                <View style={styles.noCoordsNoticeBox}>
                  <Ionicons name="information-circle-outline" size={18} color={colors.info} style={{ marginRight: 6 }} />
                  <Text style={styles.noCoordsNoticeText}>
                    {t('nearby_workers_coords_required')}
                  </Text>
                </View>
              )}

              {workers.length === 0 ? (
                <View style={styles.noWorkersBox}>
                  <Ionicons name="search-outline" size={32} color={colors.textMuted} />
                  <Text style={styles.noWorkersTitle}>{t('no_workers_found')}</Text>
                  <Text style={styles.noWorkersText}>
                    {t('no_workers_vicinity')}
                  </Text>
                </View>
              ) : (
                workers.map((worker) => (
                  <WorkerCard
                    key={worker.id}
                    worker={worker}
                    onPress={() => onNavigateToWorkerProfile(worker.id)}
                    onBookNow={() => onNavigateToBookingFlow(worker.id)}
                  />
                ))
              )}
            </View>
          </>
        )}

        {/* Fair Wage Cooperative Guarantee Card */}
        <View style={styles.guaranteeCard}>
          <Ionicons name="shield-checkmark" size={32} color={colors.primary} />
          <View style={styles.guaranteeContent}>
            <Text style={styles.guaranteeTitle}>{t('fair_wage_model')}</Text>
            <Text style={styles.guaranteeText}>
              {t('fair_wage_desc')}
            </Text>
          </View>
        </View>
      </ScrollView>

      <CategoryDetailsModal
        visible={Boolean(selectedCategoryForDetails)}
        category={selectedCategoryForDetails}
        onClose={() => setSelectedCategoryForDetails(null)}
        onFindWorkers={(catId) => onNavigateToServices(catId)}
        onBookTask={(catId, subId) => onNavigateToBookingFlow(undefined, catId)}
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
  noWorkersBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    marginVertical: spacing.sm,
  },
  noWorkersTitle: {
    ...typography.h4,
    color: colors.text,
    marginTop: spacing.sm,
  },
  noWorkersText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  locationAlertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  locationAlertTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  locationAlertText: {
    fontSize: 11,
    color: '#78350F',
    lineHeight: 14,
  },
  alertGpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  alertGpsBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textInverse,
  },
  alertActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  alertManualBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  alertManualBtnText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  noCoordsNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(37, 99, 235, 0.25)',
    borderRadius: borderRadius.sm,
    padding: spacing.sm,
    marginBottom: spacing.md,
  },
  noCoordsNoticeText: {
    flex: 1,
    fontSize: 11,
    color: colors.textSecondary,
    lineHeight: 15,
  },
});
