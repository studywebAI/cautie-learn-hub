'use client';

import React, { Suspense, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, FileUp, Loader2, Plus, Sparkles, Trash2, Upload } from 'lucide-react';
import { AppContext } from '@/contexts/app-context';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { MicrosoftAppStrip } from '@/components/tools/microsoft-app-strip';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { PresentationPlanResult, PresentationUiConfig, PreviewManifest, SourceAnalysis } from '@/lib/presentation/types';
import { AdaptiveSettingsSidebar } from '@/components/presentation/adaptive-settings-sidebar';
import { PresentationPreview } from '@/components/presentation/presentation-preview';
import { SlideshowView } from '@/components/presentation/slideshow-view';
import { ActionBar } from '@/components/presentation/action-bar';
import { OneDriveExportFolderPicker } from '@/components/presentation/onedrive-export-folder-picker';

type PresentationPlatform = 'powerpoint' | 'google-slides' | 'keynote';
type WorkflowStage = 'upload' | 'subjects' | 'style' | 'building' | 'result';
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

function defaultSubjectSeed(count: number) {
  return Array.from({ length: Math.max(4, Math.min(12, count || 8)) }, (_, i) => `Subject ${i + 1}`);
}

const IMPORT_USAGE_STORAGE_KEY = 'presentation.import.usage.v1';

function mergeAttachments(prev: SourceAttachment[], next: SourceAttachment[]) {
  const map = new Map<string, SourceAttachment>();
  for (const item of prev) map.set(item.key, item);
  for (const item of next) map.set(item.key, item);
  return Array.from(map.values());
}

