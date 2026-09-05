import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase, isSupabaseConfigured, getAppRedirectUrl } from '../lib/supabase';
import { AppUser, UserRole, WorkerProfile, CooperativeAdmin, Customer } from '../types';

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
  identityDoc?: { name: string; size?: number; uri: string };
  skillCertDoc?: { name: string; size?: number; uri: string };
  // Admin-specific
  adminDesignation?: string;
  societyRegNo?: string;
  federationName?: string;
  adminAuthDoc?: { name: string; size?: number; uri: string };
}

/**
 * Normalizes an email address by trimming whitespace and converting to lowercase.
 */
export function normalizeEmail(email?: string): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

/**
 * Normalizes phone numbers to a consistent international E.164-style format (+91XXXXXXXXXX for Indian numbers).
 * Strips whitespace, dashes, brackets, and non-digits.
 * Handles:
 * - 10-digit Indian numbers (9876543210 -> +919876543210)
 * - 11-digit numbers with leading 0 (09876543210 -> +919876543210)
 * - 12-digit numbers starting with 91 (+91 98765 43210 -> +919876543210)
 */
export function normalizePhoneNumber(rawPhone?: string): string {
  if (!rawPhone) return '';
  const trimmed = rawPhone.trim();
  if (!trimmed) return '';
  let digits = trimmed.replace(/[^0-9]/g, '');
  if (digits.length === 11 && digits.startsWith('0')) {
    digits = digits.substring(1);
  }
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  if (digits.length > 0) {
    return `+${digits}`;
  }
  return '';
}

/**
 * Maps raw Supabase and API errors to distinct, user-friendly messages.
 * Prevents masking real errors and eliminates developer/configuration warnings.
 */
export const mapFriendlyAuthError = (err?: any): string => {
  if (!err) return 'Authentication failed. Please try again.';

  const errorMessage = typeof err === 'string'
    ? err
    : err.message || err.error_description || err.msg || '';
  const errorCode = (typeof err === 'object' && err?.code ? String(err.code) : '').toLowerCase();
  const statusCode = typeof err === 'object' ? (err.status || err.statusCode) : undefined;
  const lower = errorMessage.toLowerCase();

  // 1. Preserve explicit friendly duplicate or custom messages
  if (
    errorMessage === 'An account with this email address already exists.' ||
    errorMessage === 'An account with this mobile number already exists.' ||
    errorMessage === 'Invalid email/mobile number or password.'
  ) {
    return errorMessage;
  }

  // 2. Duplicate Account: Email Uniqueness
  if (
    lower.includes('idx_profiles_unique_email') ||
    lower.includes('profiles_email_key') ||
    lower.includes('user already registered') ||
    lower.includes('already_registered') ||
    (lower.includes('duplicate key') && lower.includes('email'))
  ) {
    return 'An account with this email address already exists.';
  }

  // 3. Duplicate Account: Phone Uniqueness
  if (
    lower.includes('idx_profiles_unique_phone') ||
    lower.includes('profiles_phone_key') ||
    (lower.includes('duplicate key') && (lower.includes('phone') || lower.includes('mobile')))
  ) {
    return 'An account with this mobile number already exists.';
  }

  // 4. Invalid Credentials & Email Not Confirmed (never block user with confirmation error in UI)
  if (
    errorCode === 'invalid_grant' ||
    errorCode === 'invalid_credentials' ||
    errorCode === 'email_not_confirmed' ||
    errorCode === 'user_not_found' ||
    lower.includes('invalid login credentials') ||
    lower.includes('invalid credentials') ||
    lower.includes('invalid_grant') ||
    lower.includes('email not confirmed') ||
    lower.includes('email_not_confirmed') ||
    lower.includes('user not found')
  ) {
    return 'Invalid email/mobile number or password.';
  }

  // 5. Rate Limiting
  if (
    statusCode === 429 ||
    errorCode === 'over_email_send_rate_limit' ||
    errorCode === 'rate_limit_exceeded' ||
    errorCode === 'too_many_requests' ||
    errorCode === 'over_request_rate_limit' ||
    lower.includes('too many') ||
    lower.includes('rate limit') ||
    lower.includes('over_email_send_rate_limit') ||
    lower.includes('once every') ||
    lower.includes('for security purposes')
  ) {
    return 'Too many attempts. Please wait 60 seconds before trying again.';
  }

  // 6. Password Complexity
  if (lower.includes('password should be at least') || lower.includes('weak_password')) {
    return 'Password does not meet security requirements. Must be at least 8 characters.';
  }

  // 7. Missing Profile / Registration Incomplete
  if (
    lower.includes('no registered profile') ||
    lower.includes('registration incomplete') ||
    lower.includes('profile not found')
  ) {
    return 'No registered profile was found for this account. Please complete registration before signing in.';
  }

  // 8. Session Expired
  if (lower.includes('session has expired') || lower.includes('session expired')) {
    return 'Your session has expired due to inactivity. Please sign in again.';
  }

  // 9. Database Schema Not Initialized
  if (
    lower.includes('pgrst205') ||
    lower.includes('could not find the table') ||
    lower.includes('schema cache')
  ) {
    return 'Database schema is not initialized. Please ensure schema.sql has been executed in Supabase.';
  }

  // 10. Genuinely Offline / Network Request Failures Only
  if (
    lower.includes('network request failed') ||
    lower.includes('failed to fetch') ||
    lower.includes('networkerror')
  ) {
    return 'Unable to connect to authentication server. Please check your internet connection.';
  }

  return errorMessage;
};

