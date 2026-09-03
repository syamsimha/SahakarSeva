export type UserRole = 'customer' | 'worker' | 'admin';

export interface BaseUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
  avatarUrl?: string;
  address: string;
  city: string;
  pincode: string;
  createdAt: string;
}

export interface Customer extends BaseUser {
  role: 'customer';
  savedAddresses?: Array<{
    id: string;
    title: string;
    address: string;
    isDefault: boolean;
  }>;
}

export type WorkerVerificationStatus = 'pending' | 'under_review' | 'verified' | 'rejected' | 'changes_required';

export interface WorkerDocument {
  id: string;
  name: string;
  type: 'aadhaar' | 'skill_certificate' | 'police_verification' | 'society_endorsement';
  status: 'uploaded' | 'verified' | 'rejected';
  uploadedAt: string;
  fileUrl?: string;
}

export interface WorkerProfile extends BaseUser {
  role: 'worker';
  primarySkill: string;
  allSkills: string[];
  cooperativeName: string;
  cooperativeId: string;
  experienceYears: number;
  certifications: string[];
  rating: number;
  reviewCount: number;
  completedJobsCount: number;
  hourlyRate: number;
  baseRate: number;
  isAvailable: boolean;
  serviceArea: string;
  serviceRadiusKm: number;
  languages: string[];
  about: string;
  verificationStatus: WorkerVerificationStatus;
  documents: WorkerDocument[];
  distanceKm?: number;
  welfareMemberId: string;
  bankAccountLinked: boolean;
}

export interface CooperativeAdmin extends BaseUser {
  role: 'admin';
  federationName: string;
  societyRegistrationNo: string;
  adminDesignation: string;
  zoneAssigned: string;
}

export type AppUser = Customer | WorkerProfile | CooperativeAdmin;

export type ServiceCategoryKey =
  | 'electrical'
  | 'plumbing'
  | 'carpentry'
  | 'painting'
  | 'cleaning'
  | 'gardening'
  | 'driving'
  | 'caregiving'
  | 'domestic_help'
  | 'technical';

export interface ServiceCategory {
  id: ServiceCategoryKey;
  title: string;
  hindiTitle: string;
  teluguTitle: string;
  iconName: string;
  description: string;
  basePrice: number;
  workersCount: number;
  isPopular?: boolean;
}

export interface SubService {
  id: string;
  categoryId: ServiceCategoryKey;
  title: string;
  description: string;
  estimatedMinutes: number;
  standardPrice: number;
  warrantyDays: number;
}

export interface EmergencyService {
  id: string;
  categoryId: ServiceCategoryKey;
  title: string;
  etaMinutes: number;
  baseEmergencyPrice: number;
  activeWorkersNearby: number;
  description: string;
}

export type BookingStatus =
  | 'requested'
  | 'accepted'
  | 'on_the_way'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

export interface ServiceLocation {
  addressLine: string;
  landmark?: string;
  city: string;
  pincode: string;
  latitude: number;
  longitude: number;
}

export interface Booking {
  id: string;
  bookingCode: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  workerId: string;
  workerName: string;
  workerSkill: string;
  workerPhone: string;
  cooperativeName: string;
  categoryId: ServiceCategoryKey;
  serviceTitle: string;
  scheduledDate: string; // YYYY-MM-DD
  scheduledTimeSlot: string;
  status: BookingStatus;
  serviceLocation: ServiceLocation;
  instructions?: string;
  estimatedAmount: number;
  finalAmount?: number;
  welfareCessAmount: number; // 5% cooperative worker welfare
  isEmergency: boolean;
  createdAt: string;
  statusHistory: Array<{
    status: BookingStatus;
    timestamp: string;
    note?: string;
  }>;
  hasRated?: boolean;
  paymentMethod?: 'upi' | 'card' | 'netbanking' | 'cash';
  paymentStatus?: 'pending' | 'completed' | 'refunded';
}

export interface Review {
  id: string;
  bookingId: string;
  workerId: string;
  customerId: string;
  customerName: string;
  rating: number; // 1 - 5
  comment: string;
  createdAt: string;
  verifiedJob: boolean;
}

export interface WorkerEarnings {
  workerId: string;
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  pendingPayout: number;
  completedPayouts: number;
  totalHoursWorked: number;
  transactions: Array<{
    id: string;
    bookingId: string;
    customerName: string;
    amount: number;
    date: string;
    status: 'transferred' | 'processing';
    serviceTitle: string;
  }>;
}

export interface WelfareRecord {
  memberId: string;
  workerName: string;
  cooperativeName: string;
  insuranceNumber: string;
  healthInsuranceScheme: string; // e.g. "Ayushman Sahakar Health Shield"
  healthCoverAmount: number; // e.g. 500000
  accidentalCoverAmount: number; // e.g. 1000000
  pensionFundBalance: number;
  status: 'active' | 'under_renewal' | 'pending';
  validUntil: string;
  dependentsCount: number;
  cooperativeCessAccumulated: number;
  recentBenefitsClaimed?: Array<{
    id: string;
    benefitType: string;
    claimAmount: number;
    date: string;
    status: 'approved' | 'in_process';
  }>;
}

export interface AIDemandForecast {
  zoneName: string;
  zoneCode: string;
  highDemandServices: Array<{
    category: ServiceCategoryKey;
    categoryTitle: string;
    demandGrowthPercentage: number;
    requiredWorkers: number;
    availableWorkers: number;
    shortfall: number;
    recommendedAction: string;
  }>;
  peakHours: string[];
  weatherImpactNote?: string;
  confidenceScore: number;
  generatedAt: string;
}

export interface NotificationItem {
  id: string;
  recipientRole: UserRole | 'all';
  recipientId?: string;
  title: string;
  body: string;
  type: 'booking' | 'job' | 'welfare' | 'payment' | 'admin' | 'emergency';
  timestamp: string;
  read: boolean;
  actionRoute?: string;
  relatedId?: string;
}

export interface Invoice {
  invoiceNumber: string;
  bookingId: string;
  issueDate: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  workerName: string;
  cooperativeName: string;
  societyRegNo: string;
  serviceTitle: string;
  baseFare: number;
  sparePartsCost: number;
  welfareCess: number;
  gstAmount: number;
  totalAmount: number;
  paymentMethod: string;
  paymentStatus: 'paid' | 'unpaid';
}
