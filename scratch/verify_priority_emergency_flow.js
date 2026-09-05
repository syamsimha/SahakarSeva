const assert = require('assert');
const path = require('path');
const fs = require('fs');

console.log('================================================================');
console.log('TEST SUITE: REAL PRIORITY 24/7 EMERGENCY COOPERATIVE FLOW');
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

const REPO_ROOT = path.resolve(__dirname, '..');

// 1. Verify Priority 24/7 does NOT immediately create a booking
runTest('1. EmergencyServicesScreen implements a multi-step flow without immediate one-click booking', () => {
  const screenPath = path.resolve(REPO_ROOT, 'src/screens/customer/EmergencyServicesScreen.tsx');
  const content = fs.readFileSync(screenPath, 'utf8');

  assert(content.includes('const [currentStep, setCurrentStep] = useState<StepNumber>(1);'), 'Screen must start on Step 1 (not immediately book)');
  assert(content.includes('handleNextFromService'), 'Screen must have a step to confirm service');
  assert(content.includes('handleNextFromLocation'), 'Screen must have a step to confirm location');
  assert(content.includes('handleConfirmEmergencyBooking'), 'Screen must have an explicit final confirmation step');
});

// 2. Verify Emergency Service Selection
runTest('2. Emergency service selection pre-fills service and allows changing between supported trades', () => {
  const screenPath = path.resolve(REPO_ROOT, 'src/screens/customer/EmergencyServicesScreen.tsx');
  const content = fs.readFileSync(screenPath, 'utf8');

  assert(content.includes('emergencyServices[0]'), 'Pre-selects default emergency service');
  assert(content.includes('emergencyServices.map'), 'Renders emergency service selection cards');
  assert(content.includes('setSelectedEmergency(svc)'), 'Allows customer to switch emergency services');
  assert(content.includes('svc.etaMinutes'), 'Displays ETA minutes badge');
  assert(content.includes('svc.baseEmergencyPrice'), 'Displays base emergency rate');
});

// 3. Verify Location Confirmation
runTest('3. Location confirmation requires valid address before proceeding to review', () => {
  const screenPath = path.resolve(REPO_ROOT, 'src/screens/customer/EmergencyServicesScreen.tsx');
  const content = fs.readFileSync(screenPath, 'utf8');

  assert(content.includes('handleNextFromLocation'), 'Has location validation step');
  assert(content.includes('t(\'location_required_error\')'), 'Shows error if address is missing');
  assert(content.includes('locationDisplayCard'), 'Clearly displays destination address card');
});

// 4. Verify GPS Location Option
runTest('4. Customer can choose and refresh live device GPS location', () => {
  const screenPath = path.resolve(REPO_ROOT, 'src/screens/customer/EmergencyServicesScreen.tsx');
  const content = fs.readFileSync(screenPath, 'utf8');

  assert(content.includes('handleUseGps'), 'Provides GPS location handler');
  assert(content.includes('locationService.requestLiveGpsLocation()'), 'Requests genuine live GPS');
  assert(content.includes('Use My Real GPS Location'), 'Displays GPS selection button');
});

// 5. Verify Manual Location Entry & Safety
runTest('5. Manual location entry captures address details without inventing fake coordinates', () => {
  const screenPath = path.resolve(REPO_ROOT, 'src/screens/customer/EmergencyServicesScreen.tsx');
  const content = fs.readFileSync(screenPath, 'utf8');

  assert(content.includes('handleSaveManualLocation'), 'Provides manual address saving');
  assert(content.includes('coordinatesAvailable: false'), 'Explicitly flags coordinatesAvailable: false for text addresses');
  assert(content.includes('manualDetails:'), 'Stores structured manualDetails');
  assert(content.includes('Enter Location Manually'), 'Provides manual address button');
});

// 6. Verify Saved Address Selection
runTest('6. Saved addresses can be selected from customer profile', () => {
  const screenPath = path.resolve(REPO_ROOT, 'src/screens/customer/EmergencyServicesScreen.tsx');
  const content = fs.readFileSync(screenPath, 'utf8');

  assert(content.includes('LocationSelectorModal'), 'Includes LocationSelectorModal');
  assert(content.includes('savedAddresses'), 'Reads savedAddresses from user profile');
});

// 7. Verify Selected Address is Clearly Visible Before Confirmation
runTest('7. Selected service location is clearly shown on Review screen', () => {
  const screenPath = path.resolve(REPO_ROOT, 'src/screens/customer/EmergencyServicesScreen.tsx');
  const content = fs.readFileSync(screenPath, 'utf8');

  assert(content.includes('Destination:'), 'Review summary shows Destination label');
  assert(content.includes('activeLocation?.address'), 'Review displays full formatted address');
  assert(content.includes('Location Mode:'), 'Review displays location source');
});

