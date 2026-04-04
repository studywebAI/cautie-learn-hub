'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  ChevronDown,
  Clock3,
  File as FileIcon,
  UploadCloud,
  FolderOpen,
  FileText,
  Image,
  ImageIcon,
  Layers,
  Search,
  X,
  Loader2,
  Link2,
  Sparkles,
  Mic,
  Captions,
  StopCircle,
  Trash2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ReactNode } from 'react';
import { SOURCE_PLACEHOLDER_EXAMPLES } from '@/lib/tools/source-placeholder-examples';

interface SourceInputProps {
  value: string;
  onChange: (text: string) => void;
  onImageDataUriChange?: (imageDataUri: string | null) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  toolId?: 'notes' | 'quiz' | 'flashcards' | 'presentation';
  enableMic?: boolean;
  enableCaptions?: boolean;
  speechLanguage?: string;
  autoInsertCaptions?: boolean;
  enableBackendFallback?: boolean;
  sourceMergeMode?: 'append_labeled';
  topContent?: ReactNode;
  submitLabel?: string;
}

type SourceKind = 'url' | 'file' | 'caption' | 'image';

type SourceEntry = {
  id: string;
  kind: SourceKind;
  label: string;
  text: string;
  selected: boolean;
  loading?: boolean;
  error?: string;
  url?: string;
  urlKey?: string;
  previewUrl?: string;
  extractionStatus?: string;
  loadingSince?: number;
};

type RecentCatalogItem = {
  id: string;
  name: string;
  mimeType?: string;
  webUrl?: string;
  previewUrl?: string;
  lastModifiedDateTime?: string;
  isFile?: boolean;
  isFolder?: boolean;
};

type MaterialKind = 'text' | 'file' | 'image' | 'onedrive';

type MaterialEntry = {
  id: string;
  title: string;
  type: MaterialKind;
  preview: string;
  detail: string;
  dateIso: string;
};

const EXTRACTION_REQUEST_TIMEOUT_MS = 30_000;
const INTEGRATION_PENDING_MAX_POLLS = 20;
const SOURCE_LOADING_FAILSAFE_MS = 45_000;
const RECENTS_USAGE_STORAGE_KEY = 'tools.source_input.recents_usage.v1';
const MATERIALS_STORAGE_KEY = 'tools.source_input.materials.v1';

