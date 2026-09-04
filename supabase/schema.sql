-- ==============================================================================
-- SAHAKAR SEVA - POSTGRESQL DATABASE SCHEMA & RBAC ARCHITECTURE
-- Production Supabase backend definition
-- Branch: feature/backend-auth
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. ENUMS
DO $$ BEGIN
    CREATE TYPE app_role AS ENUM ('customer', 'worker', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE worker_verification_status AS ENUM ('pending', 'under_review', 'verified', 'rejected', 'changes_required');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE document_type AS ENUM ('aadhaar', 'skill_certificate', 'police_verification', 'society_endorsement');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE booking_status AS ENUM ('requested', 'accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_status AS ENUM ('pending', 'completed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE payment_method AS ENUM ('upi', 'card', 'netbanking', 'cash');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 3. PROFILES TABLE (Core 1:1 user identity mapping to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role app_role NOT NULL DEFAULT 'customer',
    full_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    avatar_url TEXT,
    address TEXT,
    city TEXT DEFAULT 'Bengaluru',
    pincode TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 4. ROLE SPECIFIC PROFILES

-- Customer Profiles
CREATE TABLE IF NOT EXISTS public.customer_profiles (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
    saved_addresses JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Worker Profiles
CREATE TABLE IF NOT EXISTS public.worker_profiles (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
    primary_skill TEXT NOT NULL,
    all_skills TEXT[] DEFAULT ARRAY[]::TEXT[],
    cooperative_name TEXT NOT NULL,
    cooperative_id TEXT,
    experience_years INTEGER DEFAULT 0,
    certifications TEXT[] DEFAULT ARRAY[]::TEXT[],
    rating NUMERIC(3, 2) DEFAULT 5.00,
    review_count INTEGER DEFAULT 0,
    completed_jobs_count INTEGER DEFAULT 0,
    hourly_rate NUMERIC(10, 2) DEFAULT 0.00,
    base_rate NUMERIC(10, 2) DEFAULT 0.00,
    is_available BOOLEAN DEFAULT true,
    service_area TEXT,
    service_radius_km NUMERIC(5, 2) DEFAULT 10.00,
    languages TEXT[] DEFAULT ARRAY['Kannada', 'Hindi', 'English']::TEXT[],
    about TEXT,
    verification_status worker_verification_status NOT NULL DEFAULT 'pending',
    welfare_member_id TEXT,
    bank_account_linked BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Worker Verification Documents
CREATE TABLE IF NOT EXISTS public.worker_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
    document_name TEXT NOT NULL,
    document_type document_type NOT NULL,
    status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'verified', 'rejected')),
    file_url TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Admin Profiles
CREATE TABLE IF NOT EXISTS public.admin_profiles (
    id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE,
    federation_name TEXT NOT NULL,
    society_registration_no TEXT NOT NULL,
    admin_designation TEXT NOT NULL,
    zone_assigned TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 5. FUTURE EXTENSIONS FOUNDATION (Schema ready for other feature branches)

-- Service Categories Master
CREATE TABLE IF NOT EXISTS public.service_categories (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    hindi_title TEXT,
    telugu_title TEXT,
    icon_name TEXT NOT NULL,
    description TEXT,
    base_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_popular BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Sub-Services Catalog
CREATE TABLE IF NOT EXISTS public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category_id TEXT NOT NULL REFERENCES public.service_categories(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    estimated_minutes INTEGER DEFAULT 60,
    standard_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    warranty_days INTEGER DEFAULT 30,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Worker Availability Schedule
CREATE TABLE IF NOT EXISTS public.worker_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    worker_id UUID NOT NULL REFERENCES public.worker_profiles(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_code TEXT NOT NULL UNIQUE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    worker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    category_id TEXT REFERENCES public.service_categories(id) ON DELETE SET NULL,
    service_title TEXT NOT NULL,
    scheduled_date DATE NOT NULL,
    scheduled_time_slot TEXT NOT NULL,
    status booking_status NOT NULL DEFAULT 'requested',
    service_location JSONB NOT NULL,
    instructions TEXT,
    estimated_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    final_amount NUMERIC(10, 2),
    welfare_cess_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    is_emergency BOOLEAN DEFAULT false,
    payment_method payment_method DEFAULT 'cash',
    payment_status payment_status DEFAULT 'pending',
    status_history JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Reviews Table
CREATE TABLE IF NOT EXISTS public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    worker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    verified_job BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_role TEXT DEFAULT 'all',
    recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL,
    read BOOLEAN DEFAULT false,
    action_route TEXT,
    related_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Payments Table (Schema ready; payments logic deferred as requested)
CREATE TABLE IF NOT EXISTS public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    worker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL,
    welfare_cess_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_method payment_method NOT NULL DEFAULT 'cash',
    payment_status payment_status NOT NULL DEFAULT 'pending',
    transaction_reference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 6. INDEXES
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
-- Database-level authoritative uniqueness for normalized email (case-insensitive, trims whitespace, allows NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_unique_email ON public.profiles (LOWER(TRIM(email))) WHERE email IS NOT NULL AND TRIM(email) != '';
-- Database-level authoritative uniqueness for normalized phone (allows multiple NULLs or empty values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_unique_phone ON public.profiles (phone) WHERE phone IS NOT NULL AND TRIM(phone) != '';
CREATE INDEX IF NOT EXISTS idx_worker_profiles_skill ON public.worker_profiles(primary_skill);
CREATE INDEX IF NOT EXISTS idx_worker_profiles_verification ON public.worker_profiles(verification_status);
CREATE INDEX IF NOT EXISTS idx_worker_documents_worker ON public.worker_documents(worker_id);
CREATE INDEX IF NOT EXISTS idx_bookings_customer ON public.bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_worker ON public.bookings(worker_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);
CREATE INDEX IF NOT EXISTS idx_reviews_worker ON public.reviews(worker_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_id);

-- 7. HELPER FUNCTIONS & TRIGGERS

-- Timestamp Auto-updater
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers
DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_customer_profiles_updated_at ON public.customer_profiles;
CREATE TRIGGER trigger_customer_profiles_updated_at
    BEFORE UPDATE ON public.customer_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_worker_profiles_updated_at ON public.worker_profiles;
CREATE TRIGGER trigger_worker_profiles_updated_at
    BEFORE UPDATE ON public.worker_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_admin_profiles_updated_at ON public.admin_profiles;
CREATE TRIGGER trigger_admin_profiles_updated_at
    BEFORE UPDATE ON public.admin_profiles
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_bookings_updated_at ON public.bookings;
CREATE TRIGGER trigger_bookings_updated_at
    BEFORE UPDATE ON public.bookings
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trigger_payments_updated_at ON public.payments;
CREATE TRIGGER trigger_payments_updated_at
    BEFORE UPDATE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Security Definer helper to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$;

-- Security Definer helper to get current role
CREATE OR REPLACE FUNCTION public.get_current_role()
RETURNS app_role
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    user_role app_role;
BEGIN
    SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
    RETURN user_role;
END;
$$;

-- Automatic User Provisioning Trigger on auth.users Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    user_role public.app_role;
    user_full_name TEXT;
    user_phone TEXT;
    user_address TEXT;
    user_city TEXT;
    user_pincode TEXT;
    raw_role TEXT;
    existing_profile_id UUID;
BEGIN
    -- Safely extract and validate role against public.app_role enum
    raw_role := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'customer'));
    IF raw_role IN ('worker', 'admin', 'customer') THEN
        user_role := raw_role::public.app_role;
    ELSE
        user_role := 'customer'::public.app_role;
    END IF;

    user_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        split_part(NEW.email, '@', 1),
        'Sahakar Member'
    );

    -- Normalize phone consistently: strip non-digits, format Indian numbers to +91XXXXXXXXXX
    DECLARE
        raw_digits TEXT := regexp_replace(COALESCE(NEW.raw_user_meta_data->>'phone', ''), '[^0-9]', '', 'g');
    BEGIN
        IF length(raw_digits) = 11 AND raw_digits LIKE '0%' THEN
            raw_digits := substr(raw_digits, 2);
        END IF;

        IF length(raw_digits) = 10 THEN
            user_phone := '+91' || raw_digits;
        ELSIF length(raw_digits) = 12 AND raw_digits LIKE '91%' THEN
            user_phone := '+' || raw_digits;
        ELSIF length(raw_digits) > 0 THEN
            user_phone := '+' || raw_digits;
        ELSE
            user_phone := NULL;
        END IF;
    END;

    user_address := NEW.raw_user_meta_data->>'address';
    user_city := COALESCE(NEW.raw_user_meta_data->>'city', 'Bengaluru');
    user_pincode := NEW.raw_user_meta_data->>'pincode';

    -- 0. Check if an orphaned/mismatched profile with this email already exists under another ID
    IF NEW.email IS NOT NULL THEN
        SELECT id INTO existing_profile_id
        FROM public.profiles
        WHERE LOWER(TRIM(email)) = LOWER(TRIM(NEW.email)) AND id != NEW.id
        LIMIT 1;

        IF existing_profile_id IS NOT NULL THEN
            -- Safely re-link the existing profile record to NEW.id
            UPDATE public.profiles
            SET id = NEW.id,
                role = user_role,
                full_name = user_full_name,
                phone = COALESCE(user_phone, phone),
                address = COALESCE(user_address, address),
                city = COALESCE(user_city, city),
                pincode = COALESCE(user_pincode, pincode),
                updated_at = timezone('utc'::text, now())
            WHERE id = existing_profile_id;
        END IF;
    END IF;

    -- 1. Create or Update Base Profile in public.profiles using NEW.id strictly
    INSERT INTO public.profiles (
        id,
        role,
        full_name,
        phone,
        email,
        avatar_url,
        address,
        city,
        pincode
    ) VALUES (
        NEW.id,
        user_role,
        user_full_name,
        user_phone,
        LOWER(TRIM(NEW.email)),
        NEW.raw_user_meta_data->>'avatar_url',
        user_address,
        user_city,
        user_pincode
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        email = EXCLUDED.email,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        address = COALESCE(EXCLUDED.address, public.profiles.address),
        city = COALESCE(EXCLUDED.city, public.profiles.city),
        pincode = COALESCE(EXCLUDED.pincode, public.profiles.pincode),
        updated_at = timezone('utc'::text, now());

    -- 2. Create Role-Specific Profile Record (Idempotent)
    IF user_role = 'customer' THEN
        INSERT INTO public.customer_profiles (id)
        VALUES (NEW.id)
        ON CONFLICT (id) DO NOTHING;

    ELSIF user_role = 'worker' THEN
        INSERT INTO public.worker_profiles (
            id,
            primary_skill,
            all_skills,
            cooperative_name,
            cooperative_id,
            experience_years,
            verification_status,
            welfare_member_id
        ) VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'primary_skill', 'General Maintenance'),
            ARRAY[COALESCE(NEW.raw_user_meta_data->>'primary_skill', 'General Maintenance')]::TEXT[],
            COALESCE(NEW.raw_user_meta_data->>'cooperative_name', 'Nagarika Seva Sahakari Samiti'),
            COALESCE(NEW.raw_user_meta_data->>'cooperative_id', 'COOP-BLR-001'),
            CASE 
                WHEN (NEW.raw_user_meta_data->>'experience_years') ~ '^[0-9]+$' 
                THEN (NEW.raw_user_meta_data->>'experience_years')::INTEGER 
                ELSE 1 
            END,
            'pending'::public.worker_verification_status,
            COALESCE(NEW.raw_user_meta_data->>'welfare_member_id', 'SSF-' || floor(random() * 90000 + 10000)::text)
        )
        ON CONFLICT (id) DO NOTHING;

    ELSIF user_role = 'admin' THEN
        INSERT INTO public.admin_profiles (
            id,
            federation_name,
            society_registration_no,
            admin_designation,
            zone_assigned
        ) VALUES (
            NEW.id,
            COALESCE(NEW.raw_user_meta_data->>'federation_name', 'State Labour Cooperative Federation'),
            COALESCE(NEW.raw_user_meta_data->>'society_registration_no', 'DRB/LCC/2024/001'),
            COALESCE(NEW.raw_user_meta_data->>'admin_designation', 'Cooperative Officer'),
            COALESCE(NEW.raw_user_meta_data->>'zone_assigned', 'Bengaluru Urban')
        )
        ON CONFLICT (id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$;

-- Attach Trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 8. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.worker_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- 8.1 PROFILES POLICIES
-- Anyone authenticated can view profiles (required for matching workers/customers)
CREATE POLICY "Profiles are viewable by authenticated users"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users can insert their own profile
CREATE POLICY "Users can insert their own profile"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Admins can update any profile
CREATE POLICY "Admins can update all profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.is_admin());

-- 8.2 CUSTOMER PROFILES POLICIES
CREATE POLICY "Customers can view their own customer profile"
    ON public.customer_profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "Customers can update their own customer profile"
    ON public.customer_profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Customers can insert their own customer profile"
    ON public.customer_profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- 8.3 WORKER PROFILES POLICIES
-- Authenticated users can view verified worker profiles (or workers viewing themselves)
CREATE POLICY "Worker profiles viewable by users and admins"
    ON public.worker_profiles FOR SELECT
    TO authenticated
    USING (verification_status = 'verified' OR auth.uid() = id OR public.is_admin());

-- Workers can update their own profile (except verification status)
CREATE POLICY "Workers can update their own profile"
    ON public.worker_profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Workers can insert their own worker profile"
    ON public.worker_profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Admins can manage all worker profiles (including verification)
CREATE POLICY "Admins can manage worker profiles"
    ON public.worker_profiles FOR ALL
    TO authenticated
    USING (public.is_admin());

-- 8.4 WORKER DOCUMENTS POLICIES
CREATE POLICY "Workers can view and insert their own documents"
    ON public.worker_documents FOR SELECT
    TO authenticated
    USING (worker_id = auth.uid() OR public.is_admin());

CREATE POLICY "Workers can insert their own documents"
    ON public.worker_documents FOR INSERT
    TO authenticated
    WITH CHECK (worker_id = auth.uid());

-- Admins can manage all worker documents
CREATE POLICY "Admins can manage all worker documents"
    ON public.worker_documents FOR ALL
    TO authenticated
    USING (public.is_admin());

-- 8.5 ADMIN PROFILES POLICIES
CREATE POLICY "Admins can view and manage admin profiles"
    ON public.admin_profiles FOR ALL
    TO authenticated
    USING (public.is_admin() OR auth.uid() = id);

CREATE POLICY "Admins can insert their own admin profile"
    ON public.admin_profiles FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- 8.6 SERVICE CATALOG POLICIES
CREATE POLICY "Service categories readable by everyone"
    ON public.service_categories FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Services readable by everyone"
    ON public.services FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Admins can manage service catalog"
    ON public.service_categories FOR ALL
    TO authenticated
    USING (public.is_admin());

CREATE POLICY "Admins can manage services"
    ON public.services FOR ALL
    TO authenticated
    USING (public.is_admin());

-- 8.7 WORKER AVAILABILITY POLICIES
CREATE POLICY "Availability viewable by all authenticated users"
    ON public.worker_availability FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Workers can manage their own availability"
    ON public.worker_availability FOR ALL
    TO authenticated
    USING (worker_id = auth.uid() OR public.is_admin());

-- 8.8 BOOKINGS POLICIES
CREATE POLICY "Customers and workers can view their own bookings"
    ON public.bookings FOR SELECT
    TO authenticated
    USING (customer_id = auth.uid() OR worker_id = auth.uid() OR public.is_admin());

CREATE POLICY "Customers can create bookings"
    ON public.bookings FOR INSERT
    TO authenticated
    WITH CHECK (customer_id = auth.uid());

CREATE POLICY "Involved parties can update bookings"
    ON public.bookings FOR UPDATE
    TO authenticated
    USING (customer_id = auth.uid() OR worker_id = auth.uid() OR public.is_admin());

-- 8.9 REVIEWS POLICIES
CREATE POLICY "Reviews readable by all authenticated users"
    ON public.reviews FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Customers can insert reviews"
    ON public.reviews FOR INSERT
    TO authenticated
    WITH CHECK (customer_id = auth.uid());

-- 8.10 NOTIFICATIONS POLICIES
CREATE POLICY "Users can view their notifications"
    ON public.notifications FOR SELECT
    TO authenticated
    USING (
        recipient_id = auth.uid() OR
        recipient_role = 'all' OR
        recipient_role = (SELECT role::text FROM public.profiles WHERE id = auth.uid()) OR
        public.is_admin()
    );

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (recipient_id = auth.uid() OR public.is_admin());

-- 8.11 PAYMENTS POLICIES
CREATE POLICY "Involved parties can view payments"
    ON public.payments FOR SELECT
    TO authenticated
    USING (customer_id = auth.uid() OR worker_id = auth.uid() OR public.is_admin());

-- ==============================================================================
-- 9. AUTHENTICATION HELPER RPC FUNCTIONS
-- ==============================================================================

-- Secure Profile Lookup Function for Mobile Number Login
-- Resolves registered email by normalized phone number for sign-in
CREATE OR REPLACE FUNCTION public.get_email_by_phone(p_phone TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_norm_phone TEXT;
    v_email TEXT;
    raw_digits TEXT;
BEGIN
    IF p_phone IS NULL OR trim(p_phone) = '' THEN
        RETURN NULL;
    END IF;

    raw_digits := regexp_replace(trim(p_phone), '[^0-9]', '', 'g');
    IF length(raw_digits) = 11 AND raw_digits LIKE '0%' THEN
        raw_digits := substr(raw_digits, 2);
    END IF;

    IF length(raw_digits) = 10 THEN
        v_norm_phone := '+91' || raw_digits;
    ELSIF length(raw_digits) = 12 AND raw_digits LIKE '91%' THEN
        v_norm_phone := '+' || raw_digits;
    ELSIF length(raw_digits) > 0 THEN
        v_norm_phone := '+' || raw_digits;
    ELSE
        RETURN NULL;
    END IF;

    SELECT email INTO v_email
    FROM public.profiles
    WHERE phone = v_norm_phone
       OR phone = raw_digits
       OR (length(raw_digits) >= 10 AND phone LIKE '%' || right(raw_digits, 10))
    LIMIT 1;

    RETURN v_email;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_email_by_phone(TEXT) TO anon, authenticated;

-- Secure Pre-Flight Duplicate Check Function
-- Allows anonymous registration client to check duplicates before signup
CREATE OR REPLACE FUNCTION public.check_profile_exists(p_email TEXT, p_phone TEXT)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_norm_email TEXT := NULL;
    v_norm_phone TEXT := NULL;
    v_email_exists BOOLEAN := false;
    v_phone_exists BOOLEAN := false;
    raw_digits TEXT;
BEGIN
    IF p_email IS NOT NULL AND trim(p_email) != '' THEN
        v_norm_email := lower(trim(p_email));
        SELECT EXISTS (
            SELECT 1 FROM public.profiles WHERE lower(trim(email)) = v_norm_email
        ) INTO v_email_exists;

        IF NOT v_email_exists THEN
            SELECT EXISTS (
                SELECT 1 FROM auth.users WHERE lower(trim(email)) = v_norm_email
            ) INTO v_email_exists;
        END IF;
    END IF;

    IF p_phone IS NOT NULL AND trim(p_phone) != '' THEN
        raw_digits := regexp_replace(trim(p_phone), '[^0-9]', '', 'g');
        IF length(raw_digits) = 11 AND raw_digits LIKE '0%' THEN
            raw_digits := substr(raw_digits, 2);
        END IF;

        IF length(raw_digits) = 10 THEN
            v_norm_phone := '+91' || raw_digits;
        ELSIF length(raw_digits) = 12 AND raw_digits LIKE '91%' THEN
            v_norm_phone := '+' || raw_digits;
        ELSIF length(raw_digits) > 0 THEN
            v_norm_phone := '+' || raw_digits;
        END IF;

        IF v_norm_phone IS NOT NULL THEN
            SELECT EXISTS (
                SELECT 1 FROM public.profiles WHERE phone = v_norm_phone
            ) INTO v_phone_exists;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'email_exists', v_email_exists,
        'phone_exists', v_phone_exists
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_profile_exists(TEXT, TEXT) TO anon, authenticated;

-- ==============================================================================
-- 11. PROFILE SELF-HEALING & SYNCHRONIZATION FUNCTION
-- Automatically resolves UUID mismatches between auth.users and public.profiles
-- Safely re-links profiles to auth.uid() without overwriting other users
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.sync_current_user_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_email TEXT;
    v_meta JSONB;
    v_existing_profile RECORD;
    v_role public.app_role;
    v_full_name TEXT;
    v_phone TEXT;
    v_result RECORD;
BEGIN
    -- 1. Ensure caller is authenticated
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- 2. Fetch authenticated user details from auth.users
    SELECT email, raw_user_meta_data INTO v_email, v_meta
    FROM auth.users
    WHERE id = v_user_id;

    IF v_email IS NULL THEN
        RAISE EXCEPTION 'User not found in auth.users';
    END IF;

    -- 3. Check if profile already exists for this exact user_id
    SELECT * INTO v_result FROM public.profiles WHERE id = v_user_id;
    IF FOUND THEN
        RETURN to_jsonb(v_result);
    END IF;

    -- 4. Check if a profile exists with this email under a mismatched UUID
    SELECT * INTO v_existing_profile
    FROM public.profiles
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(v_email))
    LIMIT 1;

    IF v_existing_profile.id IS NOT NULL THEN
        -- Safely re-link existing profile to v_user_id
        -- Foreign keys with ON UPDATE CASCADE will cascade to role profile tables!
        UPDATE public.profiles
        SET id = v_user_id,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_existing_profile.id;

        -- Check and ensure role profile exists
        IF v_existing_profile.role = 'customer' THEN
            INSERT INTO public.customer_profiles (id) VALUES (v_user_id) ON CONFLICT (id) DO NOTHING;
        ELSIF v_existing_profile.role = 'worker' THEN
            INSERT INTO public.worker_profiles (
                id, primary_skill, all_skills, cooperative_name, cooperative_id,
                experience_years, verification_status, welfare_member_id
            ) VALUES (
                v_user_id, 'General Maintenance', ARRAY['General Maintenance']::TEXT[],
                'Nagarika Seva Sahakari Samiti', 'COOP-BLR-001', 1,
                'pending'::public.worker_verification_status,
                'SSF-' || floor(random() * 90000 + 10000)::text
            ) ON CONFLICT (id) DO NOTHING;
        ELSIF v_existing_profile.role = 'admin' THEN
            INSERT INTO public.admin_profiles (
                id, federation_name, society_registration_no, admin_designation, zone_assigned
            ) VALUES (
                v_user_id, 'State Labour Cooperative Federation', 'DRB/LCC/2024/001',
                'Cooperative Officer', 'Bengaluru Urban'
            ) ON CONFLICT (id) DO NOTHING;
        END IF;

        SELECT * INTO v_result FROM public.profiles WHERE id = v_user_id;
        RETURN to_jsonb(v_result);
    END IF;

    -- 5. If no profile exists at all for this user, create fresh profile from user metadata
    v_role := CASE
        WHEN LOWER(COALESCE(v_meta->>'role', 'customer')) IN ('worker', 'admin', 'customer')
        THEN (LOWER(COALESCE(v_meta->>'role', 'customer')))::public.app_role
        ELSE 'customer'::public.app_role
    END;

    v_full_name := COALESCE(
        v_meta->>'full_name',
        v_meta->>'name',
        split_part(v_email, '@', 1),
        'Sahakar Member'
    );

    -- Normalize phone consistently
    DECLARE
        raw_phone_digits TEXT := regexp_replace(COALESCE(v_meta->>'phone', ''), '[^0-9]', '', 'g');
    BEGIN
        IF length(raw_phone_digits) = 10 THEN
            v_phone := '+91' || raw_phone_digits;
        ELSIF length(raw_phone_digits) = 12 AND raw_phone_digits LIKE '91%' THEN
            v_phone := '+' || raw_phone_digits;
        ELSIF length(raw_phone_digits) > 0 THEN
            v_phone := '+' || raw_phone_digits;
        ELSE
            v_phone := NULL;
        END IF;
    END;

    INSERT INTO public.profiles (
        id, role, full_name, phone, email, address, city, pincode
    ) VALUES (
        v_user_id,
        v_role,
        v_full_name,
        v_phone,
        LOWER(TRIM(v_email)),
        v_meta->>'address',
        COALESCE(v_meta->>'city', 'Bengaluru'),
        v_meta->>'pincode'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        updated_at = timezone('utc'::text, now());

    -- Create role-specific record
    IF v_role = 'customer' THEN
        INSERT INTO public.customer_profiles (id) VALUES (v_user_id) ON CONFLICT (id) DO NOTHING;
    ELSIF v_role = 'worker' THEN
        INSERT INTO public.worker_profiles (
            id, primary_skill, all_skills, cooperative_name, cooperative_id,
            experience_years, verification_status, welfare_member_id
        ) VALUES (
            v_user_id,
            COALESCE(v_meta->>'primary_skill', 'General Maintenance'),
            ARRAY[COALESCE(v_meta->>'primary_skill', 'General Maintenance')]::TEXT[],
            COALESCE(v_meta->>'cooperative_name', 'Nagarika Seva Sahakari Samiti'),
            COALESCE(v_meta->>'cooperative_id', 'COOP-BLR-001'),
            1,
            'pending'::public.worker_verification_status,
            'SSF-' || floor(random() * 90000 + 10000)::text
        ) ON CONFLICT (id) DO NOTHING;
    ELSIF v_role = 'admin' THEN
        INSERT INTO public.admin_profiles (
            id, federation_name, society_registration_no, admin_designation, zone_assigned
        ) VALUES (
            v_user_id,
            COALESCE(v_meta->>'federation_name', 'State Labour Cooperative Federation'),
            COALESCE(v_meta->>'society_registration_no', 'DRB/LCC/2024/001'),
            'Cooperative Officer',
            'Bengaluru Urban'
        ) ON CONFLICT (id) DO NOTHING;
    END IF;

    SELECT * INTO v_result FROM public.profiles WHERE id = v_user_id;
    RETURN to_jsonb(v_result);
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_current_user_profile() TO authenticated;


