// Debug script to check .env file loading
require('dotenv').config();

console.log('🔍 Debugging .env file...\n');

console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✅ Set' : '❌ Not set');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✅ Set' : '❌ Not set');
console.log('REPORT_EMAIL:', process.env.REPORT_EMAIL ? '✅ Set' : '❌ Not set');
console.log('TIME_ZONE:', process.env.TIME_ZONE ? '✅ Set' : '❌ Not set');

console.log('\n📝 Password format check:');
if (process.env.EMAIL_PASS) {
  console.log('Length:', process.env.EMAIL_PASS.length);
  console.log('Contains spaces:', process.env.EMAIL_PASS.includes(' ') ? 'Yes' : 'No');
  console.log('First 4 chars:', process.env.EMAIL_PASS.substring(0, 4) + '...');
} else {
  console.log('❌ No password found');
}

console.log('\n💡 App Password should be:');
console.log('- 16 characters long');
console.log('- Generated from Google Account settings');
console.log('- May contain spaces (that\'s okay)');
console.log('- Different from your regular Gmail password');
