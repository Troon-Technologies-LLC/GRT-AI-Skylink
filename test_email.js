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
    location: 'Basement',
    device: 'BOB Basement DOOR',
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
  
  // Test 3: Send test email report
  console.log('📨 Sending test email report...');
  
  try {
    await emailReporter.sendHourlyReport();
    console.log('✅ Test email sent successfully!');
    console.log('📬 Check your configured email address');
    
  } catch (error) {
    console.error('❌ Failed to send test email:', error.message);
  }
  
  console.log('\n🎯 Skylink Email Reporter Test Complete!');
}

// Run the test
testEmailReporter().catch(console.error);
