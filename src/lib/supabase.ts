import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import { Database } from './database.types';

const getEnvUrl = (): string => {
  let url = (process.env.EXPO_PUBLIC_SUPABASE_URL || '').trim();
  return url.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
};
const getEnvKey = (): string => (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '').trim();

// Verify if environment variables are configured and valid
export const isSupabaseConfigured = (): boolean => {
  const url = getEnvUrl();
  const key = getEnvKey();
  if (!url || !key) return false;
  return url.startsWith('https://') || url.startsWith('http://');
};

/**
 * Resolves the application redirect URL for authentication (email confirmation & password reset).
 * Priority:
 * 1. Environment variable EXPO_PUBLIC_APP_URL or EXPO_PUBLIC_REDIRECT_URL (dev & prod configurable)
 * 2. In browser runtime (web): current window.location.origin
 * 3. Fallback: http://localhost:8081
 */
export const getAppRedirectUrl = (): string => {
  const envUrl = (
    process.env.EXPO_PUBLIC_APP_URL ||
    process.env.EXPO_PUBLIC_REDIRECT_URL ||
    process.env.EXPO_PUBLIC_SITE_URL ||
    ''
  ).trim();

  if (envUrl) {
    return envUrl.replace(/\/+$/, '');
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, '');
  }

  return 'http://localhost:8081';
};

// Storage adapter that safely falls back between local storage and AsyncStorage
const customStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        return window.localStorage.getItem(key);
      }
      return await AsyncStorage.getItem(key);
    } catch (e) {
      console.warn('Supabase storage getItem error:', e);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem(key, value);
        return;
      }
      await AsyncStorage.setItem(key, value);
    } catch (e) {
      console.warn('Supabase storage setItem error:', e);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    try {
      if (Platform.OS === 'web' && typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.removeItem(key);
        return;
      }
      await AsyncStorage.removeItem(key);
    } catch (e) {
      console.warn('Supabase storage removeItem error:', e);
    }
  },
};

const supabaseUrl = getEnvUrl();
const supabaseAnonKey = getEnvKey();

// Valid fallback URL to prevent createClient from throwing on initialization if env is empty
const effectiveUrl = supabaseUrl || 'https://placeholder-project.supabase.co';
const effectiveKey = supabaseAnonKey || 'placeholder-anon-key';

export const supabase = createClient<Database>(effectiveUrl, effectiveKey, {
  auth: {
    storage: customStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: Platform.OS === 'web',
  },
});
