import { AppUser, UserRole } from '../types';
import { mockCustomer, mockWorkerUser, mockAdminUser } from '../data';

class AuthService {
  private currentUser: AppUser = mockCustomer;

  async getCurrentUser(): Promise<AppUser> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(this.currentUser), 150);
    });
  }

  async login(role: UserRole, _identifier?: string, _password?: string): Promise<AppUser> {
    return new Promise((resolve) => {
      setTimeout(() => {
        if (role === 'worker') {
          this.currentUser = { ...mockWorkerUser };
        } else if (role === 'admin') {
          this.currentUser = { ...mockAdminUser };
        } else {
          this.currentUser = { ...mockCustomer };
        }
        resolve(this.currentUser);
      }, 300);
    });
  }

  async switchRole(role: UserRole): Promise<AppUser> {
    return this.login(role);
  }

  async registerCustomer(data: Partial<AppUser>): Promise<AppUser> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newUser: AppUser = {
          ...mockCustomer,
          ...data,
          id: `cust-${Date.now()}`,
          role: 'customer',
        };
        this.currentUser = newUser;
        resolve(newUser);
      }, 400);
    });
  }

  async registerWorker(data: Partial<AppUser>): Promise<AppUser> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const newWorker: AppUser = {
          ...mockWorkerUser,
          ...data,
          id: `worker-${Date.now()}`,
          role: 'worker',
          verificationStatus: 'pending',
        };
        this.currentUser = newWorker;
        resolve(newWorker);
      }, 400);
    });
  }

  async logout(): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.currentUser = mockCustomer;
        resolve();
      }, 200);
    });
  }
}

export const authService = new AuthService();
