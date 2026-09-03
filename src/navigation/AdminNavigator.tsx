import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { colors } from '../theme';
import {
  AdminDashboardScreen,
  WorkerManagementScreen,
  WorkerVerificationAdminScreen,
  AdminBookingsScreen,
  AIDemandForecastScreen,
} from '../screens/admin';
import { NotificationsScreen, ProfileScreen, HelpSupportScreen } from '../screens/common';
import { useLanguage } from '../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

type AdminTab = 'dashboard' | 'workers' | 'bookings' | 'analytics' | 'profile';

export const AdminNavigator: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');

  // Subscreens
  const [showVerification, setShowVerification] = useState(false);
  const [showForecast, setShowForecast] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  if (showVerification) {
    return <WorkerVerificationAdminScreen onBack={() => setShowVerification(false)} />;
  }

  if (showForecast) {
    return <AIDemandForecastScreen onBack={() => setShowForecast(false)} />;
  }

  if (showHelp) {
    return <HelpSupportScreen onBack={() => setShowHelp(false)} />;
  }

  if (showNotifications) {
    return <NotificationsScreen onBack={() => setShowNotifications(false)} />;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <AdminDashboardScreen
            onNavigateToWorkers={() => setActiveTab('workers')}
            onNavigateToVerification={() => setShowVerification(true)}
            onNavigateToBookings={() => setActiveTab('bookings')}
            onNavigateToForecast={() => setShowForecast(true)}
            onNavigateToNotifications={() => setShowNotifications(true)}
          />
        );
      case 'workers':
        return <WorkerManagementScreen />;
      case 'bookings':
        return <AdminBookingsScreen />;
      case 'analytics':
        return <AIDemandForecastScreen />;
      case 'profile':
        return (
          <ProfileScreen
            onNavigateToHelp={() => setShowHelp(true)}
          />
        );
    }
  };

  const tabs: Array<{ id: AdminTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid' },
    { id: 'workers', label: t('nav_workers'), icon: 'people-outline' },
    { id: 'bookings', label: t('nav_bookings'), icon: 'receipt-outline' },
    { id: 'analytics', label: t('nav_analytics'), icon: 'analytics-outline' },
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
              onPress={() => setActiveTab(tab.id)}
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
