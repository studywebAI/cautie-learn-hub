'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface DashboardFiltersProps {
  filters: string[];
  active: string;
  onFilterChange: (filter: string) => void;
}

export function DashboardFilters({
  filters,
  active,
  onFilterChange,
}: DashboardFiltersProps) {
  return (
    <div className="flex gap-1.5 flex-wrap">
      {filters.map((filter) => (
        <button
          key={filter}
          onClick={() => onFilterChange(filter)}
          className={cn(
            'text-[12px] px-2.5 py-1 rounded-full border transition-colors',
            active === filter
              ? 'bg-[var(--accent-brand)] border-[var(--accent-brand)] text-white'
              : 'bg-transparent border-border text-muted-foreground hover:border-[var(--accent-brand)] hover:text-[var(--accent-brand)]'
          )}
        >
          {filter}
        </button>
      ))}
    </div>
  );
}
