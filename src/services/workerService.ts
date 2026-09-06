import { WorkerProfile, WorkerVerificationStatus } from '../types';
import { mockWorkers } from '../data';
import { databaseService } from './db/databaseService';
import { locationService } from './locationService';

// Canonical trade definitions with stems and synonyms for robust service matching
interface TradeDefinition {
  prefix: string;
  aliases: string[];
}

const TRADE_DEFINITIONS: TradeDefinition[] = [
  {
    prefix: 'plumb',
    aliases: ['plumber', 'plumbing', 'plumb', 'pipe', 'leak', 'tap', 'drainage', 'faucet', 'sanitary', 'drain', 'नलसाजी', 'प्लंबर', 'ప్లంబర్', 'ప్లంబింగ్'],
  },
  {
    prefix: 'electr',
    aliases: ['electrician', 'electrical', 'electric', 'wiring', 'wireman', 'circuit', 'inverter', 'switchboard', 'बिजली', 'इलेक्ट्रीशियन', 'ఎలక్ట్రీషియన్', 'ఎలక్ట్రికల్', 'విద్యుత్'],
  },
  {
    prefix: 'technic',
    aliases: ['technician', 'technical', 'tech', 'appliance', 'ac repair', 'washing machine', 'microwave', 'electronics', 'hvac', 'refrigerant', 'mechanic', 'तकनीशियन', 'उपकरण', 'టెక్నీషియన్'],
  },
  {
    prefix: 'carpent',
    aliases: ['carpenter', 'carpentry', 'carpent', 'wood', 'furniture', 'door lock', 'cabinet', 'modular kitchen', 'hinge', 'बढ़ई', 'लकड़ी', 'వడ్రంగి', 'కార్పెంటర్'],
  },
  {
    prefix: 'paint',
    aliases: ['painter', 'painting', 'paint', 'wall painting', 'waterproofing', 'putty', 'whitewash', 'रंगाई', 'पुताई', 'पेंटर', 'రంగులు', 'పెయింటర్'],
  },
  {
    prefix: 'clean',
    aliases: ['cleaner', 'cleaning', 'clean', 'deep cleaning', 'sanitization', 'housekeeping', 'maid', 'sofa shampooing', 'सफाई', 'క్లీనింగ్', 'శుభ్రత'],
  },
  {
    prefix: 'garden',
    aliases: ['gardener', 'gardening', 'garden', 'lawn', 'plants', 'pruning', 'landscaping', 'माली', 'बागवानी', 'తోటమాలి', 'గార్డెనింగ్'],
  },
  {
    prefix: 'driv',
    aliases: ['driver', 'driving', 'driv', 'chauffeur', 'car driver', 'transport', 'ड्राइवर', 'चालक', 'డ్రైవర్'],
  },
  {
    prefix: 'care',
    aliases: ['caregiver', 'caregiving', 'nurse', 'nursing', 'geriatric', 'elderly care', 'patient care', 'first aid', 'vitals', 'देखभाल', 'నర్స్', 'కేర్‌టేకర్‌'],
  },
  {
    prefix: 'domestic',
    aliases: ['domestic help', 'domestic', 'maid', 'cook', 'cooking', 'housekeeper', 'घरेलू सहायिका', 'खाना', 'ఇంటి పని', 'వంట'],
  },
];

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
    customerCoords?: { latitude: number; longitude: number };
  }): Promise<WorkerProfile[]> {
    const allWorkers = await databaseService.getWorkers();
    let results = allWorkers && allWorkers.length > 0
      ? [...allWorkers]
      : (databaseService.isSupabaseConfigured() ? [] : [...this.workers]);
    results = results.filter((w) => !(w as any).isDeleted);

    // Compute live distance if customer coordinates provided
    if (filters?.customerCoords) {
      const { latitude: cLat, longitude: cLng } = filters.customerCoords;
      results = results.map((w) => {
        if (w.latitude && w.longitude) {
          const dist = locationService.calculateDistance(cLat, cLng, w.latitude, w.longitude);
          return { ...w, distanceKm: dist };
        }
        return w;
      });
    }

    if (filters?.status && filters.status !== 'all') {
      results = results.filter((w) => w.verificationStatus === filters.status);
    }

    // Filter by search query
    if (filters?.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      results = results.filter((w) => {
        // Admin match on name, phone, cooperative, service area
        if (
          w.name.toLowerCase().includes(q) ||
          w.phone.includes(q) ||
          w.cooperativeName.toLowerCase().includes(q) ||
          w.serviceArea.toLowerCase().includes(q)
        ) {
          return true;
        }

        const primarySkillLower = (w.primarySkill || '').toLowerCase();
        const allSkillsLower = (w.allSkills || []).map((s) => s.toLowerCase());
        const certsLower = (w.certifications || []).map((c) => c.toLowerCase());
        const aboutLower = (w.about || '').toLowerCase();

        if (primarySkillLower.includes(q)) return true;
        if (allSkillsLower.some((s) => s.includes(q))) return true;
        if (certsLower.some((c) => c.includes(q))) return true;
        if (aboutLower.includes(q)) return true;

        for (const trade of TRADE_DEFINITIONS) {
          const queryMatchesTrade =
            (q.length >= 3 && trade.prefix.startsWith(q)) ||
            q.startsWith(trade.prefix) ||
            trade.aliases.some((alias) => alias.includes(q) || q.includes(alias));

          if (queryMatchesTrade) {
            const workerInTrade =
              primarySkillLower.startsWith(trade.prefix) ||
              primarySkillLower.includes(trade.prefix);
            if (workerInTrade) return true;
          }
        }

        return false;
      });
    }

    if (filters?.category && filters.category !== 'all') {
      const cat = filters.category.toLowerCase();
      const tradeDef = TRADE_DEFINITIONS.find(
        (t) => t.prefix.startsWith(cat.slice(0, 4)) || cat.startsWith(t.prefix)
      );
      const aliases = tradeDef ? tradeDef.aliases : [cat];

      results = results.filter(
        (w) =>
          w.primarySkill.toLowerCase().includes(cat) ||
          w.allSkills.some((s) => s.toLowerCase().includes(cat)) ||
          aliases.some(
            (alias) =>
              w.primarySkill.toLowerCase().includes(alias) ||
              w.allSkills.some((s) => s.toLowerCase().includes(alias))
          )
      );
    }

    if (filters?.minRating) {
      results = results.filter((w) => w.rating >= (filters.minRating || 0));
    }

    if (filters?.availableOnly) {
      results = results.filter((w) => w.isAvailable);
    }

    if (filters?.maxDistanceKm) {
      results = results.filter((w) => (w.distanceKm ?? 999) <= (filters.maxDistanceKm || 999));
    }

    return results;
  }

  async getWorkerById(id: string): Promise<WorkerProfile | undefined> {
    const dbWorker = await databaseService.getWorkerById(id);
    if (dbWorker && !(dbWorker as any).isDeleted) return dbWorker;
    if (databaseService.isSupabaseConfigured()) return undefined;
    return this.workers.find((w) => w.id === id && !(w as any).isDeleted);
  }

  async addWorker(data: Partial<WorkerProfile>): Promise<WorkerProfile> {
    if (!data.name || !data.name.trim()) {
      throw new Error('Worker full name is required');
    }
    if (!data.phone || !data.phone.trim()) {
      throw new Error('Worker phone number is required');
    }
    if (!data.primarySkill || !data.primarySkill.trim()) {
      throw new Error('Primary trade skill is required');
    }

    const cleanPhone = data.phone.trim().replace(/\s+/g, '');
    const allWorkers = await databaseService.getWorkers();
    const exists = (allWorkers && allWorkers.length > 0 ? allWorkers : this.workers).find(
      (w) => !(w as any).isDeleted && w.phone.replace(/\s+/g, '') === cleanPhone
    );
    if (exists) {
      throw new Error(`A worker with phone number ${data.phone} already exists in the cooperative roster.`);
    }

    const id = `wkr-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const welfareId = `WEL-2024-${Math.floor(1000 + Math.random() * 9000)}`;
    const now = new Date().toISOString();

    const allSkills =
      data.allSkills && data.allSkills.length > 0
        ? Array.from(new Set([data.primarySkill.trim(), ...data.allSkills]))
        : [data.primarySkill.trim()];

    const newWorker: WorkerProfile = {
      id,
      name: data.name.trim(),
      email:
        data.email?.trim() ||
        `${data.name.trim().toLowerCase().replace(/\s+/g, '.')}@sahakarseva.coop`,
      phone: data.phone.trim(),
      role: 'worker',
      avatarUrl:
        data.avatarUrl ||
        `https://images.unsplash.com/photo-1540569014015-19a7be504e3a?w=400&fit=crop&q=80`,
      address: data.address?.trim() || 'Central Cooperative Colony',
      city: data.city?.trim() || 'Mumbai',
      pincode: data.pincode?.trim() || '400001',
      createdAt: now,
      primarySkill: data.primarySkill.trim(),
      allSkills,
      cooperativeName: data.cooperativeName || 'Mumbai Central Workers Cooperative Union',
      cooperativeId: data.cooperativeId || 'COOP-MH-001',
      experienceYears: data.experienceYears ?? 3,
      certifications:
        data.certifications ?? ['National Skill Qualification Framework (NSQF) L3'],
      rating: 5.0,
      reviewCount: 0,
      completedJobsCount: 0,
      hourlyRate: data.hourlyRate ?? data.baseRate ?? 350,
      baseRate: data.baseRate ?? 350,
      isAvailable: data.isAvailable ?? true,
      serviceArea: data.serviceArea?.trim() || 'South Mumbai & Fort',
      serviceRadiusKm: data.serviceRadiusKm ?? 10,
      languages:
        data.languages && data.languages.length > 0
          ? data.languages
          : ['Hindi', 'Marathi', 'English'],
      about:
        data.about?.trim() ||
        `Certified ${data.primarySkill} professional registered under the cooperative society.`,
      verificationStatus: data.verificationStatus || 'verified',
      welfareMemberId: welfareId,
      bankAccountLinked: data.bankAccountLinked ?? true,
      documents:
        data.documents && data.documents.length > 0
          ? data.documents
          : [
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

    await databaseService.updateWorker(newWorker);
    this.workers.unshift(newWorker);
    this.notify();
    return newWorker;
  }

  async removeWorker(workerId: string): Promise<boolean> {
    const worker = await this.getWorkerById(workerId);
    if (!worker) {
      throw new Error(`Worker not found with ID ${workerId}`);
    }

    (worker as any).isDeleted = true;
    worker.isAvailable = false;
    await databaseService.updateWorker(worker);

    const idx = this.workers.findIndex((w) => w.id === workerId);
    if (idx !== -1) {
      (this.workers[idx] as any).isDeleted = true;
      this.workers[idx].isAvailable = false;
    }

    this.notify();
    return true;
  }

  async updateAvailability(workerId: string, isAvailable: boolean): Promise<boolean> {
    await databaseService.updateWorkerAvailability(workerId, isAvailable);
    const worker = this.workers.find((w) => w.id === workerId);
    if (worker) {
      worker.isAvailable = isAvailable;
    }
    this.notify();
    return true;
  }

  async updateVerificationStatus(
    workerId: string,
    status: WorkerVerificationStatus,
    _notes?: string
  ): Promise<WorkerProfile | null> {
    const worker = await this.getWorkerById(workerId);
    if (worker) {
      worker.verificationStatus = status;
      await databaseService.updateWorker(worker);

      const idx = this.workers.findIndex((w) => w.id === workerId);
      if (idx !== -1) {
        this.workers[idx].verificationStatus = status;
      }

      this.notify();
      return { ...worker };
    }
    return null;
  }

  async getPendingVerifications(): Promise<WorkerProfile[]> {
    const workers = await databaseService.getWorkers();
    const source = workers && workers.length > 0 ? workers : this.workers;
    return source.filter(
      (w) =>
        !(w as any).isDeleted &&
        (w.verificationStatus === 'pending' || w.verificationStatus === 'under_review')
    );
  }

  async recordReview(workerId: string, rating: number): Promise<WorkerProfile | null> {
    const worker = await this.getWorkerById(workerId);
    if (worker) {
      const currentTotal = worker.rating * worker.reviewCount;
      worker.reviewCount += 1;
      worker.rating = Math.round(((currentTotal + rating) / worker.reviewCount) * 10) / 10;
      await databaseService.updateWorker(worker);

      const idx = this.workers.findIndex((w) => w.id === workerId);
      if (idx !== -1) {
        this.workers[idx].reviewCount = worker.reviewCount;
        this.workers[idx].rating = worker.rating;
      }

      this.notify();
      return { ...worker };
    }
    return null;
  }
}

export const workerService = new WorkerService();
