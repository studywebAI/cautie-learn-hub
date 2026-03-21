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

