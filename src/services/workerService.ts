import { WorkerProfile, WorkerVerificationStatus } from '../types';
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

class WorkerService {
  async getWorkers(filters?: {
    category?: string;
    searchQuery?: string;
    maxDistanceKm?: number;
    minRating?: number;
    availableOnly?: boolean;
    customerCoords?: { latitude: number; longitude: number };
  }): Promise<WorkerProfile[]> {
    const allWorkers = await databaseService.getWorkers();
    let results = [...allWorkers];

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

    // Filter by search query with stem and trade alias matching (EXCLUDING personal name)
    if (filters?.searchQuery && filters.searchQuery.trim()) {
      const q = filters.searchQuery.trim().toLowerCase();
      results = results.filter((w) => {
        const primarySkillLower = (w.primarySkill || '').toLowerCase();
        const allSkillsLower = (w.allSkills || []).map((s) => s.toLowerCase());
        const certsLower = (w.certifications || []).map((c) => c.toLowerCase());
        const aboutLower = (w.about || '').toLowerCase();

        // 1. Direct contains on primarySkill (NOT w.name - personal name excluded)
        if (primarySkillLower.includes(q)) return true;

        // 2. Direct contains on skills or certifications
        if (allSkillsLower.some((s) => s.includes(q))) return true;
        if (certsLower.some((c) => c.includes(q))) return true;

        // 3. Direct contains on service description (about)
        if (aboutLower.includes(q)) return true;

        // 4. Stem & Trade alias matching
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
          cat.includes(w.primarySkill.toLowerCase().slice(0, 5)) ||
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
    return databaseService.getWorkerById(id);
  }

  async updateAvailability(workerId: string, isAvailable: boolean): Promise<boolean> {
    return databaseService.updateWorkerAvailability(workerId, isAvailable);
  }

  async updateVerificationStatus(
    workerId: string,
    status: WorkerVerificationStatus,
    _notes?: string
  ): Promise<WorkerProfile | null> {
    const worker = await databaseService.getWorkerById(workerId);
    if (worker) {
      worker.verificationStatus = status;
      await databaseService.updateWorker(worker);
      return { ...worker };
    }
    return null;
  }

  async getPendingVerifications(): Promise<WorkerProfile[]> {
    const workers = await databaseService.getWorkers();
    return workers.filter(
      (w) => w.verificationStatus === 'pending' || w.verificationStatus === 'under_review'
    );
  }
}

export const workerService = new WorkerService();
