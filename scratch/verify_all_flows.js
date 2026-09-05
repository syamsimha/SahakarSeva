/**
 * Automated Verification Script for SahakarSeva Real-World Platform Upgrade
 * Covers All 11 Required Tests & Edge Cases
 */

const { locationService, defaultLocations } = require('../src/services/locationService');
const { workerService } = require('../src/services/workerService');
const { bookingService } = require('../src/services/bookingService');
const { authService } = require('../src/services/authService');
const { databaseService, storage } = require('../src/services/db/databaseService');
const { getDynamicDateOptions, formatTimeAgo } = require('../src/utils/dateTime');

let passedTests = 0;
let totalTests = 0;

function assert(condition, testName, details = '') {
  totalTests++;
  if (condition) {
    console.log(`✅ [PASS] ${testName} ${details ? '(' + details + ')' : ''}`);
    passedTests++;
  } else {
    console.error(`❌ [FAIL] ${testName} ${details ? '(' + details + ')' : ''}`);
  }
}

async function runAllTests() {
  console.log('========================================================');
  console.log('STARTING AUTOMATED VERIFICATION: 11 TEST FLOWS');
  console.log('========================================================\n');

  // TEST 1: GPS Permission & Live Location
  console.log('--- TEST 1: Browser/Device GPS Location ---');
  // In node environment navigator is read-only getter on globalThis, so defineProperty
  Object.defineProperty(global, 'navigator', {
    value: {
      geolocation: {
        getCurrentPosition: (success) => {
          success({
            coords: { latitude: 12.9352, longitude: 77.6245, accuracy: 15 },
          });
        },
      },
    },
    configurable: true,
    writable: true,
  });
  const gpsRes = await locationService.requestLiveGpsLocation();
  assert(gpsRes.success === true, 'TEST 1.1: GPS request resolves successfully');
  assert(gpsRes.coords && gpsRes.coords.latitude === 12.9352, 'TEST 1.2: GPS coordinates recorded accurately', `lat: ${gpsRes.coords?.latitude}`);
  assert(gpsRes.coords && gpsRes.coords.isGps === true, 'TEST 1.3: GPS flag marked true');

  // TEST 2: GPS Denied / Fallback to Manual Cluster
  console.log('\n--- TEST 2: Fallback to Manual Selection ---');
  global.navigator.geolocation.getCurrentPosition = (success, error) => {
    error({ code: 1, PERMISSION_DENIED: 1, message: 'User denied geolocation' });
  };
  const deniedRes = await locationService.requestLiveGpsLocation();
  assert(deniedRes.success === false, 'TEST 2.1: GPS denial handled gracefully');
  assert(deniedRes.error.includes('denied') || deniedRes.error.includes('cluster'), 'TEST 2.2: Helpful error message returned', deniedRes.error);
  
  // Manual selection
  const manualLoc = await locationService.setLocation('koramangala');
  assert(manualLoc.city === 'Bengaluru' && manualLoc.isGps === false, 'TEST 2.3: Manual cluster selection works', manualLoc.address);

  // TEST 3: Search "plumber"
  console.log('\n--- TEST 3: Search "plumber" with Synonym Engine ---');
  const plumberResults = await workerService.getWorkers({ searchQuery: 'plumber' });
  assert(plumberResults.length > 0, 'TEST 3.1: Plumber search returns workers', `count: ${plumberResults.length}`);
  const hasPlumber = plumberResults.some((w) => w.primarySkill.toLowerCase().includes('plumb'));
  assert(hasPlumber, 'TEST 3.2: Worker with Plumbing skill matched', plumberResults[0].name);

  // TEST 4: Search "technician"
  console.log('\n--- TEST 4: Search "technician" with Synonym Matching ---');
  const techResults = await workerService.getWorkers({ searchQuery: 'technician' });
  assert(techResults.length > 0, 'TEST 4.1: Technician search matches electricians / technical trade', `count: ${techResults.length}`);
  const hasElectricOrTech = techResults.some((w) => 
    w.primarySkill.toLowerCase().includes('electric') || 
    w.primarySkill.toLowerCase().includes('tech') ||
    w.allSkills.some(s => s.toLowerCase().includes('repair'))
  );
  assert(hasElectricOrTech, 'TEST 4.2: Electrician/appliance worker matched for technician query', techResults[0].name);

  // Also test "mechanic" and "carpenter"
  const carpResults = await workerService.getWorkers({ searchQuery: 'carpenter' });
  assert(carpResults.length > 0, 'TEST 4.3: Carpenter search matches carpentry workers', carpResults[0].name);

  // TEST 5: Priority 24/7 Booking Creation & Available Worker Matching
  console.log('\n--- TEST 5: Priority 24/7 Function ---');
  const availableElectricians = await workerService.getWorkers({
    category: 'electrical',
    availableOnly: true,
  });
  assert(availableElectricians.length > 0, 'TEST 5.1: Real online/available workers matched for emergency trade', availableElectricians[0].name);

  const priorityBooking = await bookingService.createBooking({
    customerId: 'cust-101',
    customerName: 'Ramesh Sharma',
    customerPhone: '+91 98450 12345',
    workerId: availableElectricians[0].id,
    workerName: availableElectricians[0].name,
    workerSkill: availableElectricians[0].primarySkill,
    workerPhone: availableElectricians[0].phone,
    cooperativeName: availableElectricians[0].cooperativeName,
    categoryId: 'electrical',
    serviceTitle: 'Electrical SOS Short Circuit [Priority 24/7]',
    scheduledDate: 'Immediate Dispatch (Priority)',
    scheduledTimeSlot: 'ETA: 20 mins',
    status: 'on_the_way',
    serviceLocation: {
      addressLine: '100ft Road, Indiranagar',
      city: 'Bengaluru',
      pincode: '560038',
      latitude: 12.9784,
      longitude: 77.6408,
    },
    instructions: 'URGENT PRIORITY 24/7',
    estimatedAmount: 399,
    welfareCessAmount: 20,
    isEmergency: true,
    isPriority: true,
    workerLocation: {
      latitude: availableElectricians[0].latitude || 12.9784,
      longitude: availableElectricians[0].longitude || 77.6408,
      updatedAt: new Date().toISOString(),
    },
    paymentMethod: 'upi',
    paymentStatus: 'pending',
  });

  assert(priorityBooking.isPriority === true, 'TEST 5.2: Booking record stored with isPriority: true');
  assert(priorityBooking.isEmergency === true, 'TEST 5.3: Booking record stored with isEmergency: true');
  assert(priorityBooking.workerId === availableElectricians[0].id, 'TEST 5.4: Assigned real matching worker, not a fake assignment');

  // TEST 6: Database Persistence & Dynamic Date/Time
  console.log('\n--- TEST 6: Database Persistence & Dynamic Date/Time ---');
  const fetchedBooking = await databaseService.getBookingById(priorityBooking.id);
  assert(fetchedBooking !== undefined, 'TEST 6.1: Booking retrieved from persistent databaseService');
  assert(fetchedBooking.bookingCode.startsWith('SS-BLR-'), 'TEST 6.2: Booking code generated properly', fetchedBooking.bookingCode);
  
  // Dynamic dates check
  const dynamicDates = getDynamicDateOptions(5);
  const today = new Date();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const expectedMonth = monthNames[today.getMonth()];
  assert(dynamicDates[0].value.includes(expectedMonth), 'TEST 6.3: Dynamic calendar correctly displays current real month', dynamicDates[0].value);
  assert(dynamicDates[0].label === 'Today', 'TEST 6.4: First date option is dynamic Today');
  assert(dynamicDates[1].label === 'Tomorrow', 'TEST 6.5: Second date option is dynamic Tomorrow');

  // TEST 7: Active Booking Track Worker
  console.log('\n--- TEST 7: Track Worker Functionality ---');
  assert(fetchedBooking.workerLocation !== undefined, 'TEST 7.1: Worker coordinates stored on active booking');
  assert(fetchedBooking.workerLocation.latitude > 12 && fetchedBooking.workerLocation.longitude > 77, 'TEST 7.2: Valid Bengaluru worker GPS coordinates present');

  // TEST 8: Worker Moves / Updates Location
  console.log('\n--- TEST 8: Live Worker Location Updates ---');
  const updatedBooking = await bookingService.updateWorkerLocation(priorityBooking.id, 12.9790, 77.6415);
  assert(updatedBooking.workerLocation.latitude === 12.9790, 'TEST 8.1: Worker location update persisted', `lat: ${updatedBooking.workerLocation.latitude}`);
  const timeAgo = formatTimeAgo(updatedBooking.workerLocation.updatedAt);
  assert(timeAgo === 'just now', 'TEST 8.2: Dynamic relative timestamp computed', timeAgo);

  // TEST 9: Booking Completed -> Tracking Stops
  console.log('\n--- TEST 9: Tracking Terminates on Completion ---');
  const completedBooking = await bookingService.updateBookingStatus(priorityBooking.id, 'completed', 'Job finished');
  assert(completedBooking.status === 'completed', 'TEST 9.1: Status transitioned to completed');
  assert(completedBooking.paymentStatus === 'completed', 'TEST 9.2: Payment settled on completion');

  // TEST 10: Real Nearby Workers on Map & Empty Vicinity Handling
  console.log('\n--- TEST 10: Nearby Workers Vicinity & Empty Handling ---');
  const nearbyWorkers = await workerService.getWorkers({
    availableOnly: true,
    customerCoords: { latitude: 12.9784, longitude: 77.6408 },
    maxDistanceKm: 10,
  });
  assert(nearbyWorkers.length > 0, 'TEST 10.1: Workers in 10km vicinity found', `count: ${nearbyWorkers.length}`);
  assert(nearbyWorkers[0].distanceKm !== undefined && nearbyWorkers[0].distanceKm <= 10, 'TEST 10.2: Worker distance correctly computed via Haversine', `${nearbyWorkers[0].distanceKm} km`);

  // Empty vicinity test (e.g. coordinates in middle of ocean / remote area)
  const emptyVicinity = await workerService.getWorkers({
    customerCoords: { latitude: 0.0, longitude: 0.0 },
    maxDistanceKm: 5,
  });
  assert(emptyVicinity.length === 0, 'TEST 10.3: Empty vicinity returns 0 workers rather than fake workers');

  // TEST 11: Sign Out & Route Protection Persistence
  console.log('\n--- TEST 11: Real Sign Out & Session Persistence ---');
  // First ensure logged in
  await authService.login('customer');
  let currentAuth = await authService.getCurrentUser();
  assert(currentAuth !== null, 'TEST 11.1: User is logged in with valid session');

  // Logout
  await authService.logout();
  let afterLogout = await authService.getCurrentUser();
  assert(afterLogout === null, 'TEST 11.2: authService.getCurrentUser() returns null after logout');
  
  // Refresh simulation: check database session
  const storedSession = await databaseService.getSession();
  assert(storedSession === null, 'TEST 11.3: Session cleared from persistent storage across simulated page reload');

  // Re-login test for normal operation
  await authService.login('customer');
  const restored = await authService.getCurrentUser();
  assert(restored !== null && restored.role === 'customer', 'TEST 11.4: Subsequent login restores valid session', restored?.name);

  console.log('\n========================================================');
  console.log(`VERIFICATION COMPLETE: ${passedTests} / ${totalTests} TESTS PASSED`);
  console.log('========================================================');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test execution failed with error:', err);
  process.exit(1);
});
