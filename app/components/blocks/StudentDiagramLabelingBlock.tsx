'use client';

import React, { useRef, useState } from 'react';
import { BaseBlock, DiagramLabelingBlockContent } from './types';
import { Button } from '@/components/ui/button';

interface StudentDiagramLabelingBlockProps {
  block: BaseBlock & { data: DiagramLabelingBlockContent };
  onSubmit: (answerData: any) => Promise<{ ok: boolean; error?: string }>;
  isSubmitted?: boolean;
}

export const StudentDiagramLabelingBlock: React.FC<StudentDiagramLabelingBlockProps> = ({
  block,
  onSubmit,
  isSubmitted = false,
}) => {
  const points: Array<{ id: string; x: number; y: number; correctLabel: string }> = block.data.points || [];
  const labelBank: string[] = (block.data.labelBank || []).filter(Boolean);
  const [labels, setLabels] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const startedAtRef = useRef<string>(new Date().toISOString());

  const allAnswered = points.length > 0 && points.every((p) => labels[p.id]);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    const result = await onSubmit({
      labels,
      started_at: startedAtRef.current,
      submitted_at: new Date().toISOString(),
    });
    if (!result.ok) {
      setError(result.error || 'Failed to submit answer');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-3">
      {block.data.url && (
        <div className="relative inline-block max-w-full">
          <img src={block.data.url} alt="" className="block max-w-full max-h-80 rounded-md border border-border object-contain" />
          {points.map((p, idx) => (
            <span
              key={p.id}
              className="absolute flex h-5 w-5 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-foreground text-[10px] font-semibold text-background"
              style={{ left: `${p.x}%`, top: `${p.y}%` }}
            >
              {idx + 1}
            </span>
          ))}
        </div>
      )}
      <div className="space-y-1.5">
        {points.map((p, idx) => (
          <div key={p.id} className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
              {idx + 1}
            </span>
            <select
              value={labels[p.id] || ''}
              onChange={(e) => setLabels((prev) => ({ ...prev, [p.id]: e.target.value }))}
              disabled={isSubmitted || isSubmitting}
              className="h-8 flex-1 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">...</option>
              {labelBank.map((label) => (
                <option key={label} value={label}>{label}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
      {!isSubmitted && (
        <Button onClick={handleSubmit} disabled={!allAnswered || isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Answer'}
        </Button>
      )}
      {isSubmitted && <div className="text-sm text-green-600 font-medium">Answer submitted successfully!</div>}
      {error && <div className="text-sm text-destructive">{error}</div>}
    </div>
  );
};
