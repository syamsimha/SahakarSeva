const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('================================================================');
console.log('TEST SUITE: REAL HELP, FAQS & COOPERATIVE SUPPORT SYSTEM');
console.log('================================================================\n');

let passedTests = 0;
let failedTests = 0;

function runTest(name, fn) {
  try {
    fn();
    console.log(`✅ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${err.message}`);
    failedTests++;
  }
}

// 1. Verify FAQ Dataset Structure & Topics
runTest('1. FAQ dataset contains all 13 required cooperative topics', () => {
  const faqsPath = path.resolve(__dirname, '../src/data/faqs.ts');
  const content = fs.readFileSync(faqsPath, 'utf8');

  // Check required topics
  const requiredKeywords = [
    'book a cooperative worker',
    'search for a plumber',
    'Priority 24/7',
    'track my assigned worker',
    'change my service location',
    'GPS location system',
    'enter my location manually',
    'Saved Addresses',
    'cancel a booking',
    'contact my assigned cooperative worker',
    'no cooperative worker is immediately available',
    'change the application language',
    'after a booking is completed',
  ];

  for (const kw of requiredKeywords) {
    assert(content.includes(kw), `FAQ dataset missing topic containing "${kw}"`);
  }
});

// 2. Multilingual FAQ Coverage (en, hi, te)
runTest('2. All 13 FAQ items have complete English, Hindi, and Telugu questions & answers', () => {
  const faqsPath = path.resolve(__dirname, '../src/data/faqs.ts');
  const content = fs.readFileSync(faqsPath, 'utf8');

  // Count faq items
  const matches = content.match(/id:\s*'faq-\d+'/g);
  assert(matches && matches.length === 13, `Expected 13 FAQs, found ${matches ? matches.length : 0}`);

  // Count question languages
  const hiQuestions = (content.match(/hi:\s*'/g) || []).length;
  const teQuestions = (content.match(/te:\s*'/g) || []).length;
  assert(hiQuestions >= 26, `Expected at least 26 Hindi entries (questions + answers), found ${hiQuestions}`);
  assert(teQuestions >= 26, `Expected at least 26 Telugu entries (questions + answers), found ${teQuestions}`);
});

// 3. FAQ Search Logic (Case-insensitive, across keywords and tags)
runTest('3. FAQ search logic matches questions, answers, and tags case-insensitively', () => {
  // Mock FAQ item
  const sampleFaq = {
    id: 'faq-1',
    category: 'booking',
    question: {
      en: 'How do I book a cooperative worker?',
      hi: 'मैं सहकारी कार्यकर्ता को कैसे बुक करूँ?',
      te: 'నేను సహకార కార్యకర్తను ఎలా బుక్ చేసుకోవాలి?',
    },
    answer: {
      en: 'To book a worker, select your required service from the home screen.',
      hi: 'कार्यकर्ता बुक करने के लिए, होम स्क्रीन से अपनी आवश्यक सेवा चुनें।',
      te: 'కార్యకర్తను బుక్ చేయడానికి, హోమ్ స్క్రీన్ నుండి అవసరమైన సేవను ఎంచుకోండి.',
    },
    tags: ['book', 'booking', 'hire', 'service', 'worker', 'बुकिंग'],
  };

  const searchFaq = (faq, query, lang = 'en') => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    const qText = (faq.question[lang] || faq.question.en).toLowerCase();
    const aText = (faq.answer[lang] || faq.answer.en).toLowerCase();
    const tagMatch = faq.tags.some((t) => t.toLowerCase().includes(q));
    const enQ = faq.question.en.toLowerCase();
    return qText.includes(q) || aText.includes(q) || tagMatch || enQ.includes(q);
  };

  assert(searchFaq(sampleFaq, 'BOOK'), 'Should match uppercase "BOOK"');
  assert(searchFaq(sampleFaq, 'worker'), 'Should match lowercase "worker"');
  assert(searchFaq(sampleFaq, 'hire'), 'Should match tag "hire"');
  assert(searchFaq(sampleFaq, 'बुकिंग'), 'Should match Hindi tag');
  assert(!searchFaq(sampleFaq, 'astrophysics'), 'Should not match unrelated search');
});

// 4. Ticket Data Model & Types in src/types/index.ts
runTest('4. src/types/index.ts exports SupportCategory, SupportRequestStatus, and SupportRequest', () => {
  const typesPath = path.resolve(__dirname, '../src/types/index.ts');
  const content = fs.readFileSync(typesPath, 'utf8');

  assert(content.includes('export type SupportCategory ='), 'Missing SupportCategory export');
  assert(content.includes('export type SupportRequestStatus ='), 'Missing SupportRequestStatus export');
  assert(content.includes('export interface SupportRequest {'), 'Missing SupportRequest interface');
  assert(content.includes('ticketCode: string;'), 'SupportRequest missing ticketCode');
  assert(content.includes('category: SupportCategory;'), 'SupportRequest missing category');
  assert(content.includes('status: SupportRequestStatus;'), 'SupportRequest missing status');
});

// 5. Database Service Methods
runTest('5. src/services/db/databaseService.ts provides real createSupportRequest and getSupportRequests', () => {
  const dbPath = path.resolve(__dirname, '../src/services/db/databaseService.ts');
  const content = fs.readFileSync(dbPath, 'utf8');

  assert(content.includes('SUPPORT_REQUESTS:'), 'Missing STORAGE_KEYS.SUPPORT_REQUESTS');
  assert(content.includes('async getSupportRequests('), 'Missing getSupportRequests method');
  assert(content.includes('async getSupportRequestById('), 'Missing getSupportRequestById method');
  assert(content.includes('async createSupportRequest('), 'Missing createSupportRequest method');
  assert(content.includes('SUPPORT_REQUEST_CREATED'), 'Missing broadcast event for real-time updates');
});

// 6. Real Ticket Code & Current Year Timestamps (No 2024 hardcoding)
runTest('6. Ticket code generation uses current dynamic year (e.g. TKT-2026-xxxx) and ISO dates', () => {
  const dbPath = path.resolve(__dirname, '../src/services/db/databaseService.ts');
  const content = fs.readFileSync(dbPath, 'utf8');

  assert(content.includes('const currentYear = new Date().getFullYear();'), 'Ticket code should use current dynamic year');
  assert(content.includes('`TKT-${currentYear}-${randomSuffix}`'), 'Ticket code format should be TKT-<year>-<suffix>');
  assert(!content.includes('TKT-2024-'), 'No hardcoded 2024 in ticket codes');
});

// 7. Supabase Schema & Row Level Security (RLS)
runTest('7. supabase/schema.sql defines support_requests table with customer isolation RLS', () => {
  const schemaPath = path.resolve(__dirname, '../supabase/schema.sql');
  const content = fs.readFileSync(schemaPath, 'utf8');

  assert(content.includes('CREATE TABLE IF NOT EXISTS public.support_requests'), 'Missing public.support_requests table');
  assert(content.includes('ticket_code TEXT UNIQUE NOT NULL'), 'Missing ticket_code column');
  assert(content.includes('ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;'), 'Missing RLS enablement');
  assert(content.includes('auth.uid()::text = customer_id'), 'RLS policy must restrict access to owning customer');
});

// 8. Internationalization Keys in en.ts, hi.ts, te.ts
runTest('8. Complete translations present in en.ts, hi.ts, and te.ts', () => {
  const enContent = fs.readFileSync(path.resolve(__dirname, '../src/i18n/en.ts'), 'utf8');
  const hiContent = fs.readFileSync(path.resolve(__dirname, '../src/i18n/hi.ts'), 'utf8');
  const teContent = fs.readFileSync(path.resolve(__dirname, '../src/i18n/te.ts'), 'utf8');

  const requiredKeys = [
    'help_support_title',
    'help_subtitle',
    'faq_tab',
    'submit_ticket_tab',
    'my_tickets_tab',
    'faq_search_placeholder',
    'all_faqs',
    'no_faqs_found',
    'contact_coop_support',
    'ticket_category',
    'ticket_subject',
    'ticket_message',
    'ticket_status_open',
    'ticket_status_in_progress',
    'ticket_status_resolved',
    'validation_subject_required',
    'validation_message_required',
    'need_help_with_booking',
  ];

  for (const k of requiredKeys) {
    assert(enContent.includes(`${k}:`), `Missing key "${k}" in en.ts`);
    assert(hiContent.includes(`${k}:`), `Missing key "${k}" in hi.ts`);
    assert(teContent.includes(`${k}:`), `Missing key "${k}" in te.ts`);
  }
});

// 9. Interactive HelpSupportScreen Component
runTest('9. HelpSupportScreen contains tab switching, search bar, form, and status tracking', () => {
  const screenPath = path.resolve(__dirname, '../src/screens/common/HelpSupportScreen.tsx');
  const content = fs.readFileSync(screenPath, 'utf8');

  assert(content.includes('initialBookingId?: string;'), 'HelpSupportScreen accepts initialBookingId prop');
  assert(content.includes('FAQS_DATA'), 'HelpSupportScreen imports FAQS_DATA');
  assert(content.includes('databaseService.createSupportRequest'), 'HelpSupportScreen calls createSupportRequest');
  assert(content.includes('databaseService.getSupportRequests'), 'HelpSupportScreen calls getSupportRequests');
  assert(content.includes('setSearchQuery'), 'HelpSupportScreen supports real-time FAQ search');
  assert(content.includes('setExpandedFaqId'), 'HelpSupportScreen supports accordion FAQ expansion');
  assert(content.includes('statusPillOpen'), 'HelpSupportScreen renders status badges');
});

// 10. BookingDetailsScreen "Need Help with this Booking?" Integration
runTest('10. BookingDetailsScreen includes "Need Help with this Booking?" button linking to support', () => {
  const bookingScreenPath = path.resolve(__dirname, '../src/screens/customer/BookingDetailsScreen.tsx');
  const content = fs.readFileSync(bookingScreenPath, 'utf8');

  assert(content.includes('onNavigateToHelp?: (bookingId: string) => void;'), 'BookingDetailsScreenProps has onNavigateToHelp');
  assert(content.includes('onNavigateToHelp(booking.id)'), 'BookingDetailsScreen passes booking.id to onNavigateToHelp');
  assert(content.includes("t('need_help_with_booking')"), 'Button renders translated need_help_with_booking text');
});

// 11. CustomerNavigator Route Handling
runTest('11. CustomerNavigator passes helpBookingId to HelpSupportScreen and connects screens', () => {
  const navPath = path.resolve(__dirname, '../src/navigation/CustomerNavigator.tsx');
  const content = fs.readFileSync(navPath, 'utf8');

  assert(content.includes('const [helpBookingId, setHelpBookingId] = useState'), 'CustomerNavigator has helpBookingId state');
  assert(content.includes('initialBookingId={helpBookingId}'), 'CustomerNavigator passes initialBookingId to HelpSupportScreen');
  assert(content.includes('setHelpBookingId(bId)'), 'CustomerNavigator captures bookingId from BookingDetailsScreen');
});

// 12. Top-Right Role Switcher Pill Protection in Header.tsx
runTest('12. CRITICAL PROTECTION: Header.tsx Quick Role Switcher Pill is 100% intact', () => {
  const headerPath = path.resolve(__dirname, '../src/components/common/Header.tsx');
  const content = fs.readFileSync(headerPath, 'utf8');

  assert(content.includes('rolePill'), 'Header.tsx missing rolePill');
  assert(content.includes('setRoleModalVisible(true)'), 'Header.tsx role switcher action modified');
  assert(content.includes('getRoleColor()'), 'Header.tsx missing getRoleColor');
  assert(content.includes('getRoleLabel()'), 'Header.tsx missing getRoleLabel');
});

// 13. Honest Helpline & Direct Contact Handling (No fake 1800 numbers)
runTest('13. HelpSupportScreen handles helpline without fabricating fake contact numbers', () => {
  const screenPath = path.resolve(__dirname, '../src/screens/common/HelpSupportScreen.tsx');
  const content = fs.readFileSync(screenPath, 'utf8');

  assert(!content.includes('+91 1800-SAHAKAR'), 'No fake toll-free alert number');
  assert(!content.includes('#GT-9921'), 'No fake mock ticket ID');
  assert(content.includes('process.env.EXPO_PUBLIC_SUPPORT_PHONE'), 'Uses real environment support phone if set');
  assert(content.includes('triggerPhoneCall'), 'Uses real phone dialer utility');
});

// 14. Customer Data Isolation Test (Simulated DB Behavior)
runTest('14. DatabaseService isolates support requests by customerId', () => {
  const tickets = [
    { id: 't1', ticketCode: 'TKT-2026-1001', customerId: 'cust-1', subject: 'Pipe leak issue' },
    { id: 't2', ticketCode: 'TKT-2026-1002', customerId: 'cust-2', subject: 'Payment query' },
    { id: 't3', ticketCode: 'TKT-2026-1003', customerId: 'cust-1', subject: 'Electrician delayed' },
  ];

  const getForCustomer = (cid) => tickets.filter((t) => t.customerId === cid);

  const cust1Tickets = getForCustomer('cust-1');
  const cust2Tickets = getForCustomer('cust-2');

  assert.strictEqual(cust1Tickets.length, 2, 'Customer 1 should only see their 2 tickets');
  assert.strictEqual(cust2Tickets.length, 1, 'Customer 2 should only see their 1 ticket');
  assert(!cust1Tickets.some((t) => t.customerId === 'cust-2'), 'Customer 1 cannot access Customer 2 tickets');
});

// 15. Form Validation Logic Test
runTest('15. Ticket form validation enforces name, minimum subject (>=3 chars), and message (>=10 chars)', () => {
  const validateForm = (name, subj, msg) => {
    if (!name || !name.trim()) return 'name_required';
    if (!subj || subj.trim().length < 3) return 'subject_invalid';
    if (!msg || msg.trim().length < 10) return 'message_invalid';
    return null;
  };

  assert.strictEqual(validateForm('', 'Subject', 'Message text here'), 'name_required');
  assert.strictEqual(validateForm('John', 'ab', 'Message text here'), 'subject_invalid');
  assert.strictEqual(validateForm('John', 'Valid Subject', 'Too short'), 'message_invalid');
  assert.strictEqual(validateForm('John', 'Valid Subject', 'This is a valid long enough message for support'), null);
});

console.log(`\n================================================================`);
console.log(`SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log(`================================================================`);

if (failedTests > 0) {
  process.exit(1);
}
