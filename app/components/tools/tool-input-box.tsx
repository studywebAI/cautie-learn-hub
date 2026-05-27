'use client';

import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Mic, MicOff, ArrowUp, X, Link, Image, FileText, Camera, ChevronDown, Loader2 } from 'lucide-react';
import { useScreenshotCapture } from '@/hooks/use-screenshot-capture';
import { useSpeechToText } from '@/hooks/use-speech-to-text';
import { useToast } from '@/hooks/use-toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AttachmentKind = 'pasted' | 'file' | 'image' | 'screenshot' | 'url';

export type Attachment = {
  id: string;
  kind: AttachmentKind;
  label: string;
  previewText?: string;   // first ~180 chars — pasted / url
  dataUri?: string;       // images & screenshots
  mimeType?: string;
  compiledText?: string;  // extracted text for files/urls
};

type ToolInputBoxProps = {
  toolId: string;
  placeholder?: string;
  onSourceChange?: (text: string, attachments: Attachment[]) => void;
  onImageDataUriChange?: (uri: string | null) => void;
  /** Called when user clicks the generate/submit button */
  onSubmit: (compiledText: string) => void;
  isLoading?: boolean;
  submitLabel?: string;
  /** BCP-47 language code passed to the transcription API (default: 'en') */
  speechLanguage?: string;
  /** Hide the tool switcher (e.g. on pages that are not tool pages) */
  hideToolSwitcher?: boolean;
};

// ---------------------------------------------------------------------------
// Available tools list
// ---------------------------------------------------------------------------

const TOOLS = [
  { id: 'quiz',       label: 'Quiz',        href: '/tools/quiz' },
  { id: 'flashcards', label: 'Flashcards',  href: '/tools/flashcards' },
  { id: 'notes',      label: 'Notes',       href: '/tools/notes' },
  { id: 'mindmap',    label: 'Mindmap',     href: '/tools/mindmap' },
];

// ---------------------------------------------------------------------------
// Session storage helpers
// ---------------------------------------------------------------------------

const SS_KEY = 'tools.shared-input.v1';

type StoredInputState = {
  sourceText: string;
  attachments: Attachment[];
};

function readStoredState(): StoredInputState {
  try {
    const raw = sessionStorage.getItem(SS_KEY);
    if (!raw) return { sourceText: '', attachments: [] };
    return JSON.parse(raw) as StoredInputState;
  } catch {
    return { sourceText: '', attachments: [] };
  }
}

