const fs = require('fs');
const path = require('path');

// Resolve TIME_ZONE from environment. If not set, use system local time.
function resolveTimeZone(tzEnv) {
  if (!tzEnv) return null; // null => system local timezone

  const tz = tzEnv.trim();

  // Support numeric offsets like "-4", "+3", "UTC-4", "UTC+5"
  const m = tz.match(/^UTC?\s*([+-]\d{1,2})$/i) || tz.match(/^([+-]\d{1,2})$/);
  if (m) {
    const offset = parseInt(m[1], 10);
    // Map to IANA fixed-offset zones (note the inverted sign semantics)
    // UTC-4 (Toronto summer) => Etc/GMT+4
    // UTC+3 => Etc/GMT-3
    const sign = offset >= 0 ? '-' : '+';
    const abs = Math.abs(offset);
    return `Etc/GMT${sign}${abs}`;
  }

  // Otherwise assume it's a valid IANA timezone like 'America/Toronto'
  return tz;
}

const RESOLVED_TZ = resolveTimeZone(process.env.TIME_ZONE);

class ScheduleReader {
  // Return current time in configured timezone (or system local) as HH:MM (24h)
  static currentTimeInTZ() {
    const options = { hour: '2-digit', minute: '2-digit', hour12: false };
    const fmt = new Intl.DateTimeFormat('en-CA', RESOLVED_TZ ? { ...options, timeZone: RESOLVED_TZ } : options);
    const parts = fmt.formatToParts(new Date());
    let hh = parts.find(p => p.type === 'hour')?.value || '00';
    const mm = parts.find(p => p.type === 'minute')?.value || '00';
    
    // Fix 24:XX format to 00:XX for midnight hours
    if (hh === '24') {
      hh = '00';
    }
    
    return `${hh}:${mm}`;
  }
  static readDailySchedule(csvFileName) {
    try {
      const csvPath = path.join(__dirname, csvFileName);
      const csvContent = fs.readFileSync(csvPath, 'utf-8');
      const lines = csvContent.trim().split('\n');
      
      const schedule = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line && line !== '.') {
          const [device, timeRange] = line.split(',');
          if (device && timeRange) {
            const [startTime, endTime] = timeRange.trim().split(' - ');
            schedule.push({
              device: device.trim(),
              startTime: startTime.trim(),
              endTime: endTime.trim(),
              location: this.extractLocation(device.trim())
            });
          }
        }
      }
      
      console.log(`⛳Successfully read ${schedule.length} schedule entries from ${csvFileName}`);
      return schedule;
      
    } catch (error) {
      console.error('Error reading schedule:', error.message);
      throw error;
    }
  }

  static extractLocation(deviceName) {
    // Extract location from device name preserving multi-word locations
    // Examples:
    //  - "BOB Dining room PIR" => "Dining room"
    //  - "BOB Livingroom PIR"   => "Livingroom"
    //  - "BOB Kitchen DOOR"     => "Kitchen"
    if (!deviceName || typeof deviceName !== 'string') return '';
    // Remove leading owner prefix (e.g., "BOB ")
    let name = deviceName.replace(/^\s*BOB\s+/i, '');
    // Remove trailing sensor type suffix (e.g., " PIR" or " DOOR")
    name = name.replace(/\s+(PIR|DOOR)\s*$/i, '');
    return name.trim();
  }

  static getCurrentTimeSlot(schedule) {
    const currentTime = this.currentTimeInTZ();
    
    for (const slot of schedule) {
      if (this.isTimeInRange(currentTime, slot.startTime, slot.endTime)) {
        return slot;
      }
    }
    
    return null;
  }

  static isTimeInRange(currentTime, startTime, endTime) {
    const current = this.timeToMinutes(currentTime);
    const start = this.timeToMinutes(startTime);
    let end = this.timeToMinutes(endTime);
    const endInclusive = /11:59\s*PM/i.test(endTime);
    
    // Handle overnight time ranges (e.g., 12:00 AM - 8:00 AM or 8:00 PM - 11:59 PM)
    if (end <= start) {
      // This is an overnight range like 12:00 AM - 8:00 AM
      // Current time should be either:
      // 1. From start time to end of day (start <= current < 1440)
      // 2. From start of day to end time (0 <= current < end)
      if (start === 0) {
        // Special case: 12:00 AM - 8:00 AM
        return current >= start && (endInclusive ? current <= end : current < end);
      } else {
        // Regular overnight range like 8:00 PM - 6:00 AM
        return current >= start || current < end;
      }
    }
    
    // Regular same-day range
    return current >= start && (endInclusive ? current <= end : current < end);
  }

  static timeToMinutes(timeStr) {
    // Handle both 12-hour format (with AM/PM) and 24-hour format
    const timeString = timeStr.trim();
    
    if (timeString.includes('AM') || timeString.includes('PM')) {
      // 12-hour format parsing
      const isPM = timeString.includes('PM');
      const cleanTime = timeString.replace(/\s*(AM|PM)\s*/, '');
      const [hours, minutes] = cleanTime.split(':').map(Number);
      
      let hour24 = hours;
      if (isPM && hours !== 12) {
        hour24 = hours + 12;
      } else if (!isPM && hours === 12) {
        hour24 = 0; // 12:00 AM is 00:00 in 24-hour format
      }
      
      return hour24 * 60 + minutes;
    } else {
      // 24-hour format parsing (fallback)
      const [hours, minutes] = timeString.split(':').map(Number);
      
      // Fix 24:XX format to 00:XX for midnight hours
      let fixedHours = hours;
      if (hours === 24) {
        fixedHours = 0;
      }
      
      return fixedHours * 60 + minutes;
    }
  }

  static getNextScheduleChange(schedule) {
    const currentTime = this.currentTimeInTZ();
    
    // Find the next time slot change
    for (const slot of schedule) {
      const startMinutes = this.timeToMinutes(slot.startTime);
      const currentMinutes = this.timeToMinutes(currentTime);
      
      if (startMinutes > currentMinutes) {
        return slot;
      }
    }
    
    // If no slot found for today, return first slot of next day
    return schedule[0];
  }
}

module.exports = ScheduleReader;
