import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { Platform, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppUser, UserRole, Customer } from '../types';
import { authService, RegisterPayload, mapFriendlyAuthError } from '../services/authService';

interface AuthContextType {
  user: AppUser | null;
  role: UserRole;
  isOnboarded: boolean;
  isLoading: boolean;
  authError: string | null;
  isBackendConnected: boolean;
  login: (role: UserRole, identifier?: string, password?: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (updates: Partial<AppUser>) => Promise<void>;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  updateCustomerProfile: (data: Partial<Customer>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'customer',
  isOnboarded: true,
  isLoading: false,
  authError: null,
  isBackendConnected: false,
  login: async () => { },
  loginWithEmail: async () => { },
  register: async () => { },
  switchRole: async () => { },
  logout: async () => { },
  clearError: () => { },
  updateUser: async () => { },
  completeOnboarding: () => { },
  resetOnboarding: () => { },
  updateCustomerProfile: async () => { },
});

const LAST_ACTIVE_KEY = '@sahakar_last_active_timestamp';
const DEFAULT_TIMEOUT_MINUTES = 30;

const getSessionTimeoutMs = (): number => {
  const envVal = Number(process.env.EXPO_PUBLIC_SESSION_TIMEOUT_MINUTES);
  if (!isNaN(envVal) && envVal > 0) {
    return envVal * 60 * 1000;
  }
  return DEFAULT_TIMEOUT_MINUTES * 60 * 1000;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<UserRole>('customer');
  const [isOnboarded, setIsOnboarded] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const lastActivityRef = useRef<number>(Date.now());
  const lastPersistRef = useRef<number>(0);

  // Throttled activity recorder (updates storage at most every 15 seconds)
  const recordActivity = useCallback(async () => {
    const now = Date.now();
    lastActivityRef.current = now;

    if (now - lastPersistRef.current > 15000) {
      lastPersistRef.current = now;
      try {
        await AsyncStorage.setItem(LAST_ACTIVE_KEY, now.toString());
      } catch (e) {
        // Storage write failures are non-fatal
      }
    }
  }, []);

  const clearInactivityTimestamp = async () => {
    try {
      await AsyncStorage.removeItem(LAST_ACTIVE_KEY);
    } catch (e) {
      // Ignore cleanup error
    }
  };

  const handleInactivityTimeout = useCallback(async () => {
    await clearInactivityTimestamp();
    try {
      await authService.logout();
    } catch (e) {
      // Ignore signout error
    }
    setUser(null);
    setAuthError('Your session has expired due to inactivity. Please sign in again.');
  }, []);

  // Check whether current inactivity threshold is exceeded
  const checkInactivity = useCallback(async () => {
    if (!user) return;
    const now = Date.now();
    const timeoutMs = getSessionTimeoutMs();

    // In-memory check
    if (now - lastActivityRef.current > timeoutMs) {
      await handleInactivityTimeout();
      return;
    }

    // Persistent storage check (important across tabs / refresh)
    try {
      const stored = await AsyncStorage.getItem(LAST_ACTIVE_KEY);
      if (stored) {
        const storedTs = Number(stored);
        if (!isNaN(storedTs) && now - storedTs > timeoutMs) {
          await handleInactivityTimeout();
        }
      }
    } catch (e) {
      // Ignore read error
    }
  }, [user, handleInactivityTimeout]);

  useEffect(() => {
    // 1. Initial bootstrap: restore active Supabase session
    const initAuth = async () => {
      try {
        const now = Date.now();
        const timeoutMs = getSessionTimeoutMs();
        const stored = await AsyncStorage.getItem(LAST_ACTIVE_KEY);

        // If previously stored session has exceeded inactivity timeout, purge it
        if (stored) {
          const storedTs = Number(stored);
          if (!isNaN(storedTs) && now - storedTs > timeoutMs) {
            await handleInactivityTimeout();
            return;
          }
        }

        // Fetch real Supabase authenticated user with database profile verification
        const u = await authService.getCurrentUser();
        if (u) {
          let merged = u;
          try {
            const cached = await AsyncStorage.getItem('@sahakar_cached_user');
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed && parsed.id === u.id) {
                merged = { ...u, ...parsed } as AppUser;
              }
            }
          } catch (e) {
            // Ignore parse error
          }
          setUser(merged);
          setRole(merged.role);
          await recordActivity();
        } else {
          await clearInactivityTimestamp();
          setUser(null);
        }
      } catch (err: any) {
        console.warn('Failed to restore auth session:', err?.message || err);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // 2. Subscribe to live auth state changes from Supabase
    const subscription = authService.onAuthStateChange((updatedUser, event) => {
      if (event === 'PASSWORD_RECOVERY') {
        // Do not route into normal dashboard session during password recovery
        return;
      }

      if (updatedUser) {
        setUser(updatedUser);
        setRole(updatedUser.role);
        recordActivity();
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [handleInactivityTimeout, recordActivity]);

  // Periodic inactivity checker (every 15 seconds)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      checkInactivity();
    }, 15000);

    return () => clearInterval(interval);
  }, [user, checkInactivity]);

  // Activity listeners for Web runtime
  useEffect(() => {
    if (!user) return;

    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const onUserActivity = () => {
        recordActivity();
      };

      window.addEventListener('mousedown', onUserActivity, { passive: true });
      window.addEventListener('keydown', onUserActivity, { passive: true });
      window.addEventListener('scroll', onUserActivity, { passive: true });
      window.addEventListener('touchstart', onUserActivity, { passive: true });

      return () => {
        window.removeEventListener('mousedown', onUserActivity);
        window.removeEventListener('keydown', onUserActivity);
        window.removeEventListener('scroll', onUserActivity);
        window.removeEventListener('touchstart', onUserActivity);
      };
    }
  }, [user, recordActivity]);

