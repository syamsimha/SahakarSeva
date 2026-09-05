import { AppUser, UserRole } from '../types';
import { mockCustomer, mockWorkerUser, mockAdminUser } from '../data';

class AuthService {
  private currentUser: AppUser = mockCustomer;

  async getCurrentUser(): Promise<AppUser> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(this.currentUser), 150);
    });
  }

  async login(role: UserRole, identifier?: string, _password?: string): Promise<AppUser> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (role === 'worker') {
          this.currentUser = { ...mockWorkerUser };
        } else if (role === 'admin') {
          // Single Administrator Protocol:
          // Only one authorized Master Admin (Lakshmi Narayana - +91 94480 88990) is allowed to sign in and control all jobs.
          if (identifier && identifier.trim().length > 0) {
            const cleanId = identifier.replace(/\s+/g, '').replace('+91', '');
            const isMasterAdmin =
              cleanId === '9448088990' ||
              identifier.toLowerCase().includes('lakshmi.admin') ||
              identifier.toLowerCase().includes('admin');
            if (!isMasterAdmin) {
              reject(new Error('Single Admin Policy: Multiple administrators are not permitted. Only the designated Master Administrator (+91 94480 88990) can control district operations and all jobs.'));
              return;
            }
          }
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

  async updateUser(data: Partial<AppUser>): Promise<AppUser> {
    return new Promise((resolve) => {
      setTimeout(() => {
        this.currentUser = {
          ...this.currentUser,
          ...data,
        } as AppUser;
        resolve(this.currentUser);
      }, 150);
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
