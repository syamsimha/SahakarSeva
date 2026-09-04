import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../theme';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import {
  SplashScreen,
  OnboardingScreen,
  LoginScreen,
  RegisterScreen,
  ForgotPasswordScreen,
} from '../screens/auth';
import { CustomerNavigator } from './CustomerNavigator';
import { WorkerNavigator } from './WorkerNavigator';
import { AdminNavigator } from './AdminNavigator';
import { DeviceFrame } from '../components/ui';

export const RootNavigator: React.FC = () => {
  const { user, role, isOnboarded, isLoading } = useAuth();
  const [showSplash, setShowSplash] = useState(true);
  const [authScreen, setAuthScreen] = useState<'login' | 'register' | 'forgotPassword'>('login');
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [regSuccessMessage, setRegSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setShowSplash(false);
        setRecoveryMode(true);
        setAuthScreen('forgotPassword');
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // When user signs out or user state becomes null, always ensure authScreen is 'login'
  useEffect(() => {
    if (!user) {
      setAuthScreen('login');
      setRecoveryMode(false);
    }
  }, [user]);

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

  if (!user || recoveryMode) {
    return (
      <DeviceFrame>
        {authScreen === 'login' && !recoveryMode ? (
          <LoginScreen
            onNavigateToRegister={() => {
              setRegSuccessMessage(null);
              setAuthScreen('register');
            }}
            onNavigateToForgotPassword={() => {
              setRegSuccessMessage(null);
              setAuthScreen('forgotPassword');
            }}
            onLoginSuccess={() => setRegSuccessMessage(null)}
            registrationSuccessMessage={regSuccessMessage}
            onClearRegistrationSuccessMessage={() => setRegSuccessMessage(null)}
          />
        ) : authScreen === 'register' && !recoveryMode ? (
          <RegisterScreen
            onNavigateToLogin={() => setAuthScreen('login')}
            onRegisterSuccess={() => {
              setRegSuccessMessage('Registration successful. Please sign in to continue.');
              setAuthScreen('login');
            }}
          />
        ) : (
          <ForgotPasswordScreen
            onNavigateToLogin={() => {
              setRecoveryMode(false);
              setAuthScreen('login');
            }}
            initialStep={recoveryMode ? 'new_password' : 'identifier'}
          />
        )}
      </DeviceFrame>
    );
  }

  // Render role-specific navigation inside device frame
  const renderRoleNavigator = () => {
    switch (role) {
      case 'worker':
        return <WorkerNavigator />;
      case 'admin':
        return <AdminNavigator />;
      default:
        return <CustomerNavigator />;
    }
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
