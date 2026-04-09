'use client';

import React, { Suspense, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, FileUp, Loader2, Sparkles, Upload } from 'lucide-react';
import { AppContext } from '@/contexts/app-context';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { MicrosoftAppStrip } from '@/components/tools/microsoft-app-strip';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { PresentationPlanResult, PresentationUiConfig, PreviewManifest, SourceAnalysis } from '@/lib/presentation/types';
import { PresentationPreview } from '@/components/presentation/presentation-preview';
import { SlideshowView } from '@/components/presentation/slideshow-view';
import { ActionBar } from '@/components/presentation/action-bar';
import { OneDriveExportFolderPicker } from '@/components/presentation/onedrive-export-folder-picker';

type PresentationPlatform = 'powerpoint' | 'google-slides' | 'keynote';
type WorkflowStage = 'source' | 'settings' | 'building' | 'preview';
type SlideSetupItem = { title: string; subject: string };
type SourceAttachment = {
  key: string;
  sourceType: 'file' | 'image' | 'cloud_file';
  fileName: string;
  mimeType?: string;
  externalProvider?: 'onedrive' | 'sharepoint' | 'google_drive' | 'dropbox';
  externalFileId?: string;
  extractedText?: string;
  content?: string;
  thumbnailUrl?: string;
  parsedMetadata?: Record<string, any>;
};
type ImportCatalogItem = {
  id: string;
  name: string;
  source: 'sidebar_recent';
  recentType: 'tool_run' | 'material';
  runId?: string;
  materialId?: string;
  mimeType?: string;
  webUrl?: string;
  previewUrl?: string;
  lastModifiedDateTime?: string;
  isFile?: boolean;
  isFolder?: boolean;
};

type PresentationSlide = {
  id: string;
  index: number;
  heading: string;
  bullets: string[];
  speakerNotes?: string;
};

type PresentationPrototype = {
  platform: PresentationPlatform;
  title: string;
  slideCount: number;
  analysis: SourceAnalysis;
  effectiveConfig: PresentationUiConfig;
  slides: PresentationSlide[];
  previewManifest: PreviewManifest;
};

const THEME_PRESETS = [
  { id: 'clean-classic', label: 'Clean Classic' },
  { id: 'vibrant-gradient', label: 'Vibrant Gradient' },
  { id: 'studio-editorial', label: 'Studio Editorial' },
  { id: 'academic-focus', label: 'Academic Focus' },
] as const;

const FONT_PRESETS = [
  { id: 'modern-sans', label: 'Modern Sans' },
  { id: 'business-serif', label: 'Business Serif' },
  { id: 'classroom-readable', label: 'Classroom Readable' },
] as const;

const LAYOUT_PRESETS = [
  { id: 'balanced', label: 'Balanced' },
  { id: 'visual-first', label: 'Visual First' },
  { id: 'text-first', label: 'Text First' },
] as const;

const BULLET_PRESETS = [
  { id: 'concise', label: 'Concise bullets' },
  { id: 'expanded', label: 'Expanded bullets' },
  { id: 'mixed', label: 'Mixed bullets + callouts' },
] as const;

function mapBuildToPrototype(payload: any): PresentationPrototype {
  const blueprint = payload?.blueprint || {};
  const slides = Array.isArray(blueprint?.slides) ? blueprint.slides : [];
  const previewManifest = payload?.previewManifest || {
    slides: [],
    slideCount: 0,
    title: blueprint?.presentation?.title || 'Presentation',
    aspectRatio: '16:9',
  };
  const plan: PresentationPlanResult | undefined = payload?.plan;
  return {
    platform: (blueprint?.presentation?.platform || 'powerpoint') as PresentationPlatform,
    title: String(blueprint?.presentation?.title || 'Presentation'),
    slideCount: Number(previewManifest?.slideCount || slides.length || 0),
    analysis: (plan?.analysis || payload?.analysis || {}) as SourceAnalysis,
    effectiveConfig: (plan?.effectiveConfig || payload?.effectiveConfig || {}) as PresentationUiConfig,
    slides: slides.map((slide: any, idx: number) => ({
      id: String(slide?.id || `slide_${idx + 1}`),
      index: Number(slide?.index || idx + 1),
      heading: String(slide?.heading || slide?.title || `Slide ${idx + 1}`),
      bullets: Array.isArray(slide?.bullets) ? slide.bullets.map((b: any) => String(b)) : [],
      speakerNotes: typeof slide?.speakerNotes === 'string' ? slide.speakerNotes : undefined,
    })),
    previewManifest,
  };
}

function normalizeSubject(input: string, fallbackIndex: number) {
  const trimmed = input.trim();
  return trimmed || `Slide ${fallbackIndex + 1}`;
}

function serializeSlideSetup(items: SlideSetupItem[]) {
  return items.map((item, idx) => {
    const title = String(item?.title || '').trim();
    const subject = String(item?.subject || '').trim();
    if (title && subject) return `${title}: ${subject}`;
    if (title) return title;
    if (subject) return subject;
    return `Slide ${idx + 1}`;
  });
}

function defaultSubjectSeed(count: number) {
  return Array.from({ length: Math.max(4, Math.min(12, count || 8)) }, (_, i) => `Subject ${i + 1}`);
}

const IMPORT_USAGE_STORAGE_KEY = 'presentation.import.usage.v1';
const RECENT_TYPE_LABELS: Record<string, string> = {
  flashcards: 'Flashcards',
  notes: 'Notes',
  quiz: 'Quiz',
  subject: 'Subject',
  assignment: 'Assignment',
  presentation: 'Presentation',
};

function mergeAttachments(prev: SourceAttachment[], next: SourceAttachment[]) {
  const map = new Map<string, SourceAttachment>();
  for (const item of prev) map.set(item.key, item);
  for (const item of next) map.set(item.key, item);
  return Array.from(map.values());
}

function toPlainText(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) {
    return value
      .map((item) => toPlainText(item))
      .filter(Boolean)
      .join('\n')
      .trim();
  }
  if (typeof value === 'object') {
    const preferredKeys = ['text', 'content', 'markdown', 'summary', 'notes', 'title'];
    const preferredParts = preferredKeys
      .map((key) => {
        const normalized = toPlainText(value?.[key]);
        return normalized ? `${key}: ${normalized}` : '';
      })
      .filter(Boolean);
    if (preferredParts.length > 0) return preferredParts.join('\n\n').trim();
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return '';
    }
  }
  return '';
}

