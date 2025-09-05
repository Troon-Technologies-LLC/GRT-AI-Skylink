# Skylink PIR & DOOR Sensor Project - Goals & Implementation


npx playwright test tests\main.spec.js --project=chromium
npx playwright test tests/main.spec.js --project=chromium
behave as a QA engineer and test the bob activity assume the xyz daty and time check the flow 
npx playwright test tests/main.spec.js --project=chromium --reporter=line --workers=1
## 🎯 Project Overview
This project creates a 24/7 automation system for testing Skylink PIR and DOOR sensors based on a client's weekly routine schedule. The system continuously monitors and tests sensors every 5 minutes, sending hourly email reports.

## 🚀 Key Features Implemented

### ✅ 24/7 Continuous Operation
- Runs indefinitely until manually stopped
- Tests execute every 5 minutes based on schedule
- Auto-restarts on errors with 10-second delay
- Survives system reboots with PM2 process manager

### ✅ Smart Scheduling System
- Weekly CSV schedules (Monday.csv through Sunday.csv)
- Automatic day switching at midnight
- Timezone-aware scheduling (supports IANA zones and UTC offsets)
- Handles "away from home" scenarios gracefully

### ✅ Skylink Device Support
- **PIR Sensors**: Motion detection for Bedroom, Kitchen, Livingroom, Office, Washroom, Dinning room
- Dynamic payload generation with realistic sensor data
- Proper API integration with https://dev-functions.grtinsight.com/api/Skylink

### ✅ Email Reporting System
- Hourly automated reports with test statistics
- Success/failure/away status tracking
- HTML formatted emails with detailed test logs
- Gmail SMTP integration with App Password support

### ✅ Error Handling & Recovery
- Graceful handling of API failures
- Continues operation when client is away
- Email system fallback (continues without emails if needed)
- Comprehensive error logging

## 📊 API Integration Details

### Endpoint
```
POST https://dev-functions.grtinsight.com/api/Skylink
Content-Type: application/json
```

### Payload Structure
```json
{
    "timestamp": 1742542779.274,
    "deviceId": "BOB Washroom",
    "client_name": "GRT Health",
    "payload_type": "PIR",
    "frame_type": "DETECTED_MOVEMENT",
    "temp": "25",
    "detection_bin_seq": "000000000000100000000000000000000000000010000000000000",
    "battery": 2.5,
    "dw_init": "closed at start",
    "dw_inter": "closed during period",
    "dw_end": "closed at end",
    "light_level": 0.0,
    "mvt_message_counter": 191,
    "block_counter": 149
}
```

## 🏠 Device Mapping
- **BOB Washroom PIR** → Washroom location (12:00 AM - 8:00 AM)
- **BOB Washroom PIR** → Washroom location (8:00 AM - 8:30 AM)
- **BOB Kitchen PIR** → Kitchen location (8:30 AM - 9:00 AM)
- **BOB Livingroom PIR** → Livingroom location (9:00 AM - 11:00 AM)
- **BOB Office PIR** → Office location (11:00 AM - 8:00 PM)
- **BOB Dinning room PIR** → Dinning room location (8:00 PM - 11:59 PM)

## 🔧 Deployment Options

### Local Development
```bash
npm install
npx playwright install chromium
node scheduler.js
```

### Windows Automation
- `start_24_7_scheduler.bat` - Start in background
- `stop_scheduler.bat` - Stop all processes

### GitHub Actions (Cloud)
- Automatic deployment on push
- Manual start/stop/status controls
- Free tier compatible (with 6-hour job limits)

### Production Server
```bash
# Install PM2 for process management
npm i -g pm2
pm2 start 'npx playwright test tests/main.spec.js --project=chromium --workers=1' --name skylink24x7
pm2 save
pm2 startup
```

## 📧 Email Configuration
Create `.env` file with:
```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-character-app-password
REPORT_EMAIL=recipient@domain.com
TIME_ZONE=-4
```

## 🎯 Success Metrics
- **Uptime**: 24/7 continuous operation
- **Test Frequency**: Every 5 minutes
- **Response Tracking**: All API calls logged with status codes
- **Email Reports**: Hourly summaries with success rates
- **Error Recovery**: Auto-restart on failures

## 🔄 Continuous Improvements
The system is designed to:
1. **Monitor continuously** - Never stops testing
2. **Adapt to schedules** - Follows client's daily routine
3. **Report accurately** - Tracks all sensor interactions
4. **Recover gracefully** - Handles errors without stopping
5. **Scale easily** - Can be deployed anywhere

## 🎉 Project Status: COMPLETE
All components implemented and ready for deployment. The system mirrors the original GRT-AI project architecture but is specifically adapted for Skylink devices and the new API endpoint.
