// Lightweight LLM controller with safe defaults
// - Returns null if LLM is disabled or misconfigured
// - Uses OpenAI via REST if OPENAI_API_KEY is present
// - Enforces timeout and strict JSON parsing

const DEFAULT_TIMEOUT_MS = parseInt(process.env.LLM_TIMEOUT_MS || '8000', 10);
const MIN_CONFIDENCE = Math.max(0, Math.min(1, parseFloat(process.env.LLM_CONFIDENCE_MIN || '0.7')));

async function ensureFetch() {
  if (typeof fetch === 'function') return fetch;
  const mod = await import('node-fetch');
  return mod.default;
}

function withTimeout(promise, ms) {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), ms);
  return {
    signal: controller.signal,
    done: promise.finally(() => clearTimeout(t))
  };
}

function isEnabled() {
  return process.env.ENABLE_LLM === 'true';
}

function buildPrompt(context) {
  const {
    dayName,
    time,
    schedule = [],
    currentSlot,
    isWeekend,
    isAway,
    history = [], // array of { time, location, device }
    dwellMinutesSoFar = 0,
    minDwellMinutes = 10,
    transitionAdjacency = {}, // e.g., { Kitchen: ["Livingroom", "Bathroom"], ...}
    cooldownMinutes = 5,
    mealWindows = { breakfast: '07:00-09:30', lunch: '12:00-14:00', dinner: '18:00-20:00' }
  } = context || {};

  const scheduleStr = schedule.map(s => `${s.startTime}-${s.endTime}: ${s.location} (${s.device})`).join('\n');
  const currentStr = currentSlot ? `${currentSlot.startTime}-${currentSlot.endTime} @ ${currentSlot.location} (${currentSlot.device})` : 'none';
  const historyStr = history.map(h => `${h.time}: ${h.location} (${h.device})`).join('\n') || 'none';
  const adjacencyStr = Object.entries(transitionAdjacency).map(([k,v]) => `${k} -> ${v.join(', ')}`).join('\n') || 'default';

  return `You are simulating the daily routine of client BOB.
The schedule is a guideline; be realistic and consistent.
Return ONLY JSON and nothing else.

Context:
- Day: ${dayName}  (weekend=${!!isWeekend})
- Time: ${time}
- Current scheduled slot: ${currentStr}
- Full schedule (today):\n${scheduleStr}
- Away flag: ${!!isAway}
- Recent history (most recent last):\n${historyStr}
- Dwell so far in current location: ${dwellMinutesSoFar} minutes (minDwell=${minDwellMinutes})
- Transition adjacency allowed (low confidence):\n${adjacencyStr}
- Cooldown on repeats: ${cooldownMinutes} minutes
- Meal windows: breakfast ${mealWindows.breakfast}, lunch ${mealWindows.lunch}, dinner ${mealWindows.dinner}

Rules (important):
1) Prefer the CURRENT SCHEDULED SLOT by default. Only suggest a change if there is a strong, concrete rationale AND confidence is high.
2) Respect minimum dwell time — do NOT move before minDwell is reached unless confidence is VERY high and rationale is explicit.
3) Low-confidence moves must follow adjacency; non-adjacent moves require VERY high confidence (>= 0.9) and justification.
4) Early morning bias: between 12:00 AM and 06:00 AM, strongly prefer Bedroom. Avoid suggesting Bathroom unless it is IMMEDIATELY after waking and you are VERY confident (>= 0.9) with a short hygiene rationale.
5) Avoid repeating the same location too frequently (cooldown) unless rationale justifies.
6) If 'away' is true, bias against indoor PIR; prefer DOOR off/idle states.
7) Use meal/biological priors (Kitchen around meals, Bathroom after wake-up, etc.).
8) Weekend routine can differ from weekdays (more Livingroom, less Office). State rationale.
9) Be concise; output only the JSON object as specified.

Valid locations: Bedroom, Washroom, Bathroom, Kitchen, Livingroom, Office, Dinning room
Valid deviceType: PIR or DOOR

Decide if Bob would stay with the scheduled slot or move logically to another location now.
Respond with strict JSON in this schema:
{
  "location": "Livingroom",
  "deviceType": "PIR",
  "override": false,
  "confidence": 0.85,
  "rationale": "Short reason here"
}`;
}

function validateDecision(obj) {
  const locations = new Set(['Bedroom', 'Washroom', 'Bathroom', 'Kitchen', 'Livingroom', 'Office', 'Dinning room']);
  const devices = new Set(['PIR', 'DOOR']);
  if (!obj || typeof obj !== 'object') return 'Not an object';
  if (!locations.has(obj.location)) return `Invalid location: ${obj.location}`;
  if (!devices.has(obj.deviceType)) return `Invalid deviceType: ${obj.deviceType}`;
  if (typeof obj.override !== 'boolean') return 'override must be boolean';
  const c = Number(obj.confidence);
  if (Number.isNaN(c) || c < 0 || c > 1) return 'confidence must be 0..1';
  if (typeof obj.rationale !== 'string') return 'rationale must be string';
  return null;
}

async function callOpenAI(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY not set');
  const _fetch = await ensureFetch();
  const body = {
    model: process.env.LLM_MODEL || 'gpt-4o-mini',
    messages: [
      { role: 'system', content: 'You are a concise decision engine. Output JSON only.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    max_tokens: 200
  };
  // Create AbortController BEFORE invoking fetch so the signal exists
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);
  const res = await _fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(body),
    signal: controller.signal
  }).finally(() => clearTimeout(timer));
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`OpenAI error ${res.status}: ${text}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content?.trim();
  if (!content) throw new Error('Empty OpenAI response');
  // Attempt to extract JSON safely
  const jsonMatch = content.match(/\{[\s\S]*\}$/);
  const jsonStr = jsonMatch ? jsonMatch[0] : content;
  let parsed;
  try { parsed = JSON.parse(jsonStr); } catch (e) {
    throw new Error('Failed to parse JSON from model');
  }
  return parsed;
}

async function decideAction(context) {
  if (!isEnabled()) return null;
  try {
    const prompt = buildPrompt(context);
    const provider = (process.env.LLM_PROVIDER || 'openai').toLowerCase();

    let decision = null;
    if (provider === 'openai') {
      decision = await callOpenAI(prompt);
    } else {
      throw new Error(`Unsupported LLM_PROVIDER: ${provider}`);
    }

    const err = validateDecision(decision);
    if (err) throw new Error(`Invalid LLM decision: ${err}`);

    // Enforce minimum confidence gating info (caller may choose to just log)
    decision._meetsThreshold = Number(decision.confidence) >= MIN_CONFIDENCE;
    return decision;
  } catch (e) {
    // Swallow errors to avoid breaking main loop
    return { error: e.message };
  }
}

module.exports = { decideAction };
