'use client';

import React, { useState } from 'react';
import { BlockProps, ComplexBlockContent } from './types';
import { cn } from '@/lib/utils';

interface ComplexBlockProps extends BlockProps {
  block: BlockProps['block'] & { content: ComplexBlockContent };
}

export const ComplexBlock: React.FC<ComplexBlockProps> = ({
  block,
  onUpdate,
  isEditing = false,
  className,
}) => {
  const [isEditingState, setIsEditingState] = useState(isEditing);

  const renderViewer = () => {
    const { viewerType, data } = block.content;

    // For now, render a placeholder. In a real implementation, you'd have a component registry
    switch (viewerType) {
      case 'mindmap-professional':
        return (
          <div className="p-8 text-center bg-blue-50 rounded-lg border-2 border-dashed border-blue-200">
            <div className="text-4xl mb-2">🧠</div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Mind Map</h3>
            <p className="text-blue-700">Interactive mind map viewer would render here</p>
            <p className="text-sm text-blue-600 mt-2">Central: {data?.central || 'No data'}</p>
          </div>
        );
      case 'timeline-professional':
        return (
          <div className="p-8 text-center bg-green-50 rounded-lg border-2 border-dashed border-green-200">
            <div className="text-4xl mb-2">📅</div>
            <h3 className="text-lg font-semibold text-green-900 mb-2">Timeline</h3>
            <p className="text-green-700">Interactive timeline viewer would render here</p>
          </div>
        );
      case 'chart':
        return (
          <div className="p-8 text-center bg-purple-50 rounded-lg border-2 border-dashed border-purple-200">
            <div className="text-4xl mb-2">📊</div>
            <h3 className="text-lg font-semibold text-purple-900 mb-2">Chart</h3>
            <p className="text-purple-700">Interactive chart viewer would render here</p>
          </div>
        );
      default:
        return (
          <div className="p-8 text-center text-muted-foreground bg-muted/50 rounded-lg">
            Viewer "{viewerType}" not implemented
          </div>
        );
    }
  };

  return (
    <div className={cn('w-full mb-4', className)}>
      <div className="border rounded-lg p-4 bg-background">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-medium text-muted-foreground capitalize">
            {block.content.type} Viewer
          </span>
          <button
            onClick={() => setIsEditingState(!isEditingState)}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            {isEditingState ? 'Done' : 'Edit'}
          </button>
        </div>
        <div className="min-h-[200px]">
          {renderViewer()}
        </div>
        {isEditingState && (
          <div className="mt-4 p-4 border-t bg-muted/50 rounded">
            <p className="text-sm text-muted-foreground">
              Complex blocks are edited through their respective viewer interfaces.
              Click "Done" when finished.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};