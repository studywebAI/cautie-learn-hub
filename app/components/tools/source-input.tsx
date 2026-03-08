'use client';

import React, { useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { UploadCloud, FileText, ImageIcon, X, Loader2, Link2, Lightbulb } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SourceInputProps {
  value: string;
  onChange: (text: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function SourceInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Paste or type your source material...',
  disabled = false,
}: SourceInputProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [isFetchingUrl, setIsFetchingUrl] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const supported = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/webp',
    ];

    if (!supported.includes(file.type)) {
      toast({ variant: 'destructive', title: 'Unsupported file type', description: 'Upload a PDF, DOCX, TXT, JPG, PNG or WebP file.' });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Max file size is 10MB.' });
      return;
    }

    setUploadedFile(file);
    setIsProcessing(true);

    try {
      if (file.type === 'text/plain') {
        const text = await file.text();
        onChange(text);
      } else {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/tools/extract-text', { method: 'POST', body: formData });
        if (res.ok) {
          const data = await res.json();
          if (data.text) onChange(data.text);
          else toast({ title: 'File uploaded', description: 'Could not extract text. Enter text manually.' });
        } else {
          toast({ title: 'File uploaded', description: 'Text extraction unavailable. Enter text manually.' });
        }
      }
    } catch {
      toast({ title: 'File uploaded', description: 'Could not extract text automatically.' });
    } finally {
      setIsProcessing(false);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
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

  const handleUrlImport = async () => {
    const url = urlInput.trim();
    if (!url) return;

    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
    } catch {
      toast({ variant: 'destructive', title: 'Invalid URL', description: 'Enter a valid website URL.' });
      return;
    }

    setIsFetchingUrl(true);
    try {
      const res = await fetch('/api/tools/extract-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.startsWith('http') ? url : `https://${url}` }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.text) {
          onChange(data.text);
          setUrlInput('');
          setShowUrlInput(false);
          toast({ title: 'Content imported', description: `Extracted text from ${new URL(url.startsWith('http') ? url : `https://${url}`).hostname}` });
        } else {
          toast({ variant: 'destructive', title: 'No content found', description: 'Could not extract text from this URL.' });
        }
      } else {
        toast({ variant: 'destructive', title: 'Import failed', description: 'Could not fetch content from this URL.' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Import failed', description: 'Network error fetching URL.' });
    } finally {
      setIsFetchingUrl(false);
    }
  };

  const isImage = uploadedFile?.type.startsWith('image/');
  const wordCount = value.trim() ? value.trim().split(/\s+/).length : 0;
  const charCount = value.length;

  const tips = [
    'Paste lecture notes, textbook chapters, or articles',
    'Upload a PDF, DOCX, or image with text',
    'Import content from any URL',
    'Even a single sentence works — more text = richer output',
  ];

  return (
    <div
      className="h-full flex flex-col gap-3"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* Tips area — top */}
      {!value && (
        <div className="flex items-start pt-2">
          <div className="space-y-2.5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5 text-foreground/60">
              <Lightbulb className="h-3.5 w-3.5" />
              <span className="font-medium">Tips</span>
            </div>
            {tips.map((tip, i) => (
              <p key={i} className="pl-5">• {tip}</p>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded file chip */}
      {uploadedFile && (
        <div className="flex items-center gap-2 rounded-full border bg-muted/50 px-3 py-1.5 text-xs">
          {isImage ? <ImageIcon className="h-3.5 w-3.5 shrink-0 text-primary" /> : <FileText className="h-3.5 w-3.5 shrink-0 text-primary" />}
          <span className="truncate">{uploadedFile.name}</span>
          <Button variant="ghost" size="icon" className="ml-auto h-4 w-4 shrink-0" onClick={() => setUploadedFile(null)}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Spacer to push input area to bottom */}
      <div className="flex-1" />

      {/* URL import bar */}
      {showUrlInput && (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-bottom-1 duration-150">
          <input
            autoFocus
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleUrlImport(); if (e.key === 'Escape') setShowUrlInput(false); }}
            placeholder="https://en.wikipedia.org/wiki/..."
            className="flex-1 bg-background border rounded-full px-3 py-1.5 text-xs outline-none focus:ring-1 focus:ring-ring"
            disabled={isFetchingUrl}
          />
          <Button size="sm" onClick={handleUrlImport} disabled={isFetchingUrl || !urlInput.trim()} className="rounded-full text-xs h-7 px-3">
            {isFetchingUrl ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Import'}
          </Button>
        </div>
      )}

      {/* Textarea — bottom */}
      <Textarea
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (uploadedFile) setUploadedFile(null);
        }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
            e.preventDefault();
            onSubmit?.();
          }
        }}
        placeholder="Enter your text here..."
        className="min-h-[120px] max-h-[200px] resize-none text-sm"
        disabled={disabled || isProcessing}
      />

      {/* Action bar — below textarea */}
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant={showUrlInput ? 'secondary' : 'ghost'}
          size="sm"
          className="gap-1.5 text-xs rounded-full"
          onClick={() => setShowUrlInput(!showUrlInput)}
          disabled={disabled || isProcessing}
        >
          <Link2 className="h-3.5 w-3.5" />
          URL
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs rounded-full"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isProcessing}
        >
          {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
          Upload
        </Button>
        {charCount > 0 && (
          <span className="ml-auto mr-2 text-[10px] text-muted-foreground font-mono tabular-nums">
            {wordCount} words · {charCount} chars
          </span>
        )}
        <Button
          type="button"
          size="sm"
          className="ml-auto gap-1.5 rounded-full"
          onClick={() => onSubmit?.()}
          disabled={disabled || isProcessing || !value.trim()}
        >
          {isProcessing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Generate
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        accept=".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp"
        onChange={handleFileChange}
        disabled={disabled || isProcessing}
      />
    </div>
  );
}
