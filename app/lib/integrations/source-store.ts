type IntegrationSourceRow = {
  id: string;
  user_id: string;
  provider: string;
  app: string;
  provider_item_id: string;
  name: string;
  mime_type: string | null;
  web_url: string | null;
  extracted_text: string | null;
  extraction_status: string;
  is_selected: boolean;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
};

type IntegrationIngestionJobRow = {
  id: string;
  user_id: string;
  source_id: string;
  provider: string;
  app: string;
  status: 'queued' | 'processing' | 'done' | 'error' | 'dead';
  attempts: number;
  max_attempts: number;
  next_attempt_at: string | null;
  last_error: string | null;
  created_at: string;
  updated_at: string;
};

export async function listIntegrationSources(
  supabase: any,
  userId: string,
  input?: { provider?: string; app?: string; selectedOnly?: boolean; limit?: number }
): Promise<IntegrationSourceRow[]> {
  let query = (supabase as any)
    .from('external_integration_sources')
    .select(
      'id, user_id, provider, app, provider_item_id, name, mime_type, web_url, extracted_text, extraction_status, is_selected, metadata, created_at, updated_at'
    )
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (input?.provider) query = query.eq('provider', input.provider);
  if (input?.app) query = query.eq('app', input.app);
  if (input?.selectedOnly) query = query.eq('is_selected', true);
  if (input?.limit) query = query.limit(input.limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message || 'Failed to list integration sources');
  return (Array.isArray(data) ? data : []) as IntegrationSourceRow[];
}

