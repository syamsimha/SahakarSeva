import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppUser, UserRole } from '../types';
import { authService, RegisterPayload } from '../services/authService';

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
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'customer',
  isOnboarded: true,
  isLoading: false,
  authError: null,
  isBackendConnected: false,
  login: async () => {},
  loginWithEmail: async () => {},
  register: async () => {},
  switchRole: async () => {},
  logout: async () => {},
  clearError: () => {},
  completeOnboarding: () => {},
  resetOnboarding: () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<UserRole>('customer');
  const [isOnboarded, setIsOnboarded] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // 1. Initial bootstrap: restore active Supabase session or demo user
    const initAuth = async () => {
      try {
        const u = await authService.getCurrentUser();
        if (u) {
          setUser(u);
          setRole(u.role);
        }
      } catch (err: any) {
        console.warn('Failed to restore auth session:', err?.message || err);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();

    // 2. Subscribe to live auth state changes from Supabase
    const subscription = authService.onAuthStateChange((updatedUser) => {
      if (updatedUser) {
        setUser(updatedUser);
        setRole(updatedUser.role);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  const clearError = () => {
    setAuthError(null);
  };

  const loginWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const u = await authService.loginWithPassword(email, password);
      setUser(u);
      setRole(u.role);
    } catch (err: any) {
      setAuthError(err?.message || 'Login failed. Please check your credentials.');
      throw err;
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
    } catch (err: any) {
      setAuthError(err?.message || 'Sign in failed. Please verify credentials.');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (payload: RegisterPayload) => {
    setIsLoading(true);
    setAuthError(null);
    try {
      const u = await authService.register(payload);
      setUser(u);
      setRole(u.role);
    } catch (err: any) {
      setAuthError(err?.message || 'Registration failed. Please check details.');
      throw err;
    } finally {
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
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    setAuthError(null);
    try {
      await authService.logout();
      setUser(null);
    } catch (err: any) {
      console.warn('Logout error:', err?.message || err);
    } finally {
      setIsLoading(false);
    }
  };

  const completeOnboarding = () => {
    setIsOnboarded(true);
  };

  const resetOnboarding = () => {
    setIsOnboarded(false);
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
        completeOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
