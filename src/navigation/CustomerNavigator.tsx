import React, { useState, useEffect } from 'react';
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
import { LocationCoords, locationService } from '../services/locationService';
import { LocationSelectorModal } from '../components/customer';
import { Ionicons } from '@expo/vector-icons';

type CustomerTab = 'home' | 'services' | 'bookings' | 'notifications' | 'profile';

export const CustomerNavigator: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<CustomerTab>('home');

  // Customer Location State (starts in detecting, no false Bengaluru default)
  const [currentLocation, setCurrentLocation] = useState<LocationCoords | null>(null);
  const [currentLocationLabel, setCurrentLocationLabel] = useState<string>('Detecting location...');
  const [locationStatus, setLocationStatus] = useState<'detecting' | 'ready' | 'denied' | 'error' | 'manual'>('detecting');
  const [locationErrorMessage, setLocationErrorMessage] = useState<string | null>(null);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const unwatchRef = React.useRef<(() => void) | null>(null);

  // Automatic GPS Detection on mount + Live Tracking
  useEffect(() => {
    let isMounted = true;

    const bootstrapLocation = async () => {
      // 1. Check if user previously saved a custom manual location in storage
      const saved = await locationService.getCurrentLocation();
      if (saved && (saved.locationMode === 'MANUAL' || !saved.isGps)) {
        if (!isMounted) return;
        setCurrentLocation(saved);
        setCurrentLocationLabel(saved.address || saved.city);
        setLocationStatus('manual');
        return;
      }

      // 2. Request live GPS from device / browser
      setLocationStatus('detecting');
      setCurrentLocationLabel('Acquiring GPS location...');

      const result = await locationService.requestLiveGpsLocation();
      if (!isMounted) return;

      if (result.success && result.coords) {
        setCurrentLocation(result.coords);
        setCurrentLocationLabel(result.coords.address);
        setLocationStatus('ready');
        setLocationErrorMessage(null);

        // Start live GPS tracking watcher
        unwatchRef.current = locationService.watchLiveGpsLocation((updatedCoords) => {
          if (!isMounted) return;
          setCurrentLocation(updatedCoords);
          setCurrentLocationLabel(updatedCoords.address);
        });
      } else {
        // Explicitly set denied/error - DO NOT fall back to Bengaluru!
        setLocationStatus(result.errorCode === 'PERMISSION_DENIED' ? 'denied' : 'error');
        setLocationErrorMessage(result.error || 'Unable to determine your current location.');
        setCurrentLocation(null);
        setCurrentLocationLabel('Location Unavailable');
      }
    };

    bootstrapLocation();

    return () => {
      isMounted = false;
      if (unwatchRef.current) {
        unwatchRef.current();
        unwatchRef.current = null;
      }
    };
  }, []);

  const handleRetryGps = async () => {
    if (unwatchRef.current) {
      unwatchRef.current();
      unwatchRef.current = null;
    }

    setLocationStatus('detecting');
    setCurrentLocationLabel('Acquiring GPS location...');
    setLocationErrorMessage(null);

    const result = await locationService.requestLiveGpsLocation();
    if (result.success && result.coords) {
      setCurrentLocation(result.coords);
      setCurrentLocationLabel(result.coords.address);
      setLocationStatus('ready');
      setLocationErrorMessage(null);

      unwatchRef.current = locationService.watchLiveGpsLocation((updatedCoords) => {
        setCurrentLocation(updatedCoords);
        setCurrentLocationLabel(updatedCoords.address);
      });
    } else {
      setLocationStatus(result.errorCode === 'PERMISSION_DENIED' ? 'denied' : 'error');
      setLocationErrorMessage(result.error || 'Unable to determine your current location.');
      setCurrentLocation(null);
      setCurrentLocationLabel('Location Unavailable');
    }
  };

  // Search State across tabs
  const [searchQuery, setSearchQuery] = useState<string | undefined>();

  // Modal / Subscreen States
  const [selectedWorkerId, setSelectedWorkerId] = useState<string | null>(null);
  const [bookingFlowWorkerId, setBookingFlowWorkerId] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null);
  const [selectedBookingDetailsId, setSelectedBookingDetailsId] = useState<string | null>(null);
  const [invoiceBookingId, setInvoiceBookingId] = useState<string | null>(null);
  const [rateBookingId, setRateBookingId] = useState<string | null>(null);
  const [showEmergency, setShowEmergency] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [helpBookingId, setHelpBookingId] = useState<string | undefined>(undefined);
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
        customerLocation={currentLocation || undefined}
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
        onNavigateToHelp={(bId) => {
          setSelectedBookingDetailsId(null);
          setHelpBookingId(bId);
          setShowHelp(true);
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
        currentLocation={currentLocation || undefined}
        onBookingSuccess={(b) => {
          setShowEmergency(false);
          setConfirmedBooking(b);
        }}
        onBack={() => setShowEmergency(false)}
      />
    );
  }

  if (showHelp) {
    return (
      <HelpSupportScreen
        initialBookingId={helpBookingId}
        onBack={() => {
          setShowHelp(false);
          setHelpBookingId(undefined);
        }}
      />
    );
  }

  // Render Base Tabs
  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <CustomerHomeScreen
            activeLocationName={currentLocationLabel}
            currentLocation={currentLocation}
            locationStatus={locationStatus}
            locationErrorMessage={locationErrorMessage}
            onRetryGps={handleRetryGps}
            onLocationPress={() => setShowLocationModal(true)}
            onNavigateToServices={(catId, q) => {
              setServiceCategoryId(catId);
              setSearchQuery(q);
              setActiveTab('services');
            }}
            onNavigateToWorkerProfile={(wId) => setSelectedWorkerId(wId)}
            onNavigateToBookingFlow={(wId, catId) => {
              setBookingFlowWorkerId(wId || 'worker-101');
              if (catId) setServiceCategoryId(catId);
            }}
            onNavigateToBookings={() => setActiveTab('bookings')}
            onNavigateToEmergency={() => setShowEmergency(true)}
            onNavigateToNotifications={() => setActiveTab('notifications')}
          />
        );
      case 'services':
        return (
          <ServiceSearchScreen
            initialCategoryId={serviceCategoryId}
            initialSearchQuery={searchQuery}
            activeLocationName={currentLocationLabel}
            onLocationPress={() => setShowLocationModal(true)}
            onNavigateToWorkerProfile={(wId) => setSelectedWorkerId(wId)}
            onNavigateToBookingFlow={(wId, catId) => {
              setBookingFlowWorkerId(wId);
              if (catId) setServiceCategoryId(catId);
            }}
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
            onNavigateToHelp={() => {
              setHelpBookingId(undefined);
              setShowHelp(true);
            }}
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

      <LocationSelectorModal
        visible={showLocationModal}
        currentLocation={currentLocation}
        currentAddress={currentLocationLabel}
        onClose={() => setShowLocationModal(false)}
        onSelectLocation={(loc, label) => {
          if (!loc.isGps && unwatchRef.current) {
            unwatchRef.current();
            unwatchRef.current = null;
          }
          setCurrentLocation(loc);
          setCurrentLocationLabel(label);
          setLocationStatus(loc.isGps ? 'ready' : 'manual');
          setLocationErrorMessage(null);
        }}
        onUseGps={handleRetryGps}
        onManageAddresses={() => {
          setShowLocationModal(false);
          setActiveTab('profile');
        }}
      />
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
