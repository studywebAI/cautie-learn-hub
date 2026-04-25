'use client';

import React, { useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { UploadCloud, FileText, ImageIcon, X, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SourceInputProps {
  value: string;
  onChange: (text: string) => void;
  onSubmit?: () => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}

export function SourceInput({
  value,
  onChange,
  onSubmit,
  placeholder = 'Paste material or upload a file...',
  disabled = false,
  label = 'Source Text',
}: SourceInputProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

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
      toast({
        variant: 'destructive',
        title: 'Niet ondersteund bestandstype',
        description: 'Upload een PDF, DOCX, TXT, JPG, PNG of WebP bestand.',
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Bestand te groot',
        description: 'Max bestandsgrootte is 10MB.',
      });
      return;
    }

    setUploadedFile(file);
    setIsProcessing(true);

    try {
      if (file.type === 'text/plain') {
        const text = await file.text();
        onChange(text);
      } else {
        // For PDFs, DOCX, and images - upload and extract text via API
        const formData = new FormData();
        formData.append('file', file);
        
        const res = await fetch('/api/tools/extract-text', {
          method: 'POST',
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data.text) {
            onChange(data.text);
          } else {
            toast({
              title: 'Bestand geüpload',
              description: 'Kon geen tekst extraheren. Je kunt de tekst handmatig invoeren.',
            });
          }
        } else {
          // Fallback: just note the file was uploaded
          toast({
            title: 'Bestand geüpload',
            description: 'Tekst extractie is niet beschikbaar. Voer de tekst handmatig in.',
          });
        }
      }
    } catch {
      toast({
        title: 'Bestand geüpload',
        description: 'Kon tekst niet automatisch extraheren. Voer de tekst handmatig in.',
      });
    } finally {
      setIsProcessing(false);
    }

    // Reset input so the same file can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const clearFile = () => {
    setUploadedFile(null);
  };

  const isImage = uploadedFile?.type.startsWith('image/');

  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center justify-between">
        <Label>{label}</Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="gap-1.5 text-xs"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isProcessing}
        >
          {isProcessing ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <UploadCloud className="h-3.5 w-3.5" />
          )}
          Upload bestand
        </Button>
      </div>

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
        placeholder={placeholder}
        className="min-h-[74vh] text-sm"
        disabled={disabled || isProcessing}
      />

      {uploadedFile && (
        <div className="flex items-center gap-2 rounded-md border bg-muted/50 px-3 py-2 text-sm">
          {isImage ? (
            <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
          ) : (
            <FileText className="h-4 w-4 shrink-0 text-primary" />
          )}
          <span className="truncate">{uploadedFile.name}</span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto h-5 w-5 shrink-0"
            onClick={clearFile}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Ctrl/Cmd + Enter om te genereren. Ondersteunt PDF, DOCX, TXT, JPG, PNG.
      </p>

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