const URL_REGEX = /\b((?:https?:\/\/|www\.)[^\s<>"]+)/gi;

function isImageLike(name?: string, mimeType?: string) {
  const lowerName = String(name || '').toLowerCase();
  const lowerMime = String(mimeType || '').toLowerCase();
  return lowerMime.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/.test(lowerName);
}

const normalizeText = (value: string) => value.replace(/\s+/g, ' ').trim();

const appendLabeledBlock = (existing: string, _label: string, body: string) => {
  const cleanBody = body.trim();
  if (!cleanBody) return existing;
  const block = cleanBody;
  if (!existing.trim()) return block;
  return `${existing.trimEnd()}\n\n${block}`;
};

const formatTime = (epochMs?: number) => {
  if (!epochMs) return '--:--';
  const d = new Date(epochMs);
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${hh}:${mm}:${ss}`;
};

const normalizeUrl = (raw: string): string | null => {
  const input = raw.trim();
  if (!input) return null;
  const candidate = /^(https?:)?\/\//i.test(input) ? input : `https://${input}`;
  try {
    const parsed = new URL(candidate);
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
};

const urlKey = (url: string) => url;

const cleanupCaptionText = (value: string) => {
  const normalized = value
    .replace(/\b(uh+|um+|erm+|like)\b/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;!?])/g, '$1')
    .trim();

  if (!normalized) return '';
  const withPeriod = /[.!?]$/.test(normalized) ? normalized : `${normalized}.`;
  return withPeriod.charAt(0).toUpperCase() + withPeriod.slice(1);
};

const extractUrlsFromText = (text: string) => {
  const matches = Array.from(text.matchAll(URL_REGEX)).map((m) => m[0]);
  if (matches.length === 0) return { cleanedText: text, urls: [] as string[] };

  const cleanedText = text
    .replace(URL_REGEX, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trimStart();

  return { cleanedText, urls: matches };
};

function buildMicrosoftContextBlock(input: {
  app: string;
  name: string;
  mimeType?: string;
  webUrl?: string;
  extractedText?: string;
  extractionStatus?: string;
}) {
  const extracted = input.extractedText?.trim() || '';
  // Never emit metadata-only context to model prompts.
  return extracted;
}

function extractContextFileName(block: string) {
  const match = block.match(/^name:\s*(.+)$/im);
  return match?.[1]?.trim() || 'Imported file';
}

export function SourceInput({
  value,
  onChange,
  onImageDataUriChange,
  onSubmit,
  placeholder = 'Enter your text here...',
  disabled = false,
  toolId,
  enableMic = true,
  enableCaptions = true,
  speechLanguage = 'en',
  autoInsertCaptions: _autoInsertCaptions = true,
  enableBackendFallback: _enableBackendFallback = true,
  sourceMergeMode = 'append_labeled',
  topContent,
  submitLabel = 'Generate',
}: SourceInputProps) {
  const { toast } = useToast();
  const micSessionIdRef = useRef<string>('');
  const micChunkCountRef = useRef(0);
  const micChunkBytesRef = useRef(0);
  const debugMic = useCallback((event: string, details?: Record<string, unknown>) => {
    const payload = {
      event,
      sessionId: micSessionIdRef.current || null,
      ts: new Date().toISOString(),
      ...details,
    };
    console.log('[MIC_DEBUG][CLIENT]', payload);

    // Mirror client mic logs to server so they appear in Vercel logs too.
    try {
      void fetch('/api/tools/mic-debug', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
      });
    } catch {
      // Keep local flow resilient if debug logging fails.
    }
  }, []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fallbackRecorderRef = useRef<MediaRecorder | null>(null);
  const fallbackStreamRef = useRef<MediaStream | null>(null);
  const fallbackAudioChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);
  const recordingSegmentsRef = useRef<string[]>([]);
  const restartAttemptsRef = useRef(0);
  const isFinalizingRecordingRef = useRef(false);
  const initializedRef = useRef(false);
  const lastEmittedRef = useRef('');
  const integrationHydratedRef = useRef(false);
  const integrationPollTimeoutRef = useRef<number | null>(null);
  const integrationPendingPollCountRef = useRef(0);

  const [manualText, setManualText] = useState('');
  const [sources, setSources] = useState<SourceEntry[]>([]);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadedImageDataUri, setUploadedImageDataUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [urlInput, setUrlInput] = useState('');
  const [linksOpen, setLinksOpen] = useState(false);
  const [recentsOpen, setRecentsOpen] = useState(false);
  const [otherOpen, setOtherOpen] = useState(false);
  const [materialsOpen, setMaterialsOpen] = useState(false);
  const [recentsCatalog, setRecentsCatalog] = useState<RecentCatalogItem[]>([]);
  const [recentsLoading, setRecentsLoading] = useState(false);
  const [recentsSourceFilter, setRecentsSourceFilter] = useState<'recent' | 'files' | 'all'>('recent');
  const [recentsSort, setRecentsSort] = useState<'newest' | 'oldest' | 'most_used' | 'name'>('newest');
  const [recentsSearch, setRecentsSearch] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [removingSourceIds, setRemovingSourceIds] = useState<string[]>([]);
  const [materialsSearch, setMaterialsSearch] = useState('');
  const [materials, setMaterials] = useState<MaterialEntry[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [typedPlaceholder, setTypedPlaceholder] = useState('');

  const [micError, setMicError] = useState<string | null>(null);
  const [isFallbackRecording, setIsFallbackRecording] = useState(false);
  const [isTranscribingFallback, setIsTranscribingFallback] = useState(false);
  const [isFinalizingRecording, setIsFinalizingRecording] = useState(false);
  const [captionsOpen, setCaptionsOpen] = useState(false);

  useEffect(() => {
    isFinalizingRecordingRef.current = isFinalizingRecording;
  }, [isFinalizingRecording]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    if (value.trim()) setManualText(value);
  }, [value]);

  const upsertMaterial = useCallback((entry: Omit<MaterialEntry, 'id' | 'dateIso'>) => {
    setMaterials((prev) => {
      const normalizedTitle = entry.title.trim().toLowerCase();
      const normalizedDetail = entry.detail.trim().toLowerCase();
      const existing = prev.find((item) =>
        item.type === entry.type &&
        item.title.trim().toLowerCase() === normalizedTitle &&
        item.detail.trim().toLowerCase() === normalizedDetail
      );
      if (existing) {
        return prev.map((item) =>
          item.id === existing.id ? { ...item, preview: entry.preview, dateIso: new Date().toISOString() } : item
        );
      }
      const next: MaterialEntry = {
        id: `material-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: entry.title,
        type: entry.type,
        preview: entry.preview,
        detail: entry.detail,
        dateIso: new Date().toISOString(),
      };
      return [next, ...prev].slice(0, 500);
    });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(MATERIALS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const safe = parsed.filter((item: any) => item && typeof item.id === 'string');
      setMaterials(safe);
    } catch {
      // ignore invalid persisted data
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(MATERIALS_STORAGE_KEY, JSON.stringify(materials));
  }, [materials]);

  useEffect(() => {
    if (manualText.trim().length < 24) return;
    const timer = window.setTimeout(() => {
      const preview = manualText.trim().slice(0, 220);
      const firstWords = manualText.trim().split(/\s+/).slice(0, 8).join(' ');
      upsertMaterial({
        type: 'text',
        title: firstWords || 'Text source',
        preview,
        detail: manualText.trim(),
      });
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [manualText, upsertMaterial]);

  useEffect(() => {
    if (SOURCE_PLACEHOLDER_EXAMPLES.length === 0) return;
    const sample = SOURCE_PLACEHOLDER_EXAMPLES[Math.floor(Math.random() * SOURCE_PLACEHOLDER_EXAMPLES.length)];
    let index = 0;
    setTypedPlaceholder('');
    const interval = window.setInterval(() => {
      index += 1;
      setTypedPlaceholder(sample.slice(0, index));
      if (index >= sample.length) {
        window.clearInterval(interval);
      }
    }, 18);
    return () => window.clearInterval(interval);
  }, [toolId]);

  const hydrateIntegrationSources = useCallback(async (quiet = false) => {
    const response = await fetch('/api/integrations/context-sources?provider=microsoft&selected=1', {
      cache: 'no-store',
    });
    if (!response.ok) return;
    const json = await response.json();
    const items = Array.isArray(json?.items) ? json.items : [];
    const pendingCount = items.filter((item: any) => {
      const status = String(item?.extraction_status || '').toLowerCase();
      return status === 'pending';
    }).length;

    const mapped: SourceEntry[] = items.map((item: any) => {
      const appKey = String(item?.app || '').toLowerCase();
      const appLabel = appKey === 'powerpoint' ? 'PowerPoint' : appKey === 'onedrive' ? 'OneDrive' : 'Word';
      const name = String(item?.name || 'Untitled');
      const extracted = typeof item?.extracted_text === 'string' ? item.extracted_text.trim() : '';
      const webUrl = typeof item?.web_url === 'string' ? item.web_url : '';
      const previewUrl = typeof item?.metadata?.preview_url === 'string' ? item.metadata.preview_url : undefined;
      const extractionStatus = typeof item?.extraction_status === 'string' ? item.extraction_status : undefined;
      const normalizedStatus = String(extractionStatus || '').toLowerCase();
      const isLoading = normalizedStatus === 'pending' || (normalizedStatus === '' && !extracted);
      const hasError = normalizedStatus === 'error';
      return {
        id: `integration-${String(item?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)}`,
        kind: 'file',
        label: `${name} (${appLabel})`,
        text: extracted
          ? buildMicrosoftContextBlock({
            app: appKey || 'onedrive',
            name,
            mimeType: typeof item?.mime_type === 'string' ? item.mime_type : undefined,
            webUrl,
            extractedText: extracted,
            extractionStatus,
          })
          : '',
        selected: true,
        loading: isLoading,
        error: hasError ? 'Could not extract text from this file yet.' : undefined,
        previewUrl,
        extractionStatus: normalizedStatus || undefined,
      };
    });

    setSources((prev) => {
      const byId = new Map(prev.map((source) => [source.id, source]));
      const localOnly = prev.filter((source) => !source.id.startsWith('integration-'));
      const merged = mapped.map((source) => {
        const previous = byId.get(source.id);
        if (source.loading) {
          return {
            ...source,
            loadingSince: previous?.loadingSince || Date.now(),
          };
        }
        return { ...source, loadingSince: undefined };
      });
      return [...localOnly, ...merged];
    });

    if (!quiet) {
      toast({
        title: 'Microsoft sources ready',
        description: `${mapped.length} selected file${mapped.length === 1 ? '' : 's'} loaded.`,
      });
    }
    if (integrationPollTimeoutRef.current) {
      clearTimeout(integrationPollTimeoutRef.current);
      integrationPollTimeoutRef.current = null;
    }
    if (pendingCount > 0 && typeof window !== 'undefined') {
      integrationPendingPollCountRef.current += 1;
      if (integrationPendingPollCountRef.current >= INTEGRATION_PENDING_MAX_POLLS) {
        setSources((prev) =>
          prev.map((source) =>
            source.id.startsWith('integration-') && source.loading
              ? {
                  ...source,
                  loading: false,
                  extractionStatus: 'error',
                  error: 'Extraction timed out. Re-upload the file to try again.',
                }
              : source
          )
        );
        if (!quiet) {
          toast({
            variant: 'destructive',
            title: 'File extraction timed out',
            description: 'Please re-upload the file. Extraction took too long.',
          });
        }
        return;
      }
      integrationPollTimeoutRef.current = window.setTimeout(() => {
        void hydrateIntegrationSources(true);
      }, 1500);
    } else {
      integrationPendingPollCountRef.current = 0;
    }
  }, [toast]);

  const getRecentsUsageMap = useCallback((): Record<string, number> => {
    if (typeof window === 'undefined') return {};
    try {
      const raw = window.localStorage.getItem(RECENTS_USAGE_STORAGE_KEY);
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }, []);

  const bumpRecentsUsage = useCallback((ids: string[]) => {
    if (typeof window === 'undefined' || ids.length === 0) return;
    const usage = getRecentsUsageMap();
    for (const id of ids) usage[id] = Number(usage[id] || 0) + 1;
    window.localStorage.setItem(RECENTS_USAGE_STORAGE_KEY, JSON.stringify(usage));
  }, [getRecentsUsageMap]);

  const loadRecentsCatalog = useCallback(async () => {
    setRecentsLoading(true);
    try {
      const response = await fetch(`/api/integrations/microsoft/files?kind=onedrive&source=${recentsSourceFilter}`, {
        cache: 'no-store',
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(payload?.error || 'Could not load recents'));
      const items: RecentCatalogItem[] = (Array.isArray(payload?.items) ? payload.items : [])
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
        .filter((item: RecentCatalogItem) => item.id && item.isFile && !item.isFolder);
      setRecentsCatalog(items);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Recents failed',
        description: error?.message || 'Could not load recents.',
      });
    } finally {
      setRecentsLoading(false);
    }
  }, [recentsSourceFilter, toast]);

  const importRecentsItems = useCallback(async (items: RecentCatalogItem[]) => {
    if (items.length === 0) return;
    try {
      const response = await fetch('/api/integrations/microsoft/files/extract', {
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
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(payload?.error || 'Could not extract selected recents'));

      const extractedItems = Array.isArray(payload?.items) ? payload.items : [];
      const byId = new Map<string, any>();
      for (const extracted of extractedItems) {
        const id = String(extracted?.id || '');
        if (!id) continue;
        byId.set(id, extracted);
      }

      const recentsAsSources: SourceEntry[] = items.map((item, idx) => {
        const extracted = byId.get(item.id);
        const extractedText = typeof extracted?.extractedText === 'string' ? extracted.extractedText.trim() : '';
        const imageLike = isImageLike(item.name, item.mimeType);
        upsertMaterial({
          type: 'onedrive',
          title: item.name || 'OneDrive file',
          preview: extractedText.slice(0, 220) || item.name,
          detail: extractedText || item.webUrl || item.name,
        });
        return {
          id: `recents-${item.id}-${idx}`,
          kind: imageLike ? 'image' : 'file',
          label: `${item.name} (OneDrive)`,
          text: extractedText || (imageLike ? `[IMAGE] ${item.name}\nAttached as raw visual context.` : ''),
          selected: true,
          loading: false,
          previewUrl: item.previewUrl,
          extractionStatus: extractedText ? 'ready' : 'empty',
          error: undefined,
        };
      });
      setSources((prev) => [...prev.filter((entry) => !entry.id.startsWith('recents-')), ...recentsAsSources]);
      bumpRecentsUsage(items.map((item) => item.id));
      toast({
        title: 'Recents imported',
        description: `${items.length} file${items.length === 1 ? '' : 's'} imported.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Recents import failed',
        description: error?.message || 'Could not import selected recents.',
      });
    }
  }, [bumpRecentsUsage, toast, upsertMaterial]);

  useEffect(() => {
    if (integrationHydratedRef.current) return;
    integrationHydratedRef.current = true;
    void hydrateIntegrationSources(true);
  }, [hydrateIntegrationSources]);

  useEffect(() => {
    const onUpdated = () => {
      void hydrateIntegrationSources(true);
    };
    const onPicked = (event: Event) => {
      const custom = event as CustomEvent<any>;
      const detail = custom?.detail || {};
      const items = Array.isArray(detail?.items) ? detail.items : [];
      if (items.length === 0) return;
      for (const item of items) {
        const name = String(item?.name || 'OneDrive file');
        const extractedText = typeof item?.extractedText === 'string' ? item.extractedText : '';
        const webUrl = typeof item?.webUrl === 'string' ? item.webUrl : '';
        upsertMaterial({
          type: 'onedrive',
          title: name,
          preview: extractedText.slice(0, 220) || name,
          detail: extractedText || webUrl || name,
        });
      }
      const mapped: SourceEntry[] = items.map((item: any) => {
        const id = String(item?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
        const name = String(item?.name || 'Untitled');
        const mimeType = typeof item?.mimeType === 'string' ? item.mimeType : undefined;
        const webUrl = typeof item?.webUrl === 'string' ? item.webUrl : undefined;
        const extractedText = typeof item?.extractedText === 'string' ? item.extractedText : '';
        const previewUrl = typeof item?.previewUrl === 'string' ? item.previewUrl : undefined;
        const extractionStatus = typeof item?.extractionStatus === 'string' ? item.extractionStatus : undefined;
        const normalizedStatus = String(extractionStatus || '').toLowerCase();
        const isLoading = normalizedStatus === 'pending' || (normalizedStatus === '' && !extractedText.trim());
        const hasError = normalizedStatus === 'error';
        return {
          id: `integration-local-${id}`,
          kind: 'file',
          label: `${name} (OneDrive)`,
          text: extractedText
            ? buildMicrosoftContextBlock({
              app: 'onedrive',
              name,
              mimeType,
              webUrl,
              extractedText,
              extractionStatus: extractionStatus || 'ready',
            })
            : '',
          selected: true,
          loading: isLoading,
          error: hasError ? 'Could not extract text from this file yet.' : undefined,
          previewUrl,
          extractionStatus: normalizedStatus || undefined,
          loadingSince: isLoading ? Date.now() : undefined,
        };
      });
      setSources((prev) => {
        const withoutOldLocal = prev.filter((source) => !source.id.startsWith('integration-local-'));
        return [...withoutOldLocal, ...mapped];
      });
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('integration-sources-updated', onUpdated as EventListener);
      window.addEventListener('integration-source-picked', onPicked as EventListener);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('integration-sources-updated', onUpdated as EventListener);
        window.removeEventListener('integration-source-picked', onPicked as EventListener);
      }
      if (integrationPollTimeoutRef.current) {
        clearTimeout(integrationPollTimeoutRef.current);
        integrationPollTimeoutRef.current = null;
      }
    };
  }, [hydrateIntegrationSources, upsertMaterial]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const timer = window.setInterval(() => {
      setSources((prev) => {
        let changed = false;
        const now = Date.now();
        const next = prev.map((source) => {
          if (!source.loading) return source;
          const startedAt = source.loadingSince || now;
          if (now - startedAt < SOURCE_LOADING_FAILSAFE_MS) return source;
          changed = true;
          return {
            ...source,
            loading: false,
            loadingSince: undefined,
            extractionStatus: 'error',
            error: 'Extraction timed out. Re-upload the file to try again.',
          };
        });
        return changed ? next : prev;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  const compiledSource = useMemo(() => {
    let next = '';

    if (manualText.trim()) {
      next = sourceMergeMode === 'append_labeled'
        ? appendLabeledBlock(next, 'MANUAL_TEXT', manualText)
        : manualText;
    }

    for (const source of sources) {
      const body = source.text.trim() || source.url || '';
      if (!body) continue;
      next = sourceMergeMode === 'append_labeled'
        ? appendLabeledBlock(next, source.label, body)
        : body;
    }

    return next;
  }, [manualText, sourceMergeMode, sources]);

  useEffect(() => {
    if (compiledSource === lastEmittedRef.current) return;
    lastEmittedRef.current = compiledSource;
    onChange(compiledSource);
  }, [compiledSource, onChange]);

  useEffect(() => {
    onImageDataUriChange?.(uploadedImageDataUri);
  }, [onImageDataUriChange, uploadedImageDataUri]);

  const captionSources = useMemo(
    () => sources.filter((source) => source.kind === 'caption'),
    [sources]
  );
  const integrationFileCards = useMemo(
    () =>
      sources
        .filter((source) => source.kind === 'file' && source.id.startsWith('integration-'))
        .map((source) => ({
          id: source.id,
          name: source.label || extractContextFileName(source.text),
          preview: '',
          previewUrl: source.previewUrl,
          loading: Boolean(source.loading),
          error: source.error,
          isRemote: source.id.startsWith('integration-') && !source.id.startsWith('integration-local-'),
        })),
    [sources]
  );
  const urlSources = useMemo(
    () => sources.filter((source) => source.kind === 'url'),
    [sources]
  );
  const visibleRecents = useMemo(() => {
    const usage = getRecentsUsageMap();
    const query = recentsSearch.trim().toLowerCase();
    const filtered = recentsCatalog.filter((item) => (query ? item.name.toLowerCase().includes(query) : true));
    const sorted = [...filtered].sort((a, b) => {
      if (recentsSort === 'name') return a.name.localeCompare(b.name);
      if (recentsSort === 'most_used') return Number(usage[b.id] || 0) - Number(usage[a.id] || 0);
      const aTime = a.lastModifiedDateTime ? new Date(a.lastModifiedDateTime).getTime() : 0;
      const bTime = b.lastModifiedDateTime ? new Date(b.lastModifiedDateTime).getTime() : 0;
      return recentsSort === 'oldest' ? aTime - bTime : bTime - aTime;
    });
    return sorted;
  }, [getRecentsUsageMap, recentsCatalog, recentsSearch, recentsSort]);

  useEffect(() => {
    void loadRecentsCatalog();
  }, [loadRecentsCatalog, recentsSourceFilter]);

  const addSource = useCallback((entry: SourceEntry) => {
    setSources((prev) => [...prev, entry]);
  }, []);

  const upsertUrlSource = useCallback(async (rawUrl: string) => {
    const normalized = normalizeUrl(rawUrl);
    if (!normalized) {
      toast({ variant: 'destructive', title: 'Invalid URL', description: 'Enter a valid website URL.' });
      return;
    }
    setUrlInput(normalized);
    setLinksOpen(true);

    const host = new URL(normalized).hostname;
    const key = urlKey(normalized);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let inserted = false;

    setSources((prev) => {
      const exists = prev.some((s) => s.kind === 'url' && s.urlKey === key);
      if (exists) return prev;
      inserted = true;
      return [
        ...prev,
        {
          id,
          kind: 'url',
          label: `URL (${host})`,
          text: '',
          selected: true,
          loading: true,
          url: normalized,
          urlKey: key,
        },
      ];
    });

    if (!inserted) {
      toast({ title: 'Link already added', description: 'That exact link is already in the list.' });
      return;
    }

    setIsFetchingUrl(true);
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), EXTRACTION_REQUEST_TIMEOUT_MS);
      const res = await fetch('/api/tools/extract-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalized }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) throw new Error('import_failed');

      const data = await res.json();
      const extracted = typeof data?.text === 'string' ? data.text.trim() : '';

      setSources((prev) => prev.map((s) => {
        if (s.id !== id) return s;
        if (!extracted) {
          return { ...s, loading: false, error: 'No readable text was found on this page.' };
        }
        return { ...s, text: extracted, loading: false, error: undefined };
      }));

      if (extracted) {
        toast({ title: 'Content imported', description: `Extracted text from ${host}` });
      }
    } catch {
      setSources((prev) => prev.map((s) => (
        s.id === id ? { ...s, loading: false, error: 'Could not fetch this URL right now.' } : s
      )));
      toast({ variant: 'destructive', title: 'Import failed', description: 'Could not fetch content from this URL.' });
    } finally {
      setIsFetchingUrl(false);
    }
  }, [toast]);

  const handleAddLink = async () => {
    const raw = urlInput.trim();
    if (!raw) return;
    await upsertUrlSource(raw);
    setUrlInput('');
  };

  const removeSource = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  const removeIntegrationSource = useCallback(async (sourceId: string) => {
    const query = new URLSearchParams({ sourceId }).toString();
    const res = await fetch(`/api/integrations/context-sources?${query}`, { method: 'DELETE' });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      const message = typeof payload?.error === 'string' ? payload.error : 'Could not remove selected file.';
      throw new Error(message);
    }
  }, []);

  const handleRemoveFileCard = useCallback(
    async (fileId: string, isRemote: boolean) => {
      setSources((prev) => prev.filter((s) => s.id !== fileId));
      if (!isRemote) return;

      setRemovingSourceIds((prev) => (prev.includes(fileId) ? prev : [...prev, fileId]));
      try {
        const remoteSourceId = fileId.replace(/^integration-/, '');
        await removeIntegrationSource(remoteSourceId);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Could not remove file',
          description: String(error?.message || 'Try again.'),
        });
        void hydrateIntegrationSources(true);
      } finally {
        setRemovingSourceIds((prev) => prev.filter((id) => id !== fileId));
      }
    },
    [hydrateIntegrationSources, removeIntegrationSource, toast]
  );

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, pickerKind: 'file' | 'image' = 'file') => {
    const file = e.target.files?.[0];
    if (!file) return;

    const supported = pickerKind === 'image'
      ? ['image/jpeg', 'image/png', 'image/webp']
      : [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/png',
        'image/webp',
      ];

    if (!supported.includes(file.type)) {
      toast({ variant: 'destructive', title: 'Unsupported file type', description: pickerKind === 'image' ? 'Upload JPG, PNG or WebP.' : 'Upload a PDF, DOCX, TXT, JPG, PNG or WebP file.' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Max file size is 10MB.' });
      return;
    }

    const isUploadedImage = file.type.startsWith('image/');
    setUploadedFile(file);
    if (isUploadedImage) {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUri = typeof reader.result === 'string' ? reader.result : null;
        setUploadedImageDataUri(dataUri);
        upsertMaterial({
          type: 'image',
          title: file.name,
          preview: dataUri || file.name,
          detail: file.name,
        });
      };
      reader.onerror = () => setUploadedImageDataUri(null);
      reader.readAsDataURL(file);
    } else {
      setUploadedImageDataUri(null);
    }
    setIsProcessing(true);

    try {
      let extractedText = '';
      if (isUploadedImage) {
        addSource({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          kind: 'image',
          label: `IMAGE (${file.name})`,
          text: `[IMAGE] ${file.name}\nAttached as raw visual context.`,
          selected: true,
        });
        return;
      }

      if (file.type === 'text/plain') {
        extractedText = await file.text();
      } else {
        const formData = new FormData();
        formData.append('file', file);
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), EXTRACTION_REQUEST_TIMEOUT_MS);
        const res = await fetch('/api/tools/extract-text', { method: 'POST', body: formData, signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          const data = await res.json();
          extractedText =
            (typeof data?.layoutText === 'string' && data.layoutText.trim()) ||
            (typeof data?.text === 'string' ? data.text : '');
        }
      }

      addSource({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        kind: 'file',
        label: `FILE (${file.name})`,
        text: extractedText,
        selected: true,
        error: extractedText.trim() ? undefined : 'Could not extract text automatically.',
      });
      upsertMaterial({
        type: 'file',
        title: file.name,
        preview: extractedText.slice(0, 220) || file.name,
        detail: extractedText || file.name,
      });

      if (!extractedText.trim()) {
        toast({
          variant: 'destructive',
          title: 'Could not read file text',
          description: 'This file was uploaded, but readable text could not be extracted. Re-upload or use another file.',
        });
      }
    } catch {
      if (!isUploadedImage) {
        addSource({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          kind: 'file',
          label: `FILE (${file.name})`,
          text: '',
          selected: true,
          error: 'Could not extract text automatically.',
        });
      }
      toast({
        variant: 'destructive',
        title: 'Could not read file text',
        description: 'Automatic extraction failed. Re-upload or paste the important text directly.',
      });
    } finally {
      setIsProcessing(false);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const input = fileInputRef.current;
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }
  };

  const appendRecordingSegment = useCallback((text: string) => {
    const clean = normalizeText(text);
    if (!clean) return;
    const prev = recordingSegmentsRef.current[recordingSegmentsRef.current.length - 1];
    if (prev && prev.toLowerCase() === clean.toLowerCase()) {
      return;
    }
    recordingSegmentsRef.current = [...recordingSegmentsRef.current, clean];
  }, []);

  const beginRecordingSession = useCallback(() => {
    micSessionIdRef.current = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    micChunkCountRef.current = 0;
    micChunkBytesRef.current = 0;
    restartAttemptsRef.current = 0;
    recordingStartedAtRef.current = Date.now();
    recordingSegmentsRef.current = [];
    setIsFinalizingRecording(false);
    debugMic('recording_session_started', {
      speechLanguage,
      enableMic,
      enableCaptions,
      manualTextLength: manualText.length,
      sourceCount: sources.length,
    });
  }, [debugMic, enableCaptions, enableMic, manualText.length, sources.length, speechLanguage]);

  const finalizeRecordingSession = useCallback(() => {
    const joined = normalizeText(recordingSegmentsRef.current.join(' '));
    const captionText = cleanupCaptionText(joined);
    const start = recordingStartedAtRef.current ?? Date.now();
    const end = Date.now();

    recordingStartedAtRef.current = null;
    recordingSegmentsRef.current = [];
    debugMic('recording_session_finalize', {
      joinedLength: joined.length,
      captionLength: captionText.length,
      chunks: micChunkCountRef.current,
      chunkBytes: micChunkBytesRef.current,
      start,
      end,
      durationMs: end - start,
    });

    if (!captionText) {
      setMicError('No speech was detected in the recording.');
      debugMic('recording_session_no_speech');
      return;
    }

    const captionSource: SourceEntry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      kind: 'caption',
      label: `CAPTION (${formatTime(start)}-${formatTime(end)})`,
      text: captionText,
      selected: true,
    };

    setSources((prev) => [...prev, captionSource]);
    setManualText((prev) => (prev.trim() ? `${prev.trimEnd()}\n\n${captionText}` : captionText));
    debugMic('recording_session_caption_inserted', {
      captionSourceId: captionSource.id,
      captionPreview: captionText.slice(0, 100),
    });
  }, [debugMic]);

  const cleanupFallbackStream = useCallback(() => {
    const stream = fallbackStreamRef.current;
    fallbackStreamRef.current = null;
    if (!stream) return;
    for (const track of stream.getTracks()) {
      track.stop();
    }
  }, []);

  const transcribeFallbackAudio = useCallback(async (blob: Blob) => {
    if (blob.size === 0) {
      debugMic('transcribe_skipped_empty_blob');
      return;
    }
    setIsTranscribingFallback(true);
    const transcribeStartedAt = Date.now();
    debugMic('transcribe_started', {
      blobType: blob.type,
      blobSize: blob.size,
      speechLanguage,
    });
    try {
      const fileExt = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const file = new File([blob], `speech.${fileExt}`, { type: blob.type || 'audio/webm' });
      const formData = new FormData();
      formData.append('file', file);
      formData.append('language', speechLanguage);

      const response = await fetch('/api/tools/transcribe', {
        method: 'POST',
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));
      debugMic('transcribe_response', {
        ok: response.ok,
        status: response.status,
        durationMs: Date.now() - transcribeStartedAt,
        payloadKeys: Object.keys(payload || {}),
        textLength: typeof payload?.text === 'string' ? payload.text.length : 0,
        error: payload?.error || null,
      });
      if (!response.ok) {
        throw new Error(payload?.error || 'Transcription failed');
      }

      const text = normalizeText(payload?.text || '');
      if (text) {
        appendRecordingSegment(text);
        debugMic('transcribe_text_received', {
          normalizedLength: text.length,
          normalizedPreview: text.slice(0, 120),
        });
        finalizeRecordingSession();
      } else {
        setMicError('No speech was detected in the recording.');
        debugMic('transcribe_no_text');
      }
    } catch (error: any) {
      setMicError(error?.message || 'Could not transcribe fallback audio.');
      debugMic('transcribe_error', {
        message: error?.message || null,
        durationMs: Date.now() - transcribeStartedAt,
      });
      toast({
        variant: 'destructive',
        title: 'Transcription error',
        description: error?.message || 'Could not transcribe fallback audio.',
      });
    } finally {
      setIsTranscribingFallback(false);
      setIsFinalizingRecording(false);
      debugMic('transcribe_finished', {
        durationMs: Date.now() - transcribeStartedAt,
      });
    }
  }, [appendRecordingSegment, debugMic, finalizeRecordingSession, speechLanguage, toast]);

  const startFallbackRecording = useCallback(async () => {
    if (isFallbackRecording) return;
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      setMicError('Microphone is unavailable in this environment.');
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setMicError('Browser does not support audio recording fallback.');
      return;
    }

    try {
      debugMic('media_devices_request_start');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      fallbackStreamRef.current = stream;
      fallbackAudioChunksRef.current = [];
      for (const track of stream.getAudioTracks()) {
        track.onended = () => {
          debugMic('audio_track_ended', { label: track.label, readyState: track.readyState });
        };
        track.onmute = () => {
          debugMic('audio_track_muted', { label: track.label, readyState: track.readyState });
        };
        track.onunmute = () => {
          debugMic('audio_track_unmuted', { label: track.label, readyState: track.readyState });
        };
      }
      debugMic('media_devices_request_success', {
        audioTracks: stream.getAudioTracks().length,
        trackLabels: stream.getAudioTracks().map((t) => t.label || 'unknown'),
      });

      const preferredMime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';
      const recorder = preferredMime
        ? new MediaRecorder(stream, { mimeType: preferredMime })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data?.size) {
          fallbackAudioChunksRef.current.push(event.data);
          micChunkCountRef.current += 1;
          micChunkBytesRef.current += event.data.size;
          debugMic('recorder_chunk', {
            chunkIndex: micChunkCountRef.current,
            size: event.data.size,
            totalBytes: micChunkBytesRef.current,
            recorderState: recorder.state,
          });
        }
      };

      recorder.onerror = (event) => {
        setMicError('Audio recording failed.');
        debugMic('recorder_error', {
          recorderState: recorder.state,
          eventType: event.type,
        });
      };

      recorder.onstop = async () => {
        const blob = new Blob(fallbackAudioChunksRef.current, {
          type: recorder.mimeType || 'audio/webm',
        });
        const recordingDurationMs = recordingStartedAtRef.current
          ? Date.now() - recordingStartedAtRef.current
          : null;
        const unexpectedEarlyStop =
          !isFinalizingRecordingRef.current &&
          (blob.size === 0 || micChunkCountRef.current === 0) &&
          !!recordingDurationMs &&
          recordingDurationMs < 3000;
        debugMic('recorder_stopped', {
          recorderMimeType: recorder.mimeType,
          finalBlobType: blob.type,
          finalBlobBytes: blob.size,
          chunks: micChunkCountRef.current,
          totalChunkBytes: micChunkBytesRef.current,
          recordingDurationMs,
          expectedStop: isFinalizingRecordingRef.current,
          unexpectedEarlyStop,
        });
        fallbackAudioChunksRef.current = [];

        if (unexpectedEarlyStop && restartAttemptsRef.current < 1) {
          restartAttemptsRef.current += 1;
          debugMic('recorder_auto_restart', { attempt: restartAttemptsRef.current });
          cleanupFallbackStream();
          setIsFallbackRecording(false);
          setTimeout(() => {
            void startFallbackRecording();
          }, 180);
          return;
        }

        await transcribeFallbackAudio(blob);
        cleanupFallbackStream();
      };

      fallbackRecorderRef.current = recorder;
      setIsFallbackRecording(true);
      debugMic('recorder_start', {
        recorderMimeType: recorder.mimeType,
        preferredMime,
      });
      recorder.start(250);
    } catch (error: any) {
      cleanupFallbackStream();
      setMicError(error?.message || 'Could not access microphone for fallback recording.');
      setIsFinalizingRecording(false);
      debugMic('media_devices_request_error', {
        message: error?.message || null,
      });
    }
  }, [cleanupFallbackStream, debugMic, isFallbackRecording, transcribeFallbackAudio]);

  const stopFallbackRecording = useCallback(() => {
    const recorder = fallbackRecorderRef.current;
    fallbackRecorderRef.current = null;
    if (!recorder) {
      cleanupFallbackStream();
      setIsFallbackRecording(false);
      return;
    }

    if (recorder.state !== 'inactive') {
      debugMic('recorder_stop_requested', { recorderState: recorder.state });
      recorder.stop();
    } else {
      cleanupFallbackStream();
      debugMic('recorder_already_inactive');
    }
    setIsFallbackRecording(false);
  }, [cleanupFallbackStream, debugMic]);

  const stopListening = useCallback(() => {
    const wasListening = isFallbackRecording;
    if (!wasListening) return;

    setIsFinalizingRecording(true);
    debugMic('stop_listening');
    stopFallbackRecording();
  }, [debugMic, isFallbackRecording, stopFallbackRecording]);

  const startListening = useCallback(() => {
    setMicError(null);
    debugMic('start_listening');
    beginRecordingSession();
    void startFallbackRecording();
  }, [beginRecordingSession, debugMic, startFallbackRecording]);

  useEffect(() => {
    return () => {
      const recorder = fallbackRecorderRef.current;
      fallbackRecorderRef.current = null;
      if (recorder && recorder.state !== 'inactive') {
        try {
          recorder.stop();
        } catch {
          // no-op during teardown
        }
      }
      cleanupFallbackStream();
    };
  }, [cleanupFallbackStream]);

  const updateSourceText = (id: string, text: string) => {
    setSources((prev) => prev.map((source) => (
      source.id === id ? { ...source, text } : source
    )));
  };

  const handleManualTextChange = (raw: string) => {
    const { cleanedText, urls } = extractUrlsFromText(raw);
    setManualText(cleanedText);
    if (uploadedFile) {
      setUploadedFile(null);
      setUploadedImageDataUri(null);
    }

    if (urls.length > 0) {
      setLinksOpen(true);
      void Promise.all(urls.map((u) => upsertUrlSource(u)));
    }
  };

  const isImage = uploadedFile?.type.startsWith('image/');
  const wordCount = manualText.trim() ? manualText.trim().split(/\s+/).length : 0;
  const charCount = manualText.length;
  const hasPendingSource = sources.some((source) => Boolean(source.loading));
  const hasFileSourceWithoutText = sources.some(
    (source) => source.kind === 'file' && !source.loading && !source.text.trim() && !source.previewUrl
  );
  const canGenerate = compiledSource.trim().length > 0 && !hasPendingSource && !hasFileSourceWithoutText;
  const visibleMaterials = useMemo(() => {
    const q = materialsSearch.trim().toLowerCase();
    const base = q
      ? materials.filter((item) => item.title.toLowerCase().includes(q) || item.detail.toLowerCase().includes(q))
      : materials;
    return [...base].sort((a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime());
  }, [materials, materialsSearch]);
  const selectedMaterial = useMemo(
    () => materials.find((item) => item.id === selectedMaterialId) || null,
    [materials, selectedMaterialId]
  );

  const openMicrosoftPicker = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('cautie:open-microsoft-picker'));
  }, []);

  const submitAndSave = useCallback(() => {
    if (manualText.trim()) {
      const firstWords = manualText.trim().split(/\s+/).slice(0, 8).join(' ');
      upsertMaterial({
        type: 'text',
        title: firstWords || 'Text source',
        preview: manualText.trim().slice(0, 220),
        detail: manualText.trim(),
      });
    }
    onSubmit?.();
  }, [manualText, onSubmit, upsertMaterial]);

  return (
    <div
      className="h-full flex flex-col gap-3 relative"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {captionsOpen && (
        <div className="absolute right-0 top-0 z-20 flex h-full w-full flex-col gap-3 border bg-background p-3 md:w-[360px]">
          <div className="flex items-center justify-between">
            <p className="text-sm">Captions</p>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCaptionsOpen(false)}>Close</Button>
          </div>

          {captionSources.length === 0 ? (
            <div className="rounded-md border p-3 text-xs text-muted-foreground">
              No captions yet. Record with Mic and each finished recording appears here.
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-auto space-y-2 pr-1">
                {captionSources.map((caption) => (
                  <div key={caption.id} className="rounded-md border p-2 text-xs space-y-2">
                    <div className="flex items-center gap-2">
                      <p className="text-muted-foreground">{caption.label}</p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="ml-auto h-5 w-5 shrink-0"
                        onClick={() => removeSource(caption.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Textarea
                      value={caption.text}
                      onChange={(e) => {
                        updateSourceText(caption.id, e.target.value);
                      }}
                      className="min-h-[72px] text-xs"
                    />
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {topContent && <div className="sr-only">{topContent}</div>}

      {uploadedFile && (
        <div className="flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1.5 text-xs">
          {isImage ? <ImageIcon className="h-3.5 w-3.5 shrink-0 text-primary" /> : <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />}
          <span className="truncate">{uploadedFile.name}</span>
          {isProcessing && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-4 w-4 shrink-0"
            onClick={() => {
              setUploadedFile(null);
              setUploadedImageDataUri(null);
            }}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {integrationFileCards.length > 0 && (
        <div className="max-h-[292px] overflow-y-auto pr-1">
          <div className="flex flex-wrap gap-1.5">
          {integrationFileCards.map((file) => (
            <div
              key={file.id}
              className="group h-[146px] w-[132px] sm:h-[154px] sm:w-[142px] md:h-[164px] md:w-[154px] rounded-xl bg-sidebar-accent/35 p-2 shadow-sm transition-transform duration-150 hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="relative mb-1.5 h-[90px] sm:h-[96px] md:h-[104px] rounded-lg bg-sidebar-accent/75 overflow-hidden">
                {file.previewUrl && !file.loading ? (
                  <>
                    <img
                      src={file.previewUrl}
                      alt={`${file.name} preview`}
                      className="h-full w-full object-cover object-top [transform:scale(1.14)] [transform-origin:top_center]"
                    />
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/40 to-transparent p-1">
                      <p className="text-[9px] text-white/95 font-medium tracking-wide">CAUTIE PREVIEW</p>
                    </div>
                  </>
                ) : (
                  <div className="h-full w-full p-1.5">
                    <div className="mb-1 flex items-center gap-1">
                      {file.loading ? (
                        <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                      ) : (
                        <FileText className="h-3 w-3 text-muted-foreground" />
                      )}
                      <span className="text-[9px] text-muted-foreground">Preview</span>
                    </div>
                    <p className="max-h-[58px] overflow-hidden text-[9px] leading-snug text-muted-foreground">
                      {file.loading ? 'Extracting first-page screenshot...' : 'No preview image available yet.'}
                    </p>
                  </div>
                )}
              </div>
              <div className="flex items-start gap-1">
                <div className="min-w-0 flex-1 space-y-0.5">
                  <p className="max-h-[30px] overflow-hidden text-[10px] leading-snug md:text-[11px]">{file.name}</p>
                  {!file.loading && file.error && <p className="text-[9px] text-destructive">Extraction failed</p>}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0 rounded-full hover:bg-sidebar-accent/90 -mt-0.5"
                  onClick={() => void handleRemoveFileCard(file.id, file.isRemote)}
                  disabled={removingSourceIds.includes(file.id)}
                  aria-label="Remove file"
                >
                  {removingSourceIds.includes(file.id) ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          ))}
          </div>
        </div>
      )}

      <div className="mt-auto flex flex-col gap-2">
        <div className="relative z-10 -mb-1 flex flex-wrap items-center gap-1.5 rounded-lg border border-sidebar-border bg-sidebar-accent/35 px-2 py-1.5">
          <Button type="button" variant="ghost" size="sm" className="h-7 rounded-md px-2 text-xs" onClick={openMicrosoftPicker} disabled={disabled || isProcessing}>
            <UploadCloud className="mr-1.5 h-3.5 w-3.5" />
            Import
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 rounded-md px-2 text-xs" onClick={() => imageInputRef.current?.click()} disabled={disabled || isProcessing}>
            <Image className="mr-1.5 h-3.5 w-3.5" />
            Photo
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 rounded-md px-2 text-xs" onClick={() => fileInputRef.current?.click()} disabled={disabled || isProcessing}>
            <FileIcon className="mr-1.5 h-3.5 w-3.5" />
            Files
          </Button>
          <Button type="button" variant="ghost" size="sm" className="h-7 rounded-md px-2 text-xs" onClick={() => setRecentsOpen(true)} disabled={disabled || isProcessing}>
            <Clock3 className="mr-1.5 h-3.5 w-3.5" />
            Recents
          </Button>
          <div className="relative">
            <Button type="button" variant="ghost" size="sm" className="h-7 rounded-md px-2 text-xs" onClick={() => setOtherOpen((prev) => !prev)} disabled={disabled || isProcessing}>
              <Layers className="mr-1.5 h-3.5 w-3.5" />
              Other
              <ChevronDown className="ml-1 h-3 w-3" />
            </Button>
            {otherOpen && (
              <div className="absolute left-0 top-8 z-30 min-w-[128px] rounded-md border border-sidebar-border bg-background p-1 shadow-md">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs hover:bg-sidebar-accent/40"
                  onClick={() => {
                    setMaterialsOpen(true);
                    setOtherOpen(false);
                  }}
                >
                  <FolderOpen className="h-3.5 w-3.5" />
                  Materials
                </button>
              </div>
            )}
          </div>
          <Button type="button" variant="ghost" size="sm" className="h-7 rounded-md px-2 text-xs" onClick={() => setLinksOpen((prev) => !prev)} disabled={disabled || isProcessing}>
            <Link2 className="mr-1.5 h-3.5 w-3.5" />
            Links
          </Button>
          {enableMic && (
            <Button type="button" variant="ghost" size="sm" className="h-7 rounded-md px-2 text-xs" onClick={() => (isFallbackRecording ? stopListening() : startListening())} disabled={disabled || isProcessing || !enableMic}>
              {isFallbackRecording ? <StopCircle className="mr-1.5 h-3.5 w-3.5" /> : <Mic className="mr-1.5 h-3.5 w-3.5" />}
              Mic
            </Button>
          )}
          {enableCaptions && (
            <Button type="button" variant="ghost" size="sm" className="h-7 rounded-md px-2 text-xs" onClick={() => setCaptionsOpen((prev) => !prev)} disabled={disabled || !enableCaptions}>
              <Captions className="mr-1.5 h-3.5 w-3.5" />
              Captions
            </Button>
          )}
        </div>

        {linksOpen && (
          <div className="space-y-2 rounded-xl border border-sidebar-border bg-sidebar-accent/20 p-2">
            <div className="flex items-center gap-2">
              <input
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void handleAddLink(); }}
                placeholder="Paste a link and press Enter"
                className="flex-1 border border-sidebar-border rounded-md bg-sidebar-accent/65 px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
                disabled={isFetchingUrl}
              />
              <Button variant="outline" size="sm" onClick={() => void handleAddLink()} disabled={isFetchingUrl || !urlInput.trim()} className="rounded-md border-sidebar-border bg-sidebar-accent/70 text-xs h-7 px-3 hover:bg-sidebar-accent">
                {isFetchingUrl ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Import'}
              </Button>
            </div>
            {urlSources.length > 0 && (
              <div className="max-h-24 space-y-1 overflow-auto pr-1">
                {urlSources.map((source) => (
                  <div key={source.id} className="flex items-center gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/45 px-2 py-1 text-xs">
                    <span className="flex-1 truncate">{source.url || source.label}</span>
                    {source.loading && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
                    {source.error && <span className="text-destructive">Error</span>}
                    <button type="button" onClick={() => removeSource(source.id)} className="rounded-sm p-0.5 hover:bg-muted" aria-label="Remove link">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-stretch gap-2">
          <Textarea
            value={manualText}
            onChange={(e) => handleManualTextChange(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                submitAndSave();
              }
            }}
            placeholder={typedPlaceholder || placeholder}
            className="min-h-[190px] flex-1 resize-none rounded-2xl border border-border bg-muted/70 text-sm"
            disabled={disabled || isProcessing}
          />
          <Button
            type="button"
            variant="outline"
            className="w-[112px] rounded-2xl border-border bg-muted/80 text-xs hover:bg-muted"
            onClick={submitAndSave}
            disabled={disabled || isProcessing || !canGenerate}
          >
            {isProcessing ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Sparkles className="mr-1.5 h-4 w-4" />}
            {submitLabel}
          </Button>
        </div>

        {charCount > 0 && (
          <span className="text-[10px] text-muted-foreground font-mono tabular-nums pl-1">
            {wordCount} words - {charCount} chars
          </span>
        )}
        {hasPendingSource && (
          <span className="text-[11px] text-muted-foreground pl-1">
            Still extracting text from selected source...
          </span>
        )}
        {hasFileSourceWithoutText && (
          <span className="text-[11px] text-destructive pl-1">
            File text extraction failed or returned empty. Re-upload the file so full content can be used.
          </span>
        )}
      </div>

      {recentsOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/35 p-3">
          <div className="flex h-[72vh] w-full max-w-3xl flex-col rounded-xl border border-sidebar-border bg-background p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Recents</p>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setRecentsOpen(false)}>Close</Button>
            </div>
            <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-3">
              <div className="relative md:col-span-1">
                <Search className="pointer-events-none absolute left-2 top-2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  value={recentsSearch}
                  onChange={(e) => setRecentsSearch(e.target.value)}
                  placeholder="Search by name..."
                  className="h-8 w-full rounded-md border border-sidebar-border bg-sidebar-accent/50 pl-7 pr-2 text-xs outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <select value={recentsSourceFilter} onChange={(e) => setRecentsSourceFilter(e.target.value as 'recent' | 'files' | 'all')} className="h-8 rounded-md border border-sidebar-border bg-sidebar-accent/50 px-2 text-xs">
                <option value="recent">Recent</option>
                <option value="files">Files</option>
                <option value="all">All</option>
              </select>
              <select value={recentsSort} onChange={(e) => setRecentsSort(e.target.value as 'newest' | 'oldest' | 'most_used' | 'name')} className="h-8 rounded-md border border-sidebar-border bg-sidebar-accent/50 px-2 text-xs">
                <option value="newest">Time: Newest</option>
                <option value="oldest">Time: Oldest</option>
                <option value="most_used">Most used</option>
                <option value="name">Name</option>
              </select>
            </div>
            <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-sidebar-border bg-sidebar-accent/20 p-2">
              {recentsLoading ? (
                <div className="flex h-full items-center justify-center"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              ) : visibleRecents.length === 0 ? (
                <p className="text-xs text-muted-foreground">No recents found.</p>
              ) : (
                <div className="space-y-1.5">
                  {visibleRecents.slice(0, 50).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className="flex w-full items-center gap-2 rounded-md border border-sidebar-border bg-background px-2 py-1.5 text-left hover:bg-sidebar-accent/30"
                      onClick={() => {
                        void importRecentsItems([item]);
                        setRecentsOpen(false);
                      }}
                    >
                      <FileText className="h-4 w-4 shrink-0 text-primary" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs">{toolId || 'tool'} | {item.name}</p>
                        <p className="text-[10px] text-muted-foreground">{item.lastModifiedDateTime ? new Date(item.lastModifiedDateTime).toLocaleString() : '-'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {materialsOpen && (
        <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/35 p-3">
          <div className="flex h-[78vh] w-full max-w-5xl gap-3 rounded-xl border border-sidebar-border bg-background p-3 shadow-xl">
            <div className="flex min-w-0 flex-1 flex-col">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-medium">Materials</p>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setMaterialsOpen(false)}>Close</Button>
              </div>
              <input
                value={materialsSearch}
                onChange={(e) => setMaterialsSearch(e.target.value)}
                placeholder="Search materials..."
                className="mb-2 h-8 rounded-md border border-sidebar-border bg-sidebar-accent/50 px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
              />
              <div className="min-h-0 flex-1 overflow-auto">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {visibleMaterials.map((material) => (
                    <button
                      key={material.id}
                      type="button"
                      className="rounded-xl border border-sidebar-border bg-sidebar-accent/25 p-2 text-left hover:bg-sidebar-accent/40"
                      onClick={() => setSelectedMaterialId(material.id)}
                    >
                      <p className="mb-1 truncate text-xs font-medium">{material.title}</p>
                      <div className="rounded-lg border border-sidebar-border bg-background p-2">
                        <div className="h-16 overflow-hidden rounded-md bg-sidebar-accent/20 p-2 text-[10px] text-muted-foreground">
                          {material.type === 'image' && material.preview.startsWith('data:image') ? (
                            <img src={material.preview} alt={material.title} className="h-full w-full object-cover" />
                          ) : (
                            material.preview
                          )}
                        </div>
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">{material.type}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(material.dateIso).toLocaleString()}</p>
                    </button>
                  ))}
                </div>
                {visibleMaterials.length === 0 && <p className="text-xs text-muted-foreground">No materials yet.</p>}
              </div>
            </div>
            <div className="hidden w-[36%] min-w-[280px] rounded-xl border border-sidebar-border bg-sidebar-accent/20 p-3 lg:block">
              {selectedMaterial ? (
                <div className="h-full space-y-2 overflow-auto">
                  <p className="text-sm font-medium">{selectedMaterial.title}</p>
                  <p className="text-xs text-muted-foreground">Type: {selectedMaterial.type}</p>
                  <p className="text-xs text-muted-foreground">Date: {new Date(selectedMaterial.dateIso).toLocaleString()}</p>
                  <div className="rounded-lg border border-sidebar-border bg-background p-2 text-xs">
                    {selectedMaterial.type === 'image' && selectedMaterial.preview.startsWith('data:image') ? (
                      <img src={selectedMaterial.preview} alt={selectedMaterial.title} className="max-h-[260px] w-full rounded object-contain" />
                    ) : (
                      <pre className="whitespace-pre-wrap break-words font-sans">{selectedMaterial.detail}</pre>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Select a material to view details.</p>
              )}
            </div>
          </div>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"
        onChange={(e) => void handleFileChange(e, 'file')}
        disabled={disabled || isProcessing}
      />
      <input
        ref={imageInputRef}
        type="file"
        className="sr-only"
        accept=".png,.jpg,.jpeg,.webp"
        onChange={(e) => void handleFileChange(e, 'image')}
        disabled={disabled || isProcessing}
      />
    </div>
  );
}
