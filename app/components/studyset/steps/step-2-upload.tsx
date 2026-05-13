'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { SourceInput } from '@/components/tools/source-input';
import { CheckCircle2, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

type WorkflowData = {
  step: 1 | 2 | 3 | 4;
  name: string;
  description: string;
  subject: string;
  materials: Array<{ type: string; content: string }>;
  agenda: Record<string, any>;
  preferences: Record<string, any>;
  studysetId?: string;
};

export function Step2Upload({
  data,
  setData,
}: {
  data: WorkflowData;
  setData: (data: WorkflowData) => void;
}) {
  const [sourceText, setSourceText] = useState('');

  const handleAddMaterial = async (compiledText?: string) => {
    const textToAdd = compiledText || sourceText;
    if (!textToAdd.trim()) return;

    setData({
      ...data,
      materials: [
        ...data.materials,
        { type: 'text', content: textToAdd },
      ],
    });
    setSourceText('');
  };

  const removeMaterial = (index: number) => {
    setData({
      ...data,
      materials: data.materials.filter((_, i) => i !== index),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Your Materials</CardTitle>
        <CardDescription>
          Add anything you want to study - text, files, links, images, or voice notes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Component */}
        <SourceInput
          value={sourceText}
          onChange={setSourceText}
          onSubmit={handleAddMaterial}
          placeholder="Paste text, add files, links, or record voice notes..."
          toolId="notes"
          enableMic={true}
          submitLabel="Add Material"
          showSubmitButton={true}
        />

        {/* Materials List */}
        {data.materials.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-3">Added Materials ({data.materials.length})</p>
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {data.materials.map((material, idx) => (
                <div
                  key={idx}
                  className="flex items-start justify-between p-3 rounded-lg border bg-muted/30 group hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <CheckCircle2 className="h-5 w-5 text-[var(--accent-brand)] mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium line-clamp-2 break-words">
                        {material.content.substring(0, 100)}
                        {material.content.length > 100 ? '...' : ''}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {material.type} • {material.content.length} chars
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMaterial(idx)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 p-4 border border-blue-200 dark:border-blue-800">
          <p className="text-sm text-blue-900 dark:text-blue-200">
            <strong>Tip:</strong> The more material you add, the better the AI can understand your topic. Add textbooks, notes, articles, images, or anything relevant.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
