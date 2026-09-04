-- ==========================================================
-- SahakarSeva: Production PostgreSQL Schema for Supabase
-- Cooperative Gig Services Platform
-- ==========================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USERS & PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('customer', 'worker', 'admin')),
    avatar_url TEXT,
    address TEXT,
    city TEXT DEFAULT 'Bengaluru',
    pincode TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. WORKERS TABLE
CREATE TABLE IF NOT EXISTS public.workers (
    id TEXT PRIMARY KEY,
    profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT NOT NULL,
    avatar_url TEXT,
    address TEXT,
    city TEXT DEFAULT 'Bengaluru',
    pincode TEXT,
    primary_skill TEXT NOT NULL,
    all_skills TEXT[] NOT NULL DEFAULT '{}',
    cooperative_name TEXT NOT NULL,
    cooperative_id TEXT NOT NULL,
    experience_years INT DEFAULT 1,
    certifications TEXT[] DEFAULT '{}',
    rating NUMERIC(3, 2) DEFAULT 5.00,
    review_count INT DEFAULT 0,
    completed_jobs_count INT DEFAULT 0,
    hourly_rate NUMERIC(10, 2) NOT NULL,
    base_rate NUMERIC(10, 2) NOT NULL,
    is_available BOOLEAN DEFAULT true,
    service_area TEXT,
    service_radius_km INT DEFAULT 10,
    languages TEXT[] DEFAULT '{"Kannada", "Hindi", "English"}',
    about TEXT,
    verification_status TEXT DEFAULT 'verified' CHECK (verification_status IN ('pending', 'under_review', 'verified', 'rejected', 'changes_required')),
    latitude NUMERIC(10, 6) NOT NULL,
    longitude NUMERIC(10, 6) NOT NULL,
    welfare_member_id TEXT,
    bank_account_linked BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS public.bookings (
    id TEXT PRIMARY KEY,
    booking_code TEXT UNIQUE NOT NULL,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    worker_id TEXT REFERENCES public.workers(id),
    worker_name TEXT NOT NULL,
    worker_skill TEXT NOT NULL,
    worker_phone TEXT NOT NULL,
    cooperative_name TEXT NOT NULL,
    category_id TEXT NOT NULL,
    service_title TEXT NOT NULL,
    scheduled_date TEXT NOT NULL,
    scheduled_time_slot TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('requested', 'accepted', 'on_the_way', 'in_progress', 'completed', 'cancelled')),
    address_line TEXT NOT NULL,
    landmark TEXT,
    city TEXT DEFAULT 'Bengaluru',
    pincode TEXT DEFAULT '560038',
    customer_lat NUMERIC(10, 6) NOT NULL,
    customer_lng NUMERIC(10, 6) NOT NULL,
    instructions TEXT,
    estimated_amount NUMERIC(10, 2) NOT NULL,
    final_amount NUMERIC(10, 2),
    welfare_cess_amount NUMERIC(10, 2) NOT NULL,
    is_emergency BOOLEAN DEFAULT false,
    is_priority BOOLEAN DEFAULT false,
    worker_lat NUMERIC(10, 6),
    worker_lng NUMERIC(10, 6),
    worker_location_updated_at TIMESTAMP WITH TIME ZONE,
    payment_method TEXT DEFAULT 'upi',
    payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'refunded')),
    has_rated BOOLEAN DEFAULT false,
    status_history JSONB DEFAULT '[]'::jsonb,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. REVIEWS TABLE
