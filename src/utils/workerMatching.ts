import { Booking, WorkerProfile, ServiceCategoryKey } from '../types';

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
 * Normalizes any category string or trade title into a canonical ServiceCategoryKey
 */
export const getCanonicalCategory = (input: string = ''): ServiceCategoryKey | null => {
  const norm = normalize(input);
  if (!norm) return null;

  const validKeys: ServiceCategoryKey[] = [
    'electrical',
    'plumbing',
    'carpentry',
    'painting',
    'cleaning',
    'gardening',
    'driving',
    'caregiving',
    'domestic_help',
    'technical',
  ];
  for (const key of validKeys) {
    if (norm === key || norm === key.replace('_', ' ')) {
      return key;
    }
  }

  if (norm.includes('plumb') || norm.includes('pipe') || norm.includes('leak') || norm.includes('drain') || norm.includes('tap') || norm.includes('faucet') || norm.includes('sanitary') || norm.includes('washbasin')) {
    return 'plumbing';
  }
  if (norm.includes('electr') || norm.includes('wireman') || norm.includes('wiring') || norm.includes('circuit') || norm.includes('switchboard') || norm.includes('inverter') || norm.includes('socket')) {
    return 'electrical';
  }
  if (norm.includes('carpent') || norm.includes('wood') || norm.includes('furniture') || norm.includes('door') || norm.includes('cabinet') || norm.includes('timber') || norm.includes('wardrobe')) {
    return 'carpentry';
  }
  if (norm.includes('paint') || norm.includes('whitewash') || norm.includes('distemper') || norm.includes('putty')) {
    return 'painting';
  }
  if (norm.includes('clean') || norm.includes('housekeeping') || norm.includes('sanitiz') || norm.includes('mopping') || norm.includes('sweeping') || norm.includes('deep clean')) {
    return 'cleaning';
  }
  if (norm.includes('garden') || norm.includes('lawn') || norm.includes('plant') || norm.includes('pruning') || norm.includes('horticulture')) {
    return 'gardening';
  }
  if (norm.includes('driv') || norm.includes('chauffeur') || norm.includes('cab driver') || norm.includes('car driver') || norm.includes('vehicle')) {
    return 'driving';
  }
  if (norm.includes('care') || norm.includes('nurse') || norm.includes('nursing') || norm.includes('geriatric') || norm.includes('patient care') || norm.includes('attendant')) {
    return 'caregiving';
  }
  if (norm.includes('domestic') || norm.includes('maid') || norm.includes('cook') || norm.includes('cooking help') || norm.includes('household')) {
    return 'domestic_help';
  }
  if (norm.includes('technic') || norm.includes('appliance') || norm.includes('ac repair') || norm.includes('refrigerat') || norm.includes('washing machine') || norm.includes('cctv')) {
    return 'technical';
  }

  return null;
};

/**
 * Returns human-friendly profession title (e.g. "Plumber", "Electrician", "Carpenter")
 */
export const getWorkerProfessionLabel = (worker?: { primarySkill?: string } | null): string => {
  if (!worker || !worker.primarySkill) return 'Service Professional';
  const canonical = getCanonicalCategory(worker.primarySkill);
  switch (canonical) {
    case 'plumbing':
      return 'Plumber';
    case 'electrical':
      return 'Electrician';
    case 'carpentry':
      return 'Carpenter';
    case 'painting':
      return 'Painter';
    case 'cleaning':
      return 'Cleaner';
    case 'gardening':
      return 'Gardener';
    case 'driving':
      return 'Driver';
    case 'caregiving':
      return 'Caregiver';
    case 'domestic_help':
      return 'Domestic Help';
    case 'technical':
      return 'Technician';
    default:
      return worker.primarySkill.trim() || 'Service Professional';
  }
};

/**
 * Check if worker's skill/trade matches the job category or service title
 * Strictly enforces category matching when canonical trades can be determined.
 */
