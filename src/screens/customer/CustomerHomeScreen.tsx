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
  const { t } = useLanguage();
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
        locationName="Indiranagar, Bengaluru"
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
            onFilterPress={() => onNavigateToServices()}
            style={{ marginTop: spacing.md }}
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
              <Text style={styles.emergencyBadgeText}>PRIORITY 24x7</Text>
            </View>
            <Text style={styles.emergencyTitle}>Emergency Cooperative Response</Text>
            <Text style={styles.emergencySubtitle}>Electrician & plumber available in 20-30 mins</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={colors.danger} />
        </TouchableOpacity>

        {/* Active Booking Tracker (if any) */}
        {activeBooking && (
          <View style={styles.activeBookingSection}>
            <View style={styles.sectionHeader}>
              <View style={styles.activeTitleRow}>
                <View style={styles.pulseGreenDot} />
                <Text style={styles.sectionTitle}>Current Active Booking</Text>
              </View>
              <TouchableOpacity onPress={onNavigateToBookings}>
                <Text style={styles.seeAllText}>Track</Text>
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
            <Text style={styles.viewMoreText}>+ View 4 More Cooperative Categories</Text>
          </TouchableOpacity>
        </View>

        {/* Cooperative Map Geo-Spatial Preview */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Workers Near Your Cooperative Zone</Text>
            <Text style={styles.zoneText}>Indiranagar Cluster</Text>
          </View>
          <MapPlaceholder height={160} workerCount={8} />
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
            <Text style={styles.guaranteeTitle}>The Cooperative Promise</Text>
            <Text style={styles.guaranteeText}>
              Every rupee paid directly supports worker welfare funds, pension contributions, and zero middleman exploitation.
            </Text>
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
});
