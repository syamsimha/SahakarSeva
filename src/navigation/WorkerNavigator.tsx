import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { colors } from '../theme';
import {
  WorkerHomeScreen,
  JobRequestsScreen,
  JobManagementScreen,
  WorkerEarningsScreen,
  WorkerWelfareScreen,
  WorkerVerificationScreen,
} from '../screens/worker';
import { NotificationsScreen, ProfileScreen, HelpSupportScreen } from '../screens/common';
import { useLanguage } from '../context/LanguageContext';
import { Ionicons } from '@expo/vector-icons';

type WorkerTab = 'home' | 'jobs' | 'requests' | 'earnings' | 'profile';

export const WorkerNavigator: React.FC = () => {
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<WorkerTab>('home');

  // Subscreen States
  const [showWelfare, setShowWelfare] = useState(false);
  const [showVerification, setShowVerification] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  if (showWelfare) {
    return <WorkerWelfareScreen onBack={() => setShowWelfare(false)} />;
  }

  if (showVerification) {
    return <WorkerVerificationScreen onBack={() => setShowVerification(false)} />;
  }

  if (showHelp) {
    return <HelpSupportScreen onBack={() => setShowHelp(false)} />;
  }

  if (showNotifications) {
    return <NotificationsScreen onBack={() => setShowNotifications(false)} />;
  }

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <WorkerHomeScreen
            onNavigateToJobRequests={() => setActiveTab('requests')}
            onNavigateToJobManagement={() => setActiveTab('jobs')}
            onNavigateToEarnings={() => setActiveTab('earnings')}
            onNavigateToWelfare={() => setShowWelfare(true)}
            onNavigateToVerification={() => setShowVerification(true)}
            onNavigateToNotifications={() => setShowNotifications(true)}
            onNavigateToProfile={() => setActiveTab('profile')}
          />
        );
      case 'jobs':
        return <JobManagementScreen />;
      case 'requests':
        return (
          <JobRequestsScreen
            onNavigateToVerification={() => setShowVerification(true)}
            onNavigateToJobManagement={() => setActiveTab('jobs')}
          />
        );
      case 'earnings':
        return <WorkerEarningsScreen />;
      case 'profile':
        return (
          <ProfileScreen
            onNavigateToHelp={() => setShowHelp(true)}
            onNavigateToWelfare={() => setShowWelfare(true)}
            onNavigateToVerification={() => setShowVerification(true)}
          />
        );
    }
  };

  const tabs: Array<{ id: WorkerTab; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
    { id: 'home', label: t('nav_home'), icon: 'home' },
    { id: 'jobs', label: t('nav_jobs'), icon: 'construct-outline' },
    { id: 'requests', label: 'Requests', icon: 'git-pull-request-outline' },
    { id: 'earnings', label: t('nav_earnings'), icon: 'wallet-outline' },
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
