'use client';

import { useCallback, useEffect, useState } from 'react';
import type { AdvancedToolSettings } from '@/lib/tools/advanced-settings-schema';

type Conflict = {
  key: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
};

export function useAdvancedToolSettings() {
  const [settings, setSettings] = useState<AdvancedToolSettings | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/user/tool-settings', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Failed to load tool settings');
      setSettings(data?.settings || null);
      setConflicts(Array.isArray(data?.conflicts) ? data.conflicts : []);
    } catch (err: any) {
      setError(err?.message || 'Failed to load tool settings');
    } finally {
      setLoading(false);
    }
  }, []);

  const savePatch = useCallback(
    async (patch: Partial<AdvancedToolSettings>, context?: { tool?: string; isLiveGeneratedQuiz?: boolean }) => {
      setSaving(true);
      setError(null);
      try {
        const response = await fetch('/api/user/tool-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ patch, context }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Failed to save tool settings');
        setSettings(data?.settings || null);
        setConflicts(Array.isArray(data?.conflicts) ? data.conflicts : []);
        return { ok: true as const, conflicts: data?.conflicts || [] };
      } catch (err: any) {
        setError(err?.message || 'Failed to save tool settings');
        return { ok: false as const, error: err?.message || 'Failed to save tool settings' };
      } finally {
        setSaving(false);
      }
    },
    []
  );

  useEffect(() => {
    void load();
  }, [load]);

  return {
    settings,
    conflicts,
    loading,
    saving,
    error,
    reload: load,
    savePatch,
  };
}
