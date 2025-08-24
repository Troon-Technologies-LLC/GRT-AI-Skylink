# Skylink PIR & DOOR Sensor Scheduler - 24/7 Automation

npx playwright test tests/main.spec.js --project=chromium

Automated Skylink PIR and DOOR sensor testing system that runs 24/7 based on client's weekly routine schedule.

## 🚀 Quick Start

### Local Development
```bash
# Install dependencies
npm install
npx playwright install chromium

# Start 24/7 scheduler
node scheduler.js
```

### GitHub Deployment (24/7 Cloud)
1. Push code to GitHub repository
2. Go to **Actions** tab
3. Run **"Skylink Sensor Scheduler 24/7"** workflow
4. Choose action: `start`, `stop`, or `status`

## 📅 Schedule Files

Weekly CSV schedules in `TestData/` folder:
- `Monday.csv` through `Sunday.csv`
- 12-hour format with AM/PM
- Auto-switches at midnight

## 🔧 Manual Control

### Start Scheduler
```bash
# Method 1: Direct
node scheduler.js

# Method 2: Background (Windows)
start_24_7_scheduler.bat

# Method 3: GitHub Actions
# Go to Actions → Run workflow → Select "start"
```

### Stop Scheduler
```bash
# Method 1: Ctrl+C (if running in terminal)

# Method 2: Kill process (Windows)
stop_scheduler.bat

# Method 3: GitHub Actions
# Go to Actions → Run workflow → Select "stop"
```

### Check Status
```bash
# GitHub Actions
# Go to Actions → Run workflow → Select "status"
```

## 🌐 Cloud Deployment Options

### Option 1: GitHub Actions (Free)
- Uses GitHub's free runner minutes
- Limited to 6 hours per job
- Auto-restarts on failure

### Option 2: VPS/Cloud Server
```bash
# Deploy to any Linux server
git clone <your-repo>
cd Skylink-PIR
npm install
npx playwright install chromium
nohup node scheduler.js &
```

### Option 3: Railway/Heroku
- Deploy directly from GitHub
- 24/7 operation with paid plans
- Auto-scaling and monitoring

## 📊 Features

- ✅ **24/7 Operation**: Runs continuously until manually stopped
- ✅ **Auto Day Switching**: Loads new schedule at midnight
- ✅ **Error Recovery**: Auto-restarts on crashes
- ✅ **Remote Control**: Start/stop via GitHub Actions
- ✅ **Weekly Schedules**: Supports different routines per day
- ✅ **Skylink Sensor Testing**: Tests PIR and DOOR sensors based on time/location
- ✅ **Timezone Support**: Configurable timezone for accurate scheduling

## 🔄 How It Works

1. **Schedule Detection**: Automatically detects current day and time
2. **Location Mapping**: Determines client location from CSV schedule
3. **Sensor Testing**: Triggers appropriate Skylink sensor test every 5 minutes
4. **Day Transitions**: Switches schedules at midnight
5. **Continuous Operation**: Runs 24/7 until manually stopped

## 🏠 Supported Devices

- **Skylink PIR Sensors**: Motion detection sensors
- **Skylink DOOR Sensors**: Door/window open/close sensors

## 📝 Logs

- **Local**: Check terminal output or `scheduler.log`
- **GitHub**: View in Actions workflow logs
- **Server**: `tail -f scheduler.log`

## 🛑 Emergency Stop

If scheduler becomes unresponsive:
```bash
# Kill all Node.js processes
pkill -f node
# or on Windows
taskkill /f /im node.exe
```

## 🔧 Configuration

Create a `.env` file with:
```env
EMAIL_USER=your-email@domain.com
EMAIL_PASS=your-app-password
REPORT_EMAIL=recipient@domain.com
TIME_ZONE=-4
```

## 📡 API Endpoint

- **URL**: https://dev-functions.grtinsight.com/api/Skylink
- **Method**: POST
- **Content-Type**: application/json
- **Payload**: Raw JSON with sensor data
