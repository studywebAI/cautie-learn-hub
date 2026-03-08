'use client';

import { useState, useEffect } from 'react';

type SavedRun = {
  id: string;
  tool_id: string;
  flow_name: string;
  mode: string | null;
  input_payload: Record<string, any>;
  output_payload: Record<string, any> | null;
  status: string;
  created_at: string;
};

export function useSavedRun(runId: string | null) {
  const [run, setRun] = useState<SavedRun | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!runId) return;

    setIsLoading(true);
    fetch(`/api/tools/v2/runs/${runId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) setRun(data);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [runId]);

  return { run, isLoading };
}
