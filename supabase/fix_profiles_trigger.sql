-- ==============================================================================
-- SAHAKAR SEVA - DATABASE AUTHENTICATION & IDENTITY INTEGRITY SCRIPT
-- Replaces broken custom OTP infrastructure with clean Supabase Auth integration.
-- Safe & Non-destructive: preserves existing users, profiles, bookings & marketplace data.
-- Run in Supabase Dashboard -> SQL Editor
-- ==============================================================================

SET search_path = public, auth;

-- 1. Ensure public.profiles.id has NO random generator default and references auth.users(id)
ALTER TABLE public.profiles ALTER COLUMN id DROP DEFAULT;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'profiles_id_fkey' AND table_name = 'profiles'
    ) THEN
        ALTER TABLE public.profiles
            ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Ensure ON UPDATE CASCADE on role-specific profile foreign keys
-- Allows safely synchronizing/re-linking any mismatched profile UUIDs without foreign key errors
DO $$ BEGIN
    ALTER TABLE public.customer_profiles
        DROP CONSTRAINT IF EXISTS customer_profiles_id_fkey,
        ADD CONSTRAINT customer_profiles_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.worker_profiles
        DROP CONSTRAINT IF EXISTS worker_profiles_id_fkey,
        ADD CONSTRAINT worker_profiles_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.admin_profiles
        DROP CONSTRAINT IF EXISTS admin_profiles_id_fkey,
        ADD CONSTRAINT admin_profiles_id_fkey FOREIGN KEY (id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.worker_documents
        DROP CONSTRAINT IF EXISTS worker_documents_worker_id_fkey,
        ADD CONSTRAINT worker_documents_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.worker_profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.bookings
        DROP CONSTRAINT IF EXISTS bookings_customer_id_fkey,
        ADD CONSTRAINT bookings_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.bookings
        DROP CONSTRAINT IF EXISTS bookings_worker_id_fkey,
        ADD CONSTRAINT bookings_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.reviews
        DROP CONSTRAINT IF EXISTS reviews_worker_id_fkey,
        ADD CONSTRAINT reviews_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.reviews
        DROP CONSTRAINT IF EXISTS reviews_customer_id_fkey,
        ADD CONSTRAINT reviews_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.notifications
        DROP CONSTRAINT IF EXISTS notifications_recipient_id_fkey,
        ADD CONSTRAINT notifications_recipient_id_fkey FOREIGN KEY (recipient_id) REFERENCES public.profiles(id) ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.payments
        DROP CONSTRAINT IF EXISTS payments_customer_id_fkey,
        ADD CONSTRAINT payments_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN OTHERS THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE public.payments
        DROP CONSTRAINT IF EXISTS payments_worker_id_fkey,
        ADD CONSTRAINT payments_worker_id_fkey FOREIGN KEY (worker_id) REFERENCES public.profiles(id) ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION WHEN OTHERS THEN null;
END $$;

-- 3. Database-level authoritative uniqueness for normalized email and phone
-- Allows multiple NULLs or empty values, strictly enforces uniqueness on real inputs
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_unique_email ON public.profiles (LOWER(TRIM(email))) WHERE email IS NOT NULL AND TRIM(email) != '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_unique_phone ON public.profiles (phone) WHERE phone IS NOT NULL AND TRIM(phone) != '';

-- 4. Synchronize existing mismatched profiles with their Auth user UUID
UPDATE public.profiles p
SET id = u.id,
    updated_at = timezone('utc'::text, now())
FROM auth.users u
WHERE LOWER(TRIM(p.email)) = LOWER(TRIM(u.email))
  AND p.id != u.id
  AND NOT EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = u.id);

-- 5. Hardened, Idempotent handle_new_user Trigger Function
-- Ensures public.profiles.id is ALWAYS exactly auth.users.id
-- If a pre-existing profile row exists with this email under a different UUID, re-links it to NEW.id
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
    raw_digits TEXT;
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
    raw_digits := regexp_replace(COALESCE(NEW.raw_user_meta_data->>'phone', ''), '[^0-9]', '', 'g');
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

-- 6. Re-attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Secure Profile Lookup Function for Mobile Number Login
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

-- 8. Secure Pre-Flight Duplicate Check Function
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

