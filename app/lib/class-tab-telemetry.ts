type LogLevel = 'debug' | 'info' | 'warn' | 'error';

type ClassTabTelemetryInput = {
  classId: string;
  tab: string;
  event: string;
  stage?: string;
  level?: LogLevel;
  message?: string;
  meta?: Record<string, any>;
};

const EVENT_DEDUPE_WINDOW_MS = 5000;
const MAX_EVENTS_PER_WINDOW = 12;
const RATE_WINDOW_MS = 10000;
const NETWORK_LEVELS = new Set<LogLevel>(['error']);

const recentEventByKey = new Map<string, number>();
const recentWindowTimestamps: number[] = [];

function buildEventKey(input: ClassTabTelemetryInput): string {
  return `${input.classId}|${input.tab}|${input.stage || 'runtime'}|${input.event}|${input.level || 'info'}`;
}

function canSendToServer(input: ClassTabTelemetryInput): boolean {
  const level = input.level || 'info';
  if (!NETWORK_LEVELS.has(level)) return false;

  const now = Date.now();
  const cutoff = now - RATE_WINDOW_MS;
  while (recentWindowTimestamps.length > 0 && recentWindowTimestamps[0] < cutoff) {
    recentWindowTimestamps.shift();
  }
  if (recentWindowTimestamps.length >= MAX_EVENTS_PER_WINDOW) {
    return false;
  }

  const eventKey = buildEventKey(input);
  const lastSentAt = recentEventByKey.get(eventKey) || 0;
  if (now - lastSentAt < EVENT_DEDUPE_WINDOW_MS) {
    return false;
  }

  recentEventByKey.set(eventKey, now);
  recentWindowTimestamps.push(now);
  return true;
}

export async function logClassTabEvent(input: ClassTabTelemetryInput): Promise<void> {
  const payload = {
    tab: input.tab,
    event: input.event,
    stage: input.stage || 'runtime',
    level: input.level || 'info',
    message: input.message || null,
    meta: input.meta || {},
    client_ts: new Date().toISOString(),
  };

  const prefix = `[CLASS_TAB][${input.classId}][${input.tab}] ${input.event}`;
  if (payload.level === 'error') {
    console.error(prefix, payload);
  } else if (payload.level === 'warn') {
    console.warn(prefix, payload);
  } else if (payload.level === 'debug') {
    console.debug(prefix, payload);
  } else {
    console.log(prefix, payload);
  }

  if (!canSendToServer(input)) {
    return;
  }

  try {
    await fetch(`/api/classes/${input.classId}/telemetry`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {
    // Non-blocking telemetry
  }
}
