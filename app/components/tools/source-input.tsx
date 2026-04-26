'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Clock3,
  File as FileIcon,
  UploadCloud,
  FileText,
  Image,
  ImageIcon,
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

interface SourceInputProps {
  value: string;
  onChange: (text: string) => void;
  onImageDataUriChange?: (imageDataUri: string | null) => void;
  onSubmit?: (compiledText?: string) => void | Promise<unknown>;
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
  enableMicrosoftSources?: boolean;
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
  sourceType: 'tool_run' | 'material';
  materialType?: MaterialKind;
  text?: string;
  webUrl?: string;
  previewUrl?: string;
  lastModifiedDateTime?: string;
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

const urlKey = (url: string) => {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    // Remove common tracking params so same page does not appear as duplicate mismatch.
    const removableParams = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'gclid',
      'fbclid',
      'mc_cid',
      'mc_eid',
    ];
    for (const key of removableParams) {
      parsed.searchParams.delete(key);
    }
    const pathname = parsed.pathname.endsWith('/') && parsed.pathname !== '/' ? parsed.pathname.slice(0, -1) : parsed.pathname;
    const search = parsed.searchParams.toString();
    return `${parsed.origin}${pathname}${search ? `?${search}` : ''}`;
  } catch {
    return url.trim();
  }
};

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
  // Auto-import links only after a trailing space/newline was typed.
  const trailingWhitespaceUrlRegex = /((?:https?:\/\/|www\.)[^\s<>"]+)(?=\s+)/gi;
  const urls = Array.from(text.matchAll(trailingWhitespaceUrlRegex))
    .map((m) => m[1])
    .filter(Boolean);
  if (urls.length === 0) return { cleanedText: text, urls: [] as string[] };

  const uniqueUrls = Array.from(new Set(urls));
  const cleanedText = text
    .replace(trailingWhitespaceUrlRegex, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trimStart();

  return { cleanedText, urls: uniqueUrls };
};

const compileSourceText = (
  manualValue: string,
  sourceItems: SourceEntry[],
  mergeMode: 'append_labeled'
) => {
  let next = '';
  if (manualValue.trim()) {
    next = mergeMode === 'append_labeled'
      ? appendLabeledBlock(next, 'MANUAL_TEXT', manualValue)
      : manualValue;
  }

  for (const source of sourceItems) {
    const body = source.text.trim() || source.url || '';
    if (!body) continue;
    next = mergeMode === 'append_labeled'
      ? appendLabeledBlock(next, source.label, body)
      : body;
  }
  return next;
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

export function SourceInput({
  value,
  onChange,
  onImageDataUriChange,
  onSubmit,
  placeholder: _placeholder = 'Enter your text here...',
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
  enableMicrosoftSources = false,
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

  const [uploadedImageDataUri, setUploadedImageDataUri] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [recentsOpen, setRecentsOpen] = useState(false);
  const [recentsCatalog, setRecentsCatalog] = useState<RecentCatalogItem[]>([]);
  const [recentsLoading, setRecentsLoading] = useState(false);
  const [recentsSourceFilter, setRecentsSourceFilter] = useState<'all' | 'tool_runs' | 'materials'>('all');
  const [recentsSort, setRecentsSort] = useState<'newest' | 'oldest' | 'most_used' | 'name'>('newest');
  const [recentsSearch, setRecentsSearch] = useState('');
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);
  const [linkInputOpen, setLinkInputOpen] = useState(false);
  const [linkInputValue, setLinkInputValue] = useState('');
  const [removingSourceIds, setRemovingSourceIds] = useState<string[]>([]);
  const [materials, setMaterials] = useState<MaterialEntry[]>([]);

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

  const hydrateIntegrationSources = useCallback(async (quiet = false) => {
    if (!enableMicrosoftSources) return;
    let items: any[] = [];
    let pendingCount = 0;
    try {
      const response = await fetch('/api/integrations/context-sources?provider=microsoft&selected=1', {
        cache: 'no-store',
      });
      if (!response.ok) return;
      const json = await response.json();
      items = Array.isArray(json?.items) ? json.items : [];
      pendingCount = items.filter((item: any) => {
        const status = String(item?.extraction_status || '').toLowerCase();
        return status === 'pending';
      }).length;
    } catch {
      return;
    }

    const mapped: SourceEntry[] = items.map((item: any) => {
      const appKey = String(item?.app || '').toLowerCase();
      const appLabel = appKey === 'powerpoint' ? 'PowerPoint' : appKey === 'onedrive' ? 'OneDrive' : 'Word';
      const name = String(item?.name || 'Untitled');
      const extracted = typeof item?.extracted_text === 'string' ? item.extracted_text.trim() : '';
      const webUrl = typeof item?.web_url === 'string' ? item.web_url : '';
      const mimeType = typeof item?.mime_type === 'string' ? item.mime_type : undefined;
      const previewUrl = typeof item?.metadata?.preview_url === 'string' ? item.metadata.preview_url : undefined;
      const extractionStatus = typeof item?.extraction_status === 'string' ? item.extraction_status : undefined;
      const normalizedStatus = String(extractionStatus || '').toLowerCase();
      const imageLike = isImageLike(name, mimeType);
      const isLoading = !imageLike && (normalizedStatus === 'pending' || (normalizedStatus === '' && !extracted));
      const hasError = normalizedStatus === 'error';
      return {
        id: `integration-${String(item?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)}`,
        kind: imageLike ? 'image' : 'file',
        label: `${name} (${appLabel})`,
        text: imageLike
          ? ''
          : (extracted
          ? buildMicrosoftContextBlock({
            app: appKey || 'onedrive',
            name,
            mimeType,
            webUrl,
            extractedText: extracted,
            extractionStatus,
          })
          : ''),
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
  }, [enableMicrosoftSources, toast]);

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
      const [runsResult, materialsResult] = await Promise.allSettled([
        fetch('/api/tools/v2/runs', { cache: 'no-store' }).then(async (response) => {
          if (!response.ok) throw new Error('Could not load tool runs');
          return response.json();
        }),
        fetch('/api/materials?limit=50', { cache: 'no-store' }).then(async (response) => {
          if (!response.ok) throw new Error('Could not load materials');
          return response.json();
        }),
      ]);
      const runsRes = runsResult.status === 'fulfilled' ? runsResult.value : [];
      const materialsRes = materialsResult.status === 'fulfilled' ? materialsResult.value : { materials: [] };

      const runs: RecentCatalogItem[] = (Array.isArray(runsRes) ? runsRes : [])
        .filter((run: any) => run?.status === 'succeeded')
        .filter((run: any) => run?.options_payload?.saveToRecents !== false)
        .map((run: any) => {
          const tool = String(run?.tool_id || 'tool');
          const mode = String(run?.mode || '').trim();
          const title = mode ? `${tool} | ${mode}` : tool;
          const sourceText = String(
            run?.input_payload?.sourceText ||
            run?.input_payload?.source_text ||
            run?.input_payload?.text ||
            run?.input_payload?.content ||
            ''
          ).trim();
          const description = String(
            run?.output_payload?.description ||
            run?.output_payload?.summary ||
            ''
          ).trim();
          return {
            id: `tool-run:${String(run?.id || '')}`,
            name: title,
            sourceType: 'tool_run' as const,
            text: sourceText || description,
            webUrl: `/tools/${tool}?runId=${String(run?.id || '')}`,
            lastModifiedDateTime: String(run?.finished_at || run?.created_at || ''),
          };
        })
        .filter((item) => item.id !== 'tool-run:');

      const materialRows = Array.isArray(materialsRes?.materials) ? materialsRes.materials : [];
      const materials: RecentCatalogItem[] = materialRows.map((material: any) => {
        const type = String(material?.type || 'file').toLowerCase();
        const materialType: MaterialKind =
          type === 'image' ? 'image' : type === 'text' ? 'text' : type === 'onedrive' ? 'onedrive' : 'file';
        const content = String(
          material?.source_text ||
          material?.content ||
          material?.description ||
          ''
        ).trim();
        return {
          id: `material:${String(material?.id || '')}`,
          name: String(material?.title || material?.type || 'Material'),
          sourceType: 'material' as const,
          materialType,
          text: content,
          lastModifiedDateTime: String(material?.updated_at || material?.created_at || ''),
        };
      })
      .filter((item: RecentCatalogItem) => item.id !== 'material:')
      .filter((item: RecentCatalogItem) => enableMicrosoftSources || item.materialType !== 'onedrive');

      let merged = [...runs, ...materials];
      if (recentsSourceFilter === 'tool_runs') {
        merged = merged.filter((item) => item.sourceType === 'tool_run');
      } else if (recentsSourceFilter === 'materials') {
        merged = merged.filter((item) => item.sourceType === 'material');
      }
      merged.sort((a, b) => {
        const aTime = a.lastModifiedDateTime ? new Date(a.lastModifiedDateTime).getTime() : 0;
        const bTime = b.lastModifiedDateTime ? new Date(b.lastModifiedDateTime).getTime() : 0;
        return bTime - aTime;
      });
      setRecentsCatalog(merged);

      // Only show a warning if both upstream sources failed.
      if (runsResult.status === 'rejected' && materialsResult.status === 'rejected') {
        toast({
          variant: 'destructive',
          title: 'Could not load recents',
          description: 'Try again in a moment.',
        });
      }
    } catch (error: any) {
      setRecentsCatalog([]);
      toast({
        variant: 'destructive',
        title: 'Could not load recents',
        description: error?.message || 'Try again in a moment.',
      });
    } finally {
      setRecentsLoading(false);
    }
  }, [enableMicrosoftSources, recentsSourceFilter, toast]);

  const importRecentsItems = useCallback(async (items: RecentCatalogItem[]) => {
    if (items.length === 0) return;
    try {
      const recentsAsSources: SourceEntry[] = items.map((item, idx) => {
        const textBody = String(item.text || item.webUrl || '').trim();
        const imageLike = item.materialType === 'image';
        upsertMaterial({
          type: item.materialType || (imageLike ? 'image' : 'text'),
          title: item.name || 'Recent item',
          preview: imageLike ? (item.previewUrl || item.name) : (textBody.slice(0, 220) || item.name),
          detail: imageLike ? (item.webUrl || item.name) : (textBody || item.name),
        });
        return {
          id: `recents-${item.id}-${idx}`,
          kind: imageLike ? 'image' : 'file',
          label: item.sourceType === 'tool_run' ? `${item.name} (Tool run)` : `${item.name} (Material)`,
          text: imageLike ? '' : textBody,
          selected: true,
          loading: false,
          previewUrl: item.previewUrl,
          extractionStatus: textBody ? 'ready' : 'empty',
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
    if (!enableMicrosoftSources) return;
    if (integrationHydratedRef.current) return;
    integrationHydratedRef.current = true;
    void hydrateIntegrationSources(true);
  }, [enableMicrosoftSources, hydrateIntegrationSources]);

  useEffect(() => {
    if (!enableMicrosoftSources) return;
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
        const mimeType = typeof item?.mimeType === 'string' ? item.mimeType : undefined;
        const previewUrl = typeof item?.previewUrl === 'string' ? item.previewUrl : '';
        const imageLike = isImageLike(name, mimeType);
        upsertMaterial({
          type: imageLike ? 'image' : 'onedrive',
          title: name,
          preview: imageLike ? (previewUrl || name) : (extractedText.slice(0, 220) || name),
          detail: imageLike ? (webUrl || name) : (extractedText || webUrl || name),
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
        const imageLike = isImageLike(name, mimeType);
        const isLoading = !imageLike && (normalizedStatus === 'pending' || (normalizedStatus === '' && !extractedText.trim()));
        const hasError = normalizedStatus === 'error';
        return {
          id: `integration-local-${id}`,
          kind: imageLike ? 'image' : 'file',
          label: `${name} (OneDrive)`,
          text: imageLike
            ? ''
            : (extractedText
            ? buildMicrosoftContextBlock({
              app: 'onedrive',
              name,
              mimeType,
              webUrl,
              extractedText,
              extractionStatus: extractionStatus || 'ready',
            })
            : ''),
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
  }, [enableMicrosoftSources, hydrateIntegrationSources, upsertMaterial]);

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

  const compiledSource = useMemo(
    () => compileSourceText(manualText, sources, sourceMergeMode),
    [manualText, sourceMergeMode, sources]
  );

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
  const attachmentSources = useMemo(
    () => sources.filter((source) => source.kind === 'url' || source.kind === 'file' || source.kind === 'image'),
    [sources]
  );
  const visibleRecents = useMemo(() => {
    const usage = getRecentsUsageMap();
    const query = recentsSearch.trim().toLowerCase();
    const filtered = recentsCatalog.filter((item) => (query ? item.name.toLowerCase().includes(query) : true));
    const sorted = [...filtered].sort((a, b) => {
      if (recentsSort === 'name') return String(a?.name || '').localeCompare(String(b?.name || ''));
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
    const host = new URL(normalized).hostname;
    const key = urlKey(normalized);
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    let targetId = id;
    let shouldFetch = true;
    let existingReady = false;

    setSources((prev) => {
      const existing = prev.find((s) => s.kind === 'url' && s.urlKey === key);
      if (existing) {
        targetId = existing.id;
        if (existing.loading) {
          shouldFetch = false;
          return prev;
        }
        if ((existing.text.trim() || existing.previewUrl) && !existing.error) {
          existingReady = true;
          shouldFetch = false;
          return prev.map((source) =>
            source.id === existing.id ? { ...source, selected: true } : source
          );
        }
        return prev.map((source) =>
          source.id === existing.id ? { ...source, loading: true, error: undefined } : source
        );
      }
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

    if (!shouldFetch) {
      // Existing source is already loaded or loading: silently reuse to avoid duplicate/noisy UX.
      return;
    }

    setIsFetchingUrl(true);
    let timeout: ReturnType<typeof setTimeout> | null = null;
    try {
      const controller = new AbortController();
      timeout = setTimeout(() => controller.abort(), EXTRACTION_REQUEST_TIMEOUT_MS);
      const res = await fetch('/api/tools/extract-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: normalized }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        const message = typeof payload?.error === 'string' ? payload.error : 'Could not fetch this URL right now.';
        throw new Error(message);
      }

      const data = await res.json();
      const extracted = typeof data?.text === 'string' ? data.text.trim() : '';

      setSources((prev) => prev.map((s) => {
        if (s.id !== targetId) return s;
        if (!extracted) {
          return { ...s, loading: false, error: 'No readable text was found on this page.' };
        }
        return { ...s, text: extracted, loading: false, error: undefined };
      }));

      if (extracted) {
        toast({ title: 'Content imported', description: `Extracted text from ${host}` });
      }
    } catch (error: any) {
      const aborted = error?.name === 'AbortError';
      const message = aborted
        ? 'This link took too long to load. Please try again.'
        : String(error?.message || 'Could not fetch this URL right now.');
      setSources((prev) => prev.map((s) => (
        s.id === targetId ? { ...s, loading: false, error: message } : s
      )));
      toast({ variant: 'destructive', title: 'Import failed', description: message });
    } finally {
      if (timeout) clearTimeout(timeout);
      setIsFetchingUrl(false);
    }
  }, [toast]);

  const handleAddLink = async (rawInput?: string) => {
    const raw = String(rawInput || '').trim();
    if (!raw) return;
    await upsertUrlSource(raw);
  };

  const removeSource = (id: string) => {
    setSources((prev) => {
      const target = prev.find((s) => s.id === id);
      if (target?.kind === 'image') {
        setUploadedImageDataUri(null);
      }
      return prev.filter((s) => s.id !== id);
    });
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
    if (!isUploadedImage) setUploadedImageDataUri(null);
    setIsProcessing(true);

    try {
      let extractedText = '';
      if (isUploadedImage) {
        const imageDataUri = await new Promise<string | null>((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : null);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(file);
        });
        setUploadedImageDataUri(imageDataUri);
        addSource({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          kind: 'image',
          label: file.name,
          text: '',
          selected: true,
          previewUrl: imageDataUri || undefined,
        });
        upsertMaterial({
          type: 'image',
          title: file.name,
          preview: imageDataUri || file.name,
          detail: file.name,
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
        label: file.name,
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
          label: file.name,
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

    if (urls.length > 0) {
      void Promise.all(urls.map((u) => upsertUrlSource(u)));
    }
  };

  const wordCount = manualText.trim() ? manualText.trim().split(/\s+/).length : 0;
  const charCount = manualText.length;
  const hasImageContext = Boolean(uploadedImageDataUri) || sources.some((source) => source.kind === 'image');
  const hasPendingSource = sources.some((source) => Boolean(source.loading));
  const hasFileSourceWithoutText = sources.some(
    (source) => source.kind === 'file' && !source.loading && !source.text.trim() && !source.previewUrl
  );
  const canGenerate = (compiledSource.trim().length > 0 || hasImageContext) && !hasPendingSource && !hasFileSourceWithoutText;

  const openMicrosoftPicker = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('cautie:open-microsoft-picker'));
  }, []);

  const submitAndSave = useCallback(async () => {
    setIsProcessing(true);
    let nextManualText = manualText;
    if (manualText.trim()) {
      const firstWords = manualText.trim().split(/\s+/).slice(0, 8).join(' ');
      upsertMaterial({
        type: 'text',
        title: firstWords || 'Text source',
        preview: manualText.trim().slice(0, 220),
        detail: manualText.trim(),
      });
    }

    try {
      const inlineUrlRegex = /((?:https?:\/\/|www\.)[^\s<>"]+)/gi;
      const rawUrls = Array.from(new Set((manualText.match(inlineUrlRegex) || []).map((entry) => entry.trim()).filter(Boolean)));
      if (rawUrls.length > 0) {
        nextManualText = manualText
          .replace(inlineUrlRegex, ' ')
          .replace(/\n{3,}/g, '\n\n')
          .replace(/[ \t]{2,}/g, ' ')
          .trimStart();
        setManualText(nextManualText);
        await Promise.all(rawUrls.map((url) => upsertUrlSource(url)));
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
      const finalized = compileSourceText(nextManualText, sources, sourceMergeMode);
      onChange(finalized);
      await onSubmit?.(finalized);
    } finally {
      setIsProcessing(false);
    }
  }, [manualText, onChange, onSubmit, sourceMergeMode, sources, upsertMaterial, upsertUrlSource]);

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

      {topContent}

      <div className="mt-auto flex flex-col gap-2">
        {attachmentSources.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            {attachmentSources.map((source) => {
              const icon =
                source.kind === 'image'
                  ? <ImageIcon className="h-3.5 w-3.5 shrink-0" />
                  : source.kind === 'url'
                    ? <Link2 className="h-3.5 w-3.5 shrink-0" />
                    : <FileText className="h-3.5 w-3.5 shrink-0" />;
              const label = source.url || source.label;
              const isRemote = source.id.startsWith('integration-') && !source.id.startsWith('integration-local-');
              return (
                <div key={source.id} className="flex max-w-full items-center gap-2 rounded-full border border-sidebar-border bg-background px-3 py-1.5 text-xs">
                  {icon}
                  <span className="truncate">{label}</span>
                  {source.loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                  {source.error && <span className="text-destructive">Error</span>}
                  <button
                    type="button"
                    className="rounded-full p-0.5 hover:bg-muted"
                    onClick={() => {
                      if (isRemote) {
                        void handleRemoveFileCard(source.id, true);
                      } else {
                        removeSource(source.id);
                      }
                    }}
                    aria-label="Remove attachment"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="relative z-10 flex flex-wrap items-center gap-1.5">
          {enableMicrosoftSources && (
            <Button type="button" variant="outline" size="sm" className="h-7 rounded-full border-sidebar-border bg-sidebar-accent/35 px-3 text-xs hover:bg-sidebar-accent/65" onClick={openMicrosoftPicker} disabled={disabled || isProcessing}>
              <UploadCloud className="mr-1.5 h-3.5 w-3.5" />
              Cloud
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" className="h-7 rounded-full border-sidebar-border bg-sidebar-accent/35 px-3 text-xs hover:bg-sidebar-accent/65" onClick={() => imageInputRef.current?.click()} disabled={disabled || isProcessing}>
            <Image className="mr-1.5 h-3.5 w-3.5" />
            Photo
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-7 rounded-full border-sidebar-border bg-sidebar-accent/35 px-3 text-xs hover:bg-sidebar-accent/65" onClick={() => fileInputRef.current?.click()} disabled={disabled || isProcessing}>
            <FileIcon className="mr-1.5 h-3.5 w-3.5" />
            Files
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-7 rounded-full border-sidebar-border bg-sidebar-accent/35 px-3 text-xs hover:bg-sidebar-accent/65" onClick={() => setRecentsOpen(true)} disabled={disabled || isProcessing}>
            <Clock3 className="mr-1.5 h-3.5 w-3.5" />
            Recents
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 rounded-full border-sidebar-border bg-sidebar-accent/35 px-3 text-xs hover:bg-sidebar-accent/65"
            onClick={() => setLinkInputOpen((prev) => !prev)}
            disabled={disabled || isProcessing || isFetchingUrl}
          >
            <Link2 className="mr-1.5 h-3.5 w-3.5" />
            Links
          </Button>
          {enableMic && (
            <Button type="button" variant="outline" size="sm" className="h-7 rounded-full border-sidebar-border bg-sidebar-accent/35 px-3 text-xs hover:bg-sidebar-accent/65" onClick={() => (isFallbackRecording ? stopListening() : startListening())} disabled={disabled || isProcessing || !enableMic}>
              {isFallbackRecording ? <StopCircle className="mr-1.5 h-3.5 w-3.5" /> : <Mic className="mr-1.5 h-3.5 w-3.5" />}
              Mic
            </Button>
          )}
          {enableCaptions && (
            <Button type="button" variant="outline" size="sm" className="h-7 rounded-full border-sidebar-border bg-sidebar-accent/35 px-3 text-xs hover:bg-sidebar-accent/65" onClick={() => setCaptionsOpen((prev) => !prev)} disabled={disabled || !enableCaptions}>
              <Captions className="mr-1.5 h-3.5 w-3.5" />
              Captions
            </Button>
          )}
        </div>

        {linkInputOpen && (
          <div className="rounded-xl border border-sidebar-border bg-background/80 p-2">
            <div className="flex items-center gap-2">
              <input
                value={linkInputValue}
                onChange={(e) => setLinkInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    const value = linkInputValue.trim();
                    if (!value) return;
                    void handleAddLink(value).finally(() => {
                      setLinkInputValue('');
                      setLinkInputOpen(false);
                    });
                  }
                }}
                placeholder="Paste link..."
                className="h-8 flex-1 rounded-md border border-sidebar-border bg-sidebar-accent/50 px-2 text-xs outline-none focus:ring-1 focus:ring-ring"
                disabled={disabled || isProcessing || isFetchingUrl}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2 text-xs"
                disabled={disabled || isProcessing || isFetchingUrl || !linkInputValue.trim()}
                onClick={() => {
                  const value = linkInputValue.trim();
                  if (!value) return;
                  void handleAddLink(value).finally(() => {
                    setLinkInputValue('');
                    setLinkInputOpen(false);
                  });
                }}
              >
                Add
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                onClick={() => {
                  setLinkInputOpen(false);
                  setLinkInputValue('');
                }}
              >
                Close
              </Button>
            </div>
          </div>
        )}

        <div className="flex items-stretch gap-2">
          <div className="relative flex-1">
            <Textarea
              value={manualText}
              onChange={(e) => handleManualTextChange(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  void submitAndSave();
                }
              }}
              placeholder=""
              className="min-h-[190px] flex-1 resize-none rounded-2xl border border-border bg-muted/70 text-sm"
              disabled={disabled || isProcessing}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-[112px] rounded-2xl border-border bg-muted/80 text-xs hover:bg-muted"
            onClick={() => void submitAndSave()}
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
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 p-3">
          <div className="flex h-[72vh] w-full max-w-3xl flex-col rounded-xl border border-sidebar-border bg-background p-3 shadow-xl">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium">Local recents</p>
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
              <select value={recentsSourceFilter} onChange={(e) => setRecentsSourceFilter(e.target.value as 'all' | 'tool_runs' | 'materials')} className="h-8 rounded-md border border-sidebar-border bg-sidebar-accent/50 px-2 text-xs">
                <option value="all">All</option>
                <option value="tool_runs">Tool runs (local)</option>
                <option value="materials">Materials (local)</option>
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
                <p className="text-xs text-muted-foreground">No local recents found.</p>
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
                        <p className="truncate text-xs">{item.name}</p>
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
