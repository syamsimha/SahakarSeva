-- ==============================================================================
-- SAHAKAR SEVA - SEED DATA
-- Default cooperative services, categories, and sample cooperative data
-- ==============================================================================

-- 1. SERVICE CATEGORIES
INSERT INTO public.service_categories (id, title, hindi_title, telugu_title, icon_name, description, base_price, is_popular)
VALUES
    ('electrical', 'Electrical Repairs', 'बिजली का काम', 'విద్యుత్ మరమ్మతులు', 'flash', 'Wiring, fan installation, switchboard repairs, and inverters.', 250.00, true),
    ('plumbing', 'Plumbing & Pipes', 'नल और पाइप का काम', 'ప్లంబింగ్ పనులు', 'water', 'Leak repair, tap replacement, pipe installation, tank cleaning.', 200.00, true),
    ('carpentry', 'Carpentry & Woodwork', 'बढ़ई का काम', 'వడ్రంగి పనులు', 'hammer', 'Furniture assembly, door lock fitting, hinge fixes.', 300.00, false),
    ('painting', 'Painting & Whitewash', 'पेंटिंग और सफेदी', 'పెయింటింగ్ పనులు', 'color-palette', 'Interior, exterior wall painting and surface finishing.', 500.00, false),
    ('cleaning', 'Deep Home Cleaning', 'घर की गहरी सफाई', 'ఇంటి లోతైన శుభ్రత', 'sparkles', 'Kitchen, bathroom, sofa and full deep home sanitation.', 450.00, true),
    ('gardening', 'Gardening & Landscaping', 'बागवानी सेवा', 'తోటపని సేవలు', 'leaf', 'Pruning, lawn mowing, fertilizer treatment, plant care.', 250.00, false),
    ('domestic_help', 'Domestic Support & Cooking', 'घरेलू सहायता', 'గృహ సహాయం', 'home', 'Verified domestic helpers, verified cooking support.', 350.00, false),
    ('technical', 'Appliance & Inverter Service', 'उपकरण मरम्मत', 'ఉపకరణాల మరమ్మతు', 'hardware-chip', 'AC repair, washing machine, microwave and inverter setups.', 400.00, true)
ON CONFLICT (id) DO NOTHING;

-- 2. SAMPLE SUB-SERVICES
INSERT INTO public.services (category_id, title, description, estimated_minutes, standard_price, warranty_days)
VALUES
    ('electrical', 'Ceiling Fan Installation & Repair', 'Complete mounting, capacitor check and speed regulator replacement', 45, 250.00, 30),
    ('electrical', 'Full Switchboard Replacement & MCB Fit', 'Modern modular switchboard installation with safety grounding', 60, 350.00, 60),
    ('electrical', 'Inverter & Battery Setup / Health Check', 'Dual inverter wiring with automatic changeover switch testing', 90, 600.00, 90),
    ('plumbing', 'Water Leakage & Pipeline Seal', 'Under-sink, concealed pipe leak inspection and high-grade seal', 45, 220.00, 30),
    ('plumbing', 'Bathroom Tap & Mixer Installation', 'Single lever or dual bibcock fitting with Teflon sealing', 30, 180.00, 30),
    ('carpentry', 'Door Lock & Latch Replacement', 'Heavy duty cylindrical/mortise lock replacement with key calibration', 45, 300.00, 45),
    ('cleaning', 'Full Bathroom Sanitization & Descaling', 'Tile buffing, hard water scale removal, anti-microbial steam wipe', 75, 450.00, 15)
ON CONFLICT DO NOTHING;
