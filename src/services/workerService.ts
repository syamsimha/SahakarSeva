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
  }): Promise<WorkerProfile[]> {
    return new Promise((resolve) => {
      setTimeout(() => {
        let results = [...this.workers];

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

  async recordReview(workerId: string, rating: number): Promise<WorkerProfile | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const worker = this.workers.find((w) => w.id === workerId);
        if (worker) {
          const currentTotal = worker.rating * worker.reviewCount;
          worker.reviewCount += 1;
          worker.rating = Math.round(((currentTotal + rating) / worker.reviewCount) * 10) / 10;
          return resolve({ ...worker });
        }
        resolve(null);
      }, 150);
    });
  }
}

export const workerService = new WorkerService();
