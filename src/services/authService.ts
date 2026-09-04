import { AppUser, UserRole, Customer } from '../types';
import { mockCustomer, mockWorkerUser, mockAdminUser } from '../data';
import { databaseService, storage } from './db/databaseService';

const SESSION_INIT_KEY = 'sahakar_initial_auth_seeded';

class AuthService {
  private currentUser: AppUser | null = null;

  async getCurrentUser(): Promise<AppUser | null> {
    // Check persistent database session
    const saved = await databaseService.getSession();
    if (saved) {
      this.currentUser = saved;
      return saved;
    }

    // If user explicitly logged out or session was cleared, stay logged out
    const hasInitialized = storage.getItem(SESSION_INIT_KEY);
    if (hasInitialized) {
      this.currentUser = null;
      return null;
    }

    // On very first launch of the demo before any logout, seed with default customer session
    storage.setItem(SESSION_INIT_KEY, 'true');
    this.currentUser = { ...mockCustomer };
    await databaseService.setSession(this.currentUser);
    return this.currentUser;
  }

  async login(role: UserRole, _identifier?: string, _password?: string): Promise<AppUser> {
    storage.setItem(SESSION_INIT_KEY, 'true');
    let user: AppUser;
    if (role === 'worker') {
      user = { ...mockWorkerUser };
    } else if (role === 'admin') {
      user = { ...mockAdminUser };
    } else {
      user = { ...mockCustomer };
    }
    this.currentUser = user;
    await databaseService.setSession(user);
    return user;
  }

  async switchRole(role: UserRole): Promise<AppUser> {
    return this.login(role);
  }

  async registerCustomer(data: Partial<AppUser>): Promise<AppUser> {
    storage.setItem(SESSION_INIT_KEY, 'true');
    const newUser: AppUser = {
      ...mockCustomer,
      ...data,
      id: `cust-${Date.now()}`,
      role: 'customer',
    };
    this.currentUser = newUser;
    await databaseService.updateUser(newUser);
    await databaseService.setSession(newUser);
    return newUser;
  }

  async updateCustomerProfile(data: Partial<Customer>): Promise<Customer> {
    if (!this.currentUser) {
      throw new Error('No authenticated user to update');
    }
    const updated: Customer = {
      ...(this.currentUser as Customer),
      ...data,
    };
    this.currentUser = updated;
    await databaseService.updateUser(updated);
    await databaseService.setSession(updated);
    return updated;
  }

  async registerWorker(data: Partial<AppUser>): Promise<AppUser> {
    storage.setItem(SESSION_INIT_KEY, 'true');
    const newWorker: AppUser = {
      ...mockWorkerUser,
      ...data,
      id: `worker-${Date.now()}`,
      role: 'worker',
      verificationStatus: 'pending',
    };
    this.currentUser = newWorker;
    await databaseService.updateUser(newWorker);
    await databaseService.setSession(newWorker);
    return newWorker;
  }

  async logout(): Promise<void> {
    storage.setItem(SESSION_INIT_KEY, 'true'); // Flag that app is initialized so it won't re-seed
    this.currentUser = null;
    await databaseService.clearSession();
  }
}

export const authService = new AuthService();
