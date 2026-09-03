import { AppUser, UserRole, Customer, WorkerProfile, CooperativeAdmin } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { mockCustomer, mockWorkerUser, mockAdminUser } from '../data';

export interface RegisterPayload {
  email: string;
  password?: string;
  role: UserRole;
  fullName: string;
  phone?: string;
  address?: string;
  city?: string;
  pincode?: string;
  // Worker-specific
  primarySkill?: string;
  allSkills?: string[];
  cooperativeName?: string;
  experienceYears?: number;
  // Admin-specific
  adminDesignation?: string;
  societyRegNo?: string;
  federationName?: string;
}

class AuthService {
  private demoUser: AppUser | null = null;

  /**
   * Check if Supabase connection is live and active
   */
  isConfigured(): boolean {
    return isSupabaseConfigured();
  }

  /**
   * Fetch complete user profile from Supabase with role-specific data
   */
  async fetchUserProfile(userId: string): Promise<AppUser | null> {
    try {
      // 1. Fetch base profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (profileError || !profile) {
        console.warn('Could not fetch base profile:', profileError?.message);
        return null;
      }

      const role = profile.role as UserRole;
      const base = {
        id: profile.id,
        name: profile.full_name,
        email: profile.email || '',
        phone: profile.phone || '',
        role,
        avatarUrl: profile.avatar_url || undefined,
        address: profile.address || '',
        city: profile.city || 'Bengaluru',
        pincode: profile.pincode || '560001',
        createdAt: profile.created_at,
      };

      // 2. Fetch role-specific details
      if (role === 'worker') {
        const { data: workerData } = await supabase
          .from('worker_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        const { data: docs } = await supabase
          .from('worker_documents')
          .select('*')
          .eq('worker_id', userId);

        const worker: WorkerProfile = {
          ...base,
          role: 'worker',
          primarySkill: workerData?.primary_skill || 'General Maintenance',
          allSkills: workerData?.all_skills || ['General Maintenance'],
          cooperativeName: workerData?.cooperative_name || 'Nagarika Seva Sahakari Samiti',
          cooperativeId: workerData?.cooperative_id || 'COOP-BLR-001',
          experienceYears: workerData?.experience_years || 1,
          certifications: workerData?.certifications || [],
          rating: Number(workerData?.rating) || 5.0,
          reviewCount: workerData?.review_count || 0,
          completedJobsCount: workerData?.completed_jobs_count || 0,
          hourlyRate: Number(workerData?.hourly_rate) || 250,
          baseRate: Number(workerData?.base_rate) || 200,
          isAvailable: workerData?.is_available ?? true,
          serviceArea: workerData?.service_area || 'Bengaluru Urban',
          serviceRadiusKm: Number(workerData?.service_radius_km) || 10,
          languages: workerData?.languages || ['Kannada', 'English'],
          about: workerData?.about || '',
          verificationStatus: workerData?.verification_status || 'pending',
          welfareMemberId: workerData?.welfare_member_id || 'SSF-WLF-001',
          bankAccountLinked: workerData?.bank_account_linked || false,
          documents: (docs || []).map((d) => ({
            id: d.id,
            name: d.document_name,
            type: d.document_type as any,
            status: d.status as any,
            uploadedAt: d.uploaded_at,
            fileUrl: d.file_url || undefined,
          })),
        };
        return worker;
      }

      if (role === 'admin') {
        const { data: adminData } = await supabase
          .from('admin_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        const admin: CooperativeAdmin = {
          ...base,
          role: 'admin',
          federationName: adminData?.federation_name || 'State Labour Cooperative Federation',
          societyRegistrationNo: adminData?.society_registration_no || 'DRB/LCC/2024/001',
          adminDesignation: adminData?.admin_designation || 'Cooperative Officer',
          zoneAssigned: adminData?.zone_assigned || 'Bengaluru Cluster',
        };
        return admin;
      }

      // Customer role
      const { data: custData } = await supabase
        .from('customer_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      const customer: Customer = {
        ...base,
        role: 'customer',
        savedAddresses: (custData?.saved_addresses as any) || [],
      };
      return customer;
    } catch (err) {
      console.error('Error fetching user profile:', err);
      return null;
    }
  }

  /**
   * Get current authenticated user session and profile
   */
  async getCurrentUser(): Promise<AppUser | null> {
    if (this.demoUser) {
      return this.demoUser;
    }

    if (!isSupabaseConfigured()) {
      return null;
    }

    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error || !session?.user) {
        return null;
      }

      const profile = await this.fetchUserProfile(session.user.id);
      if (profile) return profile;

