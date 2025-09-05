// Shared timezone and date/time utilities
// CommonJS module so it can be required from Node scripts/tests

function resolveTimeZone(tzEnv) {
  if (!tzEnv) return null; // system local timezone
  const tz = tzEnv.trim();
  const m = tz.match(/^UTC?\s*([+-]\d{1,2})$/i) || tz.match(/^([+-]\d{1,2})$/);
  if (m) {
    const offset = parseInt(m[1], 10);
    const sign = offset >= 0 ? '-' : '+'; // Etc/GMT sign inversion
    const abs = Math.abs(offset);
    return `Etc/GMT${sign}${abs}`;
  }
  return tz; // assume IANA
}

function getNumericOffsetHours(tzEnv) {
  if (!tzEnv) return null;
  const tz = tzEnv.trim();
  const m = tz.match(/^UTC?\s*([+-]\d{1,2})$/i) || tz.match(/^([+-]\d{1,2})$/);
  if (!m) return null;
  return parseInt(m[1], 10);
}

const RESOLVED_TZ = resolveTimeZone(process.env.TIME_ZONE);
const NUMERIC_OFFSET_HOURS = getNumericOffsetHours(process.env.TIME_ZONE);

function currentTimeInTZ(date = new Date()) {
  const options = { hour: '2-digit', minute: '2-digit', hour12: false };
  const fmt = new Intl.DateTimeFormat('en-CA', RESOLVED_TZ ? { ...options, timeZone: RESOLVED_TZ } : options);
  const parts = fmt.formatToParts(date);
  let hh = parts.find(p => p.type === 'hour')?.value || '00';
  const mm = parts.find(p => p.type === 'minute')?.value || '00';
  if (hh === '24') hh = '00';
  return `${hh}:${mm}`;
}

function currentDayNameInTZ(date = new Date()) {
  if (typeof NUMERIC_OFFSET_HOURS === 'number') {
    const utcMs = date.getTime() + date.getTimezoneOffset() * 60 * 1000;
    const localMs = utcMs + NUMERIC_OFFSET_HOURS * 60 * 60 * 1000;
    const d = new Date(localMs);
    const dayIndex = d.getUTCDay();
    const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return names[dayIndex];
  }
  const options = { weekday: 'long' };
  const fmt = new Intl.DateTimeFormat('en-CA', RESOLVED_TZ ? { ...options, timeZone: RESOLVED_TZ } : options);
  return fmt.format(date);
}

function fmtDate(date = new Date()) {
  const opts = { dateStyle: 'medium', timeStyle: 'medium' };
  const fmt = new Intl.DateTimeFormat('en-CA', RESOLVED_TZ ? { ...opts, timeZone: RESOLVED_TZ } : opts);
  const s = fmt.format(date);
  return s.replace(/(^|[\s,])24:(\d{2})(?::(\d{2}))?/g, (m, p1, mm, ss) => `${p1}00:${mm}${ss ? `:${ss}` : ''}`);
}

function fmtTime(date = new Date()) {
  const opts = { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false };
  const fmt = new Intl.DateTimeFormat('en-CA', RESOLVED_TZ ? { ...opts, timeZone: RESOLVED_TZ } : opts);
  const timeStr = fmt.format(date);
  return timeStr.replace(/^24:(\d{2})(?::(\d{2}))?/, (m, mm, ss) => `00:${mm}${ss ? `:${ss}` : ''}`);
}

function fmtDateOnly(date = new Date()) {
  const opts = { year: 'numeric', month: '2-digit', day: '2-digit' };
  const fmt = new Intl.DateTimeFormat('en-CA', RESOLVED_TZ ? { ...opts, timeZone: RESOLVED_TZ } : opts);
  return fmt.format(date);
}

module.exports = {
  resolveTimeZone,
  getNumericOffsetHours,
  RESOLVED_TZ,
  NUMERIC_OFFSET_HOURS,
  currentTimeInTZ,
  currentDayNameInTZ,
  fmtDate,
  fmtTime,
  fmtDateOnly,
};
