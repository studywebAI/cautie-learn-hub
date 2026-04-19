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
    <div className="flex items-center rounded-xl bg-[hsl(var(--surface-2))] p-1">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange('week')}
        className={currentView === 'week' ? 'h-8 gap-2 rounded-lg bg-[hsl(var(--surface-1))]' : 'h-8 gap-2 rounded-lg bg-transparent'}
      >
        <Calendar className="h-4 w-4" />
        Week
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onViewChange('list')}
        className={currentView === 'list' ? 'h-8 gap-2 rounded-lg bg-[hsl(var(--surface-1))]' : 'h-8 gap-2 rounded-lg bg-transparent'}
      >
        <List className="h-4 w-4" />
        List
      </Button>
    </div>
  );
}
