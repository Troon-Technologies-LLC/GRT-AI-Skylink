@echo off
echo 🚀 Starting 24/7 Skylink Sensor Scheduler...
echo ⏰ This will run continuously until manually stopped
echo 🛑 Press Ctrl+C to stop the scheduler
echo.

REM Ensure logs directory exists
if not exist logs mkdir logs

REM Start the scheduler in background and write output to logs/scheduler.log
start "Skylink Scheduler" /min cmd /c "node scheduler.js >> logs\scheduler.log 2>&1"

echo ✅ Skylink Scheduler started in background
echo 📊 Logs are being written to logs\scheduler.log
echo 🔄 The scheduler will run every 5 minutes automatically
pause