function writeStoredState(state: StoredInputState) {
  try {
    sessionStorage.setItem(SS_KEY, JSON.stringify(state));
  } catch { /* ignore */ }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildCompiledText(sourceText: string, attachments: Attachment[]): string {
  const parts: string[] = [];
  if (sourceText.trim()) parts.push(sourceText.trim());
  for (const a of attachments) {
    if (a.compiledText?.trim()) {
      parts.push(`[${a.label}]\n${a.compiledText.trim()}`);
    } else if (a.previewText?.trim() && a.kind === 'pasted') {
      // previewText is truncated; use compiledText if available, otherwise skip
    }
  }
  return parts.join('\n\n');
}

function uniqueId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// Attachment card
// ---------------------------------------------------------------------------

function AttachmentCard({
  attachment,
  onRemove,
}: {
  attachment: Attachment;
  onRemove: (id: string) => void;
}) {
  const isImage = attachment.kind === 'image' || attachment.kind === 'screenshot';

  if (isImage && attachment.dataUri) {
    return (
      <div className="relative flex-shrink-0 group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={attachment.dataUri}
          alt={attachment.label}
          className="h-[72px] w-[96px] object-cover rounded-lg border border-border"
        />
        {attachment.kind === 'screenshot' && (
          <span className="absolute bottom-1 left-1 text-[9px] font-semibold bg-black/60 text-white px-1 rounded">
            SCREENSHOT
          </span>
        )}
        <button
          type="button"
          onClick={() => onRemove(attachment.id)}
          className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-foreground text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      </div>
    );
  }

  // Text / file / url card
  return (
    <div className="relative flex-shrink-0 group w-[120px] h-[72px] rounded-lg border border-border bg-card p-2 flex flex-col justify-between overflow-hidden">
      <p className="text-[10px] text-muted-foreground leading-snug line-clamp-3 flex-1">
        {attachment.previewText || attachment.label}
      </p>
      <div className="flex items-center gap-1 mt-1">
        {attachment.kind === 'file' && <FileText className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />}
        {attachment.kind === 'url' && <Link className="h-2.5 w-2.5 text-muted-foreground flex-shrink-0" />}
        <span className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide truncate">
          {attachment.kind === 'pasted' ? 'PASTED' : attachment.kind === 'url' ? 'LINK' : attachment.kind.toUpperCase()}
        </span>
      </div>
      <button
        type="button"
        onClick={() => onRemove(attachment.id)}
        className="absolute -top-1.5 -right-1.5 h-4 w-4 rounded-full bg-foreground text-background flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="h-2.5 w-2.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ToolInputBox({
  toolId,
  placeholder = 'Paste your notes, text or content…',
  onSourceChange,
  onImageDataUriChange,
  onSubmit,
  isLoading = false,
  submitLabel,
  speechLanguage = 'en',
  hideToolSwitcher = false,
}: ToolInputBoxProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { capture, capturing } = useScreenshotCapture();

  // Hydrate from sessionStorage on first render
  const stored = readStoredState();

  const [sourceText, setSourceText] = useState(stored.sourceText);
  const [attachments, setAttachments] = useState<Attachment[]>(stored.attachments);

  const stt = useSpeechToText({
    language: speechLanguage,
    onTranscript: (text) => {
      setSourceText((prev) => prev.trim() ? `${prev.trimEnd()}\n\n${text}` : text);
    },
  });

  // Surface STT errors as toasts
  const prevSttError = useRef<string | null>(null);
  useEffect(() => {
    if (stt.error && stt.error !== prevSttError.current) {
      toast({ variant: 'destructive', title: stt.error });
    }
    prevSttError.current = stt.error;
  }, [stt.error, toast]);

  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showToolMenu, setShowToolMenu] = useState(false);
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showPhotosSubmenu, setShowPhotosSubmenu] = useState(false);
  const [linkValue, setLinkValue] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [animatedPlaceholder, setAnimatedPlaceholder] = useState('');
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);
  const plusButtonRef = useRef<HTMLButtonElement>(null);
  const toolMenuRef = useRef<HTMLDivElement>(null);
  const toolButtonRef = useRef<HTMLButtonElement>(null);
  const animationTimeoutRef = useRef<NodeJS.Timeout>();
  const [plusMenuPosition, setPlusMenuPosition] = useState({ top: 0, left: 0 });
  const [toolMenuPosition, setToolMenuPosition] = useState({ top: 0, right: 0 });

  // Ocean animal placeholder texts
  const oceanPlaceholders = [
    'Anglerfish glow in the pitch-black depths at 1000 feet, using bioluminescent lures to attract prey in the darkness of the abyss.',
    'Giant squid with eyes the size of dinner plates hunt in the midnight zone, navigating through water colder than ice.',
    'Vampire squid pulse with eerie red light, their web-like skin undulating as they drift through the deep ocean trenches.',
    'Gulper eels have massive mouths that can unhinge to swallow fish larger than themselves in the abyssal zone.',
    'Dumbo octopuses, named for their ear-like fins, are the deepest-living octopuses ever discovered in the ocean.',
    'Barreleye fish have transparent heads with tubular eyes that look upward through their see-through skull.',
    'Viperfish possess needle-like teeth so large they cannot fully close their mouths, lurking in deep water darkness.',
    'Fangtooth fish may be small but have the largest teeth relative to body size of any deep-sea fish in existence.',
    'Dragonfish emit red bioluminescent light that most creatures cannot see, giving them a hunting advantage in the abyss.',
    'Hatchetfish use photophores on their bellies to create counter-illumination, camouflaging themselves from predators below.',
    'Spookfish possess mirror-like eyes and large teeth, perfectly adapted for hunting in the perpetual darkness.',
    'Sixgill sharks are ancient predators that patrol the deep trenches, unchanged for millions of years.',
    'Dumbo squid drift slowly across the ocean floor like underwater ghosts, their graceful movements barely disturbing the water.',
    'Lanternfish migrate upward each night to feed, creating the largest animal migration by biomass on Earth.',
    'Goblin sharks are living fossils with long snouts and razor-sharp teeth, rarely seen by humans in the deep.',
    'Tube worms cluster around hydrothermal vents, thriving in scalding water that would kill most ocean life.',
    'Amphipods resembling tiny shrimp scavenge on the floor of the deepest ocean trenches known to science.',
    'Brittle stars with incredibly long arms crawl across the abyssal plains searching for food particles.',
    'Yeti crabs discovered near hydrothermal vents are covered in silky hair-like setae, unlike any known crustacean.',
    'Bioluminescent jellyfish drift through the darkness, their translucent bodies glowing with ethereal beauty and mystery.',
  ];

  // Animated placeholder effect
  useEffect(() => {
    if (sourceText.trim()) return; // Don't animate if user is typing

    let currentCharIndex = 0;
    const currentText = oceanPlaceholders[placeholderIndex % oceanPlaceholders.length];
    let isTyping = true;

    const animateChar = () => {
      if (!isTyping) {
        // Backspace phase
        if (currentCharIndex > 0) {
          currentCharIndex--;
          setAnimatedPlaceholder(currentText.substring(0, currentCharIndex));
          animationTimeoutRef.current = setTimeout(animateChar, 30);
        } else {
          // Done backspacing, move to next text
          setPlaceholderIndex((i) => i + 1);
          isTyping = true;
          currentCharIndex = 0;
          animateChar();
        }
      } else {
        // Typing phase
        if (currentCharIndex < currentText.length) {
          currentCharIndex++;
          setAnimatedPlaceholder(currentText.substring(0, currentCharIndex));
          animationTimeoutRef.current = setTimeout(animateChar, 20);
        } else {
          // Done typing, pause before backspacing
          animationTimeoutRef.current = setTimeout(() => {
            isTyping = false;
            animateChar();
          }, 15000); // 15 second pause
        }
      }
    };

    animateChar();

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [sourceText, placeholderIndex, oceanPlaceholders]);

  const currentTool = TOOLS.find((t) => t.id === toolId) ?? TOOLS[0];

  // ---------------------------------------------------------------------------
  // Persist to sessionStorage whenever state changes
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const state: StoredInputState = { sourceText, attachments };
    writeStoredState(state);
    // Filter out screenshot/image dataUris for the primary imageDataUri callback
    const imageAttachment = attachments.find((a) => a.dataUri && (a.kind === 'image' || a.kind === 'screenshot'));
    onImageDataUriChange?.(imageAttachment?.dataUri ?? null);
    onSourceChange?.(sourceText, attachments);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceText, attachments]);

  // ---------------------------------------------------------------------------
  // Auto-resize textarea
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [sourceText]);

  // ---------------------------------------------------------------------------
  // Position the plus menu (fixed positioning to escape overflow-hidden)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!showPlusMenu || !plusButtonRef.current) return;

    const updatePosition = () => {
      if (!plusButtonRef.current) return;
      const rect = plusButtonRef.current.getBoundingClientRect();
      setPlusMenuPosition({
        top: rect.bottom + 8,
        left: rect.left,
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showPlusMenu]);

  // ---------------------------------------------------------------------------
  // Position the tool menu (fixed positioning to escape overflow-hidden)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!showToolMenu || !toolButtonRef.current) return;

    const updatePosition = () => {
      if (!toolButtonRef.current) return;
      const rect = toolButtonRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      setToolMenuPosition({
        top: rect.bottom + 8,
        right: viewportWidth - rect.right,
      });
    };

    updatePosition();
    window.addEventListener('scroll', updatePosition);
    window.addEventListener('resize', updatePosition);

    return () => {
      window.removeEventListener('scroll', updatePosition);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showToolMenu]);

  // ---------------------------------------------------------------------------
  // Close dropdowns on outside click
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
        setShowPlusMenu(false);
      }
      if (toolMenuRef.current && !toolMenuRef.current.contains(e.target as Node)) {
        setShowToolMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ---------------------------------------------------------------------------
  // Paste handler — large pastes become attachment cards
  // ---------------------------------------------------------------------------
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Image paste
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith('image/'));
    if (imageItem) {
      e.preventDefault();
      const file = imageItem.getAsFile();
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUri = ev.target?.result as string;
        setAttachments((prev) => [
          ...prev,
          {
            id: uniqueId(),
            kind: 'image',
            label: 'Pasted image',
            dataUri,
            mimeType: file.type,
          },
        ]);
      };
      reader.readAsDataURL(file);
      return;
    }

    // Large text paste → attachment card (but also keep in textarea)
    const text = e.clipboardData.getData('text');
    if (text.length >= 100) {
      // Let the default paste happen (text goes into textarea), plus create a card
      setAttachments((prev) => [
        ...prev,
        {
          id: uniqueId(),
          kind: 'pasted',
          label: 'Pasted text',
          previewText: text.slice(0, 180),
          compiledText: text,
        },
      ]);
    }
  }, []);

  // ---------------------------------------------------------------------------
  // File upload
  // ---------------------------------------------------------------------------
  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    for (const file of files) {
      const isImage = file.type.startsWith('image/');
      if (isImage) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          const dataUri = ev.target?.result as string;
          setAttachments((prev) => [
            ...prev,
            {
              id: uniqueId(),
              kind: 'image',
              label: file.name,
              dataUri,
              mimeType: file.type,
            },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        // Text extraction via existing API
        const attachmentId = uniqueId();
        setAttachments((prev) => [
          ...prev,
          {
            id: attachmentId,
            kind: 'file',
            label: file.name,
            previewText: 'Extracting text…',
          },
        ]);
        try {
          const formData = new FormData();
          formData.append('file', file);
          const res = await fetch('/api/tools/extract-text', { method: 'POST', body: formData });
          const data = await res.json();
          const extracted: string = data?.text ?? '';
          setAttachments((prev) =>
            prev.map((a) =>
              a.id === attachmentId
                ? { ...a, previewText: extracted.slice(0, 180), compiledText: extracted }
                : a
            )
          );
        } catch {
          setAttachments((prev) => prev.filter((a) => a.id !== attachmentId));
          toast({ variant: 'destructive', title: `Could not read ${file.name}` });
        }
      }
    }
    // Reset so same file can be re-selected
    e.target.value = '';
  }, [toast]);

  // ---------------------------------------------------------------------------
  // Screenshot
  // ---------------------------------------------------------------------------
  const handleScreenshot = useCallback(async () => {
    setShowPlusMenu(false);
    const dataUri = await capture();
    if (!dataUri) return;
    setAttachments((prev) => [
      ...prev,
      {
        id: uniqueId(),
        kind: 'screenshot',
        label: 'Screenshot',
        dataUri,
        mimeType: 'image/png',
      },
    ]);
  }, [capture]);

  // ---------------------------------------------------------------------------
  // Link import
  // ---------------------------------------------------------------------------
  const handleLinkSubmit = useCallback(async () => {
    const url = linkValue.trim();
    if (!url) return;
    setLinkLoading(true);
    const attachmentId = uniqueId();
    try {
      const res = await fetch('/api/tools/extract-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error('Failed to fetch URL');
      const data = await res.json();
      const extracted: string = data?.text?.trim() ?? '';
      if (!extracted) throw new Error('No text extracted');
      const hostname = (() => { try { return new URL(url).hostname; } catch { return url; } })();
      setAttachments((prev) => [
        ...prev,
        {
          id: attachmentId,
          kind: 'url',
          label: hostname,
          previewText: extracted.slice(0, 180),
          compiledText: extracted,
        },
      ]);
      setLinkValue('');
      setShowLinkInput(false);
      setShowPlusMenu(false);
    } catch {
      toast({ variant: 'destructive', title: 'Could not import link' });
    } finally {
      setLinkLoading(false);
    }
  }, [linkValue, toast]);

  // ---------------------------------------------------------------------------
  // Tool switching
  // ---------------------------------------------------------------------------
  const handleToolSwitch = useCallback((tool: typeof TOOLS[number]) => {
    setShowToolMenu(false);
    if (tool.id === toolId) return;
    // State is already persisted via useEffect → just navigate
    router.push(tool.href);
  }, [router, toolId]);

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------
  const handleSubmit = useCallback(() => {
    const compiled = buildCompiledText(sourceText, attachments);
    if (!compiled.trim() && !attachments.some((a) => a.dataUri)) return;
    onSubmit(compiled || sourceText);
  }, [sourceText, attachments, onSubmit]);

  const canSubmit = (sourceText.trim().length > 0 || attachments.length > 0) && !isLoading;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="w-full rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
      {/* Attachment row */}
      {attachments.length > 0 && (
        <div className="flex gap-2 p-3 pb-0 flex-wrap">
          {attachments.map((a) => (
            <AttachmentCard
              key={a.id}
              attachment={a}
              onRemove={(id) => setAttachments((prev) => prev.filter((x) => x.id !== id))}
            />
          ))}
        </div>
      )}

      {/* Textarea */}
      <div className="px-3 pt-3 pb-1">
        <textarea
          ref={textareaRef}
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
          onPaste={handlePaste}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder={placeholder || animatedPlaceholder}
          rows={3}
          className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none leading-relaxed min-h-[72px] max-h-[220px]"
        />
      </div>

      {/* Link input (inline, shown when user picks "Add a link") */}
      {showLinkInput && (
        <div className="px-3 pb-2 flex gap-2 items-center border-t border-border pt-2">
          <input
            type="url"
            value={linkValue}
            onChange={(e) => setLinkValue(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void handleLinkSubmit(); if (e.key === 'Escape') { setShowLinkInput(false); setLinkValue(''); } }}
            placeholder="https://example.com"
            autoFocus
            className="flex-1 text-sm bg-muted/40 border border-border rounded-lg px-3 py-1.5 outline-none focus:border-[var(--accent-brand)] transition-colors text-foreground placeholder:text-muted-foreground"
          />
          <button
            type="button"
            onClick={() => void handleLinkSubmit()}
            disabled={linkLoading || !linkValue.trim()}
            className="px-3 py-1.5 bg-[var(--accent-brand)] text-white rounded-lg text-xs font-semibold hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5"
          >
            {linkLoading && <Loader2 className="h-3 w-3 animate-spin" />}
            Add
          </button>
          <button type="button" onClick={() => { setShowLinkInput(false); setLinkValue(''); }} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Bottom bar */}
      <div className="flex items-center gap-1.5 px-2 pb-2 pt-0">
        {/* + button */}
        <div ref={plusMenuRef}>
          <button
            ref={plusButtonRef}
            type="button"
            onClick={() => { setShowPlusMenu((v) => !v); setShowToolMenu(false); }}
            className="h-8 w-8 flex items-center justify-center rounded-full border border-border text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors"
          >
            <Plus className="h-4 w-4" />
          </button>

          {showPlusMenu && (
            <div className="fixed z-[999] w-52 rounded-lg border border-border bg-card shadow-lg py-1 text-sm" style={{
              top: `${plusMenuPosition.top}px`,
              left: `${plusMenuPosition.left}px`,
            }}>
              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf,.docx,.txt,.md"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent/10 transition-colors text-foreground"
                onClick={() => { setShowPhotosSubmenu(!showPhotosSubmenu); }}
              >
                <Image className="h-4 w-4 text-muted-foreground" />
                Photos
              </button>
              {showPhotosSubmenu && (
                <>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent/10 transition-colors text-foreground text-sm pl-8"
                    onClick={() => { void handleScreenshot(); setShowPhotosSubmenu(false); setShowPlusMenu(false); }}
                    disabled={capturing}
                  >
                    {capturing ? <Loader2 className="h-4 w-4 text-muted-foreground animate-spin" /> : <Camera className="h-4 w-4 text-muted-foreground" />}
                    Take screenshot
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent/10 transition-colors text-foreground text-sm pl-8"
                    onClick={() => { alert('Camera feature coming soon'); setShowPhotosSubmenu(false); setShowPlusMenu(false); }}
                  >
                    <Camera className="h-4 w-4 text-muted-foreground" />
                    Take photo
                  </button>
                  <button
                    type="button"
                    className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent/10 transition-colors text-foreground text-sm pl-8"
                    onClick={() => { fileInputRef.current?.click(); setShowPhotosSubmenu(false); setShowPlusMenu(false); }}
                  >
                    <Image className="h-4 w-4 text-muted-foreground" />
                    Photo library
                  </button>
                </>
              )}
              <div className="h-px bg-border my-1" />
              <button
                type="button"
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent/10 transition-colors text-foreground"
                onClick={() => { fileInputRef.current?.click(); setShowPlusMenu(false); }}
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                Add files
              </button>
              <div className="h-px bg-border my-1" />
              <button
                type="button"
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent/10 transition-colors text-foreground"
                onClick={() => { setShowLinkInput(true); setShowPlusMenu(false); }}
              >
                <Link className="h-4 w-4 text-muted-foreground" />
                Add a link
              </button>
              <div className="h-px bg-border my-1" />
              <button
                type="button"
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent/10 transition-colors text-foreground text-sm"
                onClick={() => { router.push(`${currentTool.href}?open=recents`); setShowPlusMenu(false); }}
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                Import from recents
              </button>
              <button
                type="button"
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent/10 transition-colors text-foreground text-sm"
                onClick={() => { router.push(`${currentTool.href}?open=microsoft`); setShowPlusMenu(false); }}
              >
                <FileText className="h-4 w-4 text-muted-foreground" />
                Microsoft 365
              </button>
            </div>
          )}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Tool switcher */}
        {!hideToolSwitcher && (
          <div ref={toolMenuRef}>
            <button
              ref={toolButtonRef}
              type="button"
              onClick={() => { setShowToolMenu((v) => !v); setShowPlusMenu(false); }}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent/10 transition-colors border border-transparent hover:border-border"
            >
              {currentTool.label}
              <ChevronDown className="h-3 w-3" />
            </button>

            {showToolMenu && (
              <div className="fixed z-[999] w-40 rounded-lg border border-border bg-card shadow-lg py-1 text-sm" style={{
                top: `${toolMenuPosition.top}px`,
                right: `${toolMenuPosition.right}px`,
              }}>
                {TOOLS.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    className={`w-full flex items-center justify-between px-3 py-2 hover:bg-accent/10 transition-colors ${tool.id === toolId ? 'text-[var(--accent-brand)] font-semibold' : 'text-foreground'}`}
                    onClick={() => handleToolSwitch(tool)}
                  >
                    {tool.label}
                    {tool.id === toolId && <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-brand)]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Mic */}
        <button
          type="button"
          onClick={() => stt.toggle()}
          title={stt.state === 'recording' ? 'Stop recording' : stt.state === 'transcribing' ? 'Transcribing…' : 'Record voice'}
          className={`h-8 w-8 flex items-center justify-center rounded-full transition-colors ${
            stt.state === 'recording'
              ? 'bg-red-500 text-white animate-pulse'
              : stt.state === 'transcribing'
                ? 'bg-muted text-muted-foreground'
                : 'text-muted-foreground hover:text-foreground hover:bg-accent/10'
          }`}
        >
          {stt.state === 'transcribing'
            ? <Loader2 className="h-4 w-4 animate-spin" />
            : stt.state === 'recording'
              ? <MicOff className="h-4 w-4" />
              : <Mic className="h-4 w-4" />}
        </button>

        {/* Submit */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="h-8 w-8 flex items-center justify-center rounded-full bg-[var(--accent-brand)] text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowUp className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
