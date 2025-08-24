@echo off
echo 🛑 Stopping Skylink Sensor Scheduler...
echo.

REM Kill all Node.js processes (this will stop the scheduler)
taskkill /f /im node.exe 2>nul

if %errorlevel% == 0 (
    echo ✅ Skylink Scheduler stopped successfully
) else (
    echo ⚠️ No running scheduler found or already stopped
)

echo.
echo 💡 To restart the scheduler, run: start_24_7_scheduler.bat
pause