  // AppState listener for Mobile runtime
  useEffect(() => {
    if (!user) return;

    const sub = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkInactivity();
      }
    });

    return () => sub.remove();
  }, [user, checkInactivity]);

  const clearError = () => {
    setAuthError(null);
  };

  const loginWithEmail = async (identifier: string, password: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const u = await authService.loginWithPassword(identifier, password);
      setUser(u);
      setRole(u.role);
      await recordActivity();
    } catch (err: any) {
      const friendly = mapFriendlyAuthError(err);
      setAuthError(friendly);
      throw new Error(friendly);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (roleToUse: UserRole, identifier?: string, password?: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const u = await authService.login(roleToUse, identifier, password);
      setUser(u);
      setRole(u.role);
      await recordActivity();
    } catch (err: any) {
      const friendly = mapFriendlyAuthError(err);
      setAuthError(friendly);
      throw new Error(friendly);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    setIsLoading(true);
    setAuthError(null);
    setUser(null);
    try {
      await authService.register(payload);
      // Registration complete: user is NOT auto-logged in.
      // Redirects to Sign In to authenticate immediately.
    } catch (err: any) {
      console.error('[AuthContext.register] Registration error caught:', err);
      const friendly = mapFriendlyAuthError(err);
      if (
        friendly.toLowerCase().includes('too many') ||
        friendly.toLowerCase().includes('wait 60 seconds')
      ) {
        setAuthError(null);
      } else {
        setAuthError(friendly);
      }
      throw new Error(friendly);
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const switchRole = async (newRole: UserRole) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const u = await authService.switchRole(newRole);
      setUser(u);
      setRole(u.role);
      await recordActivity();
    } catch (err: any) {
      setAuthError(mapFriendlyAuthError(err?.message));
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      await clearInactivityTimestamp();
      await authService.logout();
    } catch (err: any) {
      console.warn('Logout error:', err?.message || err);
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  };

  const updateUser = async (updates: Partial<AppUser>) => {
    if (!user) return;
    const updated = { ...user, ...updates } as AppUser;
    setUser(updated);
    try {
      await AsyncStorage.setItem('@sahakar_cached_user', JSON.stringify(updated));
    } catch (e) {
      // Ignore storage error
    }
    try {
      if (authService.isConfigured() && user.id) {
        await authService.updateUserProfile(user.id, updates);
      }
    } catch (e) {
      console.warn('Backend profile update notice:', e);
    }
  };

  const completeOnboarding = () => {
    setIsOnboarded(true);
  };

  const resetOnboarding = () => {
    setIsOnboarded(false);
  };

  const updateCustomerProfile = async (data: Partial<Customer>) => {
    setIsLoading(true);
    try {
      const updated = await authService.updateCustomerProfile(data);
      setUser(updated);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isOnboarded,
        isLoading,
        authError,
        isBackendConnected: authService.isConfigured(),
        login,
        loginWithEmail,
        register,
        switchRole,
        logout,
        clearError,
        updateUser,
        completeOnboarding,
        resetOnboarding,
        updateCustomerProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
