// Test script to verify time formatting and schedule detection fixes
const ScheduleReader = require('./TestData/schedule_reader');

console.log('🧪 Testing Time Formatting and Schedule Detection Fixes\n');

// Test 1: Time formatting with midnight hours
console.log('📅 Test 1: Time formatting with midnight hours');
const testTimes = [
  '00:23:41',  // Should stay 00:23:41
  '24:23:41',  // Should become 00:23:41
  '01:30:00',  // Should stay 01:30:00
  '12:00:00',  // Should stay 12:00:00
  '23:59:59'   // Should stay 23:59:59
];

testTimes.forEach(time => {
  const minutes = ScheduleReader.timeToMinutes(time);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const formatted = `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  console.log(`  ${time} -> ${minutes} minutes -> ${formatted}`);
});

console.log('\n📅 Test 2: Schedule detection for Thursday bedroom slot (12:00 AM - 8:00 AM)');

// Load Thursday schedule
try {
  const schedule = ScheduleReader.readDailySchedule('Thursday.csv');
  console.log('✅ Thursday schedule loaded successfully');
  
  // Test times that should be in bedroom slot
  const testTimesForBedroom = [
    '00:23',  // 12:23 AM - should be bedroom
    '00:28',  // 12:28 AM - should be bedroom  
    '01:03',  // 1:03 AM - should be bedroom
    '07:30',  // 7:30 AM - should be bedroom
    '08:30',  // 8:30 AM - should be bathroom
    '12:00'   // 12:00 PM - should be office
  ];
  
  testTimesForBedroom.forEach(testTime => {
    // Mock the currentTimeInTZ to return our test time
    const originalCurrentTime = ScheduleReader.currentTimeInTZ;
    ScheduleReader.currentTimeInTZ = () => testTime;
    
    const currentSlot = ScheduleReader.getCurrentTimeSlot(schedule);
    
    if (currentSlot) {
      console.log(`  ${testTime} -> ${currentSlot.location} (${currentSlot.device})`);
    } else {
      console.log(`  ${testTime} -> No active slot (Away from Home)`);
    }
    
    // Restore original function
    ScheduleReader.currentTimeInTZ = originalCurrentTime;
  });
  
} catch (error) {
  console.error('❌ Error loading Thursday schedule:', error.message);
}

console.log('\n📅 Test 3: Time range detection for bedroom slot');
const bedroomStart = '12:00 AM';
const bedroomEnd = '8:00 AM';

const testTimesInRange = [
  '00:00',  // 12:00 AM - should be true
  '00:23',  // 12:23 AM - should be true
  '07:59',  // 7:59 AM - should be true
  '08:00',  // 8:00 AM - should be false (end is exclusive)
  '08:01',  // 8:01 AM - should be false
  '23:59'   // 11:59 PM - should be false
];

testTimesInRange.forEach(testTime => {
  const inRange = ScheduleReader.isTimeInRange(testTime, bedroomStart, bedroomEnd);
  console.log(`  ${testTime} in range (${bedroomStart} - ${bedroomEnd}): ${inRange}`);
});

console.log('\n🎯 Time Formatting and Schedule Detection Test Complete!');
