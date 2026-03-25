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
    <div className="flex items-center rounded-lg border bg-white p-1">
      <Button
        variant={currentView === 'week' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('week')}
        className="gap-2 bg-transparent"
      >
        <Calendar className="h-4 w-4" />
        Week
      </Button>
      <Button
        variant={currentView === 'list' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewChange('list')}
        className="gap-2 bg-transparent"
      >
        <List className="h-4 w-4" />
        List
      </Button>
    </div>
  );
}
