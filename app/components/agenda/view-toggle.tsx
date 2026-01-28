'use client';

import { Calendar, List } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ViewMode = 'week' | 'list';

interface ViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
}

export function ViewToggle({ currentView, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center border rounded-lg p-1 bg-muted/30">
      <Button
        variant={currentView === 'week' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('week')}
        className="gap-2"
      >
        <Calendar className="h-4 w-4" />
        Week
      </Button>
      <Button
        variant={currentView === 'list' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('list')}
        className="gap-2"
      >
        <List className="h-4 w-4" />
        List
      </Button>
    </div>
  );
}