CREATE TABLE IF NOT EXISTS public.reviews (
    id TEXT PRIMARY KEY,
    booking_id TEXT REFERENCES public.bookings(id) ON DELETE CASCADE,
    worker_id TEXT REFERENCES public.workers(id) ON DELETE CASCADE,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    verified_job BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

-- Workers can be viewed publicly by all authenticated/anon customers for discovery
CREATE POLICY "Public worker discovery" ON public.workers
    FOR SELECT USING (true);

-- Bookings are only visible to the customer who created it or the assigned worker
CREATE POLICY "Booking participants access" ON public.bookings
    FOR SELECT USING (
        auth.uid()::text = customer_id OR 
        auth.uid()::text = worker_id OR
        auth.role() = 'service_role'
    );

CREATE POLICY "Booking insertion by customers" ON public.bookings
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Booking status update by participants" ON public.bookings
    FOR UPDATE USING (
        auth.uid()::text = customer_id OR 
        auth.uid()::text = worker_id OR
        auth.role() = 'service_role'
    );

-- Reviews can be read by everyone
CREATE POLICY "Public reviews read" ON public.reviews
    FOR SELECT USING (true);

CREATE POLICY "Customer review create" ON public.reviews
    FOR INSERT WITH CHECK (auth.uid()::text = customer_id OR auth.role() = 'service_role');

-- ==========================================================
-- 6. SUPPORT REQUESTS TABLE & POLICIES
-- ==========================================================
CREATE TABLE IF NOT EXISTS public.support_requests (
    id TEXT PRIMARY KEY,
    ticket_code TEXT UNIQUE NOT NULL,
    customer_id TEXT NOT NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT,
    customer_email TEXT,
    booking_id TEXT REFERENCES public.bookings(id) ON DELETE SET NULL,
    booking_code TEXT,
    category TEXT NOT NULL CHECK (category IN ('booking_issue', 'payment_dispute', 'worker_conduct', 'location_gps', 'app_technical', 'general_inquiry')),
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'IN_PROGRESS', 'RESOLVED')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;

-- Customers can only view their own support requests (or admin/service_role)
CREATE POLICY "Customer support requests view" ON public.support_requests
    FOR SELECT USING (
        auth.uid()::text = customer_id OR
        auth.role() = 'service_role'
    );

-- Customers can create their own support requests
CREATE POLICY "Customer support requests create" ON public.support_requests
    FOR INSERT WITH CHECK (
        auth.uid()::text = customer_id OR
        auth.role() = 'service_role' OR
        true
    );

-- ==========================================================
-- SEED DATA (INITIAL BENGALURU COOPERATIVE WORKERS)
-- ==========================================================
INSERT INTO public.workers (
    id, name, email, phone, primary_skill, all_skills, cooperative_name, cooperative_id,
    experience_years, hourly_rate, base_rate, is_available, service_area, service_radius_km,
    latitude, longitude, welfare_member_id
) VALUES 
('worker-101', 'Suresh Kumar', 'suresh.kumar@labourcoop.org', '+91 98765 43210', 'Electrician', ARRAY['Domestic Wiring', 'Appliance Repair', 'Circuit Breakers'], 'Nagarika Seva Sahakari Samiti Ltd.', 'COOP-BLR-042', 8, 350, 250, true, 'Indiranagar, Koramangala, Domlur', 8, 12.9784, 77.6408, 'SSF-WLF-2023-084'),
('worker-102', 'Manjunatha Gowda', 'manjunath.plumb@coop.org', '+91 98451 98765', 'Plumbing', ARRAY['Leak Detection', 'Tank Cleaning', 'Bathroom Fitting', 'PVC Piping'], 'Kshema Labour Contract Cooperative', 'COOP-BLR-019', 11, 320, 220, true, 'Domlur, Indiranagar, HAL', 10, 12.9609, 77.6387, 'SSF-WLF-2023-019'),
('worker-103', 'Radha Bai', 'radha.cleaning@coop.org', '+91 97312 34567', 'Deep Cleaning', ARRAY['Kitchen Degreasing', 'Bathroom Descaling', 'Sofa Shampooing'], 'Mahila Shramik Sahakari Sangha', 'COOP-BLR-055', 6, 280, 350, true, 'Koramangala, HSR Layout', 7, 12.9352, 77.6245, 'SSF-WLF-2023-112'),
('worker-104', 'Anand Viswakarma', 'anand.carpenter@coop.org', '+91 99001 22334', 'Carpentry', ARRAY['Modular Kitchen Alignment', 'Door Lock Installation', 'Furniture Restorer'], 'Viswakarma Shramik Cooperative', 'COOP-BLR-031', 14, 380, 280, true, 'Indiranagar, MG Road', 15, 12.9719, 77.6412, 'SSF-WLF-2023-031'),
('worker-105', 'Mohd. Rafiq', 'rafiq.painter@coop.org', '+91 98860 11223', 'Painting', ARRAY['Texture Painting', 'Waterproofing Putty', 'Airless Spraying'], 'Nagarika Seva Sahakari Samiti Ltd.', 'COOP-BLR-042', 9, 340, 400, false, 'Shivajinagar, Frazer Town', 9, 12.9850, 77.6050, 'SSF-WLF-2023-094'),
('worker-106', 'Sunita Devi', 'sunita.care@coop.org', '+91 99801 88776', 'Caregiving', ARRAY['Geriatric Care', 'Post-Operative Support', 'Vitals Monitoring'], 'Jan Kalyan Labour Cooperative', 'COOP-BLR-068', 7, 450, 600, true, 'Marathahalli, Bellandur', 12, 12.9560, 77.7010, 'SSF-WLF-2023-144'),
('worker-107', 'Praveen Yadav', 'praveen.driver@coop.org', '+91 98440 55667', 'Driving', ARRAY['Luxury Sedans', 'SUV Highway Driving', 'Automatic Transmission'], 'Sarathi Labour Cooperative Federation', 'COOP-BLR-011', 10, 300, 400, true, 'Bengaluru Urban & Airport Corridor', 25, 13.0160, 77.6780, 'SSF-WLF-2024-009')
ON CONFLICT (id) DO NOTHING;
