'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { PageHeader } from '@/components/ui/page-header';

interface NoteStyleOption {
  value: string;
  label: string;
  description: string;
}

interface NotesOptionsPanelProps {
  setPhase: (phase: 'input' | 'options' | 'study') => void;
  setSourceText: (text: string) => void;
  style: string;
  setStyle: (style: string) => void;
  length: 'short' | 'medium' | 'long';
  setLength: (length: 'short' | 'medium' | 'long') => void;
  audience: string;
  setAudience: (audience: string) => void;
  customTitle: string;
  setCustomTitle: (title: string) => void;
  noteStyleOptions: NoteStyleOption[];
  isLoading: boolean;
  pageTitle: string;
  runNotesGeneration: (text: string, options?: any) => Promise<any>;
  sourceText: string;
  isWordwebPreset: boolean;
  isTimelinePreset: boolean;
}

export function NotesOptionsPanel({
  setPhase,
  setSourceText,
  style,
  setStyle,
  length,
  setLength,
  audience,
  setAudience,
  customTitle,
  setCustomTitle,
  noteStyleOptions,
  isLoading,
  pageTitle,
  runNotesGeneration,
  sourceText,
  isWordwebPreset,
  isTimelinePreset,
}: NotesOptionsPanelProps) {
  return (
    <div className="h-full flex flex-col">
      <PageHeader
        title={`Customize ${pageTitle}`}
        subtitle="Configure your content generation settings"
        hideBreadcrumb
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-6">
          {/* Style selection */}
          {!isWordwebPreset && !isTimelinePreset && (
            <div className="space-y-2">
              <p className="text-[10px] text-muted-foreground">Note Style</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {noteStyleOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setStyle(option.value)}
                    className={`p-3 rounded-lg border transition-colors text-left ${
                      style === option.value
                        ? 'border-border bg-background'
                        : 'border-transparent bg-muted hover:bg-muted/80'
                    }`}
                  >
                    <p className="text-sm font-medium">{option.label}</p>
                    <p className="text-xs text-muted-foreground">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Length selection */}
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground">Length</p>
            <div className="flex flex-wrap gap-2">
              {['short', 'medium', 'long'].map((option) => (
                <button
                  key={option}
                  onClick={() => setLength(option as 'short' | 'medium' | 'long')}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    length === option
                      ? 'border-border bg-background text-foreground'
                      : 'border-transparent bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Audience selection */}
          <div className="space-y-2">
            <p className="text-[10px] text-muted-foreground">Target Audience</p>
            <div className="flex flex-wrap gap-2">
              {['student', 'teacher', 'parent'].map((option) => (
                <button
                  key={option}
                  onClick={() => setAudience(option)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    audience === option
                      ? 'border-border bg-background text-foreground'
                      : 'border-transparent bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                >
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Title input */}
          <div className="space-y-1.5">
            <p className="text-[10px] text-muted-foreground">Title</p>
            <Input
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="h-9 text-sm"
              placeholder="Optional title for your content"
            />
          </div>
        </div>
      </div>

      {/* Footer actions */}
      <div className="border-t border-border p-4 flex justify-between gap-2">
        <Button
          variant="outline"
          onClick={() => {
            setPhase('input');
            setSourceText('');
          }}
        >
          Back
        </Button>
        <Button
          onClick={() => {
            setPhase('study');
            void runNotesGeneration(sourceText, { background: false });
          }}
          disabled={isLoading || !sourceText.trim()}
        >
          {isLoading ? (
            <>
              <Spinner size={16} className="mr-2" />
              Generating...
            </>
          ) : (
            `Generate ${pageTitle}`
          )}
        </Button>
      </div>
    </div>
  );
}