      // If auth user exists but database profile record is pending
      const metadata = session.user.user_metadata || {};
      const fallbackRole: UserRole = (metadata.role as UserRole) || 'customer';
      return {
        id: session.user.id,
        name: metadata.full_name || session.user.email?.split('@')[0] || 'Sahakar Member',
        email: session.user.email || '',
        phone: metadata.phone || '',
        role: fallbackRole,
        address: metadata.address || '',
        city: metadata.city || 'Bengaluru',
        pincode: metadata.pincode || '',
        createdAt: session.user.created_at,
      } as AppUser;
    } catch (err) {
      console.error('Failed to get current user session:', err);
      return null;
    }
  }

  /**
   * Sign in with Email & Password via Supabase Auth
   */
  async loginWithPassword(email: string, password: string): Promise<AppUser> {
    this.demoUser = null;

    if (!isSupabaseConfigured()) {
      throw new Error(
        'Supabase is not configured yet. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file, or use Team Demo Mode.'
      );
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.user) {
      throw new Error(error?.message || 'Invalid email or password.');
    }

    const profile = await this.fetchUserProfile(data.user.id);
    if (profile) {
      return profile;
    }

    const metadata = data.user.user_metadata || {};
    return {
      id: data.user.id,
      name: metadata.full_name || data.user.email?.split('@')[0] || 'Sahakar Member',
      email: data.user.email || '',
      phone: metadata.phone || '',
      role: (metadata.role as UserRole) || 'customer',
      address: metadata.address || '',
      city: metadata.city || 'Bengaluru',
      pincode: metadata.pincode || '',
      createdAt: data.user.created_at,
    } as AppUser;
  }

  /**
   * Quick 1-tap persona login for Evaluators & Demo testing
   */
  async loginDemo(role: UserRole): Promise<AppUser> {
    if (role === 'worker') {
      this.demoUser = { ...mockWorkerUser };
    } else if (role === 'admin') {
      this.demoUser = { ...mockAdminUser };
    } else {
      this.demoUser = { ...mockCustomer };
    }
    return this.demoUser;
  }

  /**
   * Unified login method supporting both credentials and demo roles
   */
  async login(role: UserRole, identifier?: string, password?: string): Promise<AppUser> {
    // If credentials are supplied and look like an email with a non-default password
    if (identifier && password && identifier.includes('@') && isSupabaseConfigured()) {
      return await this.loginWithPassword(identifier, password);
    }
    // Otherwise fallback to demo persona
    return await this.loginDemo(role);
  }

  /**
   * Register a new user with Supabase Auth and save metadata to PostgreSQL
   */
  async register(payload: RegisterPayload): Promise<AppUser> {
    this.demoUser = null;

    if (!isSupabaseConfigured()) {
      // Demo fallback if Supabase is not yet configured with real API keys
      console.warn('Supabase not configured. Simulating registration in demo mode.');
      const simulatedUser: AppUser = {
        id: `user-${Date.now()}`,
        name: payload.fullName,
        email: payload.email,
        phone: payload.phone || '',
        role: payload.role,
        address: payload.address || '',
        city: payload.city || 'Bengaluru',
        pincode: payload.pincode || '',
        createdAt: new Date().toISOString(),
      } as any;
      this.demoUser = simulatedUser;
      return simulatedUser;
    }

    if (!payload.password || payload.password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    // Pass user metadata to Supabase auth - trigger will auto-create database rows
    const { data, error } = await supabase.auth.signUp({
      email: payload.email.trim(),
      password: payload.password,
      options: {
        data: {
          role: payload.role,
          full_name: payload.fullName,
          phone: payload.phone || '',
          address: payload.address || '',
          city: payload.city || 'Bengaluru',
          pincode: payload.pincode || '',
          primary_skill: payload.primarySkill,
          experience_years: payload.experienceYears,
          cooperative_name: payload.cooperativeName,
          admin_designation: payload.adminDesignation,
          society_registration_no: payload.societyRegNo,
          federation_name: payload.federationName,
        },
      },
    });

    if (error || !data.user) {
      throw new Error(error?.message || 'Registration failed. Please check your information.');
    }

    // Check if session was granted immediately (auto-confirm enabled)
    if (data.session) {
      const profile = await this.fetchUserProfile(data.user.id);
      if (profile) return profile;
    }

    // Return preliminary user record
    return {
      id: data.user.id,
      name: payload.fullName,
      email: payload.email,
      phone: payload.phone || '',
      role: payload.role,
      address: payload.address || '',
      city: payload.city || 'Bengaluru',
      pincode: payload.pincode || '',
      createdAt: data.user.created_at,
    } as AppUser;
  }

  /**
   * Switch active persona
   */
  async switchRole(role: UserRole): Promise<AppUser> {
    return this.loginDemo(role);
  }

  /**
   * Sign out and clear stored sessions
   */
  async logout(): Promise<void> {
    this.demoUser = null;
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase sign out error:', err);
      }
    }
  }

  /**
   * Listen to Supabase auth state changes
   */
  onAuthStateChange(callback: (user: AppUser | null) => void) {
    if (!isSupabaseConfigured()) {
      return { unsubscribe: () => {} };
    }

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const profile = await this.fetchUserProfile(session.user.id);
        callback(profile);
      } else if (!this.demoUser) {
        callback(null);
      }
    });

    return {
      unsubscribe: () => {
        listener.subscription.unsubscribe();
      },
    };
  }
}

export const authService = new AuthService();
