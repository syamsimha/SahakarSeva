import { WorkerProfile } from '../../types';

export const categoryAliases: Record<string, string[]> = {
  electrical: ['electric', 'wiring', 'switch', 'appliance', 'inverter'],
  plumbing: ['plumb', 'pipe', 'leak', 'tap', 'tank', 'drain'],
  carpentry: ['carpenter', 'wood', 'furniture', 'door', 'lock', 'cabinet'],
  painting: ['paint', 'waterproofing', 'putty', 'wall'],
  cleaning: ['clean', 'sanitiz', 'hygiene', 'housekeeping'],
  gardening: ['garden', 'lawn', 'plant', 'landscaping'],
  driving: ['driver', 'driving', 'chauffeur', 'car'],
  caregiving: ['care', 'nurs', 'patient', 'geriatric', 'elderly'],
  domestic_help: ['domestic', 'cooking', 'housekeeping', 'maid', 'helper', 'errand'],
  technical: ['technical', 'appliance', 'electronic', 'ac', 'repair', 'hardware'],
};

/**
 * Filters workers by service category using trade alias keywords.
 * Scoped strictly to Customer screens to avoid modifying shared workerService.ts.
 */
export const filterWorkersByCategory = (
  workers: WorkerProfile[],
  categoryId?: string
): WorkerProfile[] => {
  if (!categoryId || categoryId === 'all') return workers;
  const cat = categoryId.toLowerCase();
  const aliases = categoryAliases[cat] || [cat];
  return workers.filter((w) => {
    const text = `${w.primarySkill} ${w.allSkills.join(' ')}`.toLowerCase();
    return aliases.some((alias) => text.includes(alias)) || text.includes(cat);
  });
};
