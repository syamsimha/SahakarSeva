import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, BookingProvider, LanguageProvider, NotificationProvider } from './src/context';
import { RootNavigator } from './src/navigation';

export default function App() {
  return (
    <SafeAreaProvider style={{ flex: 1, width: '100%', height: '100%' }}>
      <LanguageProvider>
        <AuthProvider>
          <BookingProvider>
            <NotificationProvider>
              <StatusBar style="auto" />
              <RootNavigator />
            </NotificationProvider>
          </BookingProvider>
        </AuthProvider>
      </LanguageProvider>
    </SafeAreaProvider>
  );
}
