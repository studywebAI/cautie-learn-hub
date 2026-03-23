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
