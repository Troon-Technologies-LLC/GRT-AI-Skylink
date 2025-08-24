@echo off
echo 🚀 Starting 24/7 Skylink Sensor Scheduler...
echo ⏰ This will run continuously until manually stopped
echo 🛑 Press Ctrl+C to stop the scheduler
echo.

REM Start the scheduler in background
start "Skylink Scheduler" /min cmd /c "node scheduler.js"

echo ✅ Skylink Scheduler started in background
echo 📊 Check the minimized window for live status updates
echo 🔄 The scheduler will run every 5 minutes automatically
pause