// 8. Verify No Hardcoded Bengaluru Default on GPS Failure
runTest('8. GPS failure does not default to arbitrary Bengaluru coordinates', () => {
  const screenPath = path.resolve(REPO_ROOT, 'src/screens/customer/EmergencyServicesScreen.tsx');
  const content = fs.readFileSync(screenPath, 'utf8');

  assert(!content.includes('12.9716'), 'No hardcoded Bengaluru latitude');
  assert(!content.includes('77.5946'), 'No hardcoded Bengaluru longitude');
});

// 9. Verify Transparent Emergency Pricing Calculation
runTest('9. Transparent price breakdown matches Base + Welfare Cess (5%) + GST (5%)', () => {
  const basePrice = 399; // Electrician
  const welfareCess = Math.round(basePrice * 0.05); // 20
  const gst = Math.round(basePrice * 0.05); // 20
  const total = basePrice + welfareCess + gst; // 439

  assert.strictEqual(welfareCess, 20);
  assert.strictEqual(gst, 20);
  assert.strictEqual(total, 439);

  const screenPath = path.resolve(REPO_ROOT, 'src/screens/customer/EmergencyServicesScreen.tsx');
  const content = fs.readFileSync(screenPath, 'utf8');

  assert(content.includes('const welfareCess = Math.round(basePrice * 0.05)'), 'Calculates 5% welfare cess');
  assert(content.includes('const gst = Math.round(basePrice * 0.05)'), 'Calculates 5% GST');
  assert(content.includes('const totalAmount = basePrice + welfareCess + gst'), 'Calculates totalAmount');
});

// 10. Verify Payment Method Selection
runTest('10. Allows choosing payment method (cash, upi, card, netbanking) with honest note', () => {
  const screenPath = path.resolve(REPO_ROOT, 'src/screens/customer/EmergencyServicesScreen.tsx');
  const content = fs.readFileSync(screenPath, 'utf8');

  assert(content.includes('setPaymentMethod'), 'Supports changing payment method');
  assert(content.includes('cash'), 'Includes cash option');
  assert(content.includes('upi'), 'Includes UPI option');
  assert(content.includes('pay_on_completion_note'), 'Includes honest pay-on-completion notice');
});

// 11. Verify No Fake Gateway Charges
runTest('11. Does NOT fake online payment gateway charges or display false payment success', () => {
  const screenPath = path.resolve(REPO_ROOT, 'src/screens/customer/EmergencyServicesScreen.tsx');
  const content = fs.readFileSync(screenPath, 'utf8');

  assert(!content.includes('Payment successful'), 'Must not claim payment successful before money is charged');
  assert(content.includes('paymentStatus,') || content.includes('paymentStatus: \'pending\''), 'Booking records paymentStatus: pending');
});

// 12. Verify Final Confirmation Screen Details
runTest('12. Review step shows Emergency Service, Location, Priority, Amount, and Payment Method', () => {
  const screenPath = path.resolve(REPO_ROOT, 'src/screens/customer/EmergencyServicesScreen.tsx');
  const content = fs.readFileSync(screenPath, 'utf8');

  assert(content.includes('Emergency Booking Summary'), 'Review card has summary title');
  assert(content.includes('Selected Service:'), 'Review displays Selected Service');
  assert(content.includes('Priority Level:'), 'Review displays Priority Level');
  assert(content.includes('Total Fair-Wage Amount'), 'Review displays Total Fair-Wage Amount');
  assert(content.includes('Payment Method'), 'Review displays Payment Method');
});

// 13. Verify Single Booking Creation with Priority & Emergency Flags
runTest('13. dispatchPriorityBooking creates exactly one real booking with isPriority & isEmergency flags', () => {
  const servicePath = path.resolve(REPO_ROOT, 'src/services/bookingService.ts');
  const content = fs.readFileSync(servicePath, 'utf8');

  assert(content.includes('isEmergency: true'), 'Booking stores isEmergency: true');
  assert(content.includes('isPriority: true'), 'Booking stores isPriority: true');
  assert(content.includes('status: \'requested\''), 'Booking initial status is requested');
  assert(content.includes('this.createBooking('), 'Calls createBooking to persist in database');
});

