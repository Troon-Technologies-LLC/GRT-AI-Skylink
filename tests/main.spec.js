require('dotenv').config();
const { test } = require('@playwright/test');
const BobBedroomPir = require('../Fixtures/BobBedroomPir');
const BobKitchenPir = require('../Fixtures/BobKitchenPir');
const BobLivingroomPir = require('../Fixtures/BobLivingroomPir');
const BobOfficePir = require('../Fixtures/BobOfficePir');
const BobBathroomPir = require('../Fixtures/BobBathroomPir');
const BobDinningroomPir = require('../Fixtures/BobDinningroomPir');
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
const LLM_FREE_RUN = process.env.LLM_FREE_RUN === 'true' || (process.env.LLM_MODE || '').toLowerCase() === 'free_run';

// --- Human-like behavior tuning ---
const HUMAN_MIN_DWELL_MIN = parseInt(process.env.MIN_DWELL_MINUTES || '10', 10); // minimum minutes to stay before moving
const HUMAN_COOLDOWN_MIN = parseInt(process.env.COOLDOWN_MINUTES || '5', 10); // avoid repeating same room too soon
const HUMAN_RANDOM_JITTER = Math.min(1, Math.max(0, parseFloat(process.env.RANDOM_JITTER || '0.1'))); // 0..1 probability to ignore a suggested move
const STRICT_MOVE_BONUS = 0.15; // extra confidence required when breaking dwell or adjacency
const NON_ADJ_MOVE_CONF = 0.9;  // hard confidence required for non-adjacent jumps

// Room adjacency for plausible transitions at low confidence
const TRANSITION_ADJACENCY = {
  Washroom: ['Bathroom', 'Bedroom', 'Livingroom'],
  Bathroom: ['Washroom', 'Bedroom', 'Livingroom'],
  Bedroom: ['Bathroom', 'Washroom', 'Office'],
  Kitchen: ['Livingroom', 'Bathroom'],
  Livingroom: ['Kitchen', 'Office', 'Washroom', 'Bathroom', 'Dinning room'],
  Office: ['Livingroom', 'Bedroom'],
  'Dinning room': ['Livingroom', 'Kitchen']
};

// Meal windows used for prompt context (LLM uses these hints)
const MEAL_WINDOWS = { breakfast: '07:00-09:30', lunch: '12:00-14:00', dinner: '18:00-20:00' };