export async function upsertIntegrationSource(
  supabase: any,
  input: {
    userId: string;
    provider: string;
    app: string;
    providerItemId: string;
    name: string;
    mimeType?: string | null;
    webUrl?: string | null;
    extractedText?: string | null;
    extractionStatus?: 'pending' | 'ready' | 'empty' | 'error';
    isSelected?: boolean;
    metadata?: Record<string, any>;
  }
) {
  const payload = {
    user_id: input.userId,
    provider: input.provider,
    app: input.app,
    provider_item_id: input.providerItemId,
    name: input.name,
    mime_type: input.mimeType || null,
    web_url: input.webUrl || null,
    extracted_text: input.extractedText ?? null,
    extraction_status: input.extractionStatus || 'pending',
    is_selected: input.isSelected ?? false,
    metadata: input.metadata || {},
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await (supabase as any)
    .from('external_integration_sources')
    .upsert(payload, { onConflict: 'user_id,provider,app,provider_item_id' })
    .select(
      'id, user_id, provider, app, provider_item_id, name, mime_type, web_url, extracted_text, extraction_status, is_selected, metadata, created_at, updated_at'
    )
    .single();

  if (error) throw new Error(error.message || 'Failed to upsert integration source');
  return data as IntegrationSourceRow;
}

export async function clearSelectedIntegrationSources(
  supabase: any,
  input: { userId: string; provider?: string; app?: string }
) {
  let query = (supabase as any)
    .from('external_integration_sources')
    .update({ is_selected: false, updated_at: new Date().toISOString() })
    .eq('user_id', input.userId);

  if (input.provider) query = query.eq('provider', input.provider);
  if (input.app) query = query.eq('app', input.app);

  const { error } = await query;
  if (error) throw new Error(error.message || 'Failed to clear selected integration sources');
}

export async function getIntegrationSourceById(supabase: any, userId: string, sourceId: string) {
  const { data, error } = await (supabase as any)
    .from('external_integration_sources')
    .select(
      'id, user_id, provider, app, provider_item_id, name, mime_type, web_url, extracted_text, extraction_status, is_selected, metadata, created_at, updated_at'
    )
    .eq('user_id', userId)
    .eq('id', sourceId)
    .maybeSingle();
  if (error) throw new Error(error.message || 'Failed to read integration source');
  return (data as IntegrationSourceRow | null) || null;
}

export async function updateIntegrationSourceExtraction(
  supabase: any,
  input: {
    sourceId: string;
    extractedText: string | null;
    extractionStatus: 'pending' | 'ready' | 'empty' | 'error';
    metadata?: Record<string, any>;
  }
) {
  const { error } = await (supabase as any)
    .from('external_integration_sources')
    .update({
      extracted_text: input.extractedText,
      extraction_status: input.extractionStatus,
      metadata: input.metadata || {},
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.sourceId);

  if (error) throw new Error(error.message || 'Failed to update source extraction');
}

export async function enqueueIntegrationIngestionJobs(
  supabase: any,
  input: {
    userId: string;
    provider: string;
    app: string;
    sourceIds: string[];
  }
) {
  if (input.sourceIds.length === 0) return;
  const nowIso = new Date().toISOString();
  const rows = input.sourceIds.map((sourceId) => ({
    user_id: input.userId,
    source_id: sourceId,
    provider: input.provider,
    app: input.app,
    status: 'queued',
    attempts: 0,
    max_attempts: 5,
    next_attempt_at: nowIso,
    last_error: null,
    updated_at: nowIso,
  }));

  const { error } = await (supabase as any)
    .from('external_integration_ingestion_jobs')
    .insert(rows);
  if (error) throw new Error(error.message || 'Failed to enqueue ingestion jobs');
}

export async function listIntegrationIngestionJobs(
  supabase: any,
  input: { userId: string; provider?: string; app?: string; statuses?: string[]; runnableOnly?: boolean; limit?: number }
): Promise<IntegrationIngestionJobRow[]> {
  const nowIso = new Date().toISOString();
  let query = (supabase as any)
    .from('external_integration_ingestion_jobs')
    .select('id, user_id, source_id, provider, app, status, attempts, max_attempts, next_attempt_at, last_error, created_at, updated_at')
    .eq('user_id', input.userId)
    .order('updated_at', { ascending: false });

  if (input.provider) query = query.eq('provider', input.provider);
  if (input.app) query = query.eq('app', input.app);
  if (Array.isArray(input.statuses) && input.statuses.length > 0) query = query.in('status', input.statuses);
  if (input.runnableOnly) query = query.lte('next_attempt_at', nowIso);
  if (input.limit) query = query.limit(input.limit);

  const { data, error } = await query;
  if (error) throw new Error(error.message || 'Failed to list ingestion jobs');
  return (Array.isArray(data) ? data : []) as IntegrationIngestionJobRow[];
}

export async function updateIntegrationIngestionJob(
  supabase: any,
  input: {
    jobId: string;
    status: 'queued' | 'processing' | 'done' | 'error' | 'dead';
    attempts?: number;
    maxAttempts?: number;
    nextAttemptAt?: string | null;
    lastError?: string | null;
  }
) {
  const { error } = await (supabase as any)
    .from('external_integration_ingestion_jobs')
    .update({
      status: input.status,
      attempts: input.attempts,
      max_attempts: input.maxAttempts,
      next_attempt_at: input.nextAttemptAt,
      last_error: input.lastError ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.jobId);
  if (error) throw new Error(error.message || 'Failed to update ingestion job');
}

export async function retryIntegrationIngestionJobs(
  supabase: any,
  input: { userId: string; provider?: string; app?: string; statuses?: Array<'error' | 'dead'>; limit?: number }
) {
  const statuses = input.statuses && input.statuses.length > 0 ? input.statuses : ['error', 'dead'];
  let query = (supabase as any)
    .from('external_integration_ingestion_jobs')
    .update({
      status: 'queued',
      next_attempt_at: new Date().toISOString(),
      last_error: null,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', input.userId)
    .in('status', statuses);

  if (input.provider) query = query.eq('provider', input.provider);
  if (input.app) query = query.eq('app', input.app);
  if (input.limit) query = query.limit(input.limit);

  const { error, count } = await query.select('id', { count: 'exact' });
  if (error) throw new Error(error.message || 'Failed to retry ingestion jobs');
  return count || 0;
}
