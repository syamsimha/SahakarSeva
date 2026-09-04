import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppUser, UserRole, Customer } from '../types';
import { authService } from '../services';

interface AuthContextType {
  user: AppUser | null;
  role: UserRole;
  isOnboarded: boolean;
  isLoading: boolean;
  login: (role: UserRole, identifier?: string, password?: string) => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  updateCustomerProfile: (data: Partial<Customer>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'customer',
  isOnboarded: true,
  isLoading: false,
  login: async () => {},
  switchRole: async () => {},
  logout: async () => {},
  completeOnboarding: () => {},
  resetOnboarding: () => {},
  updateCustomerProfile: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [role, setRole] = useState<UserRole>('customer');
  const [isOnboarded, setIsOnboarded] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Initial bootstrap
    const init = async () => {
      try {
        const u = await authService.getCurrentUser();
        setUser(u);
        setRole(u.role);
      } catch (err) {
        console.error('Failed to initialize auth', err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = async (newRole: UserRole, identifier?: string, password?: string) => {
    setIsLoading(true);
    try {
      const u = await authService.login(newRole, identifier, password);
      setUser(u);
      setRole(u.role);
    } finally {
      setIsLoading(false);
    }
  };

  const switchRole = async (newRole: UserRole) => {
    await login(newRole);
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await authService.logout();
      setUser(null);
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
        login,
        switchRole,
        logout,
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