function PresentationPageContent() {
  const searchParams = useSearchParams();
  const projectIdFromParams = searchParams.get('projectId');
  const sourceTextFromParams = searchParams.get('sourceText');
  const initialSourceSeed = sourceTextFromParams || '';
  const appContext = useContext(AppContext);
  const language = appContext?.language ?? 'en';

  const [stage, setStage] = useState<WorkflowStage>('upload');
  const [sourceText, setSourceText] = useState(initialSourceSeed);
  const [sourceAttachments, setSourceAttachments] = useState<SourceAttachment[]>([]);
  const [customTitle, setCustomTitle] = useState('');
  const [platform, setPlatform] = useState<PresentationPlatform>('powerpoint');
  const [autoMode, setAutoMode] = useState(true);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [activeSubjectIndex, setActiveSubjectIndex] = useState(0);
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
  const [importSourceFilter, setImportSourceFilter] = useState<'all' | 'files' | 'recent'>('recent');
  const [importSort, setImportSort] = useState<'newest' | 'oldest' | 'most_used' | 'name'>('newest');
  const [importSearch, setImportSearch] = useState('');
  const [onedriveExportFolder, setOnedriveExportFolder] = useState<{
    folderId: string;
    folderName: string;
    driveId?: string;
  } | null>(null);
  const { toast } = useToast();
  const uploadInputRef = React.useRef<HTMLInputElement | null>(null);
  const allSubjectsNamed = useMemo(
    () => slideSetup.every((item) => item.title.trim().length > 0 && item.subject.trim().length > 0),
    [slideSetup]
  );
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
        slideSubjects: overrides?.slideSubjects ?? slideSetup.map((item) => `${item.title}: ${item.subject}`),
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
      const response = await fetch(`/api/integrations/microsoft/files?kind=onedrive&source=${importSourceFilter}`, {
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(payload?.error || 'Could not load recents'));
      const items: ImportCatalogItem[] = (Array.isArray(payload?.items) ? payload.items : [])
        .map((item: any) => ({
          id: String(item?.id || ''),
          name: String(item?.name || 'Untitled'),
          mimeType: typeof item?.mimeType === 'string' ? item.mimeType : undefined,
          webUrl: typeof item?.webUrl === 'string' ? item.webUrl : undefined,
          previewUrl: typeof item?.previewUrl === 'string' ? item.previewUrl : undefined,
          lastModifiedDateTime: typeof item?.lastModifiedDateTime === 'string' ? item.lastModifiedDateTime : undefined,
          isFile: Boolean(item?.isFile),
          isFolder: Boolean(item?.isFolder),
        }))
        .filter((item: ImportCatalogItem) => item.id && item.isFile && !item.isFolder);
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
      const extractResponse = await fetch('/api/integrations/microsoft/files/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map((item) => ({
            id: item.id,
            name: item.name,
            kind: 'onedrive',
            webUrl: item.webUrl,
            mimeType: item.mimeType,
          })),
        }),
      });
      const extractPayload = await extractResponse.json().catch(() => ({}));
      if (!extractResponse.ok) {
        throw new Error(String(extractPayload?.error || 'Could not extract selected files'));
      }
      const extractedItems = Array.isArray(extractPayload?.items) ? extractPayload.items : [];
      const byId = new Map<string, any>();
      for (const extracted of extractedItems) {
        const id = String(extracted?.id || '');
        if (id) byId.set(id, extracted);
      }

      const attachments: SourceAttachment[] = items.map((item) => {
        const extracted = byId.get(item.id);
        return {
          key: `recent:${item.id}`,
          sourceType: 'cloud_file',
          fileName: item.name,
          mimeType: item.mimeType,
          externalProvider: 'onedrive',
          externalFileId: item.id,
          extractedText: typeof extracted?.extractedText === 'string' ? extracted.extractedText : '',
          thumbnailUrl: item.previewUrl,
          parsedMetadata: {
            webUrl: item.webUrl,
            containsVisuals: true,
            lastModifiedDateTime: item.lastModifiedDateTime,
          },
        };
      });
      setSourceAttachments((prev) => mergeAttachments(prev, attachments));

      const chunks = attachments
        .map((item) => String(item.extractedText || '').trim())
        .filter(Boolean);
      if (chunks.length > 0) appendSourceChunk(chunks.join('\n\n'));
      if (chunks.length === 0) {
        appendSourceChunk(items.map((item) => `[${item.name}]\nCloud file attached as multimodal source.`).join('\n\n'));
      }

      bumpImportUsage(items.map((item) => item.id));
      toast({ title: 'Recents imported', description: `${items.length} file(s) added.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Recents import failed', description: error?.message || 'Try again.' });
    }
  }, [appendSourceChunk, bumpImportUsage, toast]);

  const onUploadFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const collected: string[] = [];
    const attachments: SourceAttachment[] = [];
    for (const file of Array.from(files)) {
      const textLike = file.type.startsWith('text/') || /\.(txt|md|csv|json|xml|html)$/i.test(file.name);
      const imageLike = file.type.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(file.name);
      const key = `local:${file.name}:${file.size}:${file.lastModified}`;
      if (textLike) {
        const text = await file.text().catch(() => '');
        if (text.trim()) {
          collected.push(`[${file.name}]\n${text.trim()}`);
          attachments.push({
            key,
            sourceType: 'file',
            fileName: file.name,
            mimeType: file.type || undefined,
            extractedText: text.trim(),
            parsedMetadata: {
              localUpload: true,
              size: file.size,
              containsVisuals: false,
            },
          });
          continue;
        }
      }
      collected.push(`[${file.name}]\nUploaded file included as source shell with metadata.`);
      attachments.push({
        key,
        sourceType: imageLike ? 'image' : 'file',
        fileName: file.name,
        mimeType: file.type || undefined,
        parsedMetadata: {
          localUpload: true,
          size: file.size,
          containsVisuals: imageLike,
        },
      });
    }
    appendSourceChunk(collected.join('\n\n'));
    setSourceAttachments((prev) => mergeAttachments(prev, attachments));
    if (uploadInputRef.current) uploadInputRef.current.value = '';
  }, [appendSourceChunk]);

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
          setStage(workflow.stage as WorkflowStage);
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
    const onPicked = (event: Event) => {
      const custom = event as CustomEvent<any>;
      const items = Array.isArray(custom?.detail?.items) ? custom.detail.items : [];
      const chunks = items
        .map((item: any) => String(item?.extractedText || '').trim())
        .filter(Boolean);
      if (chunks.length > 0) {
        appendSourceChunk(chunks.join('\n\n'));
        toast({ title: 'Microsoft files imported', description: `${chunks.length} file(s) added to source.` });
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
    };
    window.addEventListener('integration-source-picked', onPicked as EventListener);
    return () => window.removeEventListener('integration-source-picked', onPicked as EventListener);
  }, [appendSourceChunk, toast]);

  useEffect(() => {
    if (stage !== 'upload') return;
    void loadRecentsCatalog();
  }, [stage, importSourceFilter, loadRecentsCatalog]);

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
            slideSubjects: slideSetup.map((item) => `${item.title}: ${item.subject}`),
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
        slideSubjects: slideSetup.map((item) => `${item.title}: ${item.subject}`).filter(Boolean),
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

  const continueToSubjects = useCallback(async () => {
    if (!sourceText.trim()) {
      toast({
        variant: 'destructive',
        title: 'Add source material first',
        description: 'Upload or paste your source material before continuing.',
      });
      return;
    }
    setIsPlanning(true);
    try {
      await runPlanningStep();
      goToStage('subjects');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not prepare setup',
        description: error?.message || 'Please try again.',
      });
    } finally {
      setIsPlanning(false);
    }
  }, [goToStage, runPlanningStep, sourceText, toast]);

  const buildPresentation = useCallback(async () => {
    if (!sourceText.trim()) return;
    if (!allSubjectsNamed) {
      toast({
        variant: 'destructive',
        title: 'Fill in all slide subjects',
        description: 'Each slide needs a subject/title before generation.',
      });
      return;
    }
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
          language,
          autoMode,
          uiConfig: {
            ...uiConfig,
            platform,
            layoutStyle: layoutPreset === 'visual-first' ? 'visual_first' : layoutPreset === 'text-first' ? 'text_first' : 'mixed',
            captionStyle: bulletPreset === 'concise' ? 'short' : bulletPreset === 'expanded' ? 'detailed' : 'balanced',
          },
          slideSubjects: slideSetup.map((item, i) => `${normalizeSubject(item.title, i)}: ${normalizeSubject(item.subject, i)}`),
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
      goToStage('result');
      toast({ title: 'Presentation built', description: 'Deck generated with your slide subjects and style setup.' });
    } catch (error: any) {
      goToStage('style');
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
    layoutPreset,
    platform,
    presetTitle,
    slideSetup,
    sourceText,
    themePreset,
    toast,
    uiConfig,
    goToStage,
    allSubjectsNamed,
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
      <div className="relative flex h-full flex-col gap-4">
        {(isPlanning || isBuilding) && (
          <div className="absolute inset-0 z-30 flex items-center justify-center rounded-xl bg-background/70 backdrop-blur-[1px]">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        )}

        {prototype && (
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

        {activeShareUrl && (
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

        {stage === 'upload' && (
          <div className="flex min-h-[68vh] flex-col gap-4">
            <input
              ref={uploadInputRef}
              type="file"
              className="hidden"
              multiple
              onChange={(event) => void onUploadFiles(event.target.files)}
            />

            <Card className="border border-border/60">
              <CardContent className="pt-5">
                <div className="flex flex-wrap items-center gap-2">
                  {(['upload', 'sources', 'connect', 'recents', 'plan'] as const).map((node, idx, arr) => (
                    <React.Fragment key={node}>
                      <button
                        type="button"
                        className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs transition-colors hover:bg-emerald-50 hover:text-emerald-700"
                      >
                        {node}
                      </button>
                      {idx < arr.length - 1 && <div className="h-[2px] w-8 rounded-full bg-muted-foreground/40 transition-colors hover:bg-emerald-500" />}
                    </React.Fragment>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="mt-auto rounded-2xl border border-border/60 bg-card/90 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" className="h-8 px-3 text-xs" onClick={() => void continueToSubjects()} disabled={!sourceText.trim() || isPlanning || isBuilding}>
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                    Generate
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={() => uploadInputRef.current?.click()}>
                    <Upload className="mr-1.5 h-3.5 w-3.5" />
                    Upload
                  </Button>
                  <div className="relative">
                    <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={() => setConnectMenuOpen((prev) => !prev)}>
                      Connect
                      <ChevronDown className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                    {connectMenuOpen && (
                      <div className="absolute left-0 top-9 z-20 w-44 rounded-md border border-border bg-card p-1 shadow-md">
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
                <Button size="sm" variant="outline" className="h-8 px-3 text-xs" onClick={() => uploadInputRef.current?.click()}>
                  <FileUp className="mr-1.5 h-3.5 w-3.5" />
                  Upload
                </Button>
              </div>

              <div className="mb-3 rounded-xl border border-border/60 bg-background p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium">Recents</p>
                  <Badge variant="secondary">{sourceAttachments.length} attached</Badge>
                </div>
                <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                  <Input
                    value={importSearch}
                    onChange={(e) => setImportSearch(e.target.value)}
                    placeholder="Search recents..."
                    className="h-8"
                  />
                  <select
                    value={importSourceFilter}
                    onChange={(e) => setImportSourceFilter(e.target.value as 'all' | 'files' | 'recent')}
                    className="h-8 rounded-md border border-border bg-background px-2 text-xs"
                  >
                    <option value="recent">Recent</option>
                    <option value="files">Files</option>
                    <option value="all">All</option>
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
                <div className="mb-2 max-h-44 overflow-auto rounded-md border border-border/60 p-2">
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
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2 text-[11px]"
                            onClick={() => void importRecentsFiles([item])}
                          >
                            Import
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <textarea
                value={sourceText}
                onChange={(event) => setSourceText(event.target.value)}
                placeholder="Upload or paste source material here..."
                className="h-28 w-full resize-none rounded-xl border border-border/70 bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
            </div>

            {connectMicrosoftOpen && (
              <Card className="mx-auto w-full max-w-[1080px] border border-border/60">
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

        {stage === 'subjects' && (
          <Card className="border border-border/70">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <Button variant="outline" size="sm" onClick={() => goToStage('upload')}>
                  Back
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setSlideSetup((prev) => [...prev, { title: `Slide ${prev.length + 1}`, subject: '' }])}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add slide
                  </Button>
                  <Button size="sm" onClick={() => goToStage('style')} disabled={!allSubjectsNamed}>
                    Next
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="max-h-[560px] overflow-auto rounded-xl border border-border/60 bg-muted/35 p-2">
                {slideSetup.map((slide, idx) => (
                  <button
                    key={`subject-${idx}`}
                    type="button"
                    onClick={() => setActiveSubjectIndex(idx)}
                    className={`mb-2 w-full rounded-lg border p-2 text-left transition ${
                      idx === activeSubjectIndex ? 'scale-[1.02] border-foreground/50 bg-background' : 'border-border/50 bg-card/70 hover:bg-background/70'
                    }`}
                  >
                    <p className="text-[11px] text-muted-foreground">Slide {idx + 1}</p>
                    <p className="truncate text-xs font-medium">{normalizeSubject(slide.title, idx)}</p>
                  </button>
                ))}
              </div>

              <div className="rounded-xl border border-border/60 bg-card/70 p-5 transition-all duration-300">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-sm font-medium">Slide {activeSubjectIndex + 1}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSlideSetup((prev) => prev.filter((_, idx) => idx !== activeSubjectIndex));
                      setActiveSubjectIndex((prev) => Math.max(0, Math.min(prev, slideSetup.length - 2)));
                    }}
                    disabled={slideSetup.length <= 1}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Title</p>
                    <Input
                      value={slideSetup[activeSubjectIndex]?.title || ''}
                      onChange={(e) =>
                        setSlideSetup((prev) => prev.map((item, idx) => (idx === activeSubjectIndex ? { ...item, title: e.target.value } : item)))
                      }
                      placeholder="Slide title"
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Subject explanation</p>
                    <textarea
                      value={slideSetup[activeSubjectIndex]?.subject || ''}
                      onChange={(e) =>
                        setSlideSetup((prev) => prev.map((item, idx) => (idx === activeSubjectIndex ? { ...item, subject: e.target.value } : item)))
                      }
                      placeholder="Explain the subject of this slide..."
                      className="h-28 w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {stage === 'style' && (
          <div className="space-y-4 transition-all duration-300">
            <div className="flex items-center justify-between">
              <Button variant="outline" onClick={() => goToStage('subjects')}>
                Back
              </Button>
              <div className="flex items-center gap-2">
                <Input value={customTitle} onChange={(e) => setCustomTitle(e.target.value)} placeholder="Presentation title" className="h-8 w-64" />
                <div className="flex gap-1">
                  {(['powerpoint', 'google-slides', 'keynote'] as const).map((item) => (
                    <Button
                      key={item}
                      size="sm"
                      variant={platform === item ? 'default' : 'outline'}
                      onClick={() => setPlatform(item)}
                    >
                      {item === 'powerpoint' ? 'PowerPoint' : item === 'google-slides' ? 'Google Slides' : 'Keynote'}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card className="border border-border/70">
                <CardHeader>
                  <CardTitle className="text-base">Preset identity</CardTitle>
                  <CardDescription>Name and reuse your setup style.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Input value={presetTitle} onChange={(e) => setPresetTitle(e.target.value)} placeholder="Preset name" />
                  <div className="flex flex-wrap gap-2">
                    {THEME_PRESETS.map((preset) => (
                      <Button
                        key={preset.id}
                        type="button"
                        variant={themePreset === preset.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setThemePreset(preset.id)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border border-border/70">
                <CardHeader>
                  <CardTitle className="text-base">Typography & layout</CardTitle>
                  <CardDescription>Control fonts, bullet style, and structure behavior.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-2">
                    {FONT_PRESETS.map((preset) => (
                      <Button
                        key={preset.id}
                        type="button"
                        variant={fontPreset === preset.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFontPreset(preset.id)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {LAYOUT_PRESETS.map((preset) => (
                      <Button
                        key={preset.id}
                        type="button"
                        variant={layoutPreset === preset.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setLayoutPreset(preset.id)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {BULLET_PRESETS.map((preset) => (
                      <Button
                        key={preset.id}
                        type="button"
                        variant={bulletPreset === preset.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setBulletPreset(preset.id)}
                      >
                        {preset.label}
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="border border-border/70">
              <CardHeader>
                <CardTitle className="text-base">Detailed settings</CardTitle>
                <CardDescription>All platform and layout controls for this deck.</CardDescription>
              </CardHeader>
              <CardContent>
                <AdaptiveSettingsSidebar
                  analysis={analysis}
                  autoMode={autoMode}
                  onAutoModeChange={setAutoMode}
                  customTitle={customTitle}
                  onTitleChange={setCustomTitle}
                  platform={platform}
                  onPlatformChange={setPlatform}
                  uiConfig={uiConfig}
                  onPatch={applyConfig}
                  controlTiers={plan?.relevanceRankedControls || null}
                  disabled={isPlanning || isBuilding}
                />
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void buildPresentation()}>
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

        {stage === 'result' && prototype && (
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