export const isTradeMatching = (
  jobCategory: string = '',
  jobTitle: string = '',
  worker: { primarySkill?: string; allSkills?: string[] }
): boolean => {
  if (!worker) return false;

  // 1. Resolve structured canonical trade of the job
  const jobCanonical = getCanonicalCategory(jobCategory) || getCanonicalCategory(jobTitle);

  // 2. Resolve worker's primary canonical trade
  const workerPrimaryCanonical = getCanonicalCategory(worker.primarySkill || '');

  // Strict structured match: if both categories are identified, enforce canonical identity
  if (jobCanonical && workerPrimaryCanonical) {
    if (jobCanonical === workerPrimaryCanonical) {
      return true;
    }
    // Check secondary certified skills
    if (Array.isArray(worker.allSkills)) {
      for (const skill of worker.allSkills) {
        if (getCanonicalCategory(skill) === jobCanonical) {
          return true;
        }
      }
    }
    return false;
  }

  // Fallback token/keyword check for uncanonical edge cases
  const normCategory = normalize(jobCategory);
  const normTitle = normalize(jobTitle);
  const workerPrimary = normalize(worker.primarySkill || '');
  const workerSkills = (worker.allSkills || []).map((s) => normalize(s));
  const allWorkerTokens = [workerPrimary, ...workerSkills].join(' ');

  if (
    workerPrimary &&
    normCategory &&
    (workerPrimary.includes(normCategory) || normCategory.includes(workerPrimary))
  ) {
    return true;
  }

  for (const [tradeKey, keywords] of Object.entries(TRADE_KEYWORDS)) {
    const jobMatchesCategory =
      normCategory.includes(tradeKey) || keywords.some((k) => normCategory.includes(k));
    const jobMatchesTitle =
      normTitle.includes(tradeKey) || keywords.some((k) => normTitle.includes(k));

    if (jobMatchesCategory || jobMatchesTitle) {
      const workerMatches =
        allWorkerTokens.includes(tradeKey) ||
        keywords.some((k) => allWorkerTokens.includes(k));
      if (workerMatches) {
        return true;
      }
    }
  }

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
  const canonical = getCanonicalCategory(jobCategory) || getCanonicalCategory(jobTitle);
  if (canonical) {
    switch (canonical) {
      case 'plumbing':
        return 'Plumbing';
      case 'electrical':
        return 'Electrical';
      case 'carpentry':
        return 'Carpentry';
      case 'painting':
        return 'Painting';
      case 'cleaning':
        return 'Cleaning';
      case 'gardening':
        return 'Gardening';
      case 'driving':
        return 'Driving';
      case 'caregiving':
        return 'Caregiving';
      case 'domestic_help':
        return 'Domestic Help';
      case 'technical':
        return 'Technical';
    }
  }

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
  if (!workerId) return undefined;
  return bookings.find(
    (b) =>
      b.workerId === workerId &&
      ['in_progress', 'accepted', 'on_the_way'].includes(b.status) &&
      b.id !== excludeBookingId
  );
};

/**
 * Checks all eligibility conditions for a worker to accept a booking:
 * 1. Worker authenticated & worker profile
 * 2. Admin verification === 'verified'
 * 3. Booking is still 'requested' and available
 * 4. Profession matches booking category
 * 5. Worker has NO ongoing active job
 */
export const isBookingEligibleForWorker = (
  booking: Booking,
  worker?: WorkerProfile | null,
  allBookings: Booking[] = []
): { eligible: boolean; reason?: string } => {
  if (!worker || worker.role !== 'worker') {
    return { eligible: false, reason: 'Authentication required: Only workers can accept jobs.' };
  }

  if (worker.verificationStatus !== 'verified') {
    return {
      eligible: false,
      reason: 'Admin verification required: Your profile must be verified by Admin before accepting jobs.',
    };
  }

  if (booking.status !== 'requested') {
    return { eligible: false, reason: 'Job is no longer available (already accepted or completed).' };
  }

  if (booking.workerId && booking.workerId !== 'unassigned' && booking.workerId !== worker.id) {
    return { eligible: false, reason: 'Job is already assigned to another worker.' };
  }

  if (!isTradeMatching(booking.categoryId, booking.serviceTitle, worker)) {
    const required = getRequiredTradeLabel(booking.categoryId, booking.serviceTitle);
    return {
      eligible: false,
      reason: `Skill mismatch: This job requires a certified ${required} specialist. You are certified as ${worker.primarySkill}.`,
    };
  }

  const activeJob = getWorkerActiveJob(worker.id, allBookings, booking.id);
  if (activeJob) {
    return {
      eligible: false,
      reason: `Active job in progress: You must finish job #${activeJob.bookingCode} (${activeJob.serviceTitle}) before accepting another.`,
    };
  }

  return { eligible: true };
};