// Recent state across cycles
let recentHistory = []; // { time, location, device }
let lastEffective = null; // { location, device }
let lastChangeAt = null; // Date of last location change

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
  
  // Load today's schedule unless AI free-run mode is active
  const schedule = LLM_FREE_RUN ? [] : ScheduleReader.readDailySchedule(csvFileName);
  const currentSlot = LLM_FREE_RUN ? null : ScheduleReader.getCurrentTimeSlot(schedule);
  
  if (!currentSlot && !LLM_FREE_RUN) {
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

  // Decide which slot to execute (schedule by default, AI may override)
  let effectiveSlot = currentSlot;
  
  // Optional: consult LLM for confirmation or suggestion
  try {
    if (process.env.ENABLE_LLM === 'true') {
      const { decideAction } = require('../ai/llm_controller');
      // Compute dwell time so far in minutes
      let dwellMinutesSoFar = 0;
      if (lastEffective && lastChangeAt) {
        const ms = now - lastChangeAt;
        dwellMinutesSoFar = Math.max(0, Math.floor(ms / 60000));
      }
      // Prepare history (keep last 6 entries)
      const history = recentHistory.slice(-6);
      const llmContext = {
        dayName,
        time: timeStr,
        schedule: LLM_FREE_RUN ? [] : (schedule?.map(s => ({ location: s.location, device: s.device, startTime: s.startTime, endTime: s.endTime })) || []),
        currentSlot: LLM_FREE_RUN ? null : currentSlot,
        isWeekend,
        isAway: LLM_FREE_RUN ? false : !currentSlot,
        history,
        dwellMinutesSoFar,
        minDwellMinutes: HUMAN_MIN_DWELL_MIN,
        transitionAdjacency: TRANSITION_ADJACENCY,
        cooldownMinutes: HUMAN_COOLDOWN_MIN,
        mealWindows: MEAL_WINDOWS
      };
      const llmDecision = await decideAction(llmContext);
      if (llmDecision) {
        const mode = (process.env.LLM_MODE || 'confirm_only').toLowerCase();
        const meets = !!llmDecision._meetsThreshold;
        const confPct = typeof llmDecision.confidence === 'number' ? Math.round(llmDecision.confidence * 100) : 'N/A';
        if (!llmDecision.error) {
          console.log('🧠 AI Decision');
          console.log(`   • Location: ${llmDecision.location}  • Device: ${llmDecision.deviceType}`);
          console.log(`   • Confidence: ${confPct}%  • Mode: ${mode}${LLM_FREE_RUN ? ' (free-run)' : ''}`);
          console.log(`   • Rationale: ${llmDecision.rationale}`);
        } else {
          console.log('🧠 AI Decision Error:', llmDecision.error);
        }
        if ((LLM_FREE_RUN || mode === 'override') && meets && !llmDecision.error) {
          // Human-like guardrails before accepting override
          const suggestedLoc = llmDecision.location;
          const suggestedDevType = llmDecision.deviceType;
          const currentLoc = currentSlot ? currentSlot.location : (lastEffective ? lastEffective.location : suggestedLoc);
          const confidence = Number(llmDecision.confidence) || 0;

          let allowMove = true;
          let reason = [];

          // Dwell enforcement
          if (lastEffective && lastEffective.location === currentLoc && HUMAN_MIN_DWELL_MIN > 0) {
            const ms = now - (lastChangeAt || now);
            const dwell = Math.max(0, Math.floor(ms / 60000));
            if (dwell < HUMAN_MIN_DWELL_MIN && suggestedLoc !== currentLoc) {
              if (confidence < Math.min(1, (parseFloat(process.env.LLM_CONFIDENCE_MIN || '0.7') + STRICT_MOVE_BONUS))) {
                allowMove = false;
                reason.push(`dwell ${dwell}m < min ${HUMAN_MIN_DWELL_MIN}m`);
              }
            }
          }

          // Transition adjacency
          const adj = TRANSITION_ADJACENCY[currentLoc] || [];
          const adjacentOK = adj.includes(suggestedLoc) || suggestedLoc === currentLoc;
          if (!adjacentOK && suggestedLoc !== currentLoc && confidence < NON_ADJ_MOVE_CONF) {
            allowMove = false;
            reason.push(`non-adjacent move requires >= ${Math.round(NON_ADJ_MOVE_CONF*100)}% confidence`);
          }

          // Cooldown on repeats (avoid spamming same location)
          if (recentHistory.length > 0) {
            const lastTime = recentHistory[recentHistory.length - 1].timeDate;
            const minutesSince = Math.max(0, Math.floor((now - lastTime) / 60000));
            if (suggestedLoc === currentLoc && minutesSince < HUMAN_COOLDOWN_MIN) {
              // If suggesting to stay, cooldown not strictly necessary; keep for symmetry
            } else {
              const recentHit = recentHistory.slice(-4).find(h => h.location === suggestedLoc);
              if (recentHit) {
                const minutesSinceHit = Math.max(0, Math.floor((now - recentHit.timeDate) / 60000));
                if (minutesSinceHit < HUMAN_COOLDOWN_MIN && confidence < 0.85) {
                  allowMove = false;
                  reason.push(`cooldown ${minutesSinceHit}m < ${HUMAN_COOLDOWN_MIN}m`);
                }
              }
            }
          }

          // Random jitter to avoid clock-like behavior
          if (Math.random() < HUMAN_RANDOM_JITTER) {
            allowMove = false;
            reason.push('random jitter');
          }

          // Build an effective slot from AI decision
          if (allowMove) {
            const device = suggestedDevType === 'DOOR' ? `BOB ${suggestedLoc} DOOR` : `BOB ${suggestedLoc} PIR`;
            effectiveSlot = {
              location: suggestedLoc,
              device,
              startTime: currentSlot ? currentSlot.startTime : 'N/A',
              endTime: currentSlot ? currentSlot.endTime : 'N/A'
            };
            console.log(`🤖 Action: Override enabled — using AI-selected slot -> ${effectiveSlot.location} (${suggestedDevType})`);
          } else {
            console.log(`🛑 Override blocked by human-like rules: ${reason.join('; ') || 'policy'}`);
            console.log('✅ Action: Keeping scheduled slot');
          }
        } else if (!llmDecision.error) {
          if (LLM_FREE_RUN) {
            // In free-run confirm-only, still act on AI but respect guardrails
            const device = llmDecision.deviceType === 'DOOR' ? `BOB ${llmDecision.location} DOOR` : `BOB ${llmDecision.location} PIR`;
            effectiveSlot = {
              location: llmDecision.location,
              device,
              startTime: 'N/A',
              endTime: 'N/A'
            };
            console.log('✅ Action: Free-run confirm — using AI-selected slot');
          } else {
            console.log('✅ Action: Confirm-only — keeping scheduled slot');
          }
        }
      }
    }
  } catch (e) {
    console.log('⚠️ LLM skipped (error or disabled):', e.message);
  }
  
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
        const bobWashroomPir = new BobBedroomPir(page);
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

  // Update human-like state trackers
  try {
    const locChanged = !lastEffective || lastEffective.location !== effectiveSlot.location;
    if (locChanged) lastChangeAt = new Date();
    lastEffective = { location: effectiveSlot.location, device: effectiveSlot.device };
    recentHistory.push({ time: timeStr, location: effectiveSlot.location, device: effectiveSlot.device, timeDate: new Date() });
    if (recentHistory.length > 12) recentHistory = recentHistory.slice(-12);
  } catch {}
}
