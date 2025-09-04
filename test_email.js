// Test script for email reporter functionality
require('dotenv').config();
const EmailReporter = require('./TestData/email_reporter');

async function testEmailReporter() {
  console.log('🧪 Testing Skylink Email Reporter System...\n');
  
  // Create email reporter instance
  const emailReporter = new EmailReporter();
  
  // Test 1: Check email configuration
  console.log('📧 Testing email configuration...');
  const emailValid = await emailReporter.testEmailConnection();
  
  if (!emailValid) {
    console.log('❌ Email configuration failed. Check your credentials in .env file');
    return;
  }
  
  // Test 2: Add some sample test results
  console.log('📊 Adding sample test results...');
  
  // Sample successful PIR test
  emailReporter.logTestResult({
    testCycle: 1,
    dayName: 'Thursday',
    currentTime: new Date().toLocaleTimeString(),
    location: 'Kitchen',
    device: 'BOB Kitchen PIR',
    timeSlot: '2:00 PM - 3:00 PM',
    status: 'success',
    responseStatus: 200,
    error: null
  });
  
  // Sample failed test
  emailReporter.logTestResult({
    testCycle: 2,
    dayName: 'Thursday',
    currentTime: new Date().toLocaleTimeString(),
    location: 'Office',
    device: 'BOB Office PIR',
    timeSlot: '3:00 PM - 4:00 PM',
    status: 'error',
    responseStatus: 'Error',
    error: 'Network timeout'
  });
  
  // Sample DOOR sensor test
  emailReporter.logTestResult({
    testCycle: 3,
    dayName: 'Thursday',
    currentTime: new Date().toLocaleTimeString(),
    location: 'Dinning room',
    device: 'BOB Dinning room PIR',
    timeSlot: '8:00 PM - 9:00 PM',
    status: 'success',
    responseStatus: 200,
    error: null
  });
  
  // Sample away from home
  emailReporter.logTestResult({
    testCycle: 4,
    dayName: 'Thursday',
    currentTime: new Date().toLocaleTimeString(),
    location: 'Away from Home',
    device: 'N/A - Monitoring Only',
    timeSlot: 'No active time slot',
    status: 'away',
    responseStatus: 'Monitoring Active',
    error: null
  });
  
  console.log('✅ Sample test results added');
  
  // Test 3: Send FIRST report (should include the 4 entries above)
  console.log('📨 Sending FIRST test email report (should include 4 entries)...');
  try {
    await emailReporter.sendHourlyReport();
    console.log('✅ First test email sent successfully!');
  } catch (error) {
    console.error('❌ Failed to send FIRST test email:', error.message);
  }

  // Add a short delay, then add more entries and send a SECOND report
  await new Promise(r => setTimeout(r, 2000));

  console.log('\n📊 Adding additional results for SECOND report...');
  emailReporter.logTestResult({
    testCycle: 5,
    dayName: 'Thursday',
    currentTime: new Date().toLocaleTimeString(),
    location: 'Bedroom',
    device: 'BOB Bedroom PIR',
    timeSlot: '12:00 AM - 8:00 AM',
    status: 'success',
    responseStatus: 200,
    error: null
  });
  emailReporter.logTestResult({
    testCycle: 6,
    dayName: 'Thursday',
    currentTime: new Date().toLocaleTimeString(),
    location: 'Bathroom',
    device: 'BOB Bathroom PIR',
    timeSlot: '8:00 AM - 8:15 AM',
    status: 'success',
    responseStatus: 200,
    error: null
  });

  console.log('📨 Sending SECOND test email report (should include ONLY the 2 new entries)...');
  try {
    await emailReporter.sendHourlyReport();
    console.log('✅ Second test email sent successfully!');
    console.log('📬 Check your inbox: First email has 4 entries, Second has 2 entries (since last report)');
  } catch (error) {
    console.error('❌ Failed to send SECOND test email:', error.message);
  }

  console.log('\n🎯 Skylink Email Reporter Two-Phase Test Complete!');
}

// Run the test
testEmailReporter().catch(console.error);
