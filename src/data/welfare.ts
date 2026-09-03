import { WelfareRecord } from '../types';

export const mockWelfareRecord: WelfareRecord = {
  memberId: 'SSF-WLF-2023-084',
  workerName: 'Suresh Kumar',
  cooperativeName: 'Nagarika Seva Sahakari Samiti Ltd.',
  insuranceNumber: 'NIC-COOP-HEALTH-889104',
  healthInsuranceScheme: 'Sahakar Shramik Swasthya Suraksha Shield',
  healthCoverAmount: 500000,
  accidentalCoverAmount: 1000000,
  pensionFundBalance: 42850,
  status: 'active',
  validUntil: '2025-03-31',
  dependentsCount: 3,
  cooperativeCessAccumulated: 3420,
  recentBenefitsClaimed: [
    {
      id: 'clm-01',
      benefitType: 'Annual Comprehensive Medical Checkup',
      claimAmount: 2500,
      date: '2023-11-12',
      status: 'approved',
    },
    {
      id: 'clm-02',
      benefitType: 'Children Educational Aid Grant',
      claimAmount: 6000,
      date: '2023-09-05',
      status: 'approved',
    },
  ],
};

export const cooperativeWelfareOverview = {
  totalFundCorpus: 14820000, // ₹1.48 Crore
  totalInsuredWorkers: 1248,
  totalClaimsSettledThisYear: 142,
  averageClaimSettlementDays: 3,
  activeSchemes: [
    {
      id: 'sch-1',
      name: 'Sahakar Group Health & Hospitalization Policy',
      coverage: '₹5,00,000 Cashless across 420+ empaneled hospitals',
      cooperativeContribution: '100% Federation Sponsored',
    },
    {
      id: 'sch-2',
      name: 'Pradhan Mantri Suraksha Bima (PMSBY) Top-Up',
      coverage: '₹10,00,000 Accidental Death & Disability Cover',
      cooperativeContribution: 'Federation Funded',
    },
    {
      id: 'sch-3',
      name: 'Shramik Vriddhapya Pension Sanjeevani',
      coverage: 'Guaranteed ₹3,000/month after age 60 via NPS-Lite',
      cooperativeContribution: 'Co-contributory matching scheme',
    },
    {
      id: 'sch-4',
      name: 'Emergency Tool Replacement & Safety Kit Grant',
      coverage: 'Up to ₹8,000 immediate grant for damaged trade equipment',
      cooperativeContribution: 'Discretionary Welfare Board Grant',
    },
  ],
};
