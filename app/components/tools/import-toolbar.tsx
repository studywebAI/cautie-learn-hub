'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Import, Loader2, ClipboardPaste } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type ImportToolbarProps = {
  toolType: 'quiz' | 'flashcards' | 'notes';
  onImport: (text: string) => void;
  disabled?: boolean;
};

export function ImportToolbar({ toolType, onImport, disabled }: ImportToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    try {
      if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
        const text = await file.text();
        onImport(text);
        toast({ title: 'Imported', description: `Loaded ${toolType} from HTML file.` });
      } else if (file.name.endsWith('.md') || file.name.endsWith('.txt')) {
        const text = await file.text();
        onImport(text);
        toast({ title: 'Imported', description: `Loaded ${toolType} from text file.` });
      } else if (file.type === 'application/json') {
        const text = await file.text();
        onImport(text);
        toast({ title: 'Imported', description: `Loaded ${toolType} from JSON.` });
      } else {
        toast({ variant: 'destructive', title: 'Unsupported', description: 'Import HTML, Markdown, TXT, or JSON files.' });
      }
    } catch {
      toast({ variant: 'destructive', title: 'Import failed' });
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text.trim()) {
        toast({ variant: 'destructive', title: 'Clipboard empty' });
        return;
      }
      onImport(text);
      toast({ title: 'Imported', description: `Pasted content loaded as ${toolType}.` });
    } catch {
      toast({ variant: 'destructive', title: 'Paste failed', description: 'Could not access clipboard.' });
    }
  };

  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">Import</p>
      <div className="flex gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 text-xs rounded-full h-8 border-border bg-muted/80 hover:bg-muted"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isProcessing}
        >
          {isProcessing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Import className="h-3 w-3" />}
          File
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="flex-1 gap-1.5 text-xs rounded-full h-8 border-border bg-muted/80 hover:bg-muted"
          onClick={handlePaste}
          disabled={disabled || isProcessing}
        >
          <ClipboardPaste className="h-3 w-3" />
          Paste
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        accept=".html,.htm,.md,.txt,.json"
        onChange={handleFile}
      />
    </div>
  );
}
