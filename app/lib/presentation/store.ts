import { PresentationBlueprint, PresentationUiConfig, PreviewManifest, SourceAnalysis } from '@/lib/presentation/types';

export type PresentationProjectRecord = {
  id: string;
  user_id: string;
  class_id: string | null;
  title: string;
  prompt: string;
  status: 'draft' | 'processing' | 'ready' | 'failed' | 'exporting';
  selected_platform: 'powerpoint' | 'google-slides' | 'keynote';
  language: string;
  ui_config: Record<string, any>;
  ai_suggested_config: Record<string, any>;
  effective_config: Record<string, any>;
  workflow_state: Record<string, any>;
  source_ids: string[];
  latest_version_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PresentationSourceRecord = {
  id: string;
  project_id: string;
  user_id: string;
  source_type: string;
  mime_type?: string | null;
  file_name?: string | null;
  storage_key?: string | null;
  external_provider?: string | null;
  external_file_id?: string | null;
  content?: string | null;
  extracted_text?: string | null;
  parsed_metadata?: Record<string, any> | null;
  thumbnail_url?: string | null;
  created_at: string;
};

export type PresentationVersionRecord = {
  id: string;
  project_id: string;
  version_number: number;
  blueprint_json: Record<string, any>;
  analysis_json: Record<string, any>;
  quality_json: Record<string, any>;
  render_status: 'queued' | 'rendering' | 'ready' | 'failed';
  pptx_url?: string | null;
  pdf_url?: string | null;
  preview_manifest_json: Record<string, any>;
  slide_count: number;
  generation_summary?: string | null;
  ai_change_log?: any[] | null;
  created_at: string;
};

export async function createPresentationProject(input: {
  supabase: any;
  userId: string;
  title: string;
  prompt?: string;
  classId?: string;
  selectedPlatform: 'powerpoint' | 'google-slides' | 'keynote';
  language: string;
  uiConfig: Partial<PresentationUiConfig>;
  workflowState?: Record<string, any>;
}) {
  const { data, error } = await input.supabase
    .from('presentation_projects')
    .insert({
      user_id: input.userId,
      class_id: input.classId || null,
      title: input.title,
      prompt: input.prompt || '',
      selected_platform: input.selectedPlatform,
      language: input.language,
      ui_config: input.uiConfig || {},
      effective_config: input.uiConfig || {},
      ai_suggested_config: {},
      workflow_state: input.workflowState || {},
      status: 'draft',
    })
    .select('*')
    .single();

  if (error || !data) throw new Error(error?.message || 'Failed to create project');
  return data as PresentationProjectRecord;
}

export async function updatePresentationProject(input: {
  supabase: any;
  userId: string;
  projectId: string;
  patch: {
    title?: string;
    prompt?: string;
    selected_platform?: 'powerpoint' | 'google-slides' | 'keynote';
    language?: string;
    ui_config?: Record<string, any>;
    ai_suggested_config?: Record<string, any>;
    effective_config?: Record<string, any>;
    workflow_state?: Record<string, any>;
    status?: 'draft' | 'processing' | 'ready' | 'failed' | 'exporting';
  };
}) {
  const updatePayload = { ...input.patch, updated_at: new Date().toISOString() } as Record<string, any>;
  const { data, error } = await input.supabase
    .from('presentation_projects')
    .update(updatePayload)
    .eq('id', input.projectId)
    .eq('user_id', input.userId)
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message || 'Failed to update presentation project');
  return data as PresentationProjectRecord;
}

export async function getPresentationProject(input: {
  supabase: any;
  userId: string;
  projectId: string;
}) {
  const { data, error } = await input.supabase
    .from('presentation_projects')
    .select('*')
    .eq('id', input.projectId)
    .eq('user_id', input.userId)
    .maybeSingle();
  if (error) throw new Error(error.message || 'Failed to load project');
  return (data as PresentationProjectRecord | null) || null;
}

export async function listPresentationSources(input: {
  supabase: any;
  userId: string;
  projectId: string;
}) {
  const { data, error } = await input.supabase
    .from('presentation_sources')
    .select('*')
    .eq('project_id', input.projectId)
    .eq('user_id', input.userId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message || 'Failed to load sources');
  return (data || []) as PresentationSourceRecord[];
}

