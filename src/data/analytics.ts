import { AIDemandForecast } from '../types';

export const mockAIDemandForecasts: AIDemandForecast[] = [
  {
    zoneName: 'Bengaluru East (Indiranagar & Whitefield Corridor)',
    zoneCode: 'BLR-EAST-Z4',
    confidenceScore: 92.4,
    generatedAt: '2024-03-02T06:00:00Z',
    peakHours: ['09:00 AM - 12:30 PM', '04:00 PM - 07:30 PM'],
    weatherImpactNote: 'Pre-monsoon thunderstorms forecasted in 48 hours; high probability of rooftop drainage and breaker trip queries.',
    highDemandServices: [
      {
        category: 'electrical',
        categoryTitle: 'Electrical & Power Backup',
        demandGrowthPercentage: 42,
        requiredWorkers: 28,
        availableWorkers: 16,
        shortfall: 12,
        recommendedAction: 'Reallocate 8 electricians on standby from North cluster and mobilize evening overtime incentives.',
      },
      {
        category: 'plumbing',
        categoryTitle: 'Plumbing & Drainage',
        demandGrowthPercentage: 35,
        requiredWorkers: 22,
        availableWorkers: 18,
        shortfall: 4,
        recommendedAction: 'Alert Kshema Cooperative plumbing guild for priority on-demand surge.',
      },
      {
        category: 'cleaning',
        categoryTitle: 'Deep Sanitization',
        demandGrowthPercentage: 18,
        requiredWorkers: 30,
        availableWorkers: 32,
        shortfall: 0,
        recommendedAction: 'Balanced supply; maintain normal cooperative standard shift rotas.',
      },
    ],
  },
];

export const mockAdminStats = {
  totalRegisteredWorkers: 1248,
  verifiedWorkersCount: 1184,
  pendingVerificationCount: 38,
  rejectedWorkersCount: 26,
  totalCustomers: 8940,
  activeBookingsToday: 84,
  completedBookingsThisMonth: 1420,
  grossWorkerWageDisbursedMonth: '₹48,92,400',
  averageWorkerRating: 4.88,
  cooperativeSocietiesActive: 14,
  fairWageComplianceRate: '100%',
};
