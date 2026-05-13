'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Upload,
  FileText,
  Mic,
  Link2,
  Image,
  Copy,
  Trash2,
  CheckCircle2,
} from 'lucide-react';

type WorkflowData = {
  step: 1 | 2 | 3 | 4 | 5;
  name: string;
  description: string;
  subject: string;
  materials: Array<{ type: string; content: string }>;
  aiGenOptions: string;
  agenda: Record<string, any>;
  preferences: Record<string, any>;
  studysetId?: string;
};

type MaterialPattern = 'drag-drop' | 'voice' | 'url-parser' | 'batch-import' | 'ocr';

export function Step2Upload({
  data,
  setData,
}: {
  data: WorkflowData;
  setData: (data: WorkflowData) => void;
}) {
  const [uploadPattern, setUploadPattern] = useState<MaterialPattern>('drag-drop');
  const [textInput, setTextInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const patterns: { id: MaterialPattern; icon: any; label: string; description: string }[] = [
    { id: 'drag-drop', icon: Upload, label: 'Drag & Drop', description: 'Files & documents' },
    { id: 'voice', icon: Mic, label: 'Voice', description: 'Record audio notes' },
    { id: 'url-parser', icon: Link2, label: 'Link', description: 'Paste URLs' },
    { id: 'batch-import', icon: Copy, label: 'Batch Import', description: 'Multiple files' },
    { id: 'ocr', icon: Image, label: 'Screenshot', description: 'Text from images' },
  ];

  const addMaterial = (type: string, content: string) => {
    if (!content.trim()) return;
    setData({
      ...data,
      materials: [...data.materials, { type, content }],
    });
    setTextInput('');
  };

  const removeMaterial = (index: number) => {
    setData({
      ...data,
      materials: data.materials.filter((_, i) => i !== index),
    });
  };

  const handleFileUpload = (files: FileList) => {
    for (const file of files) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result || '';
        addMaterial('file', `${file.name} (${file.size} bytes)`);
      };
      reader.readAsText(file);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Your Materials</CardTitle>
        <CardDescription>
          Add the content you want to study - documents, notes, links, recordings, or screenshots
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Pattern Selector */}
        <div>
          <Label className="mb-3 block">Choose upload method</Label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {patterns.map(pattern => {
              const Icon = pattern.icon;
              return (
                <button
                  key={pattern.id}
                  onClick={() => setUploadPattern(pattern.id)}
                  className={`flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all ${
                    uploadPattern === pattern.id
                      ? 'border-[var(--accent-brand)] bg-blue-50 dark:bg-blue-900/20'
                      : 'border-border hover:border-[var(--accent-brand)]'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span className="text-xs font-medium text-center">{pattern.label}</span>
                  <span className="text-[10px] text-muted-foreground text-center">
                    {pattern.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Upload Area */}
        <div className="space-y-3">
          {uploadPattern === 'drag-drop' && (
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
              onDragOver={e => e.preventDefault()}
              onDrop={e => {
                e.preventDefault();
                handleFileUpload(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="font-medium">Drag files here or click to browse</p>
              <p className="text-sm text-muted-foreground">PDF, DOC, TXT, images supported</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => e.target.files && handleFileUpload(e.target.files)}
              />
            </div>
          )}

          {uploadPattern === 'voice' && (
            <div className="space-y-3">
              <Button className="w-full" variant="outline">
                <Mic className="h-4 w-4 mr-2" />
                Start Recording
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Record your notes, and we'll transcribe them automatically
              </p>
            </div>
          )}

          {uploadPattern === 'url-parser' && (
            <div className="space-y-2">
              <Input
                placeholder="https://example.com/article"
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
              />
              <Button
                onClick={() => addMaterial('url', textInput)}
                className="w-full"
              >
                Add Link
              </Button>
              <p className="text-sm text-muted-foreground">
                Works with articles, videos, PDFs, and more
              </p>
            </div>
          )}

          {uploadPattern === 'batch-import' && (
            <div className="space-y-2">
              <Textarea
                placeholder="Paste multiple URLs, one per line..."
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                rows={4}
              />
              <Button
                onClick={() => {
                  textInput.split('\n').forEach(line => {
                    if (line.trim()) addMaterial('url-batch', line.trim());
                  });
                }}
                className="w-full"
              >
                Import All
              </Button>
            </div>
          )}

          {uploadPattern === 'ocr' && (
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center bg-muted/20 cursor-pointer hover:bg-muted/40 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Image className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="font-medium">Click to select image or screenshot</p>
              <p className="text-sm text-muted-foreground">We'll extract text automatically</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={e => e.target.files && handleFileUpload(e.target.files)}
              />
            </div>
          )}
        </div>

        {/* Materials List */}
        {data.materials.length > 0 && (
          <div>
            <Label className="mb-3 block">Added Materials ({data.materials.length})</Label>
            <div className="space-y-2">
              {data.materials.map((material, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-lg border bg-muted/30"
                >
                  <div className="flex items-center gap-2 flex-1">
                    <CheckCircle2 className="h-4 w-4 text-[var(--accent-brand)]" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{material.content}</p>
                      <p className="text-xs text-muted-foreground">{material.type}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMaterial(idx)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-4 border border-green-200 dark:border-green-800">
          <p className="text-sm text-green-900 dark:text-green-200">
            <strong>Tip:</strong> You can add as much material as you want. The AI will analyze it all and create your study plan.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
