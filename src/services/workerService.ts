import { WorkerProfile, WorkerVerificationStatus } from '../types';
import { mockWorkers } from '../data';

class WorkerService {
  private workers: WorkerProfile[] = [...mockWorkers];

  async getWorkers(filters?: {
    category?: string;
    searchQuery?: string;
    maxDistanceKm?: number;
    minRating?: number;
    availableOnly?: boolean;
    verifiedOnly?: boolean;
  }): Promise<WorkerProfile[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        let results = [...this.workers];

        if (filters?.verifiedOnly) {
          results = results.filter((w) => w.verificationStatus === 'verified');
        }

        if (filters?.searchQuery) {
          const q = filters.searchQuery.toLowerCase();
          results = results.filter(
            (w) =>
              w.name.toLowerCase().includes(q) ||
              w.primarySkill.toLowerCase().includes(q) ||
              w.allSkills.some((s) => s.toLowerCase().includes(q)) ||
              w.cooperativeName.toLowerCase().includes(q)
          );
        }

        if (filters?.category) {
          const cat = filters.category.toLowerCase();
          results = results.filter((w) =>
            w.primarySkill.toLowerCase().includes(cat) ||
            w.allSkills.some((s) => s.toLowerCase().includes(cat))
          );
        }

        if (filters?.minRating) {
          results = results.filter((w) => w.rating >= (filters.minRating || 0));
        }

        if (filters?.availableOnly) {
          results = results.filter((w) => w.isAvailable);
        }

        resolve(results);
      }, 200);
    });
  }

  async getWorkerById(id: string): Promise<WorkerProfile | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.workers.find((w) => w.id === id));
      }, 150);
    });
  }

  async updateAvailability(workerId: string, isAvailable: boolean): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const worker = this.workers.find((w) => w.id === workerId);
        if (worker) {
          worker.isAvailable = isAvailable;
        }
        resolve(true);
      }, 200);
    });
  }

  async updateVerificationStatus(
    workerId: string,
    status: WorkerVerificationStatus,
    _notes?: string
  ): Promise<WorkerProfile | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const worker = this.workers.find((w) => w.id === workerId);
        if (worker) {
          worker.verificationStatus = status;
          return resolve({ ...worker });
        }
        resolve(null);
      }, 300);
    });
  }

  async getPendingVerifications(): Promise<WorkerProfile[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.workers.filter((w) => w.verificationStatus === 'pending' || w.verificationStatus === 'under_review'));
      }, 150);
    });
  }

  async addWorker(data: {
    name: string;
    phone: string;
    primarySkill: string;
    allSkills?: string[];
    cooperativeName?: string;
    experienceYears?: number;
    hourlyRate?: number;
    verificationStatus?: WorkerVerificationStatus;
    about?: string;
  }): Promise<WorkerProfile> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const randId = Math.floor(100 + Math.random() * 900);
        const newWorker: WorkerProfile = {
          id: `worker-${Date.now()}`,
          name: data.name,
          email: `${data.name.toLowerCase().replace(/\s+/g, '.')}.${randId}@sahakarseva.org`,
          phone: data.phone,
          address: 'Indiranagar Cooperative Colony',
          city: 'Bengaluru',
          pincode: '560038',
          role: 'worker',
          primarySkill: data.primarySkill,
          allSkills: data.allSkills && data.allSkills.length > 0 ? data.allSkills : [data.primarySkill],
          cooperativeName: data.cooperativeName || 'Nagarika Seva Sahakari Samiti Ltd.',
          cooperativeId: 'coop-101',
          experienceYears: data.experienceYears || 3,
          certifications: ['Govt ITI Certificate', 'Cooperative Guild Registered'],
          rating: 5.0,
          reviewCount: 0,
          completedJobsCount: 0,
          hourlyRate: data.hourlyRate || 350,
          baseRate: data.hourlyRate ? Math.round(data.hourlyRate * 0.85) : 299,
          isAvailable: true,
          serviceArea: 'Indiranagar & East Bengaluru',
          serviceRadiusKm: 8,
          languages: ['Kannada', 'Hindi', 'English'],
          about: data.about || `Certified cooperative ${data.primarySkill} professional verified under state labour standards.`,
          verificationStatus: data.verificationStatus || 'verified',
          documents: [
            {
              id: `doc-${Date.now()}-1`,
              name: 'Aadhaar Card',
              type: 'aadhaar',
              status: 'verified',
              uploadedAt: new Date().toISOString().split('T')[0],
            },
          ],
          welfareMemberId: `KA-LBR-2024-${randId}`,
          bankAccountLinked: true,
          createdAt: new Date().toISOString().split('T')[0],
        };
        this.workers.unshift(newWorker);
        resolve(newWorker);
      }, 300);
    });
  }

  async removeWorker(workerId: string): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const initialLen = this.workers.length;
        this.workers = this.workers.filter((w) => w.id !== workerId);
        resolve(this.workers.length < initialLen);
      }, 250);
    });
  }
}

export const workerService = new WorkerService();
