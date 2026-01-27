'use client';

import React, { useState, useContext, Suspense, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Loader2, Sparkles } from 'lucide-react';
import { AppContext } from '@/contexts/app-context';
import { NoteViewer } from '@/components/material-viewers/note-viewer';
import type { GenerateNotesOutput } from '@/ai/flows/generate-notes';
import { ToolLayout } from '@/components/tools/tool-layout';
import { useToast } from '@/hooks/use-toast';

function NotesPageContent() {
  const searchParams = useSearchParams();
  const sourceTextFromParams = searchParams.get('sourceText');

  const [sourceText, setSourceText] = useState(sourceTextFromParams || '');
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);
  const [generatedNotes, setGeneratedNotes] = useState<GenerateNotesOutput['notes'] | null>(null);

  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileType, setFileType] = useState<'image' | 'file' | null>(null);
  const [topic, setTopic] = useState('');
  const [length, setLength] = useState<'short' | 'medium' | 'long'>('medium');
  const [mode, setMode] = useState('structured');
  const [highlightTitles, setHighlightTitles] = useState(false);
  const [fontFamily, setFontFamily] = useState<'default' | 'serif' | 'sans-serif' | 'monospace'>('default');

  const { toast } = useToast();
  const appContext = useContext(AppContext);

  const handleGenerate = async (text: string) => {
    if (!text.trim()) {
      toast({
        variant: 'destructive',
        title: 'Source text is empty',
        description: 'Please paste some text or upload a file to generate notes from.',
      });
      return;
    }

    setIsLoading(true);
    setGeneratedNotes(null);

    try {
      const apiResponse = await fetch('/api/ai/handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowName: 'generateNotes',
          input: { sourceText: text, topic: topic || undefined, length, style: mode, highlightTitles, fontFamily },
        }),
      });

      if (!apiResponse.ok) {
        let errorMessage = apiResponse.statusText;
        try {
          const errorData = await apiResponse.json();
          if (errorData.detail) errorMessage = errorData.detail;
          if (errorData.code === "MISSING_API_KEY") {
            errorMessage = "AI is not configured (Missing API Key). Please check server logs.";
          }
        } catch (e) { /* ignore */ }
        throw new Error(errorMessage);
      }

      const response = await apiResponse.json();
      setGeneratedNotes(response.notes);
    } catch (error) {
      console.error('Error generating notes:', error);
      toast({
        variant: 'destructive',
        title: 'Something went wrong',
        description: 'The AI could not generate notes. Please try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = () => {
    handleGenerate(sourceText);
  };

  // Add to recents when notes are generated
  useEffect(() => {
    if (generatedNotes) {
      const title = uploadedFile
        ? `${uploadedFile.name.split('.')[0]} Notes`
        : `Notes from "${sourceText.slice(0, 30)}${sourceText.length > 30 ? '...' : ''}"`;

      if ((window as any).recentsManager) {
        (window as any).recentsManager.addRecent({
          title,
          type: 'notes'
        });
      }
    }
  }, [generatedNotes, uploadedFile, sourceText]);

  const handleRestart = () => {
    setGeneratedNotes(null);
  };

  const totalLoading = isLoading || isProcessingFile;

  const modeOptions = [
    { value: 'structured', label: 'Structured' },
    { value: 'bullet-points', label: 'Bullet Points' },
    { value: 'standard', label: 'Standard' },
    { value: 'mindmap', label: 'Mindmap' },
    { value: 'timeline', label: 'Timeline' },
    { value: 'chart', label: 'Chart' },
    { value: 'venndiagram', label: 'Venn Diagram' },
    { value: 'vocabulary', label: 'Vocabulary' },
    { value: 'flowchart', label: 'Flowchart' },
  ];

  // Generate subject cards based on uploaded content
  const subjectCards = uploadedFile ? [
    { title: `${uploadedFile.name.split('.')[0]} Notes`, type: 'Notes' },
    { title: `${uploadedFile.name.split('.')[0]} Summary`, type: 'Summary' },
    { title: `${uploadedFile.name.split('.')[0]} Study Guide`, type: 'Study Guide' },
  ] : [];

  const additionalSettings = [
    {
      label: 'Length',
      value: length,
      onChange: setLength,
      options: [
        { value: 'short', label: 'Short' },
        { value: 'medium', label: 'Medium' },
        { value: 'long', label: 'Long' },
      ]
    },
    {
      label: 'Font',
      value: fontFamily,
      onChange: setFontFamily,
      options: [
        { value: 'default', label: 'Default' },
        { value: 'serif', label: 'Serif' },
        { value: 'sans-serif', label: 'Sans Serif' },
        { value: 'monospace', label: 'Monospace' },
      ]
    },
    {
      label: 'Titles',
      value: highlightTitles,
      onChange: setHighlightTitles,
      options: [
        { value: false, label: 'Normal' },
        { value: true, label: 'Highlighted' },
      ]
    }
  ];

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <h3 className="text-2xl font-bold tracking-tight mt-4">
            Generating Your Notes
          </h3>
          <p className="text-sm text-muted-foreground">
            The AI is analyzing the text. Please wait a moment...
          </p>
        </div>
      </div>
    );
  }

  if (generatedNotes) {
    return (
      <div className="flex flex-col gap-8">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-headline">Notes</h1>
            <p className="text-muted-foreground">
              Your automatically generated notes.
            </p>
          </div>
          <Button onClick={handleRestart} variant="outline">
            Generate New Notes
          </Button>
        </header>
        <NoteViewer notes={generatedNotes} />
      </div>
    );
  }

  return (
    <ToolLayout
      title="Notes"
      description="Create notes from text, files, or previous projects."
      sourceText={sourceText}
      setSourceText={setSourceText}
      onGenerate={handleFormSubmit}
      isLoading={totalLoading}
      isProcessingFile={isProcessingFile}
      uploadedFile={uploadedFile}
      setUploadedFile={setUploadedFile}
      fileType={fileType}
      setFileType={setFileType}
      modeOptions={modeOptions}
      selectedMode={mode}
      onModeChange={setMode}
      modeButtonText="Note Style"
      additionalSettings={additionalSettings}
      subjectCards={subjectCards}
    />
  );
}

export default function NotesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <NotesPageContent />
    </Suspense>
  );
}