'use client';

import React, { useState, useEffect, useContext, useCallback, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Loader2, Copy } from 'lucide-react';
import { AppContext } from '@/contexts/app-context';
import { runToolFlowV2 } from '@/lib/toolbox/client';
import { WorkbenchShell } from '@/components/tools/workbench-shell';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ToolInputBox } from '@/components/tools/tool-input-box';
import { PageHeader } from '@/components/ui/page-header';
import { useToast } from '@/hooks/use-toast';
import { FunLoader } from '@/components/tools/fun-loader';
import { Mindmap } from '@/components/tools/mindmap';
import { Switch } from '@/components/ui/switch';
import { classifyContent } from '@/lib/tools/content-classifier';
import type { ContentClassification } from '@/lib/tools/content-classifier';

type Phase = 'input' | 'options' | 'study';

interface MindNode {
  id: string;
  label: string;
  color?: string;
  children?: MindNode[];
  x?: number;
  y?: number;
}

function MindmapPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceTextFromParams = searchParams.get('sourceText');
  const { toast } = useToast();
  const appContext = useContext(AppContext);
  const language = appContext?.language ?? 'en';
  const region = appContext?.region ?? 'global';
  const schoolingLevel = appContext?.schoolingLevel ?? 2;

  const [phase, setPhase] = useState<Phase>('input');
  const [sourceText, setSourceText] = useState(sourceTextFromParams || '');
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedMindmap, setGeneratedMindmap] = useState<MindNode | null>(null);
  const [saveToRecents, setSaveToRecents] = useState(true);
  const [contentClass, setContentClass] = useState<ContentClassification | null>(null);
  const classifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Classify source text after user stops typing (800 ms debounce)
  useEffect(() => {
    if (classifyTimerRef.current) clearTimeout(classifyTimerRef.current);
    classifyTimerRef.current = setTimeout(() => {
      setContentClass(classifyContent(sourceText));
    }, 800);
    return () => {
      if (classifyTimerRef.current) clearTimeout(classifyTimerRef.current);
    };
  }, [sourceText]);

  const handleGenerate = useCallback(async (text: string) => {
    if (!text.trim()) return;
    setIsLoading(true);
    setGeneratedMindmap(null);
    try {
      const requestedTitle = customTitle.trim() || 'Generated Mindmap';

      const run = await runToolFlowV2({
        toolId: 'mindmap',
        flowName: 'generateMindmap',
        artifactType: 'mindmap',
        artifactTitle: requestedTitle,
        options: { saveToRecents },
        persistArtifact: saveToRecents,
        input: {
          sourceText: text,
          imageDataUri: imageDataUri || undefined,
          language,
          educationLevel: schoolingLevel,
          regionCode: String(region || 'global').toUpperCase(),
        },
      });

      const response = run?.output_payload || run;
      setGeneratedMindmap(response.mindmap || response);
      setPhase('study');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Generation Failed',
        description: (error as any)?.message || 'Unable to generate mindmap',
      });
    } finally {
      setIsLoading(false);
    }
  }, [customTitle, imageDataUri, language, region, schoolingLevel, saveToRecents, toast]);

  useEffect(() => {
    if (!sourceTextFromParams) return;
    setSourceText(sourceTextFromParams);
  }, [sourceTextFromParams]);

  const handleRestart = () => {
    setGeneratedMindmap(null);
    setSourceText('');
    setCustomTitle('');
    setPhase('input');
  };

  // INPUT PHASE
  if (phase === 'input') {
    return (
      <WorkbenchShell
        title="Mindmap"
        sidebar={<div />}
        hideSidebar={true}
        breadcrumbIcon={<Copy className="h-4 w-4" />}
      >
        <div className="flex h-full w-full flex-col items-center justify-center p-4">
          <div className="w-full max-w-2xl space-y-4">
            <div className="space-y-1.5 text-center">
              <h1 className="text-2xl font-semibold tracking-tight">Create a Mindmap</h1>
              <p className="text-sm text-muted-foreground">
                Paste your notes, upload a file, or drop a link
              </p>
            </div>
            <ToolInputBox
              toolId="mindmap"
              placeholder="Paste your content here..."
              onSourceChange={(text) => setSourceText(text)}
              onImageDataUriChange={setImageDataUri}
              onSubmit={(compiledText) => {
                setSourceText(compiledText);
                setPhase('options');
              }}
              isLoading={false}
              submitLabel="Next"
              speechLanguage={language}
              hideToolSwitcher
            />
          </div>
        </div>
      </WorkbenchShell>
    );
  }

  if (isLoading) {
    return <FunLoader tool="mindmap" />;
  }

  // OPTIONS PHASE
  if (phase === 'options') {
    return (
      <div className="h-full flex flex-col">
        <PageHeader
          title="Customize Mindmap"
          subtitle="Adjust your settings and generate"
          hideBreadcrumb
        />

        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto p-6 space-y-6">
            {/* Title section */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Title</p>
              <Input
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                className="h-9 text-sm"
                placeholder="Mindmap title (optional)"
                disabled={isLoading}
              />
            </div>

            {/* Content classification tags */}
            {contentClass && (
              <div className="flex flex-wrap gap-1.5">
                {contentClass.vocabulary === 'y' && (
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Vocabulary</span>
                )}
                {contentClass.processes === 'y' && (
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Processes</span>
                )}
                {contentClass.chronological === 'y' && (
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Chronological</span>
                )}
                {contentClass.hierarchical === 'y' && (
                  <span className="text-[10px] px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Hierarchical</span>
                )}
              </div>
            )}

            {/* Save to recents */}
            <div className="border-t border-border pt-4 flex items-center justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-[0.5px] text-muted-foreground">Save to Recents</p>
              <Switch
                checked={saveToRecents}
                onCheckedChange={setSaveToRecents}
              />
            </div>
          </div>
        </div>

        {/* Footer with actions */}
        <div className="border-t border-border p-4 flex justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setPhase('input');
              setSourceText('');
              setCustomTitle('');
            }}
          >
            Back
          </Button>
          <Button
            onClick={() => void handleGenerate(sourceText)}
            disabled={isLoading || !sourceText.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Copy className="mr-2 h-4 w-4" />
                Generate Mindmap
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // STUDY PHASE
  if (phase === 'study' && generatedMindmap) {
    return (
      <div className="h-full flex flex-col">
        <PageHeader title="View Mindmap" hideBreadcrumb />
        <div className="flex-1 min-h-0 overflow-auto flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <Mindmap
              title={customTitle.trim() || 'Generated Mindmap'}
              initialData={generatedMindmap}
              onSave={(data) => {
                setGeneratedMindmap(data);
                toast({ title: 'Mindmap saved' });
              }}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border p-4 flex justify-between gap-2">
          <Button
            variant="outline"
            onClick={() => {
              handleRestart();
              setPhase('options');
            }}
          >
            Back
          </Button>
        </div>
      </div>
    );
  }

  // Fallback
  return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center space-y-2">
        <h2 className="text-lg font-semibold">Mindmap</h2>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export default function MindmapPage() {
  return (
    <Suspense fallback={<FunLoader tool="mindmap" />}>
      <MindmapPageContent />
    </Suspense>
  );
}

import { Suspense } from 'react';
