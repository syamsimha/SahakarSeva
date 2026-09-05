import { WorkerProfile, WorkerVerificationStatus } from '../types';
import { mockWorkers } from '../data';

type WorkerListener = () => void;

class WorkerService {
  private workers: WorkerProfile[] = [...mockWorkers];
  private listeners: Set<WorkerListener> = new Set();

  subscribe(listener: WorkerListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((l) => {
      try {
        l();
      } catch (err) {
        console.error('Error notifying worker listener:', err);
      }
    });
  }

  async getWorkers(filters?: {
    category?: string;
    searchQuery?: string;
    maxDistanceKm?: number;
    minRating?: number;
    availableOnly?: boolean;
    status?: WorkerVerificationStatus | 'all';
  }): Promise<WorkerProfile[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        let results = this.workers.filter((w) => !(w as any).isDeleted);

        if (filters?.status && filters.status !== 'all') {
          results = results.filter((w) => w.verificationStatus === filters.status);
        }

        if (filters?.searchQuery) {
          const q = filters.searchQuery.toLowerCase();
          results = results.filter(
            (w) =>
              w.name.toLowerCase().includes(q) ||
              w.phone.includes(q) ||
              w.primarySkill.toLowerCase().includes(q) ||
              w.allSkills.some((s) => s.toLowerCase().includes(q)) ||
              w.cooperativeName.toLowerCase().includes(q) ||
              w.serviceArea.toLowerCase().includes(q)
          );
        }

        if (filters?.category) {
          const cat = filters.category.toLowerCase();
          results = results.filter(
            (w) =>
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
      }, 100);
    });
  }

  async getWorkerById(id: string): Promise<WorkerProfile | undefined> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.workers.find((w) => w.id === id && !(w as any).isDeleted));
      }, 80);
    });
  }

  async addWorker(data: Partial<WorkerProfile>): Promise<WorkerProfile> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (!data.name || !data.name.trim()) {
          return reject(new Error('Worker full name is required'));
        }
        if (!data.phone || !data.phone.trim()) {
          return reject(new Error('Worker phone number is required'));
        }
        if (!data.primarySkill || !data.primarySkill.trim()) {
          return reject(new Error('Primary trade skill is required'));
        }

        const cleanPhone = data.phone.trim().replace(/\s+/g, '');
        const exists = this.workers.find(
          (w) => !(w as any).isDeleted && w.phone.replace(/\s+/g, '') === cleanPhone
        );
        if (exists) {
          return reject(new Error(`A worker with phone number ${data.phone} already exists in the cooperative roster.`));
        }

        const id = `wkr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        const welfareId = `WEL-2024-${Math.floor(1000 + Math.random() * 9000)}`;
        const now = new Date().toISOString();

        const allSkills = data.allSkills && data.allSkills.length > 0 
          ? Array.from(new Set([data.primarySkill.trim(), ...data.allSkills]))
          : [data.primarySkill.trim()];

        const newWorker: WorkerProfile = {
          id,
          name: data.name.trim(),
          email: data.email?.trim() || `${data.name.trim().toLowerCase().replace(/\s+/g, '.')}@sahakarseva.coop`,
          phone: data.phone.trim(),
          role: 'worker',
          avatarUrl: data.avatarUrl || `https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=400&fit=crop&q=80`,
          address: data.address?.trim() || 'Central Cooperative Colony',
          city: data.city?.trim() || 'Mumbai',
          pincode: data.pincode?.trim() || '400001',
          createdAt: now,
          primarySkill: data.primarySkill.trim(),
          allSkills,
          cooperativeName: data.cooperativeName || 'Mumbai Central Workers Cooperative Union',
          cooperativeId: data.cooperativeId || 'COOP-MH-001',
          experienceYears: data.experienceYears ?? 3,
          certifications: data.certifications ?? ['National Skill Qualification Framework (NSQF) L3'],
          rating: 5.0,
          reviewCount: 0,
          completedJobsCount: 0,
          hourlyRate: data.hourlyRate ?? (data.baseRate ?? 350),
          baseRate: data.baseRate ?? 350,
          isAvailable: data.isAvailable ?? true,
          serviceArea: data.serviceArea?.trim() || 'South Mumbai & Fort',
          serviceRadiusKm: data.serviceRadiusKm ?? 10,
          languages: data.languages && data.languages.length > 0 ? data.languages : ['Hindi', 'Marathi', 'English'],
          about: data.about?.trim() || `Certified ${data.primarySkill} professional registered under the cooperative society.`,
          verificationStatus: data.verificationStatus || 'verified',
          welfareMemberId: welfareId,
          bankAccountLinked: data.bankAccountLinked ?? true,
          documents: data.documents && data.documents.length > 0 ? data.documents : [
            {
              id: `doc-${Date.now()}-1`,
              name: 'ID Proof (Aadhaar Card)',
              type: 'aadhaar',
              status: 'verified',
              uploadedAt: now,
            },
            {
              id: `doc-${Date.now()}-2`,
              name: `Skill Certificate (${data.primarySkill?.trim() || 'Trade Qualification'})`,
              type: 'skill_certificate',
              status: 'verified',
              uploadedAt: now,
            },
          ],
        };

        this.workers.unshift(newWorker);
        this.notify();
        resolve(newWorker);
      }, 150);
    });
  }

  async removeWorker(workerId: string): Promise<boolean> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const worker = this.workers.find((w) => w.id === workerId);
        if (!worker) {
          return reject(new Error(`Worker not found with ID ${workerId}`));
        }

        (worker as any).isDeleted = true;
        worker.isAvailable = false;

        this.notify();
        resolve(true);
      }, 150);
    });
  }

  async updateAvailability(workerId: string, isAvailable: boolean): Promise<boolean> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const worker = this.workers.find((w) => w.id === workerId);
        if (worker) {
          worker.isAvailable = isAvailable;
          this.notify();
        }
        resolve(true);
      }, 100);
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
          this.notify();
          return resolve({ ...worker });
        }
        resolve(null);
      }, 150);
    });
  }

  async getPendingVerifications(): Promise<WorkerProfile[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(
          this.workers.filter(
            (w) =>
              !(w as any).isDeleted &&
              (w.verificationStatus === 'pending' || w.verificationStatus === 'under_review')
          )
        );
      }, 100);
    });
  }

  async recordReview(workerId: string, rating: number): Promise<WorkerProfile | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const worker = this.workers.find((w) => w.id === workerId);
        if (worker) {
          const currentTotal = worker.rating * worker.reviewCount;
          worker.reviewCount += 1;
          worker.rating = Math.round(((currentTotal + rating) / worker.reviewCount) * 10) / 10;
          this.notify();
          return resolve({ ...worker });
        }
        resolve(null);
      }, 100);
    });
  }
}

export const workerService = new WorkerService();
