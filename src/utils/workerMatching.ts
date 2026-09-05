import { Booking, WorkerProfile } from '../types';

/**
 * Trade Category to Synonyms & Keywords mapping
 */
const TRADE_KEYWORDS: Record<string, string[]> = {
  electrical: [
    'electrician',
    'electrical',
    'wireman',
    'wiring',
    'switchboard',
    'inverter',
    'lighting',
    'mcb',
    'circuit',
    'socket',
    'fan',
    'light',
  ],
  plumbing: [
    'plumber',
    'plumbing',
    'pipe',
    'leak',
    'sanitary',
    'tap',
    'water tank',
    'geyser',
    'drainage',
    'faucet',
    'pipeline',
    'washbasin',
  ],
  carpentry: [
    'carpenter',
    'carpentry',
    'woodwork',
    'furniture',
    'door',
    'lock',
    'hinge',
    'cabinet',
    'wood',
    'timber',
    'cupboard',
    'wardrobe',
  ],
  painting: [
    'painter',
    'painting',
    'whitewash',
    'wall paint',
    'waterproofing',
    'primer',
    'distemper',
    'texture paint',
  ],
  cleaning: [
    'cleaning',
    'cleaner',
    'deep clean',
    'housekeeping',
    'sanitization',
    'sweeping',
    'mopping',
    'disinfection',
    'sofa clean',
    'bathroom clean',
    'kitchen clean',
  ],
  gardening: [
    'gardener',
    'gardening',
    'landscaping',
    'lawn',
    'pruning',
    'horticulture',
    'plant',
    'grass',
    'tree trimming',
  ],
  driving: [
    'driver',
    'driving',
    'chauffeur',
    'cab',
    'vehicle',
    'car driver',
    'transport',
  ],
  caregiving: [
    'caregiver',
    'caregiving',
    'nurse',
    'nursing',
    'elderly care',
    'patient care',
    'physiotherapy',
    'attendant',
    'home healthcare',
  ],
  domestic_help: [
    'domestic help',
    'domestic assistance',
    'housekeeping',
    'maid',
    'cook',
    'cooking help',
    'household help',
    'helper',
  ],
  technical: [
    'technical',
    'technician',
    'appliance',
    'appliance repair',
    'ac service',
    'ac repair',
    'refrigerator',
    'washing machine',
    'cctv',
    'ro water',
    'microwave',
  ],
};

/**
 * Normalizes text for comparison
 */
const normalize = (text: string = ''): string => {
  return text.toLowerCase().replace(/[^a-z0-9]/g, ' ').trim();
};

/**
 * Check if worker's skill/trade matches the job category or service title
 */
export const isTradeMatching = (
  jobCategory: string = '',
  jobTitle: string = '',
  worker: { primarySkill?: string; allSkills?: string[] }
): boolean => {
  const normCategory = normalize(jobCategory);
  const normTitle = normalize(jobTitle);
  const workerPrimary = normalize(worker.primarySkill || '');
  const workerSkills = (worker.allSkills || []).map((s) => normalize(s));
  const allWorkerTokens = [workerPrimary, ...workerSkills].join(' ');

  // Direct exact/substring check
  if (
    workerPrimary &&
    normCategory &&
    (workerPrimary.includes(normCategory) || normCategory.includes(workerPrimary))
  ) {
    return true;
  }

  // Check each trade category
  for (const [tradeKey, keywords] of Object.entries(TRADE_KEYWORDS)) {
    const jobMatchesCategory =
      normCategory.includes(tradeKey) || keywords.some((k) => normCategory.includes(k));
    const jobMatchesTitle =
      normTitle.includes(tradeKey) || keywords.some((k) => normTitle.includes(k));

    if (jobMatchesCategory || jobMatchesTitle) {
      // Check if worker has any keyword in primary skill or allSkills
      const workerMatches =
        allWorkerTokens.includes(tradeKey) ||
        keywords.some((k) => allWorkerTokens.includes(k));
      if (workerMatches) {
        return true;
      }
    }
  }

  // Cross-check all worker skills against job title tokens
  for (const skill of [workerPrimary, ...workerSkills]) {
    if (skill.length >= 3 && (normTitle.includes(skill) || normCategory.includes(skill))) {
      return true;
    }
  }

  return false;
};

/**
 * Human-friendly trade title for a job
 */
export const getRequiredTradeLabel = (jobCategory: string = '', jobTitle: string = ''): string => {
  const normCategory = normalize(jobCategory);
  const normTitle = normalize(jobTitle);

  for (const [tradeKey, keywords] of Object.entries(TRADE_KEYWORDS)) {
    if (
      normCategory.includes(tradeKey) ||
      keywords.some((k) => normCategory.includes(k)) ||
      normTitle.includes(tradeKey) ||
      keywords.some((k) => normTitle.includes(k))
    ) {
      return tradeKey.charAt(0).toUpperCase() + tradeKey.slice(1);
    }
  }

  return jobCategory || 'Specialist';
};

/**
 * Check if a worker currently has an ongoing active job
 * Active statuses: 'in_progress', 'accepted', 'on_the_way'
 */
export const getWorkerActiveJob = (
  workerId: string,
  bookings: Booking[],
  excludeBookingId?: string
): Booking | undefined => {
  return bookings.find(
    (b) =>
      b.workerId === workerId &&
      ['in_progress', 'accepted', 'on_the_way'].includes(b.status) &&
      b.id !== excludeBookingId
  );
};
