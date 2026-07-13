'use client';

import { useEffect } from 'react';

const CHECK_INTERVAL_MS = 60_000;

// Periodically asks the server whether any of the user's personal tasks or
// class assignments are due tomorrow or already overdue, which fires
// deadline_reminder / deadline_overdue notifications server-side, deduped
// per item. Same pattern as ScheduledReminderChecker.
export function DeadlineReminderChecker() {
  useEffect(() => {
    const check = () => {
      void fetch('/api/deadlines/check').catch(() => {});
    };
    check();
    const interval = window.setInterval(check, CHECK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, []);

  return null;
}