function PresentationPageContent() {
  const searchParams = useSearchParams();
  const projectIdFromParams = searchParams.get('projectId');
  const sourceTextFromParams = searchParams.get('sourceText');
  const classId = searchParams.get('classId');
  const initialSourceSeed = sourceTextFromParams || '';
  const appContext = useContext(AppContext);
  const language = appContext?.language ?? 'en';

  const [stage, setStage] = useState<WorkflowStage>('source');
  const [sourceText, setSourceText] = useState(initialSourceSeed);
  const [sourceAttachments, setSourceAttachments] = useState<SourceAttachment[]>([]);
  const [customTitle, setCustomTitle] = useState('');
  const [platform, setPlatform] = useState<PresentationPlatform>('powerpoint');
  const [autoMode, setAutoMode] = useState(true);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [outputLanguage, setOutputLanguage] = useState<'auto' | 'nl' | 'en'>('auto');
  const [importOpen, setImportOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [isSlideshow, setIsSlideshow] = useState(false);
  const [analysis, setAnalysis] = useState<SourceAnalysis | null>(null);
  const [plan, setPlan] = useState<PresentationPlanResult | null>(null);
  const [uiConfig, setUiConfig] = useState<Partial<PresentationUiConfig>>({
    includeSpeakerNotes: false,
    includeAgenda: true,
    includeSummary: true,
    includeQA: false,
    includeQuiz: false,
    includeReferences: false,
    includeAppendix: false,
    density: 'balanced',
    tone: 'professional',
    audience: 'general',
    goal: 'teach',
    imageRichness: 'medium',
    citations: 'minimal',
    slideCount: 10,
    chartPreference: 'auto',
    captionStyle: 'balanced',
    layoutStyle: 'mixed',
  });

  const [slideSetup, setSlideSetup] = useState<SlideSetupItem[]>(
    defaultSubjectSeed(8).map((subject, idx) => ({ title: `Slide ${idx + 1}`, subject }))
  );
  const [presetTitle, setPresetTitle] = useState('My preset');
  const [themePreset, setThemePreset] = useState<(typeof THEME_PRESETS)[number]['id']>('clean-classic');
  const [fontPreset, setFontPreset] = useState<(typeof FONT_PRESETS)[number]['id']>('modern-sans');
  const [layoutPreset, setLayoutPreset] = useState<(typeof LAYOUT_PRESETS)[number]['id']>('balanced');
  const [bulletPreset, setBulletPreset] = useState<(typeof BULLET_PRESETS)[number]['id']>('mixed');

  const [prototype, setPrototype] = useState<PresentationPrototype | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [lastSyncedSourceText, setLastSyncedSourceText] = useState<string>('');
  const [lastSyncedAttachmentSignature, setLastSyncedAttachmentSignature] = useState<string>('');
  const [isPlanning, setIsPlanning] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isExportingCloud, setIsExportingCloud] = useState(false);
  const [activeShareToken, setActiveShareToken] = useState<string | null>(null);
  const [activeShareUrl, setActiveShareUrl] = useState<string | null>(null);
  const [connectMenuOpen, setConnectMenuOpen] = useState(false);
  const [connectMicrosoftOpen, setConnectMicrosoftOpen] = useState(false);
  const [importCatalog, setImportCatalog] = useState<ImportCatalogItem[]>([]);
  const [importCatalogLoading, setImportCatalogLoading] = useState(false);
  const [importSourceFilter, setImportSourceFilter] = useState<'all' | 'tool_runs' | 'materials'>('all');
  const [importSort, setImportSort] = useState<'newest' | 'oldest' | 'most_used' | 'name'>('newest');
  const [importSearch, setImportSearch] = useState('');
  const [onedriveExportFolder, setOnedriveExportFolder] = useState<{
    folderId: string;
    folderName: string;
    driveId?: string;
  } | null>(null);
  const { toast } = useToast();
  const uploadInputRef = React.useRef<HTMLInputElement | null>(null);
  const attachmentSignature = useMemo(
    () =>
      JSON.stringify(
        sourceAttachments.map((item) => ({
          key: item.key,
          sourceType: item.sourceType,
          fileName: item.fileName,
          mimeType: item.mimeType || '',
          externalProvider: item.externalProvider || '',
          externalFileId: item.externalFileId || '',
          thumbnailUrl: item.thumbnailUrl || '',
        }))
      ),
    [sourceAttachments]
  );

  const persistWorkflowSnapshot = useCallback(
    async (overrides?: Partial<{
      stage: WorkflowStage;
      slideSubjects: string[];
      setupPreset: {
        title?: string;
        themePreset?: string;
        fontPreset?: string;
        layoutPreset?: string;
        bulletPreset?: string;
      };
      uiConfig: Partial<PresentationUiConfig>;
      title: string;
      platform: PresentationPlatform;
      prompt: string;
    }>) => {
      if (!projectId) return;
      const body = {
        stage: overrides?.stage ?? stage,
        slideSubjects: overrides?.slideSubjects ?? serializeSlideSetup(slideSetup),
        setupPreset: overrides?.setupPreset ?? {
          title: presetTitle.trim() || 'Custom preset',
          themePreset,
          fontPreset,
          layoutPreset,
          bulletPreset,
        },
        uiConfig: overrides?.uiConfig ?? { ...uiConfig, platform },
        title: overrides?.title ?? (customTitle.trim() || 'Untitled presentation'),
        platform: overrides?.platform ?? platform,
        prompt: overrides?.prompt ?? sourceText,
      };
      await fetch(`/api/presentation/${projectId}/workflow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    },
    [
      projectId,
      stage,
      slideSetup,
      presetTitle,
      themePreset,
      fontPreset,
      layoutPreset,
      bulletPreset,
      uiConfig,
      platform,
      customTitle,
      sourceText,
    ]
  );

  const goToStage = useCallback(
    (nextStage: WorkflowStage) => {
      setStage(nextStage);
      void persistWorkflowSnapshot({ stage: nextStage });
    },
    [persistWorkflowSnapshot]
  );

  const applyConfig = useCallback((patch: Partial<PresentationUiConfig>) => {
    setUiConfig((prev) => ({ ...prev, ...patch }));
  }, []);

  const appendSourceChunk = useCallback((chunk: string) => {
    const normalized = chunk.trim();
    if (!normalized) return;
    setSourceText((prev) => (prev.trim() ? `${prev.trim()}\n\n${normalized}` : normalized));
  }, []);

  const importRecentSources = useCallback(async () => {
    try {
      const response = await fetch('/api/integrations/context-sources?provider=microsoft&selected=1', { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(payload?.error || 'Could not import recent files'));
      const items = Array.isArray(payload?.items) ? payload.items : [];
      const chunks = items
        .map((item: any) => String(item?.extracted_text || '').trim())
        .filter(Boolean);
      const attachments: SourceAttachment[] = items.map((item: any, idx: number) => ({
        key: `recent:${String(item?.id || idx)}`,
        sourceType: 'cloud_file',
        fileName: String(item?.name || 'Cloud file'),
        mimeType: typeof item?.mime_type === 'string' ? item.mime_type : undefined,
        externalProvider: 'onedrive',
        externalFileId: typeof item?.external_file_id === 'string' ? item.external_file_id : undefined,
        extractedText: typeof item?.extracted_text === 'string' ? item.extracted_text : undefined,
        thumbnailUrl: typeof item?.metadata?.preview_url === 'string' ? item.metadata.preview_url : undefined,
        parsedMetadata: {
          webUrl: typeof item?.web_url === 'string' ? item.web_url : undefined,
          containsVisuals: true,
        },
      }));
      setSourceAttachments((prev) => mergeAttachments(prev, attachments));
      if (chunks.length === 0) {
        toast({ variant: 'destructive', title: 'No recent files ready', description: 'Select files with Connect first.' });
        return;
      }
      appendSourceChunk(chunks.join('\n\n'));
      toast({ title: 'Imported recents', description: `${chunks.length} file(s) merged into source.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Import failed', description: error?.message || 'Try again.' });
    }
  }, [appendSourceChunk, toast]);

  const getImportUsageMap = useCallback((): Record<string, number> => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(IMPORT_USAGE_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }, []);

  const bumpImportUsage = useCallback((ids: string[]) => {
    if (typeof window === 'undefined' || ids.length === 0) return;
    const map = getImportUsageMap();
    for (const id of ids) {
      map[id] = Number(map[id] || 0) + 1;
    }
    window.localStorage.setItem(IMPORT_USAGE_STORAGE_KEY, JSON.stringify(map));
  }, [getImportUsageMap]);

  const loadRecentsCatalog = useCallback(async () => {
    setImportCatalogLoading(true);
    try {
      const [runsRes, materialsRes] = await Promise.all([
        fetch('/api/tools/v2/runs', { cache: 'no-store' }),
        fetch('/api/materials?limit=50', { cache: 'no-store' }),
      ]);
      const runsPayload = await runsRes.json().catch(() => []);
      const materialsPayload = await materialsRes.json().catch(() => ({ materials: [] }));
      if (!runsRes.ok || !materialsRes.ok) {
        throw new Error('Could not load sidebar recents');
      }

      const runItems: ImportCatalogItem[] = (Array.isArray(runsPayload) ? runsPayload : [])
        .filter((run: any) => run?.status === 'succeeded')
        .filter((run: any) => run?.options_payload?.saveToRecents !== false)
        .map((run: any) => {
          const toolId = String(run?.tool_id || 'tool');
          const mode = typeof run?.mode === 'string' ? run.mode : '';
          const toolLabel = RECENT_TYPE_LABELS[toolId] || toolId;
          return {
            id: `run:${String(run?.id || '')}`,
            name: mode ? `${toolLabel} - ${mode}` : toolLabel,
            source: 'sidebar_recent' as const,
            recentType: 'tool_run' as const,
            runId: String(run?.id || ''),
            lastModifiedDateTime: typeof run?.finished_at === 'string' ? run.finished_at : String(run?.created_at || ''),
            isFile: true,
            isFolder: false,
          };
        })
        .filter((item) => item.runId);

      const materialItems: ImportCatalogItem[] = (Array.isArray(materialsPayload?.materials) ? materialsPayload.materials : [])
        .map((material: any) => ({
          id: `material:${String(material?.id || '')}`,
          name: String(material?.title || RECENT_TYPE_LABELS[String(material?.type || '').toLowerCase()] || 'Material'),
          source: 'sidebar_recent' as const,
          recentType: 'material' as const,
          materialId: String(material?.id || ''),
          lastModifiedDateTime: typeof material?.updated_at === 'string' ? material.updated_at : '',
          isFile: true,
          isFolder: false,
        }))
        .filter((item: ImportCatalogItem) => item.materialId);

      const items = [...runItems, ...materialItems].filter((item: ImportCatalogItem) => {
        if (importSourceFilter === 'tool_runs') return item.recentType === 'tool_run';
        if (importSourceFilter === 'materials') return item.recentType === 'material';
        return true;
      });
      setImportCatalog(items);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Recents failed', description: error?.message || 'Try again.' });
    } finally {
      setImportCatalogLoading(false);
    }
  }, [importSourceFilter, toast]);

  const importRecentsFiles = useCallback(async (items: ImportCatalogItem[]) => {
    if (items.length === 0) return;
    try {
      const resolved = await Promise.all(
        items.map(async (item) => {
          if (item.recentType === 'tool_run' && item.runId) {
            const response = await fetch(`/api/tools/v2/runs/${item.runId}`, { cache: 'no-store' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(`Could not import run: ${item.name}`);
            }
            const extracted = toPlainText(payload?.output_payload || payload?.input_payload || payload);
            return {
              item,
              text: extracted,
            };
          }

          if (item.recentType === 'material' && item.materialId) {
            const response = await fetch(`/api/materials/${item.materialId}`, { cache: 'no-store' });
            const payload = await response.json().catch(() => ({}));
            if (!response.ok) {
              throw new Error(`Could not import material: ${item.name}`);
            }
            const extracted = toPlainText(payload?.content || payload?.source_text || payload);
            return {
              item,
              text: extracted,
            };
          }

          return { item, text: '' };
        })
      );

      const attachments: SourceAttachment[] = resolved.map(({ item, text }) => ({
        key: `recent:${item.id}`,
        sourceType: 'file',
        fileName: item.name,
        extractedText: text,
        parsedMetadata: {
          source: 'sidebar_recents',
          recentType: item.recentType,
          runId: item.runId,
          materialId: item.materialId,
          lastModifiedDateTime: item.lastModifiedDateTime,
        },
      }));
      setSourceAttachments((prev) => mergeAttachments(prev, attachments));

      const chunks = resolved
        .map(({ item, text }) => {
          const normalized = text.trim();
          if (!normalized) return `[${item.name}]\nRecent item attached as source context.`;
          return `[${item.name}]\n${normalized}`;
        })
        .filter(Boolean);
      appendSourceChunk(chunks.join('\n\n'));

      bumpImportUsage(items.map((item) => item.id));
      toast({ title: 'Recents imported', description: `${items.length} recent item(s) added.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Recents import failed', description: error?.message || 'Try again.' });
    }
  }, [appendSourceChunk, bumpImportUsage, toast]);

  const extractTextFromFile = useCallback(async (file: File) => {
    const textLike = file.type.startsWith('text/') || /\.(txt|md|csv|json|xml|html)$/i.test(file.name);
    if (textLike) {
      return (await file.text().catch(() => '')).trim();
    }
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch('/api/tools/extract-text', {
      method: 'POST',
      body: formData,
    });
    if (!response.ok) return '';
    const payload = await response.json().catch(() => ({}));
    return (
      (typeof payload?.layoutText === 'string' && payload.layoutText.trim()) ||
      (typeof payload?.text === 'string' ? payload.text.trim() : '')
    );
  }, []);

  const ingestUploadedFiles = useCallback(async (
    files: File[],
    options?: {
      origin?: 'local' | 'microsoft';
      metadataByName?: Map<string, {
        id?: string;
        mimeType?: string;
        webUrl?: string;
        previewUrl?: string;
      }>;
    }
  ) => {
    if (!files || files.length === 0) return;
    const collected: string[] = [];
    const attachments: SourceAttachment[] = [];
    for (const file of files) {
      const imageLike = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(file.name);
      const extracted = await extractTextFromFile(file).catch(() => '');
      const key = `local:${file.name}:${file.size}:${file.lastModified}`;
      const cloudMeta = options?.metadataByName?.get(file.name);
      if (extracted) {
        collected.push(`[${file.name}]\n${extracted}`);
      }
      if (!extracted) {
        collected.push(`[${file.name}]\nBinary file attached as source.`);
      }
      attachments.push({
        key,
        sourceType: options?.origin === 'microsoft' ? 'cloud_file' : imageLike ? 'image' : 'file',
        fileName: file.name,
        mimeType: cloudMeta?.mimeType || file.type || undefined,
        externalProvider: options?.origin === 'microsoft' ? 'onedrive' : undefined,
        externalFileId: options?.origin === 'microsoft' ? cloudMeta?.id : undefined,
        extractedText: extracted || undefined,
        thumbnailUrl: cloudMeta?.previewUrl,
        parsedMetadata: {
          localUpload: options?.origin !== 'microsoft',
          microsoftDownloaded: options?.origin === 'microsoft',
          size: file.size,
          containsVisuals: imageLike,
          webUrl: cloudMeta?.webUrl,
        },
      });
    }
    appendSourceChunk(collected.join('\n\n'));
    setSourceAttachments((prev) => mergeAttachments(prev, attachments));
    if (uploadInputRef.current) uploadInputRef.current.value = '';
  }, [appendSourceChunk, extractTextFromFile]);

  const onUploadFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    await ingestUploadedFiles(Array.from(files), { origin: 'local' });
  }, [ingestUploadedFiles]);

  useEffect(() => {
    const target = Math.max(4, Math.min(20, uiConfig.slideCount || 10));
    setSlideSetup((prev) => {
      if (prev.length === target) return prev;
      if (prev.length > target) return prev.slice(0, target);
      return [
        ...prev,
        ...Array.from({ length: target - prev.length }, (_, i) => ({
          title: `Slide ${prev.length + i + 1}`,
          subject: `Subject ${prev.length + i + 1}`,
        })),
      ];
    });
  }, [uiConfig.slideCount]);

  useEffect(() => {
    if (!projectIdFromParams) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch(`/api/presentation/${projectIdFromParams}`);
        const payload = await response.json().catch(() => ({}));
        if (!response.ok || !payload?.project) return;
        if (cancelled) return;

        const project = payload.project;
        const projectSources = Array.isArray(payload.sources) ? payload.sources : [];
        const workflow = project.workflow_state || {};
        setProjectId(project.id);
        setCustomTitle(typeof project.title === 'string' ? project.title : '');
        setPlatform((project.selected_platform || 'powerpoint') as PresentationPlatform);
        setSourceText(typeof project.prompt === 'string' ? project.prompt : '');
        setLastSyncedSourceText(typeof project.prompt === 'string' ? project.prompt : '');
        if (project.ui_config && typeof project.ui_config === 'object') {
          setUiConfig((prev) => ({ ...prev, ...(project.ui_config || {}) }));
        }
        if (Array.isArray(workflow.slideSubjects) && workflow.slideSubjects.length > 0) {
          setSlideSetup(
            workflow.slideSubjects.map((item: any, idx: number) => {
              const raw = String(item || '');
              const split = raw.split(':');
              if (split.length >= 2) {
                return {
                  title: normalizeSubject(split.shift() || `Slide ${idx + 1}`, idx),
                  subject: normalizeSubject(split.join(':') || `Subject ${idx + 1}`, idx),
                };
              }
              return {
                title: `Slide ${idx + 1}`,
                subject: normalizeSubject(raw, idx),
              };
            })
          );
        }
        if (workflow.setupPreset && typeof workflow.setupPreset === 'object') {
          const preset = workflow.setupPreset;
          if (typeof preset.title === 'string' && preset.title) setPresetTitle(preset.title);
          if (typeof preset.themePreset === 'string' && THEME_PRESETS.some((item) => item.id === preset.themePreset)) {
            setThemePreset(preset.themePreset as (typeof THEME_PRESETS)[number]['id']);
          }
          if (typeof preset.fontPreset === 'string' && FONT_PRESETS.some((item) => item.id === preset.fontPreset)) {
            setFontPreset(preset.fontPreset as (typeof FONT_PRESETS)[number]['id']);
          }
          if (typeof preset.layoutPreset === 'string' && LAYOUT_PRESETS.some((item) => item.id === preset.layoutPreset)) {
            setLayoutPreset(preset.layoutPreset as (typeof LAYOUT_PRESETS)[number]['id']);
          }
          if (typeof preset.bulletPreset === 'string' && BULLET_PRESETS.some((item) => item.id === preset.bulletPreset)) {
            setBulletPreset(preset.bulletPreset as (typeof BULLET_PRESETS)[number]['id']);
          }
        }
        if (typeof workflow.stage === 'string') {
          const saved = String(workflow.stage);
          if (saved === 'upload') setStage('source');
          else if (saved === 'subjects' || saved === 'style') setStage('settings');
          else if (saved === 'result') setStage('preview');
          else if (saved === 'building') setStage('building');
          else setStage(saved as WorkflowStage);
        }
        if (projectSources.length > 0) {
          const attachments: SourceAttachment[] = projectSources
            .filter((source: any) => String(source?.source_type || '') !== 'text')
            .map((source: any, idx: number) => ({
              key: String(source?.id || `${source?.external_provider || 'file'}:${source?.external_file_id || source?.file_name || idx}`),
              sourceType: (String(source?.source_type || 'file') as 'file' | 'image' | 'cloud_file'),
              fileName: String(source?.file_name || 'Untitled file'),
              mimeType: typeof source?.mime_type === 'string' ? source.mime_type : undefined,
              externalProvider: source?.external_provider || undefined,
              externalFileId: source?.external_file_id || undefined,
              extractedText: typeof source?.extracted_text === 'string' ? source.extracted_text : undefined,
              content: typeof source?.content === 'string' ? source.content : undefined,
              thumbnailUrl: typeof source?.thumbnail_url === 'string' ? source.thumbnail_url : undefined,
              parsedMetadata: source?.parsed_metadata || {},
            }));
          setSourceAttachments(attachments);
          setLastSyncedAttachmentSignature(
            JSON.stringify(
              attachments.map((item) => ({
                key: item.key,
                sourceType: item.sourceType,
                fileName: item.fileName,
                mimeType: item.mimeType || '',
                externalProvider: item.externalProvider || '',
                externalFileId: item.externalFileId || '',
                thumbnailUrl: item.thumbnailUrl || '',
              }))
            )
          );
        }
      } catch {
        // Keep local defaults if loading persisted project fails.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectIdFromParams]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPicked = async (event: Event) => {
      const custom = event as CustomEvent<any>;
      const items = Array.isArray(custom?.detail?.items) ? custom.detail.items : [];
      if (items.length === 0) return;

      const metadataByName = new Map<string, {
        id?: string;
        mimeType?: string;
        webUrl?: string;
        previewUrl?: string;
      }>();
      for (const item of items) {
        const name = String(item?.name || '').trim();
        if (!name) continue;
        metadataByName.set(name, {
          id: typeof item?.id === 'string' ? item.id : undefined,
          mimeType: typeof item?.mimeType === 'string' ? item.mimeType : undefined,
          webUrl: typeof item?.webUrl === 'string' ? item.webUrl : undefined,
          previewUrl: typeof item?.previewUrl === 'string' ? item.previewUrl : undefined,
        });
      }

      const downloadedFiles: File[] = [];
      const fallbackChunks: string[] = [];
      for (const item of items) {
        try {
          const response = await fetch('/api/integrations/microsoft/files/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: String(item?.id || ''),
              name: String(item?.name || 'Cloud file'),
              kind: 'onedrive',
            }),
          });
          if (!response.ok) throw new Error('download_failed');
          const blob = await response.blob();
          const file = new File([blob], String(item?.name || 'Cloud file'), {
            type: blob.type || String(item?.mimeType || 'application/octet-stream'),
          });
          downloadedFiles.push(file);
        } catch {
          const fallbackText = String(item?.extractedText || '').trim();
          if (fallbackText) fallbackChunks.push(`[${String(item?.name || 'Cloud file')}]\n${fallbackText}`);
        }
      }

      if (downloadedFiles.length > 0) {
        await ingestUploadedFiles(downloadedFiles, {
          origin: 'microsoft',
          metadataByName,
        });
      }
      if (fallbackChunks.length > 0) {
        appendSourceChunk(fallbackChunks.join('\n\n'));
      }

      const attachments: SourceAttachment[] = items.map((item: any, idx: number) => ({
        key: `onedrive:${String(item?.id || idx)}`,
        sourceType: 'cloud_file',
        fileName: String(item?.name || 'Cloud file'),
        mimeType: typeof item?.mimeType === 'string' ? item.mimeType : undefined,
        externalProvider: 'onedrive',
        externalFileId: typeof item?.id === 'string' ? item.id : undefined,
        extractedText: typeof item?.extractedText === 'string' ? item.extractedText : undefined,
        thumbnailUrl: typeof item?.previewUrl === 'string' ? item.previewUrl : undefined,
        parsedMetadata: {
          webUrl: typeof item?.webUrl === 'string' ? item.webUrl : undefined,
          containsVisuals: true,
        },
      }));
      setSourceAttachments((prev) => mergeAttachments(prev, attachments));
      setConnectMicrosoftOpen(false);
      setConnectMenuOpen(false);
      toast({ title: 'Microsoft files imported', description: `${items.length} file(s) ingested.` });
    };
    window.addEventListener('integration-source-picked', onPicked as EventListener);
    return () => window.removeEventListener('integration-source-picked', onPicked as EventListener);
  }, [appendSourceChunk, ingestUploadedFiles, toast]);

  useEffect(() => {
    if ((stage !== 'source' && stage !== 'settings') || !importOpen) return;
    void loadRecentsCatalog();
  }, [stage, importOpen, importSourceFilter, loadRecentsCatalog]);

  useEffect(() => {
    if (!projectId) return;
    const handle = window.setTimeout(() => {
      void persistWorkflowSnapshot();
    }, 500);
    return () => window.clearTimeout(handle);
  }, [
    projectId,
    stage,
    slideSetup,
    presetTitle,
    themePreset,
    fontPreset,
    layoutPreset,
    bulletPreset,
    uiConfig,
    customTitle,
    platform,
    sourceText,
    persistWorkflowSnapshot,
  ]);

  const ensureProjectAndSources = useCallback(async () => {
    const normalized = sourceText.trim();
    if (!normalized) throw new Error('Add source material first.');
    let currentProjectId = projectId;

    if (!currentProjectId) {
      const createResponse = await fetch('/api/presentation/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: customTitle.trim() || 'Untitled presentation',
          prompt: normalized,
          language,
          platform,
          uiConfig: { ...uiConfig, platform },
          workflowState: {
            stage,
            slideSubjects: serializeSlideSetup(slideSetup),
            setupPreset: {
              title: presetTitle.trim() || 'Custom preset',
              themePreset,
              fontPreset,
              layoutPreset,
              bulletPreset,
            },
            updatedAt: new Date().toISOString(),
          },
        }),
      });
      const createPayload = await createResponse.json().catch(() => ({}));
      if (!createResponse.ok) {
        throw new Error(String(createPayload?.error || `Failed to create project (${createResponse.status})`));
      }
      currentProjectId = String(createPayload?.project?.id || '');
      if (!currentProjectId) throw new Error('Project creation returned no id');
      setProjectId(currentProjectId);
    }

    if (normalized !== lastSyncedSourceText || attachmentSignature !== lastSyncedAttachmentSignature) {
      const sourceResponse = await fetch(`/api/presentation/${currentProjectId}/sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          replaceExistingTextSources: true,
          replaceExistingNonTextSources: true,
          sources: [
            {
              sourceType: 'text',
              content: normalized,
              extractedText: normalized,
              parsedMetadata: { origin: 'presentation_input' },
            },
            ...sourceAttachments.map((attachment) => ({
              sourceType: attachment.sourceType,
              mimeType: attachment.mimeType,
              fileName: attachment.fileName,
              externalProvider: attachment.externalProvider,
              externalFileId: attachment.externalFileId,
              content: attachment.content,
              extractedText: attachment.extractedText,
              parsedMetadata: attachment.parsedMetadata || {},
              thumbnailUrl: attachment.thumbnailUrl,
            })),
          ],
        }),
      });
      const sourcePayload = await sourceResponse.json().catch(() => ({}));
      if (!sourceResponse.ok) {
        throw new Error(String(sourcePayload?.error || `Failed to sync sources (${sourceResponse.status})`));
      }
      setLastSyncedSourceText(normalized);
      setLastSyncedAttachmentSignature(attachmentSignature);
    }

    return currentProjectId;
  }, [
    bulletPreset,
    customTitle,
    fontPreset,
    language,
    lastSyncedAttachmentSignature,
    lastSyncedSourceText,
    layoutPreset,
    platform,
    presetTitle,
    projectId,
    slideSetup,
    sourceAttachments,
    sourceText,
    stage,
    themePreset,
    uiConfig,
    attachmentSignature,
  ]);

  const runPlanningStep = useCallback(async () => {
    const pid = await ensureProjectAndSources();
    const response = await fetch(`/api/presentation/${pid}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: sourceText,
        autoMode,
        uiConfig: { ...uiConfig, platform },
        slideSubjects: serializeSlideSetup(slideSetup),
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(String(payload?.error || `Failed to plan presentation (${response.status})`));
    }
    const nextPlan = payload?.plan as PresentationPlanResult | undefined;
    if (nextPlan) {
      setPlan(nextPlan);
      setAnalysis(nextPlan.analysis || null);
      setUiConfig((prev) => ({ ...prev, ...nextPlan.effectiveConfig }));
      if (Array.isArray(nextPlan.slidePlan) && nextPlan.slidePlan.length > 0) {
        setSlideSetup(
          nextPlan.slidePlan.map((item, idx) => ({
            title: `Slide ${idx + 1}`,
            subject: normalizeSubject(item.objective?.replace(/^Explain\s*/i, '').replace(/\.$/, ''), idx),
          }))
        );
      }
    }
    return pid;
  }, [autoMode, ensureProjectAndSources, platform, slideSetup, sourceText, uiConfig]);

  const continueToSettings = useCallback(async () => {
    if (!sourceText.trim()) {
      toast({
        variant: 'destructive',
        title: 'Add source material first',
        description: 'Upload, import, connect, or type your prompt before Analyze.',
      });
      return;
    }
    setIsPlanning(true);
    try {
      await runPlanningStep();
      goToStage('settings');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Analyze failed',
        description: error?.message || 'Please try again.',
      });
    } finally {
      setIsPlanning(false);
    }
  }, [goToStage, runPlanningStep, sourceText, toast]);

  const buildPresentation = useCallback(async () => {
    if (!sourceText.trim()) return;
    setIsBuilding(true);
    goToStage('building');
    try {
      const pid = await ensureProjectAndSources();
      const response = await fetch(`/api/presentation/${pid}/build`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: customTitle.trim() || undefined,
          prompt: sourceText,
          language: outputLanguage === 'auto' ? language : outputLanguage,
          autoMode,
          uiConfig: {
            ...uiConfig,
            platform,
            layoutStyle: layoutPreset === 'visual-first' ? 'visual_first' : layoutPreset === 'text-first' ? 'text_first' : 'mixed',
            captionStyle: bulletPreset === 'concise' ? 'short' : bulletPreset === 'expanded' ? 'detailed' : 'balanced',
          },
          slideSubjects: serializeSlideSetup(slideSetup),
          setupPreset: {
            title: presetTitle.trim() || 'Custom preset',
            themePreset,
            fontPreset,
            layoutPreset,
            bulletPreset,
          },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(payload?.error || `Failed to build presentation (${response.status})`));
      }
      const nextPlan = payload?.plan as PresentationPlanResult | undefined;
      setPlan(nextPlan || null);
      setAnalysis(nextPlan?.analysis || null);
      setPrototype(mapBuildToPrototype(payload));
      setSelectedSlideIndex(0);
      goToStage('preview');
      toast({ title: 'Presentation built', description: 'Deck generated successfully.' });
    } catch (error: any) {
      goToStage('settings');
      toast({
        variant: 'destructive',
        title: 'Could not build presentation',
        description: error?.message || 'Please try again.',
      });
    } finally {
      setIsBuilding(false);
    }
  }, [
    autoMode,
    bulletPreset,
    customTitle,
    ensureProjectAndSources,
    fontPreset,
    language,
    outputLanguage,
    layoutPreset,
    platform,
    presetTitle,
    slideSetup,
    sourceText,
    themePreset,
    toast,
    uiConfig,
    goToStage,
  ]);

  const downloadPresentation = useCallback(async () => {
    if (!prototype || !projectId) return;
    try {
      const response = await fetch(`/api/presentation/${projectId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: { kind: 'download' } }),
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err?.error || `Failed to export PPTX (${response.status})`);
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const safeTitle = (prototype.title || 'presentation').replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${safeTitle || 'presentation'}.pptx`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not export presentation',
        description: error?.message || 'Please try again.',
      });
    }
  }, [projectId, prototype, toast]);

  const exportToCloud = useCallback(async () => {
    if (!prototype || !projectId) return;
    setIsExportingCloud(true);
    try {
      const destinationKind =
        platform === 'google-slides' ? 'google' : platform === 'powerpoint' ? 'microsoft' : 'download';
      if (destinationKind === 'download') {
        await downloadPresentation();
        return;
      }
      const response = await fetch(`/api/presentation/${projectId}/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destination:
            destinationKind === 'google'
              ? { kind: 'google', targetApp: 'google-slides' }
              : {
                  kind: 'microsoft',
                  targetApp: 'powerpoint',
                  microsoftFolder: onedriveExportFolder
                    ? { folderId: onedriveExportFolder.folderId, driveId: onedriveExportFolder.driveId }
                    : undefined,
                },
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(payload?.error || `Export failed (${response.status})`));
      if (payload?.webUrl) window.open(payload.webUrl, '_blank', 'noopener,noreferrer');
      toast({
        title: destinationKind === 'google' ? 'Exported to Google' : 'Exported to Microsoft',
        description:
          payload?.webUrl
            ? destinationKind === 'google'
              ? 'Opening in Google Slides / Drive.'
              : 'Opening in PowerPoint / OneDrive.'
            : 'Export complete.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: platform === 'google-slides' ? 'Google export failed' : 'Microsoft export failed',
        description: `${error?.message || 'Could not export to cloud.'} Download is still available.`,
      });
    } finally {
      setIsExportingCloud(false);
    }
  }, [downloadPresentation, onedriveExportFolder, platform, projectId, prototype, toast]);

  const sharePreview = useCallback(async () => {
    if (!projectId) return;
    try {
      const response = await fetch(`/api/presentation/${projectId}/publish`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expiresInHours: 72 }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(payload?.error || `Share failed (${response.status})`));
      if (payload?.shareUrl) {
        await navigator.clipboard.writeText(payload.shareUrl);
        setActiveShareToken(typeof payload?.token === 'string' ? payload.token : null);
        setActiveShareUrl(payload.shareUrl);
      }
      toast({ title: 'Preview link copied', description: 'Public snapshot link copied to clipboard.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not publish preview',
        description: error?.message || 'Please try again.',
      });
    }
  }, [projectId, toast]);

  const revokeSharePreview = useCallback(async () => {
    if (!activeShareToken) return;
    try {
      const response = await fetch(`/api/tools/presentation/share/${activeShareToken}`, { method: 'DELETE' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(payload?.error || 'Failed to revoke share link'));
      setActiveShareToken(null);
      setActiveShareUrl(null);
      toast({ title: 'Share link revoked', description: 'Public preview access has been disabled.' });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not revoke share link',
        description: error?.message || 'Please try again.',
      });
    }
  }, [activeShareToken, toast]);

  useEffect(() => {
    if (!isSlideshow || !prototype) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsSlideshow(false);
      if (event.key === 'ArrowRight') setSelectedSlideIndex((prev) => Math.min(prev + 1, prototype.previewManifest.slides.length - 1));
      if (event.key === 'ArrowLeft') setSelectedSlideIndex((prev) => Math.max(prev - 1, 0));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isSlideshow, prototype]);

  const sidebar = <></>;

  const previewMeta = useMemo(() => {
    if (!prototype) return null;
    return `${prototype.slideCount} slides - ${prototype.analysis.dominantArchetype?.replace(/_/g, ' ') || 'presentation'}`;
  }, [prototype]);

  const cloudLabel = useMemo(() => {
    if (platform === 'google-slides') return 'Export + open Google Slides';
    if (platform === 'powerpoint') return 'Export + open PowerPoint';
    return 'Download .pptx';
  }, [platform]);

  const visibleRecents = useMemo(() => {
    const usage = getImportUsageMap();
    const query = importSearch.trim().toLowerCase();
    const filtered = importCatalog.filter((item) =>
      query ? item.name.toLowerCase().includes(query) : true
    );
    const sorted = [...filtered].sort((a, b) => {
      if (importSort === 'name') return a.name.localeCompare(b.name);
      if (importSort === 'most_used') return Number(usage[b.id] || 0) - Number(usage[a.id] || 0);
      const aTime = a.lastModifiedDateTime ? new Date(a.lastModifiedDateTime).getTime() : 0;
      const bTime = b.lastModifiedDateTime ? new Date(b.lastModifiedDateTime).getTime() : 0;
      return importSort === 'oldest' ? aTime - bTime : bTime - aTime;
    });
    return sorted;
  }, [getImportUsageMap, importCatalog, importSearch, importSort]);

  return (
    <WorkbenchShell title="Presentation" sidebar={sidebar} hideSidebar>
      <div className="relative mx-auto flex h-full w-full max-w-[1280px] flex-col gap-5 px-2 pb-6 pt-2 md:px-4 lg:px-6">
        <input
          ref={uploadInputRef}
          type="file"
          className="hidden"
          multiple
          onChange={(event) => void onUploadFiles(event.target.files)}
        />
        {(isPlanning || isBuilding) && (
          <div className="absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-background/70 backdrop-blur-[1px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {stage === 'preview' && prototype && (
          <Card className="border border-border/70">
            <CardContent className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{prototype.title}</p>
                  <p className="text-xs text-muted-foreground">{previewMeta}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {platform === 'powerpoint' && (
                    <OneDriveExportFolderPicker value={onedriveExportFolder} onChange={setOnedriveExportFolder} />
                  )}
                  <ActionBar
                    onDownload={() => void downloadPresentation()}
                    onExportCloud={() => void exportToCloud()}
                    onShare={() => void sharePreview()}
                    exportingCloud={isExportingCloud}
                    cloudLabel={cloudLabel}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {stage === 'preview' && activeShareUrl && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border border-border/60 bg-muted/35 p-2">
            <Badge variant="secondary">Public preview active</Badge>
            <a href={activeShareUrl} target="_blank" rel="noreferrer" className="text-xs underline underline-offset-2">
              {activeShareUrl}
            </a>
            <Button size="sm" variant="outline" onClick={() => void revokeSharePreview()}>
              Revoke link
            </Button>
          </div>
        )}

        {stage === 'source' && (
          <div className="flex min-h-[68vh] flex-col gap-5">
            <Card className="border border-border/60">
              <CardContent className="pt-5">
                {sourceAttachments.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-5 py-7 text-center">
                    <p className="text-sm font-medium">Add material to start</p>
                    <p className="mt-1 text-xs text-muted-foreground">Upload files, import recents, or connect Microsoft</p>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {sourceAttachments.map((source) => (
                      <div
                        key={source.key}
                        className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs transition-colors hover:border-emerald-500/60"
                      >
                        <p className="max-w-[260px] truncate font-medium">{source.fileName}</p>
                        <p className="text-[11px] text-muted-foreground">{source.sourceType.replace('_', ' ')}</p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {importOpen && (
              <Card className="border border-border/60">
                <CardContent className="pt-4">
                  <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                    <Input value={importSearch} onChange={(e) => setImportSearch(e.target.value)} placeholder="Search recents..." className="h-8" />
                    <select
                      value={importSourceFilter}
                      onChange={(e) => setImportSourceFilter(e.target.value as 'all' | 'tool_runs' | 'materials')}
                      className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                    >
                      <option value="all">All recents</option>
                      <option value="tool_runs">Tool runs</option>
                      <option value="materials">Materials</option>
                    </select>
                    <select
                      value={importSort}
                      onChange={(e) => setImportSort(e.target.value as 'newest' | 'oldest' | 'most_used' | 'name')}
                      className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                    >
                      <option value="newest">Time: Newest</option>
                      <option value="oldest">Time: Oldest</option>
                      <option value="most_used">Most used</option>
                      <option value="name">Name</option>
                    </select>
                  </div>
                  <div className="max-h-44 overflow-auto rounded-md border border-border/60 p-2">
                    {importCatalogLoading ? (
                      <div className="flex h-20 items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : visibleRecents.length === 0 ? (
                      <p className="px-1 py-2 text-xs text-muted-foreground">No recents found.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {visibleRecents.slice(0, 40).map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-2 rounded border border-border/50 px-2 py-1.5">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium">{item.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {item.lastModifiedDateTime ? new Date(item.lastModifiedDateTime).toLocaleDateString() : '-'}
                              </p>
                            </div>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => void importRecentsFiles([item])}>
                              Import
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="mt-auto rounded-2xl border border-border/60 bg-card/90 p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" className="h-9 px-3 text-xs" onClick={() => uploadInputRef.current?.click()}>
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    Upload
                  </Button>
                  <Button size="sm" variant="outline" className="h-9 px-3 text-xs" onClick={() => setImportOpen((prev) => !prev)}>
                    <FileUp className="mr-1.5 h-3.5 w-3.5" />
                    Import
                  </Button>
                  <div className="relative">
                    <Button size="sm" variant="outline" className="h-9 px-3 text-xs" onClick={() => setConnectMenuOpen((prev) => !prev)}>
                      Connect
                      <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                    {connectMenuOpen && (
                      <div className="absolute left-0 top-10 z-20 w-44 rounded-md border border-border bg-card p-1 shadow-md">
                        <button
                          type="button"
                          className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-muted"
                          onClick={() => {
                            setConnectMicrosoftOpen(true);
                            setConnectMenuOpen(false);
                          }}
                        >
                          Microsoft
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  className="h-9 px-4 text-xs"
                  onClick={() => void continueToSettings()}
                  disabled={(!sourceText.trim() && sourceAttachments.length === 0) || isPlanning || isBuilding}
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                  Analyze
                </Button>
              </div>

              <textarea
                value={sourceText}
                onChange={(event) => setSourceText(event.target.value)}
                placeholder="Describe your presentation or add material..."
                className="min-h-[56px] max-h-[124px] w-full resize-y rounded-xl border border-border/70 bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {connectMicrosoftOpen && (
              <Card className="mx-auto w-full max-w-[960px] border border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Microsoft Connect</CardTitle>
                  <CardDescription>Choose files to import into source.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                  <MicrosoftAppStrip returnTo="/tools/presentation" autoOpen hideLauncher />
                  <div className="flex justify-end">
                    <Button size="sm" variant="outline" onClick={() => setConnectMicrosoftOpen(false)}>
                      Close
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {stage === 'settings' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-card/90 p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="outline" className="h-9 px-3 text-xs" onClick={() => uploadInputRef.current?.click()}>
                  <Upload className="mr-1.5 h-3.5 w-3.5" />
                  Upload
                </Button>
                <Button size="sm" variant="outline" className="h-9 px-3 text-xs" onClick={() => setImportOpen((prev) => !prev)}>
                  <FileUp className="mr-1.5 h-3.5 w-3.5" />
                  Import
                </Button>
                <Button size="sm" variant="outline" className="h-9 px-3 text-xs" onClick={() => setConnectMicrosoftOpen(true)}>
                  Connect
                </Button>
              </div>
              <textarea
                value={sourceText}
                onChange={(event) => setSourceText(event.target.value)}
                placeholder="What should this presentation be about?"
                className="min-h-[56px] max-h-[124px] w-full resize-y rounded-xl border border-border/70 bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            <Card className="border border-border/60">
              <CardContent className="pt-4">
                <div className="flex flex-wrap gap-2">
                  {sourceAttachments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No sources attached yet.</p>
                  ) : (
                    sourceAttachments.map((source) => (
                      <div key={source.key} className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2 text-xs">
                        <p className="max-w-[260px] truncate font-medium">{source.fileName}</p>
                        <p className="text-[11px] text-muted-foreground">{source.sourceType.replace('_', ' ')}</p>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            {importOpen && (
              <Card className="border border-border/60">
                <CardContent className="pt-4">
                  <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                    <Input value={importSearch} onChange={(e) => setImportSearch(e.target.value)} placeholder="Search recents..." className="h-8" />
                    <select
                      value={importSourceFilter}
                      onChange={(e) => setImportSourceFilter(e.target.value as 'all' | 'tool_runs' | 'materials')}
                      className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                    >
                      <option value="all">All recents</option>
                      <option value="tool_runs">Tool runs</option>
                      <option value="materials">Materials</option>
                    </select>
                    <select
                      value={importSort}
                      onChange={(e) => setImportSort(e.target.value as 'newest' | 'oldest' | 'most_used' | 'name')}
                      className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                    >
                      <option value="newest">Time: Newest</option>
                      <option value="oldest">Time: Oldest</option>
                      <option value="most_used">Most used</option>
                      <option value="name">Name</option>
                    </select>
                  </div>
                  <div className="max-h-44 overflow-auto rounded-md border border-border/60 p-2">
                    {importCatalogLoading ? (
                      <div className="flex h-20 items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    ) : visibleRecents.length === 0 ? (
                      <p className="px-1 py-2 text-xs text-muted-foreground">No recents found.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {visibleRecents.slice(0, 40).map((item) => (
                          <div key={item.id} className="flex items-center justify-between gap-2 rounded border border-border/50 px-2 py-1.5">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-medium">{item.name}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {item.lastModifiedDateTime ? new Date(item.lastModifiedDateTime).toLocaleDateString() : '-'}
                              </p>
                            </div>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-[11px]" onClick={() => void importRecentsFiles([item])}>
                              Import
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="border border-border/60">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Detected from your material</CardTitle>
                <CardDescription>Recommended setup</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2 text-xs">
                <Badge variant="secondary">Type: {analysis?.dominantArchetype?.replace(/_/g, ' ') || 'mixed'}</Badge>
                <Badge variant="secondary">Audience: {analysis?.audienceGuess || 'general'}</Badge>
                <Badge variant="secondary">Slides: {analysis?.recommendedSlideCountMin || 8}-{analysis?.recommendedSlideCountMax || 12}</Badge>
                <Badge variant="secondary">Visuals: {analysis?.visualPotential || 'medium'}</Badge>
                <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => plan?.effectiveConfig && setUiConfig((prev) => ({ ...prev, ...plan.effectiveConfig }))}>
                  Apply suggestions
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setAdvancedOpen(true)}>
                  Fine-tune manually
                </Button>
                {Array.isArray(analysis?.warnings) && analysis!.warnings.length > 0 && (
                  <div className="w-full pt-1 text-[11px] text-muted-foreground">
                    {analysis!.warnings.slice(0, 2).map((warning, idx) => (
                      <p key={`warn-${idx}`}>- {warning}</p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="border border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Structure</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span>Slides</span>
                      <span>{uiConfig.slideCount || 10}</span>
                    </div>
                    <input
                      type="range"
                      min={4}
                      max={30}
                      value={Number(uiConfig.slideCount || 10)}
                      onChange={(e) => applyConfig({ slideCount: Number(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <label className="flex items-center justify-between text-xs"><span>Summary slide</span><input type="checkbox" checked={Boolean(uiConfig.includeSummary)} onChange={(e) => applyConfig({ includeSummary: e.target.checked })} /></label>
                  <label className="flex items-center justify-between text-xs"><span>Q&A slide</span><input type="checkbox" checked={Boolean(uiConfig.includeQA)} onChange={(e) => applyConfig({ includeQA: e.target.checked })} /></label>
                  <label className="flex items-center justify-between text-xs"><span>Speaker notes</span><input type="checkbox" checked={Boolean(uiConfig.includeSpeakerNotes)} onChange={(e) => applyConfig({ includeSpeakerNotes: e.target.checked })} /></label>
                </CardContent>
              </Card>

              <Card className="border border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Style</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Tone</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(['simple', 'academic', 'professional'] as const).map((tone) => (
                        <Button key={tone} type="button" size="sm" variant={uiConfig.tone === tone ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => applyConfig({ tone })}>
                          {tone[0].toUpperCase() + tone.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Density</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(['light', 'balanced', 'dense'] as const).map((density) => (
                        <Button key={density} type="button" size="sm" variant={uiConfig.density === density ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => applyConfig({ density })}>
                          {density[0].toUpperCase() + density.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Visuals</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Image usage</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(['low', 'medium', 'high'] as const).map((richness) => (
                        <Button key={richness} type="button" size="sm" variant={uiConfig.imageRichness === richness ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => applyConfig({ imageRichness: richness })}>
                          {richness[0].toUpperCase() + richness.slice(1)}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Visual source</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Button type="button" size="sm" variant={uiConfig.imageRichness === 'source_only' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => applyConfig({ imageRichness: 'source_only' })}>
                        Source only
                      </Button>
                      <Button type="button" size="sm" variant={uiConfig.imageRichness !== 'source_only' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => applyConfig({ imageRichness: 'medium' })}>
                        Allow internet
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Output</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Platform</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(['powerpoint', 'google-slides'] as const).map((item) => (
                        <Button key={item} type="button" size="sm" variant={platform === item ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setPlatform(item)}>
                          {item === 'powerpoint' ? 'PowerPoint' : 'Google Slides'}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Language</p>
                    <div className="flex flex-wrap gap-1.5">
                      <Button type="button" size="sm" variant={outputLanguage === 'nl' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setOutputLanguage('nl')}>Dutch</Button>
                      <Button type="button" size="sm" variant={outputLanguage === 'en' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setOutputLanguage('en')}>English</Button>
                      <Button type="button" size="sm" variant={outputLanguage === 'auto' ? 'default' : 'outline'} className="h-7 text-xs" onClick={() => setOutputLanguage('auto')}>Auto</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border border-border/60">
              <CardContent className="py-3">
                <button type="button" className="w-full text-left text-sm" onClick={() => setAdvancedOpen((prev) => !prev)}>
                  {advancedOpen ? 'Hide options' : 'More options'}
                </button>
                {advancedOpen && (
                  <div className="mt-3 grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
                    <label className="flex items-center justify-between"><span>References</span><input type="checkbox" checked={Boolean(uiConfig.includeReferences)} onChange={(e) => applyConfig({ includeReferences: e.target.checked })} /></label>
                    <label className="flex items-center justify-between"><span>Appendix</span><input type="checkbox" checked={Boolean(uiConfig.includeAppendix)} onChange={(e) => applyConfig({ includeAppendix: e.target.checked })} /></label>
                    <label className="flex items-center justify-between"><span>Strict citations</span><input type="checkbox" checked={uiConfig.citations === 'strict'} onChange={(e) => applyConfig({ citations: e.target.checked ? 'strict' : 'minimal' })} /></label>
                    <label className="flex items-center justify-between"><span>Preserve terminology</span><input type="checkbox" checked={Boolean(uiConfig.stepByStep)} onChange={(e) => applyConfig({ stepByStep: e.target.checked })} /></label>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex">
              <Button size="lg" onClick={() => void buildPresentation()} disabled={isBuilding || isPlanning}>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate presentation
              </Button>
            </div>
          </div>
        )}

        {stage === 'building' && (
          <Card className="border border-border/70">
            <CardContent className="py-10">
              <div className="mx-auto max-w-xl space-y-4 text-center">
                <p className="text-sm text-muted-foreground">Building presentation in 2 AI steps (plan to generate)...</p>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full w-1/2 animate-pulse rounded-full bg-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {stage === 'preview' && prototype && (
          <PresentationPreview
            manifest={prototype.previewManifest}
            selectedSlideIndex={selectedSlideIndex}
            onSelectSlide={setSelectedSlideIndex}
            onStartSlideshow={() => setIsSlideshow(true)}
            onDownload={() => void downloadPresentation()}
            onExportCloud={() => void exportToCloud()}
            onShare={() => void sharePreview()}
            exportingCloud={isExportingCloud}
            cloudLabel={cloudLabel}
          />
        )}

        {connectMicrosoftOpen && stage !== 'source' && (
          <Card className="mx-auto w-full max-w-[960px] border border-border/60">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Microsoft Connect</CardTitle>
              <CardDescription>Choose files to import into source.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <MicrosoftAppStrip returnTo="/tools/presentation" autoOpen hideLauncher />
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setConnectMicrosoftOpen(false)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {isSlideshow && prototype && (
        <SlideshowView
          manifest={prototype.previewManifest}
          selectedIndex={selectedSlideIndex}
          onSelect={setSelectedSlideIndex}
          onClose={() => setIsSlideshow(false)}
        />
      )}
    </WorkbenchShell>
  );
}

export default function PresentationPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      }
    >
      <PresentationPageContent />
    </Suspense>
  );
}





