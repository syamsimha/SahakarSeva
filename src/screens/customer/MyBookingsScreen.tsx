import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
} from 'react-native';
import { colors, spacing, typography, borderRadius } from '../../theme';
import { Header } from '../../components/common';
import { BookingCard } from '../../components/cards';
import { EmptyState } from '../../components/ui';
import { useBookings } from '../../context/BookingContext';
import { useLanguage } from '../../context/LanguageContext';
import { BookingStatus, Booking } from '../../types';

interface MyBookingsScreenProps {
  onNavigateToBookingDetails: (bookingId: string) => void;
  onNavigateToInvoice: (bookingId: string) => void;
  onNavigateToRate: (bookingId: string) => void;
  onNavigateToServices: () => void;
  onBack?: () => void;
}

type TabKey = 'active' | 'upcoming' | 'completed' | 'cancelled';

export const MyBookingsScreen: React.FC<MyBookingsScreenProps> = ({
  onNavigateToBookingDetails,
  onNavigateToInvoice,
  onNavigateToRate,
  onNavigateToServices,
  onBack,
}) => {
  const { t } = useLanguage();
  const { bookings } = useBookings();
  const [activeTab, setActiveTab] = useState<TabKey>('active');

  const filterBookings = (tab: TabKey): Booking[] => {
    switch (tab) {
      case 'active':
        return bookings.filter(
          (b) =>
            b.status === 'in_progress' ||
            b.status === 'on_the_way' ||
            b.status === 'accepted' ||
            b.status === 'requested'
        );
      case 'upcoming':
        return bookings.filter(
          (b) => b.status === 'requested' || b.status === 'accepted'
        );
      case 'completed':
        return bookings.filter((b) => b.status === 'completed');
      case 'cancelled':
        return bookings.filter((b) => b.status === 'cancelled');
    }
  };

  const displayedBookings = filterBookings(activeTab);

  const tabs: Array<{ id: TabKey; label: string }> = [
    { id: 'active', label: t('tab_active') },
    { id: 'upcoming', label: t('tab_upcoming') },
    { id: 'completed', label: t('tab_completed') },
    { id: 'cancelled', label: t('tab_cancelled') },
  ];

  return (
    <View style={styles.container}>
      <Header
        title={t('nav_bookings')}
        showBack={Boolean(onBack)}
        onBack={onBack}
      />

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              onPress={() => setActiveTab(tab.id)}
              style={[styles.tabBtn, isSelected && styles.tabBtnActive]}
            >
              <Text style={[styles.tabBtnText, isSelected && styles.tabBtnTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Bookings List */}
      <FlatList
        data={displayedBookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onPress={() => onNavigateToBookingDetails(item.id)}
            onViewInvoice={() => onNavigateToInvoice(item.id)}
            onRate={() => onNavigateToRate(item.id)}
            onTrack={() => onNavigateToBookingDetails(item.id)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title={`No ${activeTab} bookings`}
            message="Your booked cooperative services will show up here with live status updates."
            actionTitle="Browse Services"
            onAction={onNavigateToServices}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    borderRadius: borderRadius.sm,
  },
  tabBtnActive: {
    backgroundColor: colors.primaryLight,
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabBtnTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: spacing.xxxl,
  },
});