class AuthService {
  private isRegistering = false;

  isConfigured(): boolean {
    return isSupabaseConfigured();
  }

  /**
   * Backwards-compatibility no-op for reset token cleanup
   */
  clearResetToken(): void {
    // No-op in official Supabase Auth flow
  }

  /**
   * Helper: Fetch full profile from PostgreSQL profiles table.
   * Enforces that authenticated users MUST have a database profile record.
   */
  async fetchUserProfile(userId: string): Promise<AppUser | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) {
        if (error?.code === 'PGRST205') {
          console.warn('PostgreSQL profiles table not found in schema cache:', error.message);
        } else {
          console.warn('No database profile row found for user id:', userId, error?.message);
        }
        return null;
      }

      const role = data.role as UserRole;

      if (role === 'worker') {
        const { data: workerData } = await supabase
          .from('worker_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        const wp: WorkerProfile = {
          id: data.id,
          name: data.full_name || '',
          email: data.email || '',
          phone: data.phone || '',
          role: 'worker',
          avatarUrl: data.avatar_url || undefined,
          address: data.address || '',
          city: data.city || '',
          pincode: data.pincode || '',
          primarySkill: workerData?.primary_skill || '',
          allSkills: workerData?.all_skills || [],
          cooperativeName: workerData?.cooperative_name || '',
          cooperativeId: workerData?.cooperative_id || 'coop-1',
          experienceYears: workerData?.experience_years || 1,
          certifications: workerData?.certifications || [],
          hourlyRate: workerData?.hourly_rate || 200,
          baseRate: workerData?.base_rate || 350,
          rating: workerData?.rating ? Number(workerData.rating) : 4.8,
          reviewCount: workerData?.review_count || 0,
          completedJobsCount: workerData?.completed_jobs_count || 0,
          isAvailable: workerData?.is_available ?? true,
          serviceArea: workerData?.service_area || 'Indiranagar',
          serviceRadiusKm: workerData?.service_radius_km || 10,
          languages: workerData?.languages || ['English', 'Kannada'],
          about: workerData?.about || '',
          verificationStatus: (workerData?.verification_status as any) || 'pending',
          documents: [],
          welfareMemberId: workerData?.welfare_member_id || 'W-2024-001',
          bankAccountLinked: workerData?.bank_account_linked ?? true,
          createdAt: data.created_at,
        };
        return wp;
      }

      if (role === 'admin') {
        const { data: adminData } = await supabase
          .from('admin_profiles')
          .select('*')
          .eq('id', userId)
          .single();

        const ap: CooperativeAdmin = {
          id: data.id,
          name: data.full_name || '',
          email: data.email || '',
          phone: data.phone || '',
          role: 'admin',
          avatarUrl: data.avatar_url || undefined,
          address: data.address || '',
          city: data.city || '',
          pincode: data.pincode || '',
          adminDesignation: adminData?.admin_designation || 'Cooperative Administrator',
          federationName: adminData?.federation_name || 'State Labour Federation',
          societyRegistrationNo: adminData?.society_registration_no || '',
          zoneAssigned: adminData?.zone_assigned || 'Bengaluru Urban',
          createdAt: data.created_at,
        };
        return ap;
      }

      const cp: Customer = {
        id: data.id,
        name: data.full_name || '',
        email: data.email || '',
        phone: data.phone || '',
        role: 'customer',
        avatarUrl: data.avatar_url || undefined,
        address: data.address || '',
        city: data.city || '',
        pincode: data.pincode || '',
        createdAt: data.created_at,
      };
      return cp;
    } catch (err) {
      console.error('Error fetching user profile:', err);
      return null;
    }
  }

  /**
   * Helper: Ensure profile exists in PostgreSQL.
   * If the trigger was not executed, or if a profile existed with a mismatched UUID,
   * this safely synchronizes and self-heals the user's profile.
   */
  async ensureUserProfile(user: any): Promise<AppUser | null> {
    if (!user?.id || !isSupabaseConfigured()) return null;

    try {
      // 1. Attempt database-level security definer self-healing function first
      try {
        const { data: syncedData, error: syncErr } = await supabase.rpc('sync_current_user_profile');
        if (!syncErr && syncedData) {
          const profile = await this.fetchUserProfile(user.id);
          if (profile) return profile;
        }
        if (syncErr) {
          console.warn('sync_current_user_profile RPC notice:', syncErr.message);
        }
      } catch (rpcEx) {
        console.warn('sync_current_user_profile RPC call exception:', rpcEx);
      }

      // 2. Client-side self-healing fallback
      const meta = user.user_metadata || {};
      const rawRole = (meta.role || '').toLowerCase();
      const role: UserRole = rawRole === 'worker' ? 'worker' : rawRole === 'admin' ? 'admin' : 'customer';
      const fullName = meta.full_name || meta.name || user.email?.split('@')[0] || 'Sahakar Member';
      const normalizedEmail = (user.email || '').trim().toLowerCase();

      // Check if profile exists by normalized email under a mismatched ID
      if (normalizedEmail) {
        const { data: existingEmailProfile } = await supabase
          .from('profiles')
          .select('id, role')
          .eq('email', normalizedEmail)
          .maybeSingle();

        if (existingEmailProfile && existingEmailProfile.id !== user.id) {
          // Re-link existing profile ID to user.id (supported by ON UPDATE CASCADE)
          const { error: relinkErr } = await supabase
            .from('profiles')
            .update({
              id: user.id,
              full_name: fullName,
              phone: meta.phone ? normalizePhoneNumber(meta.phone) : undefined,
              address: meta.address || undefined,
              city: meta.city || undefined,
              pincode: meta.pincode || undefined,
            })
            .eq('id', existingEmailProfile.id);

          if (!relinkErr) {
            const profile = await this.fetchUserProfile(user.id);
            if (profile) return profile;
          } else {
            console.warn('Profile re-linking error:', relinkErr.message);
          }
        }
      }

      // 3. Upsert into public.profiles
      const { error: profileErr } = await supabase.from('profiles').upsert({
        id: user.id,
        role,
        full_name: fullName,
        email: normalizedEmail || '',
        phone: normalizePhoneNumber(meta.phone) || '',
        address: meta.address || '',
        city: meta.city || 'Bengaluru',
        pincode: meta.pincode || '',
      });

      if (profileErr) {
        console.warn('ensureUserProfile: profiles upsert notice:', profileErr.message);
      }

      // 4. Upsert into role-specific profile
      if (role === 'customer') {
        await supabase.from('customer_profiles').upsert({ id: user.id });
      } else if (role === 'worker') {
        await supabase.from('worker_profiles').upsert({
          id: user.id,
          primary_skill: meta.primary_skill || 'General Maintenance',
          all_skills: [meta.primary_skill || 'General Maintenance'],
          cooperative_name: meta.cooperative_name || 'Nagarika Seva Sahakari Samiti',
          cooperative_id: 'COOP-BLR-001',
          experience_years: Number(meta.experience_years) || 1,
          verification_status: 'pending',
          welfare_member_id: 'SSF-' + Math.floor(Math.random() * 90000 + 10000),
        });
      } else if (role === 'admin') {
        await supabase.from('admin_profiles').upsert({
          id: user.id,
          federation_name: meta.federation_name || 'State Labour Cooperative Federation',
          society_registration_no: meta.society_registration_no || 'DRB/LCC/2024/001',
          admin_designation: meta.admin_designation || 'Cooperative Officer',
          zone_assigned: 'Bengaluru Urban',
        });
      }

      // 5. Re-fetch the verified profile
      return await this.fetchUserProfile(user.id);
    } catch (e) {
      console.warn('ensureUserProfile caught exception:', e);
      return null;
    }
  }

  /**
   * Get current active user from Supabase session.
   * Rejects users with missing database profiles.
   */
  async getCurrentUser(): Promise<AppUser | null> {
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

      // Enforce database profile verification with auto-healing
      let profile = await this.fetchUserProfile(session.user.id);
      if (!profile) {
        profile = await this.ensureUserProfile(session.user);
      }

      if (!profile) {
        // User exists in auth but has no valid application profile in database
        await supabase.auth.signOut();
        return null;
      }

      return profile;
    } catch (err) {
      console.error('Failed to get current user session:', err);
      return null;
    }
  }

  /**
   * Sign in with Email or Mobile Number + Password via Supabase Auth.
   * - If email: normalizes and authenticates directly.
   * - If mobile number: normalizes, resolves corresponding email safely via RPC, and authenticates.
   * Immediate login without email-confirmation blocking.
   */
  async loginWithPassword(identifier: string, password: string): Promise<AppUser> {
    if (!isSupabaseConfigured()) {
      throw new Error(
        'Supabase authentication is not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
      );
    }

    const trimmedId = identifier.trim();
    if (!trimmedId || !password) {
      throw new Error('Please enter both your email/mobile and password.');
    }

    const isEmail = trimmedId.includes('@');
    let emailToAuth = '';

    if (isEmail) {
      emailToAuth = normalizeEmail(trimmedId);
    } else {
      const normalizedPhone = normalizePhoneNumber(trimmedId);
      if (!normalizedPhone) {
        throw new Error('Invalid email/mobile number or password.');
      }

      // 1. Try local verified mapping cache (handles immediate login right after registration)
      try {
        const cached = await AsyncStorage.getItem(`@sahakar_phone_map_${normalizedPhone}`);
        if (cached && cached.includes('@')) {
          emailToAuth = normalizeEmail(cached);
        }
        if (!emailToAuth) {
          const rawDigits = trimmedId.replace(/[^0-9]/g, '');
          if (rawDigits.length >= 10) {
            const cached10 = await AsyncStorage.getItem(`@sahakar_phone_map_${rawDigits.slice(-10)}`);
            if (cached10 && cached10.includes('@')) {
              emailToAuth = normalizeEmail(cached10);
            }
          }
        }
      } catch (cacheErr) {
        console.warn('phone cache lookup notice:', cacheErr);
      }

      // 2. Resolve registered email by normalized phone number via RPC
      if (!emailToAuth) {
        try {
          const { data: foundEmail, error: phoneErr } = await supabase.rpc('get_email_by_phone', {
            p_phone: normalizedPhone,
          });

          if (!phoneErr && foundEmail && typeof foundEmail === 'string' && foundEmail.includes('@')) {
            emailToAuth = normalizeEmail(foundEmail);
          }
        } catch (rpcErr) {
          console.warn('get_email_by_phone RPC exception:', rpcErr);
        }
      }

      // 3. Fallback direct query if permitted by database RLS
      if (!emailToAuth) {
        try {
          const rawDigits = trimmedId.replace(/[^0-9]/g, '');
          const phoneVariants = [normalizedPhone];
          if (rawDigits.length >= 10) {
            const tenDigits = rawDigits.slice(-10);
            if (!phoneVariants.includes(tenDigits)) phoneVariants.push(tenDigits);
            if (!phoneVariants.includes(`+91${tenDigits}`)) phoneVariants.push(`+91${tenDigits}`);
          }
          const { data: profileData } = await supabase
            .from('profiles')
            .select('email')
            .in('phone', phoneVariants)
            .maybeSingle();

          if (profileData?.email) {
            emailToAuth = normalizeEmail(profileData.email);
          }
        } catch (dbErr) {
          console.warn('profiles phone lookup fallback notice:', dbErr);
        }
      }

      if (!emailToAuth) {
        throw new Error('Invalid email/mobile number or password.');
      }
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: emailToAuth,
      password,
    });

    if (error || !data.user) {
      throw new Error(mapFriendlyAuthError(error));
    }

    // Enforce database profile verification:
    let profile = await this.fetchUserProfile(data.user.id);
    if (!profile) {
      profile = await this.ensureUserProfile(data.user);
    }

    if (!profile) {
      try {
        await supabase.rpc('sync_current_user_profile');
        profile = await this.fetchUserProfile(data.user.id);
      } catch (err) {
        console.warn('sync_current_user_profile secondary attempt notice:', err);
      }
    }

    if (!profile) {
      await supabase.auth.signOut();
      throw new Error(
        'No registered profile was found for this account. Please complete registration before signing in.'
      );
    }

    if (profile && profile.phone && profile.email) {
      const normP = normalizePhoneNumber(profile.phone);
      if (normP) {
        AsyncStorage.setItem(`@sahakar_phone_map_${normP}`, normalizeEmail(profile.email)).catch(() => { });
        const d = normP.replace(/[^0-9]/g, '');
        if (d.length >= 10) {
          AsyncStorage.setItem(`@sahakar_phone_map_${d.slice(-10)}`, normalizeEmail(profile.email)).catch(() => { });
        }
      }
    }

    return profile;
  }

  /**
   * Standard login method. Requires genuine credentials.
   * Disallows mock accounts or fallback authentication.
   */
  async login(roleToUse: UserRole, identifier?: string, password?: string): Promise<AppUser> {
    if (identifier && password) {
      return this.loginWithPassword(identifier, password);
    }
    throw new Error('Please enter your email/mobile and password to sign in.');
  }

  /**
   * Switches the active view role for an already authenticated user.
   */
  async switchRole(role: UserRole): Promise<AppUser> {
    const current = await this.getCurrentUser();
    if (!current) {
      throw new Error('You must be signed in to switch experience mode.');
    }
    return { ...current, role } as AppUser;
  }

  /**
   * Register a new user with Supabase Auth without auto-logging in.
   * Enforces normalization, pre-flight uniqueness checks, and immediate clean signout.
   */
  async register(payload: RegisterPayload): Promise<AppUser> {
    this.isRegistering = true;
    try {
      if (!isSupabaseConfigured()) {
        throw new Error(
          'Supabase authentication is not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
        );
      }

      if (!payload.password || payload.password.length < 8) {
        throw new Error('Password must be at least 8 characters.');
      }

      const normalizedEmail = normalizeEmail(payload.email);
      const normalizedPhone = normalizePhoneNumber(payload.phone);

      if (!normalizedEmail || !normalizedEmail.includes('@')) {
        throw new Error('Please enter a valid email address.');
      }

      // 1. Pre-flight duplicate check via database RPC (accessible to anonymous users)
      try {
        const { data: duplicateCheck, error: rpcErr } = await supabase.rpc('check_profile_exists', {
          p_email: normalizedEmail,
          p_phone: normalizedPhone || '',
        });

        if (!rpcErr && duplicateCheck && typeof duplicateCheck === 'object') {
          const check = duplicateCheck as { email_exists?: boolean; phone_exists?: boolean };
          if (check.email_exists) {
            throw new Error('An account with this email address already exists.');
          }
          if (check.phone_exists) {
            throw new Error('An account with this mobile number already exists.');
          }
        }
      } catch (checkErr: any) {
        if (
          checkErr.message === 'An account with this email address already exists.' ||
          checkErr.message === 'An account with this mobile number already exists.'
        ) {
          throw checkErr;
        }
        // Non-fatal if RPC unavailable; database unique constraints remain the authoritative guard
      }

      // 2. Sign up the user in Supabase Auth with normalized email and phone
      // Note: Do not pass emailRedirectTo to prevent unnecessary confirmation email processing on registration
      const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: payload.password,
        options: {
          data: {
            role: payload.role,
            full_name: payload.fullName.trim(),
            phone: normalizedPhone,
            address: payload.address || '',
            city: payload.city || '',
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

      if (error) {
        console.error('[AuthService.register] Supabase Auth signUp failed:', {
          message: error.message,
          status: error.status,
          name: error.name,
          code: (error as any).code,
        });
        throw new Error(mapFriendlyAuthError(error));
      }

      if (!data?.user) {
        console.error('[AuthService.register] Supabase signUp returned no user and no error:', data);
        throw new Error('Registration could not be completed. Please check your details and try again.');
      }

      // GoTrue existing user detection: if user already exists, identities is returned as empty array
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new Error('An account with this email address already exists.');
      }

      // If worker documents are provided, record them in PostgreSQL
      if (payload.role === 'worker' && data.user) {
        try {
          if (payload.identityDoc) {
            await supabase.from('worker_documents').insert({
              worker_id: data.user.id,
              document_name: payload.identityDoc.name,
              document_type: 'aadhaar',
              status: 'uploaded',
              file_url: payload.identityDoc.uri,
            });
          }
          if (payload.skillCertDoc) {
            await supabase.from('worker_documents').insert({
              worker_id: data.user.id,
              document_name: payload.skillCertDoc.name,
              document_type: 'skill_certificate',
              status: 'uploaded',
              file_url: payload.skillCertDoc.uri,
            });
          }
        } catch (docErr) {
          console.warn('Could not record worker documents:', docErr);
        }
      }

      // If a session exists, ensure the database profile is recorded
      if (data.user && data.session) {
        try {
          await this.ensureUserProfile(data.user);
        } catch (ensureErr) {
          console.warn('Could not auto-provision profile on registration:', ensureErr);
        }
      }
      if (normalizedPhone && normalizedEmail) {
        try {
          await AsyncStorage.setItem(`@sahakar_phone_map_${normalizedPhone}`, normalizedEmail);
          const digits = normalizedPhone.replace(/[^0-9]/g, '');
          if (digits.length >= 10) {
            await AsyncStorage.setItem(`@sahakar_phone_map_${digits.slice(-10)}`, normalizedEmail);
          }
        } catch (cacheErr) {
          // Non-fatal
        }
      }

      // Sign out immediately so registration does NOT auto-login the user
      try {
        await supabase.auth.signOut();
      } catch (signOutErr) {
        // Ignore signOut errors
      }

      return {
        id: data.user.id,
        name: payload.fullName.trim(),
        email: normalizedEmail,
        phone: normalizedPhone,
        role: payload.role,
        address: payload.address || '',
        city: payload.city || '',
        pincode: payload.pincode || '',
        createdAt: data.user.created_at,
      } as AppUser;
    } finally {
      this.isRegistering = false;
    }
  }

  /**
   * Request password recovery via official Supabase Auth.
   * Sends recovery email with reset link or token to the user.
   */
  async sendPasswordResetEmail(email: string): Promise<{ message: string }> {
    if (!isSupabaseConfigured()) {
      throw new Error(
        'Supabase authentication is not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
      );
    }

    const trimmed = normalizeEmail(email);
    if (!trimmed || !trimmed.includes('@')) {
      throw new Error('Please enter a valid email address.');
    }

    // 1. Pre-flight check: verify email belongs to an existing account if RPC is available
    try {
      const { data: check, error: rpcErr } = await supabase.rpc('check_profile_exists', {
        p_email: trimmed,
        p_phone: '',
      });
      if (!rpcErr && check && typeof check === 'object') {
        const res = check as { email_exists?: boolean };
        if (res.email_exists === false) {
          throw new Error('No account found with this email address. Please check your email or register.');
        }
      }
    } catch (checkErr: any) {
      if (checkErr.message?.includes('No account found')) {
        throw checkErr;
      }
      // Non-fatal if RPC is not present in schema cache
    }

    // 2. Trigger official Supabase password recovery (generates 6-digit numeric OTP)
    const { error } = await supabase.auth.resetPasswordForEmail(trimmed);

    if (error) {
      throw new Error(mapFriendlyAuthError(error));
    }

    return {
      message: `A verification code has been sent to ${trimmed}. Please check your Gmail inbox and spam folder.`,
    };
  }

  /**
   * Verify recovery OTP / token code from Supabase email.
   * Establishes temporary recovery session in Supabase Auth.
   * Accepts 6-8 numeric digits matching Supabase Auth GoTrue output.
   */
  async verifyRecoveryOtp(email: string, token: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error(
        'Supabase authentication is not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
      );
    }

    const trimmedEmail = normalizeEmail(email);
    const trimmedToken = token.trim();

    if (!trimmedEmail) {
      throw new Error('Please enter your email address.');
    }
    if (!trimmedToken) {
      throw new Error('Please enter the verification code.');
    }
    if (trimmedToken.length < 6 || trimmedToken.length > 8 || !/^[0-9]{6,8}$/.test(trimmedToken)) {
      throw new Error('Please enter a valid verification code.');
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: trimmedToken,
      type: 'recovery',
    });

    if (error || !data.session) {
      throw new Error(mapFriendlyAuthError(error || 'The verification code entered is incorrect or has expired.'));
    }
  }

  /**
   * Verify signup / email confirmation OTP code from Supabase email.
   * Compatible with 6-8 digit email confirmation OTPs.
   */
  async verifyEmailOtp(email: string, token: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error(
        'Supabase authentication is not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
      );
    }

    const trimmedEmail = normalizeEmail(email);
    const trimmedToken = token.trim();

    if (!trimmedEmail) {
      throw new Error('Please enter your email address.');
    }
    if (!trimmedToken) {
      throw new Error('Please enter the verification code.');
    }
    if (trimmedToken.length < 6 || trimmedToken.length > 8 || !/^[0-9]{6,8}$/.test(trimmedToken)) {
      throw new Error('Please enter a valid verification code.');
    }

    const { data, error } = await supabase.auth.verifyOtp({
      email: trimmedEmail,
      token: trimmedToken,
      type: 'signup',
    });

    if (error || !data.session) {
      throw new Error(mapFriendlyAuthError(error || 'The verification code entered is incorrect or has expired.'));
    }
  }

  /**
   * Update password for the active recovery session.
   * Automatically signs out after update so user logs in cleanly with new password.
   */
  async updatePassword(newPassword: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error(
        'Supabase authentication is not configured. Please set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in your .env file.'
      );
    }

    if (!newPassword || newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters.');
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw new Error(mapFriendlyAuthError(error));
    }

    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore signOut errors
    }
  }

  /**
   * Subscribe to Supabase auth state changes.
   * Handles PASSWORD_RECOVERY and enforces profile verification without email blocking.
   */
  onAuthStateChange(callback: (user: AppUser | null, event?: string) => void) {
    if (!isSupabaseConfigured()) return { unsubscribe: () => { } };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (this.isRegistering) {
          // Do not broadcast user session while registration is in progress
          return;
        }

        if (event === 'PASSWORD_RECOVERY') {
          // Do not log into the dashboard on password recovery event
          callback(null, event);
          return;
        }

        if (session?.user) {
          let profile = await this.fetchUserProfile(session.user.id);
          if (!profile) {
            profile = await this.ensureUserProfile(session.user);
          }

          if (!profile) {
            // User authenticated in Supabase but no profile in DB -> deny access
            await supabase.auth.signOut();
            callback(null, event);
            return;
          }
          callback(profile, event);
        } else {
          callback(null, event);
        }
      }
    );

    return subscription;
  }

  /**
   * Updates user profile in Supabase profiles and related role tables
   */
  async updateUserProfile(userId: string, updates: Partial<AppUser>): Promise<void> {
    if (!isSupabaseConfigured() || !userId) return;

    try {
      const profileUpdates: Record<string, any> = {};
      if (updates.name !== undefined) profileUpdates.full_name = updates.name;
      if (updates.phone !== undefined) profileUpdates.phone = updates.phone;
      if (updates.avatarUrl !== undefined) profileUpdates.avatar_url = updates.avatarUrl;
      if (updates.address !== undefined) profileUpdates.address = updates.address;
      if (updates.city !== undefined) profileUpdates.city = updates.city;
      if (updates.pincode !== undefined) profileUpdates.pincode = updates.pincode;

      if (Object.keys(profileUpdates).length > 0) {
        await supabase
          .from('profiles')
          .update(profileUpdates as any)
          .eq('id', userId);
      }

      // Only allow updating admin_profiles if role is strictly 'admin'
      if (updates.role === 'admin' || ('adminDesignation' in updates && updates.role === 'admin')) {
        const adminUpdates: Record<string, any> = {};
        const adminObj = updates as Partial<CooperativeAdmin>;
        if (adminObj.adminDesignation !== undefined) adminUpdates.admin_designation = adminObj.adminDesignation;
        if (adminObj.federationName !== undefined) adminUpdates.federation_name = adminObj.federationName;
        if (adminObj.societyRegistrationNo !== undefined) adminUpdates.society_registration_no = adminObj.societyRegistrationNo;
        if (adminObj.zoneAssigned !== undefined) adminUpdates.zone_assigned = adminObj.zoneAssigned;

        if (Object.keys(adminUpdates).length > 0) {
          await supabase
            .from('admin_profiles')
            .update(adminUpdates as any)
            .eq('id', userId);
        }
      }
    } catch (err) {
      console.warn('Error updating profile in Supabase:', err);
    }
  }

  /**
   * Sign out and clear stored sessions
   */
  async logout(): Promise<void> {
    if (isSupabaseConfigured()) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Error during Supabase signout:', err);
      }
    }
  }
}

export const authService = new AuthService();