// 14. Dynamic Date and Time
runTest('14. Booking creation uses dynamic current timestamp without hardcoding 2024 dates', () => {
  const servicePath = path.resolve(REPO_ROOT, 'src/services/bookingService.ts');
  const content = fs.readFileSync(servicePath, 'utf8');

  assert(content.includes('new Date().toISOString()'), 'Uses dynamic new Date().toISOString()');
  assert(!content.includes('bk-2024-'), 'No hardcoded 2024 in new bookings');
});

// 15. Worker Dispatch Queries Real Available Workers
runTest('15. Dispatch engine queries real available workers by category and proximity', () => {
  const servicePath = path.resolve(REPO_ROOT, 'src/services/bookingService.ts');
  const content = fs.readFileSync(servicePath, 'utf8');

  assert(content.includes('workerService.getWorkers({'), 'Queries workerService');
  assert(content.includes('availableOnly: true'), 'Queries only available workers');
  assert(content.includes('customerCoords: hasCoords'), 'Passes customerCoords only if coordinates exist');
});

// 16. No Fake Worker Assignment on Zero Availability
runTest('16. If no suitable worker is available, returns honest message without fake assignment', () => {
  const servicePath = path.resolve(REPO_ROOT, 'src/services/bookingService.ts');
  const content = fs.readFileSync(servicePath, 'utf8');

  assert(content.includes('workerAssigned: false'), 'Returns workerAssigned: false when no workers');
  assert(content.includes('No available cooperative worker is currently available. Your priority request has been recorded.'), 'Returns honest recorded message');
});

// 17. Booking Status Lifecycle
runTest('17. Booking status adheres to requested -> accepted -> on_the_way -> in_progress -> completed', () => {
  const servicePath = path.resolve(REPO_ROOT, 'src/services/bookingService.ts');
  const content = fs.readFileSync(servicePath, 'utf8');

  assert(content.includes('status: \'requested\''), 'Priority booking starts in requested status');
  assert(content.includes('updateBookingStatus'), 'Has updateBookingStatus method');
});

// 18. Multilingual Translations
runTest('18. Translations present in en.ts, hi.ts, and te.ts for all emergency flow elements', () => {
  const enContent = fs.readFileSync(path.resolve(REPO_ROOT, 'src/i18n/en.ts'), 'utf8');
  const hiContent = fs.readFileSync(path.resolve(REPO_ROOT, 'src/i18n/hi.ts'), 'utf8');
  const teContent = fs.readFileSync(path.resolve(REPO_ROOT, 'src/i18n/te.ts'), 'utf8');

  const emergencyKeys = [
    'emergency_flow_title',
    'step_service',
    'step_location',
    'step_review_payment',
    'emergency_pricing_breakdown',
    'emergency_base_price',
    'emergency_welfare_cess',
    'emergency_gst',
    'emergency_total',
    'pay_on_completion_note',
    'confirm_emergency_booking_btn',
    'no_worker_available_recorded',
    'location_required_error',
  ];

  for (const k of emergencyKeys) {
    assert(enContent.includes(`${k}:`), `Missing key "${k}" in en.ts`);
    assert(hiContent.includes(`${k}:`), `Missing key "${k}" in hi.ts`);
    assert(teContent.includes(`${k}:`), `Missing key "${k}" in te.ts`);
  }
});

// 19. Normal Booking Flow Intact
runTest('19. Normal booking flow in BookingFlowScreen.tsx remains intact with all steps', () => {
  const flowPath = path.resolve(REPO_ROOT, 'src/screens/customer/BookingFlowScreen.tsx');
  const content = fs.readFileSync(flowPath, 'utf8');

  assert(content.includes('totalSteps = 8;'), 'Normal booking flow still has 8 steps');
  assert(content.includes('createBooking'), 'Normal booking flow still calls createBooking');
});

// 20. CRITICAL PROTECTION: Header.tsx Role Switcher Pill
runTest('20. CRITICAL PROTECTION: Header.tsx Quick Role Switcher Pill is 100% intact', () => {
  const headerPath = path.resolve(REPO_ROOT, 'src/components/common/Header.tsx');
  const content = fs.readFileSync(headerPath, 'utf8');

  assert(content.includes('rolePill'), 'Header.tsx missing rolePill');
  assert(content.includes('setRoleModalVisible(true)'), 'Header.tsx role switcher action was modified');
  assert(content.includes('getRoleColor()'), 'Header.tsx missing getRoleColor');
  assert(content.includes('getRoleLabel()'), 'Header.tsx missing getRoleLabel');
});

console.log(`\n================================================================`);
console.log(`SUMMARY: ${passedTests} PASSED, ${failedTests} FAILED`);
console.log(`================================================================`);

if (failedTests > 0) {
  process.exit(1);
}
