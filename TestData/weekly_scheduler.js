const ScheduleReader = require('./schedule_reader');
const { spawn } = require('child_process');
const path = require('path');

class WeeklyScheduler {
  constructor() {
    this.currentSchedule = [];
    this.currentInterval = null;
    this.isRunning = false;
    this.currentDay = '';
  }

  getCurrentDayFile() {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const today = new Date().getDay();
    return `${days[today]}.csv`;
  }

  loadTodaysSchedule() {
    const dayFile = this.getCurrentDayFile();
    this.currentDay = dayFile.replace('.csv', '');
    
    try {
      this.currentSchedule = ScheduleReader.readDailySchedule(dayFile);
      console.log(`📅 ${this.currentDay} schedule loaded:`, this.currentSchedule);
      return true;
    } catch (error) {
      console.error(`❌ Error loading ${dayFile}:`, error.message);
      return false;
    }
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️ Weekly scheduler is already running');
      return;
    }

    if (!this.loadTodaysSchedule()) {
      console.log('❌ Failed to load today\'s schedule. Scheduler not started.');
      return;
    }

    this.isRunning = true;
    
    console.log(`🚀 Starting 24/7 Skylink sensor scheduler for ${this.currentDay}...`);
    console.log('⏰ Tests will run every 5 minutes - CONTINUOUS OPERATION');
    console.log('🔄 Auto-switches schedules at midnight');
    console.log('📡 Skylink sensors will be tested based on client routine 24/7');
    
    // Run immediately
    this.executeCurrentTest();
    
    // Set interval to run every 5 minutes (300,000 ms) - 24/7 operation
    this.currentInterval = setInterval(() => {
      try {
        // Check if day has changed and reload schedule if needed
        const newDayFile = this.getCurrentDayFile();
        if (newDayFile !== `${this.currentDay}.csv`) {
          console.log(`\n🌅 MIDNIGHT TRANSITION: Day changed to ${newDayFile.replace('.csv', '')}`);
          console.log('📅 Loading new daily schedule...');
          this.loadTodaysSchedule();
          console.log('✅ Schedule transition complete - continuing 24/7 operation\n');
        }
        
        this.executeCurrentTest();
      } catch (error) {
        console.error('❌ Error in scheduler interval:', error.message);
        console.log('🔄 Continuing operation...');
      }
    }, 5 * 60 * 1000);
    
    console.log('✅ 24/7 Scheduler is now running continuously');
  }

  stop() {
    if (this.currentInterval) {
      clearInterval(this.currentInterval);
      this.currentInterval = null;
    }
    this.isRunning = false;
    console.log('⏹️ Weekly scheduler stopped');
  }

  executeCurrentTest() {
    const currentSlot = ScheduleReader.getCurrentTimeSlot(this.currentSchedule);
    
    if (!currentSlot) {
      console.log(`⏰ No active time slot found for current time on ${this.currentDay}`);
      return;
    }

    const now = new Date();
    const timeStr = now.toLocaleTimeString();
    
    console.log(`\n🕐 ${timeStr} (${this.currentDay}) - Client should be in: ${currentSlot.location}`);
    console.log(`📍 Triggering Skylink sensor: ${currentSlot.device}`);
    
    this.runSensorTest(currentSlot.location);
  }

  runSensorTest(location) {
    const testCommand = this.getTestCommand(location);
    
    if (!testCommand) {
      console.log(`❌ No test command found for location: ${location}`);
      return;
    }

    console.log(`🧪 Running test: ${testCommand}`);
    
    // Run the Playwright test
    const child = spawn('npx', ['playwright', 'test', testCommand, '--project=chromium'], {
      cwd: path.join(__dirname, '..'),
      stdio: 'pipe'
    });

    child.stdout.on('data', (data) => {
      console.log(`📊 Test Output: ${data.toString().trim()}`);
    });

    child.stderr.on('data', (data) => {
      console.error(`❌ Test Error: ${data.toString().trim()}`);
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`✅ Skylink ${location} test completed successfully`);
      } else {
        console.log(`❌ Skylink ${location} test failed with code ${code}`);
      }
    });
  }

  getTestCommand(location) {
    const testMap = {
      'Bedroom': 'tests/individual/bedroom.spec.js',
      'Kitchen': 'tests/individual/kitchen.spec.js',
      'Livingroom': 'tests/individual/livingroom.spec.js',
      'Office': 'tests/individual/office.spec.js',
      'Bathroom': 'tests/individual/bathroom.spec.js',
      'Basement': 'tests/individual/basement.spec.js'
    };
    
    return testMap[location] || null;
  }

  getStatus() {
    const currentSlot = ScheduleReader.getCurrentTimeSlot(this.currentSchedule);
    const now = new Date();
    
    return {
      isRunning: this.isRunning,
      currentDay: this.currentDay,
      currentTime: now.toLocaleTimeString(),
      currentSlot: currentSlot,
      nextCheck: this.isRunning ? 'Every 5 minutes' : 'Not scheduled',
      scheduleEntries: this.currentSchedule.length
    };
  }

  // Method to manually load a specific day's schedule
  loadSpecificDay(dayName) {
    const dayFile = `${dayName}.csv`;
    try {
      this.currentSchedule = ScheduleReader.readDailySchedule(dayFile);
      this.currentDay = dayName;
      console.log(`📅 ${dayName} schedule loaded manually`);
      return true;
    } catch (error) {
      console.error(`❌ Error loading ${dayFile}:`, error.message);
      return false;
    }
  }
}

module.exports = WeeklyScheduler;
