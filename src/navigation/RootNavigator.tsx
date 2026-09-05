import React, { useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { SplashScreen, OnboardingScreen, LoginScreen, RegisterScreen } from '../screens/auth';
import { CustomerNavigator } from './CustomerNavigator';
import { WorkerNavigator } from './WorkerNavigator';
import { AdminNavigator } from './AdminNavigator';
import { DeviceFrame } from '../components/ui';

export const RootNavigator: React.FC = () => {
  const { user, role, isOnboarded, isLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [authScreen, setAuthScreen] = useState<'login' | 'register'>('login');

  if (isLoading && showSplash) {
    return (
      <DeviceFrame>
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </DeviceFrame>
    );
  }

  if (showSplash) {
    return (
      <DeviceFrame>
        <SplashScreen onFinish={() => setShowSplash(false)} />
      </DeviceFrame>
    );
  }

  if (!isOnboarded) {
    return (
      <DeviceFrame>
        <OnboardingScreen onComplete={() => {}} />
      </DeviceFrame>
    );
  }

  if (!user) {
    return (
      <DeviceFrame>
        {authScreen === 'login' ? (
          <LoginScreen
            onNavigateToRegister={() => setAuthScreen('register')}
            onLoginSuccess={() => {}}
          />
        ) : (
          <RegisterScreen
            onNavigateToLogin={() => setAuthScreen('login')}
            onRegisterSuccess={() => {}}
          />
        )}
      </DeviceFrame>
    );
  }

  // Render role-specific navigation inside device frame with strict RBAC:
  // If a member is signed in as customer, they are strictly restricted to CustomerNavigator.
  const renderRoleNavigator = () => {
    const userRole = user.role || 'customer';
    if (userRole === 'customer') {
      return <CustomerNavigator />;
    }
    if (userRole === 'worker') {
      return <WorkerNavigator />;
    }
    if (userRole === 'admin') {
      return <AdminNavigator />;
    }
    return <CustomerNavigator />;
  };

  return <DeviceFrame>{renderRoleNavigator()}</DeviceFrame>;
};

const styles = StyleSheet.create({
  loadingCenter: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