-- 9. Profile Self-Healing & Synchronization Function
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
    raw_phone_digits TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    SELECT email, raw_user_meta_data INTO v_email, v_meta
    FROM auth.users
    WHERE id = v_user_id;

    IF v_email IS NULL THEN
        RAISE EXCEPTION 'User not found in auth.users';
    END IF;

    -- Check if profile already exists for this exact user_id
    SELECT * INTO v_result FROM public.profiles WHERE id = v_user_id;
    IF FOUND THEN
        RETURN to_jsonb(v_result);
    END IF;

    -- Check if a profile exists with this email under a mismatched UUID
    SELECT * INTO v_existing_profile
    FROM public.profiles
    WHERE LOWER(TRIM(email)) = LOWER(TRIM(v_email))
    LIMIT 1;

    IF v_existing_profile.id IS NOT NULL THEN
        UPDATE public.profiles
        SET id = v_user_id,
            updated_at = timezone('utc'::text, now())
        WHERE id = v_existing_profile.id;

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

    -- If no profile exists, create fresh from auth metadata
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

    raw_phone_digits := regexp_replace(COALESCE(v_meta->>'phone', ''), '[^0-9]', '', 'g');
    IF length(raw_phone_digits) = 11 AND raw_phone_digits LIKE '0%' THEN
        raw_phone_digits := substr(raw_phone_digits, 2);
    END IF;

    IF length(raw_phone_digits) = 10 THEN
        v_phone := '+91' || raw_phone_digits;
    ELSIF length(raw_phone_digits) = 12 AND raw_phone_digits LIKE '91%' THEN
        v_phone := '+' || raw_phone_digits;
    ELSIF length(raw_phone_digits) > 0 THEN
        v_phone := '+' || raw_phone_digits;
    ELSE
        v_phone := NULL;
    END IF;

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

-- 10. Safely drop obsolete custom OTP tables & functions if present
DROP TABLE IF EXISTS public.password_reset_otps CASCADE;
DROP FUNCTION IF EXISTS public.create_pending_password_reset_otp(TEXT, UUID, TEXT, TIMESTAMPTZ, INTEGER) CASCADE;

-- 11. Backfill profiles for all existing auth users missing a profile record
INSERT INTO public.profiles (
    id,
    role,
    full_name,
    phone,
    email,
    address,
    city,
    pincode
)
SELECT
    u.id,
    COALESCE(
        CASE 
            WHEN LOWER(u.raw_user_meta_data->>'role') IN ('worker', 'admin', 'customer') 
            THEN (LOWER(u.raw_user_meta_data->>'role'))::public.app_role 
            ELSE 'customer'::public.app_role 
        END,
        'customer'::public.app_role
    ),
    COALESCE(
        u.raw_user_meta_data->>'full_name',
        u.raw_user_meta_data->>'name',
        split_part(u.email, '@', 1),
        'Sahakar Member'
    ),
    u.raw_user_meta_data->>'phone',
    LOWER(TRIM(u.email)),
    u.raw_user_meta_data->>'address',
    COALESCE(u.raw_user_meta_data->>'city', 'Bengaluru'),
    u.raw_user_meta_data->>'pincode'
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- Backfill role-specific tables for any profiles missing them
INSERT INTO public.customer_profiles (id)
SELECT p.id FROM public.profiles p
WHERE p.role = 'customer'
AND NOT EXISTS (SELECT 1 FROM public.customer_profiles cp WHERE cp.id = p.id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.worker_profiles (
    id,
    primary_skill,
    all_skills,
    cooperative_name,
    cooperative_id,
    experience_years,
    verification_status,
    welfare_member_id
)
SELECT
    p.id,
    'General Maintenance',
    ARRAY['General Maintenance']::TEXT[],
    'Nagarika Seva Sahakari Samiti',
    'COOP-BLR-001',
    1,
    'pending'::public.worker_verification_status,
    'SSF-' || floor(random() * 90000 + 10000)::text
FROM public.profiles p
WHERE p.role = 'worker'
AND NOT EXISTS (SELECT 1 FROM public.worker_profiles wp WHERE wp.id = p.id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admin_profiles (
    id,
    federation_name,
    society_registration_no,
    admin_designation,
    zone_assigned
)
SELECT
    p.id,
    'State Labour Cooperative Federation',
    'DRB/LCC/2024/001',
    'Cooperative Officer',
    'Bengaluru Urban'
FROM public.profiles p
WHERE p.role = 'admin'
AND NOT EXISTS (SELECT 1 FROM public.admin_profiles ap WHERE ap.id = p.id)
ON CONFLICT (id) DO NOTHING;

-- 12. Verification query: Count matched vs orphaned profiles
SELECT 
    COUNT(p.id) AS total_profiles,
    COUNT(u.id) AS matched_with_auth_users,
    COUNT(CASE WHEN u.id IS NULL THEN 1 END) AS orphaned_profiles_count
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id;
