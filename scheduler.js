const WeeklyScheduler = require('./TestData/weekly_scheduler');

// Create and start the weekly scheduler
const scheduler = new WeeklyScheduler();

console.log('🚀 Starting 24/7 Skylink Sensor Scheduler...');
console.log('📅 Automatically loads today\'s schedule and switches daily');
console.log('⏰ Tests run every 5 minutes based on client routine');
console.log('🔄 Continuous operation - runs 24/7 without stopping');
console.log('📊 Status updates every minute\n');

// Start the scheduler
scheduler.start();

// Auto-restart mechanism in case of any errors
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error.message);
  console.log('🔄 Restarting scheduler in 10 seconds...');
  setTimeout(() => {
    scheduler.stop();
    scheduler.start();
    console.log('✅ Scheduler restarted successfully');
  }, 10000);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  console.log('🔄 Continuing scheduler operation...');
});

// Print status every minute
setInterval(() => {
  const status = scheduler.getStatus();
  console.log('\n📊 Weekly Scheduler Status:');
  console.log(`   Running: ${status.isRunning}`);
  console.log(`   Current Day: ${status.currentDay}`);
  console.log(`   Current Time: ${status.currentTime}`);
  console.log(`   Current Slot: ${status.currentSlot ? 
    `${status.currentSlot.device} (${status.currentSlot.startTime} - ${status.currentSlot.endTime})` : 
    'No active slot'}`);
  console.log(`   Next Check: ${status.nextCheck}`);
  console.log(`   Schedule Entries: ${status.scheduleEntries}`);
}, 60000);

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n⏹️ Shutting down weekly scheduler...');
  scheduler.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n⏹️ Shutting down weekly scheduler...');
  scheduler.stop();
  process.exit(0);
});