export async function addPresentationSources(input: {
  supabase: any;
  userId: string;
  projectId: string;
  replaceTextSources?: boolean;
  replaceNonTextSources?: boolean;
  sources: Array<{
    sourceType: string;
    mimeType?: string;
    fileName?: string;
    externalProvider?: string;
    externalFileId?: string;
    content?: string;
    extractedText?: string;
    parsedMetadata?: Record<string, any>;
    thumbnailUrl?: string;
  }>;
}) {
  if (input.replaceTextSources) {
    await input.supabase
      .from('presentation_sources')
      .delete()
      .eq('project_id', input.projectId)
      .eq('user_id', input.userId)
      .eq('source_type', 'text');
  }

  if (input.replaceNonTextSources) {
    await input.supabase
      .from('presentation_sources')
      .delete()
      .eq('project_id', input.projectId)
      .eq('user_id', input.userId)
      .neq('source_type', 'text');
  }

  const rows = input.sources.map((source) => ({
    project_id: input.projectId,
    user_id: input.userId,
    source_type: source.sourceType,
    mime_type: source.mimeType || null,
    file_name: source.fileName || null,
    external_provider: source.externalProvider || null,
    external_file_id: source.externalFileId || null,
    content: source.content || null,
    extracted_text: source.extractedText || source.content || null,
    parsed_metadata: source.parsedMetadata || {},
    thumbnail_url: source.thumbnailUrl || null,
  }));

  const { data, error } = await input.supabase
    .from('presentation_sources')
    .insert(rows)
    .select('*');
  if (error) throw new Error(error.message || 'Failed to add sources');
  const created = (data || []) as PresentationSourceRecord[];

  const { data: allSourceRows } = await input.supabase
    .from('presentation_sources')
    .select('id')
    .eq('project_id', input.projectId)
    .eq('user_id', input.userId);
  const sourceIds = Array.isArray(allSourceRows) ? allSourceRows.map((s: any) => s.id as string) : created.map((s) => s.id);
  await input.supabase
    .from('presentation_projects')
    .update({ source_ids: sourceIds, updated_at: new Date().toISOString() })
    .eq('id', input.projectId)
    .eq('user_id', input.userId);

  return created;
}

export async function getNextProjectVersionNumber(input: {
  supabase: any;
  projectId: string;
}) {
  const { data, error } = await input.supabase
    .from('presentation_versions')
    .select('version_number')
    .eq('project_id', input.projectId)
    .order('version_number', { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message || 'Failed to resolve version number');
  const latest = Array.isArray(data) && data.length > 0 ? Number(data[0].version_number || 0) : 0;
  return latest + 1;
}

export async function createPresentationVersion(input: {
  supabase: any;
  userId: string;
  projectId: string;
  versionNumber: number;
  blueprint: PresentationBlueprint;
  analysis: SourceAnalysis;
  quality: Record<string, any>;
  previewManifest: PreviewManifest;
  generationSummary?: string;
}) {
  const { data, error } = await input.supabase
    .from('presentation_versions')
    .insert({
      project_id: input.projectId,
      version_number: input.versionNumber,
      blueprint_json: input.blueprint,
      analysis_json: input.analysis,
      quality_json: input.quality || {},
      render_status: 'ready',
      preview_manifest_json: input.previewManifest,
      slide_count: input.previewManifest.slideCount,
      generation_summary: input.generationSummary || null,
      ai_change_log: [],
    })
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message || 'Failed to create version');

  await input.supabase
    .from('presentation_projects')
    .update({
      status: 'ready',
      latest_version_id: data.id,
      ai_suggested_config: input.analysis.recommendedSettings || {},
      effective_config: input.blueprint.settings || {},
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.projectId)
    .eq('user_id', input.userId);

  return data as PresentationVersionRecord;
}

export async function getLatestProjectVersion(input: {
  supabase: any;
  userId: string;
  projectId: string;
}) {
  const { data: project, error: projectError } = await input.supabase
    .from('presentation_projects')
    .select('id, latest_version_id')
    .eq('id', input.projectId)
    .eq('user_id', input.userId)
    .maybeSingle();
  if (projectError) throw new Error(projectError.message || 'Failed to load project');
  if (!project?.latest_version_id) return null;

  const { data, error } = await input.supabase
    .from('presentation_versions')
    .select('*')
    .eq('id', project.latest_version_id)
    .eq('project_id', input.projectId)
    .maybeSingle();
  if (error) throw new Error(error.message || 'Failed to load version');
  return (data as PresentationVersionRecord | null) || null;
}

export async function createPresentationShareSnapshot(input: {
  supabase: any;
  userId: string;
  projectId: string;
  versionId: string;
  title: string;
  previewManifest: PreviewManifest;
  expiresInHours?: number;
}) {
  const token = crypto.randomUUID().replace(/-/g, '');
  const expiresAt =
    typeof input.expiresInHours === 'number' && input.expiresInHours > 0
      ? new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000).toISOString()
      : null;
  const { data, error } = await input.supabase
    .from('presentation_share_snapshots')
    .insert({
      project_id: input.projectId,
      version_id: input.versionId,
      user_id: input.userId,
      public_token: token,
      title: input.title,
      preview_manifest_json: input.previewManifest,
      expires_at: expiresAt,
    })
    .select('*')
    .single();
  if (error || !data) throw new Error(error?.message || 'Failed to create share snapshot');
  return data as any;
}

export async function revokePresentationShareSnapshot(input: {
  supabase: any;
  userId: string;
  token: string;
}) {
  const { data, error } = await input.supabase
    .from('presentation_share_snapshots')
    .update({ revoked_at: new Date().toISOString() })
    .eq('public_token', input.token)
    .eq('user_id', input.userId)
    .select('id')
    .maybeSingle();
  if (error) throw new Error(error.message || 'Failed to revoke share snapshot');
  return Boolean(data?.id);
}

export async function getPresentationShareSnapshotByToken(input: {
  supabase: any;
  token: string;
}) {
  const { data, error } = await input.supabase
    .from('presentation_share_snapshots')
    .select('id, title, public_token, preview_manifest_json, created_at, expires_at, revoked_at')
    .eq('public_token', input.token)
    .maybeSingle();
  if (error) throw new Error(error.message || 'Failed to load share snapshot');
  if (!data) return null;
  if (data.revoked_at) return null;
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return null;
  return data;
}
