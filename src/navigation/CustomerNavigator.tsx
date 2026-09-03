import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { colors, borderRadius, spacing } from '../theme';
import {
  CustomerHomeScreen,
  ServiceSearchScreen,
  WorkerProfileScreen,
  BookingFlowScreen,
  BookingConfirmScreen,
  MyBookingsScreen,
  BookingDetailsScreen,
  EmergencyServicesScreen,
  InvoiceScreen,
  ReviewScreen,
} from '../screens/customer';
import { NotificationsScreen, ProfileScreen, HelpSupportScreen } from '../screens/common';
import { Booking } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

type CustomerTab = 'home' | 'services' | 'bookings' | 'notifications' | 'profile';

export const CustomerNavigator: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<CustomerTab>('home');

  // Modal / Subscreen States
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [bookingFlowWorkerId, setBookingFlowWorkerId] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [selectedBookingDetailsId, setSelectedBookingDetailsId] = useState<string | null>(null);
  const [invoiceBookingId, setInvoiceBookingId] = useState<string | null>(null);
  const [rateBookingId, setRateBookingId] = useState<string | null>(null);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [serviceCategoryId, setServiceCategoryId] = useState<string | undefined>();

  // Overlays / Subscreens
  if (confirmedBooking) {
    return (
      <BookingConfirmScreen
        booking={confirmedBooking}
        onViewMyBookings={() => {
          setConfirmedBooking(null);
          setActiveTab('bookings');
        }}
        onGoHome={() => {
          setConfirmedBooking(null);
          setActiveTab('home');
        }}
      />
    );
  }

  if (bookingFlowWorkerId) {
    return (
      <BookingFlowScreen
        initialWorkerId={bookingFlowWorkerId}
        initialServiceId={serviceCategoryId}
        onBookingSuccess={(booking) => {
          setBookingFlowWorkerId(null);
          setConfirmedBooking(booking);
        }}
        onCancel={() => setBookingFlowWorkerId(null)}
      />
    );
  }

  if (selectedWorkerId) {
    return (
      <WorkerProfileScreen
        workerId={selectedWorkerId}
        onBookService={(wId) => {
          setSelectedWorkerId(null);
          setBookingFlowWorkerId(wId);
        }}
        onBack={() => setSelectedWorkerId(null)}
      />
    );
  }

  if (selectedBookingDetailsId) {
    return (
      <BookingDetailsScreen
        bookingId={selectedBookingDetailsId}
        onNavigateToInvoice={(bId) => {
          setSelectedBookingDetailsId(null);
          setInvoiceBookingId(bId);
        }}
        onNavigateToRate={(bId) => {
          setSelectedBookingDetailsId(null);
          setRateBookingId(bId);
        }}
        onBack={() => setSelectedBookingDetailsId(null)}
      />
    );
  }

  if (invoiceBookingId) {
    return (
      <InvoiceScreen
        bookingId={invoiceBookingId}
        onBack={() => setInvoiceBookingId(null)}
      />
    );
  }

  if (rateBookingId) {
    return (
      <ReviewScreen
        bookingId={rateBookingId}
        onSuccess={() => setRateBookingId(null)}
        onBack={() => setRateBookingId(null)}
      />
    );
  }

  if (showEmergency) {
    return (
      <EmergencyServicesScreen
        onBookingSuccess={(b) => {
          setShowEmergency(false);
          setConfirmedBooking(b);
        }}
        onBack={() => setShowEmergency(false)}
      />
    );
  }

  if (showHelp) {
    return <HelpSupportScreen onBack={() => setShowHelp(false)} />;
  }

  // Render Base Tabs
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <CustomerHomeScreen
            onNavigateToServices={(catId) => {
              setServiceCategoryId(catId);
              setActiveTab('services');
            }}
            onNavigateToWorkerProfile={(wId) => setSelectedWorkerId(wId)}
            onNavigateToBookingFlow={(wId) => setBookingFlowWorkerId(wId || 'worker-101')}
            onNavigateToBookings={() => setActiveTab('bookings')}
            onNavigateToEmergency={() => setShowEmergency(true)}
            onNavigateToNotifications={() => setActiveTab('notifications')}
          />
        );
      case 'services':
        return (
          <ServiceSearchScreen
            initialCategoryId={serviceCategoryId}
            onNavigateToWorkerProfile={(wId) => setSelectedWorkerId(wId)}
            onNavigateToBookingFlow={(wId) => setBookingFlowWorkerId(wId)}
          />
        );
      case 'bookings':
        return (
          <MyBookingsScreen
            onNavigateToBookingDetails={(bId) => setSelectedBookingDetailsId(bId)}
            onNavigateToInvoice={(bId) => setInvoiceBookingId(bId)}
            onNavigateToRate={(bId) => setRateBookingId(bId)}
            onNavigateToServices={() => setActiveTab('services')}
          />
        );
      case 'notifications':
        return <NotificationsScreen />;
      case 'profile':
        return (
          <ProfileScreen
            onNavigateToHelp={() => setShowHelp(true)}
          />
        );
    }
  };

  const tabs: Array<{ id: CustomerTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { id: 'home', label: t('nav_home'), icon: 'home' },
    { id: 'services', label: t('nav_services'), icon: 'grid-outline' },
    { id: 'bookings', label: t('nav_bookings'), icon: 'calendar-outline' },
    { id: 'notifications', label: t('nav_notifications'), icon: 'notifications-outline' },
    { id: 'profile', label: t('nav_profile'), icon: 'person-outline' },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.content}>{renderTabContent()}</View>

      {/* Bottom Tab Bar */}
      <View style={styles.tabBar}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.7}
              onPress={() => {
                setServiceCategoryId(undefined);
                setActiveTab(tab.id);
              }}
              style={styles.tabItem}
            >
              <Ionicons
                name={tab.icon}
                size={22}
                color={isActive ? colors.primary : colors.textMuted}
              />
              <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 8,
    paddingBottom: 10,
    elevation: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: colors.textMuted,
    marginTop: 3,
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});
