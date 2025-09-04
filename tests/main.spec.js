require('dotenv').config();
const { test } = require('@playwright/test');
const BobBedroomPir = require('../Fixtures/BobBedroomPir');
const BobKitchenPir = require('../Fixtures/BobKitchenPir');
const BobLivingroomPir = require('../Fixtures/BobLivingroomPir');
const BobOfficePir = require('../Fixtures/BobOfficePir');
const BobBathroomPir = require('../Fixtures/BobBathroomPir');
const BobDinningroomPir = require('../Fixtures/BobDinningroomPir');
const BobWashroomPir = require('../Fixtures/BobWashroomPir');
const ScheduleReader = require('../TestData/schedule_reader');
const EmailReporter = require('../TestData/email_reporter');

// Resolve TIME_ZONE from environment. Supports IANA (e.g., America/Toronto) or numeric offsets (e.g., "-4").
function resolveTimeZone(tzEnv) {
  if (!tzEnv) return null; // null => system local timezone
  const tz = tzEnv.trim();
  const m = tz.match(/^UTC?\s*([+-]\d{1,2})$/i) || tz.match(/^([+-]\d{1,2})$/);
  if (m) {
    const offset = parseInt(m[1], 10);
    const sign = offset >= 0 ? '-' : '+'; // Etc/GMT has inverted sign
    const abs = Math.abs(offset);
    return `Etc/GMT${sign}${abs}`;
  }
  return tz; // assume IANA
}

const RESOLVED_TZ = resolveTimeZone(process.env.TIME_ZONE);
// Allow skipping email functionality via env var
const SKIP_EMAIL = process.env.SKIP_EMAIL === 'true';

function timeStringInTZ(date = new Date()) {
  // 12-hour display with AM/PM for logging
  const options = { hour: '2-digit', minute: '2-digit', hour12: true };
  const fmt = new Intl.DateTimeFormat('en-CA', RESOLVED_TZ ? { ...options, timeZone: RESOLVED_TZ } : options);
  const parts = fmt.formatToParts(date);
  const hh = parts.find(p => p.type === 'hour')?.value || '12';
  const mm = parts.find(p => p.type === 'minute')?.value || '00';
  const ampm = parts.find(p => p.type === 'dayPeriod')?.value?.toUpperCase() || 'AM';
  return `${hh}:${mm} ${ampm}`;
}

function dateTimeStringInTZ(date = new Date()) {
  const options = { dateStyle: 'medium', timeStyle: 'medium' };
  const fmt = new Intl.DateTimeFormat('en-CA', RESOLVED_TZ ? { ...options, timeZone: RESOLVED_TZ } : options);
  return fmt.format(date);
}

function dayNameInTZ(date = new Date()) {
  const options = { weekday: 'long' };
  const fmt = new Intl.DateTimeFormat('en-CA', RESOLVED_TZ ? { ...options, timeZone: RESOLVED_TZ } : options);
  return fmt.format(date); // e.g., "Saturday"
}

