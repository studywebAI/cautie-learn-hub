'use client';

import { useEffect } from 'react';

const CHECK_INTERVAL_MS = 60_000;

// Periodically asks the server whether any of the user's scheduled study
// items are due, which fires reminder notifications server-side. Mounted
// once in the main app layout so reminders surface while the app is open,
// no matter which page the user is on.
export function ScheduledReminderChecker() {
  useEffect(() => {
    const check = () => {
      void fetch('/api/scheduled-items/check').catch(() => {});
    };
    check();
    const interval = window.setInterval(check, CHECK_INTERVAL_MS);
    return () => window.clearInterval(interval);
  }, []);

  return null;
}
