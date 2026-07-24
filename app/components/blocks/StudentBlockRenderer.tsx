'use client';

import React from 'react';
import { BaseBlock } from './types';
import { StudentTextBlock } from './StudentTextBlock';
import { StudentMultipleChoiceBlock } from './StudentMultipleChoiceBlock';
import { StudentOpenQuestionBlock } from './StudentOpenQuestionBlock';
import { StudentFillInBlankBlock } from './StudentFillInBlankBlock';
import { StudentMediaBlock } from './StudentMediaBlock';
import { StudentDividerBlock } from './StudentDividerBlock';
import { StudentOrderingBlock } from './StudentOrderingBlock';
import { StudentDragDropBlock } from './StudentDragDropBlock';
import { StudentTableBlock } from './StudentTableBlock';
import { StudentNumberLineBlock } from './StudentNumberLineBlock';
import { StudentDiagramLabelingBlock } from './StudentDiagramLabelingBlock';
import { StudentGraphPlotBlock } from './StudentGraphPlotBlock';
import { TimelineAxis } from './TimelineAxis';
import { PollBlock } from './PollBlock';
import { normalizeBlockSettings } from '@/lib/assignments/settings';

interface GradingResult {
  score: number;
  feedback: string;
  graded_by_ai: boolean;
  graded_at?: string;
}

interface StudentBlockRendererProps {
  block: BaseBlock;
  onSubmit: (answerData: any) => Promise<{ ok: boolean; error?: string }>;
  gradingResult?: GradingResult;
  isSubmitted?: boolean;
  onSuspiciousPaste?: (info: { blockId: string; charCount: number }) => void;
  // Only needed by blocks that poll their own results endpoint (Poll) --
  // every other block type answers purely through onSubmit and never
  // needs the surrounding route params.
  pollResultsUrl?: string;
}

export const StudentBlockRenderer: React.FC<StudentBlockRendererProps> = ({
  block,
  onSubmit,
  gradingResult,
  isSubmitted,
  onSuspiciousPaste,
  pollResultsUrl,
}) => {
  const settings = normalizeBlockSettings((block as any).settings || (block as any).data?.settings || {});
  const renderBlock = () => {
    const commonProps = {
      block: block as any,
      onSubmit,
      gradingResult,
      isSubmitted,
      onSuspiciousPaste,
    };

    switch (block.type) {
      case 'text':
        return <StudentTextBlock {...commonProps} />;
      case 'multiple_choice':
        return <StudentMultipleChoiceBlock {...commonProps} />;
      case 'open_question':
        return <StudentOpenQuestionBlock {...commonProps} />;
      case 'fill_in_blank':
        return <StudentFillInBlankBlock {...commonProps} />;
      case 'ordering':
        return <StudentOrderingBlock {...commonProps} />;
      case 'drag_drop':
      case 'matching':
        return <StudentDragDropBlock {...commonProps} />;
      case 'table':
        return <StudentTableBlock {...commonProps} />;
      case 'number_line':
        return <StudentNumberLineBlock {...commonProps} />;
      case 'diagram_labeling':
        return <StudentDiagramLabelingBlock {...commonProps} />;
      case 'graph_plot':
        return <StudentGraphPlotBlock {...commonProps} />;
      case 'image':
      case 'video':
      case 'media_embed':
      case 'file':
        return <StudentMediaBlock {...commonProps} />;
      case 'divider':
        return <StudentDividerBlock {...commonProps} />;
      case 'timeline':
        return <TimelineAxis data={(block as any).data} />;
      case 'poll':
        return <PollBlock {...commonProps} resultsUrl={pollResultsUrl} />;
      default:
        // For blocks that don't have student interaction, just display data
        return (
          <div className="p-4 border rounded-lg surface-interactive">
            <div className="text-sm text-muted-foreground mb-2">
              {block.type.replace('_', ' ').toUpperCase()}
            </div>
            <pre className="whitespace-pre-wrap font-mono text-xs">
              {JSON.stringify(block.data, null, 2)}
            </pre>
          </div>
        );
    }
  };

  return (
    <div className="space-y-2">
      {settings.hints.length > 0 && (
        <div className="rounded-md surface-interactive p-2 text-xs text-muted-foreground">
          {settings.hints.map((hint, index) => (
            <div key={`${block.id}-hint-${index}`}>Hint {index + 1}: {hint}</div>
          ))}
        </div>
      )}
      {renderBlock()}
    </div>
  );
};