// 24/7 Continuous Skylink Sensor Testing
test('24/7 Skylink Sensor Testing - Continuous Operation', async ({ page }) => {
  // Set test timeout to 0 (infinite - no timeout)
  test.setTimeout(0);
  console.log('🚀 Starting 24/7 Skylink Sensor Testing.....');
  console.log('⏰ Tests will run every 5 minutes based on client schedule');
  console.log('📧 Hourly email reports will be sent automatically');
  console.log('🛑 Press Ctrl+C to stop\n');

  // Initialize email reporter (optional)
  let emailReporter = null;
  let emailValid = false;
  if (SKIP_EMAIL) {
    console.log('📧 Email reporting is skipped (SKIP_EMAIL=true)');
  } else {
    try {
      emailReporter = new EmailReporter();
      emailValid = await emailReporter.testEmailConnection();
      if (emailValid) {
        console.log('✅ Email reporting system initialized');
        emailReporter.startHourlyReporting();
      } else {
        console.log('⚠️ Email reporting disabled - continuing without emails');
      }
    } catch (error) {
      console.log('⚠️ Email system error - continuing without emails:', error.message);
      emailReporter = null;
      emailValid = false;
    }
  }

  let testCount = 0;
  
  // Continuous loop - runs until manually stopped
  while (true) {
    try {
      testCount++;
      console.log(`\n🔄 Test Cycle #${testCount} - ${dateTimeStringInTZ(new Date())}`);
      
      await runCurrentScheduleTest(page, testCount, emailReporter, emailValid);
      
      // Wait 5 minutes before next test
      console.log('⏳ Waiting 5 minutes until next test...\n');
      await new Promise(resolve => setTimeout(resolve, 5 * 60 * 1000));
      
    } catch (error) {
      console.error('❌ Error in test cycle:', error.message);
      console.log('🔄 Continuing in 30 seconds...');
      
      // Log error to email reporter (only if email is working)
      if (emailReporter && emailValid) {
        try {
          const dayName = dayNameInTZ(new Date());
          
          emailReporter.logTestResult({
            testCycle: testCount,
            dayName: dayName,
            currentTime: timeStringInTZ(new Date()),
            location: 'Unknown',
            device: 'Unknown',
            timeSlot: 'Error occurred',
            status: 'error',
            responseStatus: 'N/A',
            error: error.message
          });
        } catch (emailError) {
          // Silently ignore email logging errors
        }
      }
      
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }
});

// Function to run the current schedule test
async function runCurrentScheduleTest(page, testCount, emailReporter, emailValid) {
  // Get current day and load schedule
  const dayName = dayNameInTZ(new Date());
  const csvFileName = `${dayName}.csv`;
  
  console.log(`📅 Testing for: ${dayName}`);
  
  // Load today's schedule and determine the current slot
  const schedule = ScheduleReader.readDailySchedule(csvFileName);
  const currentSlot = ScheduleReader.getCurrentTimeSlot(schedule);
  
  if (!currentSlot) {
    console.log('🏠 BOB is away from home - No active time slot found');
    console.log('📊 Test Status: RUNNING (monitoring continues)');
    console.log(`📈 Test Cycle #${testCount} completed - System operational`);
    console.log('🔄 Tests will continue running every 5 minutes');
    console.log('📧 Away status logged for reporting');
    
    // Log "away from home" status to email reporter (only if email is working)
    if (emailReporter && emailValid) {
      try {
        emailReporter.logTestResult({
          testCycle: testCount,
          dayName: dayName,
          currentTime: timeStringInTZ(new Date()),
          location: 'Away from Home',
          device: 'N/A - Monitoring Only',
          timeSlot: 'No active schedule',
          status: 'away',
          responseStatus: 'Monitoring Active',
          error: null
        });
      } catch (emailError) {
        // Silently ignore email logging errors
      }
    }
    return;
  }
  
  const now = new Date();
  const timeStr = timeStringInTZ(now);
  const isWeekend = ['Saturday', 'Sunday'].includes(dayName);

  // Execute the scheduled slot (no AI override)
  let effectiveSlot = currentSlot;
  
  console.log(`🕐 Current Time: ${timeStr}`);
  console.log(`📍 Client Location: ${effectiveSlot.location}`);
  console.log(`🔍 Testing Skylink Sensor: ${effectiveSlot.device}`);
  console.log(`⏰ Time Slot: ${effectiveSlot.startTime} - ${effectiveSlot.endTime}`);
  
  // Call appropriate fixture based on current location
  let response;
  let testStatus = 'success';
  let responseStatus = 'N/A';
  
  try {
    switch (effectiveSlot.location) {
      case 'Bedroom':
        const bobBedroomPir = new BobBedroomPir(page);
        response = await bobBedroomPir.sendSensorData();
        responseStatus = response.status();
        console.log('✅ Bedroom PIR Sensor Test - Response Status:', responseStatus);
        break;
      
      case 'Washroom':
        const bobWashroomPir = new BobWashroomPir(page);
        response = await bobWashroomPir.sendSensorData();
        responseStatus = response.status();
        console.log('✅ Washroom PIR Sensor Test - Response Status:', responseStatus);
        break;
        
      case 'Bathroom':
        const bobBathroomPir = new BobBathroomPir(page);
        response = await bobBathroomPir.sendSensorData();
        responseStatus = response.status();
        console.log('✅ Bathroom PIR Sensor Test - Response Status:', responseStatus);
        break;
        
      case 'Kitchen':
        const bobKitchenPir = new BobKitchenPir(page);
        response = await bobKitchenPir.sendSensorData();
        responseStatus = response.status();
        console.log('✅ Kitchen PIR Sensor Test - Response Status:', responseStatus);
        break;
        
      case 'Livingroom':
        const bobLivingroomPir = new BobLivingroomPir(page);
        response = await bobLivingroomPir.sendSensorData();
        responseStatus = response.status();
        console.log('✅ Livingroom PIR Sensor Test - Response Status:', responseStatus);
        break;
        
      case 'Office':
        const bobOfficePir = new BobOfficePir(page);
        response = await bobOfficePir.sendSensorData();
        responseStatus = response.status();
        console.log('✅ Office PIR Sensor Test - Response Status:', responseStatus);
        break;
        
      case 'Dinning room':
        const bobDinningroomPir = new BobDinningroomPir(page);
        response = await bobDinningroomPir.sendSensorData();
        responseStatus = response.status();
        console.log('✅ Dinning room PIR Sensor Test - Response Status:', responseStatus);
        break;
      
      default:
        console.log(`❌ Unknown location: ${effectiveSlot.location}`);
        testStatus = 'error';
        responseStatus = 'Unknown Location';
        
        // Log unknown location error (only if email is working)
        if (emailReporter && emailValid) {
          try {
            emailReporter.logTestResult({
              testCycle: testCount,
              dayName: dayName,
              currentTime: timeStr,
              location: effectiveSlot.location,
              device: effectiveSlot.device,
              timeSlot: `${effectiveSlot.startTime} - ${effectiveSlot.endTime}`,
              status: 'error',
              responseStatus: 'Unknown Location',
              error: `Unknown location: ${effectiveSlot.location}`
            });
          } catch (emailError) {
            // Silently ignore email logging errors
          }
        }
        return;
    }
    
    console.log(`🎯 Skylink ${effectiveSlot.location} sensor test completed successfully`);
    
  } catch (error) {
    console.error(`❌ Error testing ${effectiveSlot.location} Skylink sensor:`, error.message);
    testStatus = 'error';
    responseStatus = 'Error';
  }
  
  // Log test result to email reporter (only if email is working)
  if (emailReporter && emailValid) {
    try {
      emailReporter.logTestResult({
        testCycle: testCount,
        dayName: dayName,
        currentTime: timeStr,
        location: effectiveSlot.location,
        device: effectiveSlot.device,
        timeSlot: `${effectiveSlot.startTime} - ${effectiveSlot.endTime}`,
        status: testStatus,
        responseStatus: responseStatus,
        error: testStatus === 'error' ? 'API call failed' : null
      });
    } catch (emailError) {
      // Silently ignore email logging errors
    }
  }

  // No state tracking required
}
