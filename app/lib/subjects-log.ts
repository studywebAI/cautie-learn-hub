type LogData = Record<string, unknown> | unknown[] | string | number | boolean | null | undefined;

function stamp() {
  return new Date().toISOString();
}

export function makeRequestId(prefix = 'subj') {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function subjectsLog(scope: string, requestId: string, event: string, data?: LogData) {
  if (data === undefined) {
    console.log(`[${stamp()}][SUBJECTS][${scope}][${requestId}] ${event}`);
    return;
  }
  console.log(`[${stamp()}][SUBJECTS][${scope}][${requestId}] ${event}`, data);
}

export function subjectsWarn(scope: string, requestId: string, event: string, data?: LogData) {
  if (data === undefined) {
    console.warn(`[${stamp()}][SUBJECTS][${scope}][${requestId}] ${event}`);
    return;
  }
  console.warn(`[${stamp()}][SUBJECTS][${scope}][${requestId}] ${event}`, data);
}

export function subjectsError(scope: string, requestId: string, event: string, data?: LogData) {
  if (data === undefined) {
    console.error(`[${stamp()}][SUBJECTS][${scope}][${requestId}] ${event}`);
    return;
  }
  console.error(`[${stamp()}][SUBJECTS][${scope}][${requestId}] ${event}`, data);
}
