import React, { createContext, useContext, useState, useEffect } from 'react';
import { Alert } from 'react-native';
import { AppUser, UserRole } from '../types';
import { authService } from '../services';

interface AuthContextType {
  user: AppUser | null;
  role: UserRole;
  isOnboarded: boolean;
  isLoading: boolean;
  login: (role: UserRole, identifier?: string, password?: string) => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  updateUserProfile: (data: Partial<AppUser>) => Promise<void>;
  logout: () => Promise<void>;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: 'customer',
  isOnboarded: true,
  isLoading: false,
  login: async () => {},
  switchRole: async () => {},
  updateUserProfile: async () => {},
  logout: async () => {},
  completeOnboarding: () => {},
  resetOnboarding: () => {},
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
    // Strict Role-Based Access Control (RBAC):
    // Workers cannot access Admin or Customer dashboards.
    // Admins cannot access Customer or Worker dashboards.
    // Customers cannot access Worker or Admin dashboards.
    if (user && user.role !== newRole) {
      const currentRoleLabel = user.role === 'customer' ? 'Customer' : user.role === 'worker' ? 'Worker' : 'Administrator';
      const targetRoleLabel = newRole === 'customer' ? 'Customer' : newRole === 'worker' ? 'Worker' : 'Administrator';
      Alert.alert(
        'Access Denied (RBAC Enforced)',
        `Role-Based Access Control: You are authenticated as a ${currentRoleLabel}.\n\nAccess to the ${targetRoleLabel} dashboard is strictly restricted.\n\nPlease Sign Out and log in with authorized ${targetRoleLabel} credentials.`
      );
      return;
    }
    await login(newRole);
  };

  const updateUserProfile = async (data: Partial<AppUser>) => {
    setIsLoading(true);
    try {
      const updated = await authService.updateUser(data);
      setUser(updated);
    } finally {
      setIsLoading(false);
    }
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

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isOnboarded,
        isLoading,
        login,
        switchRole,
        updateUserProfile,
        logout,
        completeOnboarding,
        resetOnboarding,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
