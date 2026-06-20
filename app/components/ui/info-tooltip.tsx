'use client';

import * as React from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

type InfoTooltipProps = {
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
};

export function InfoTooltip({ children, className, contentClassName, side = 'top' }: InfoTooltipProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-muted-foreground/30 text-muted-foreground/50 hover:border-[var(--accent-brand)]/40 hover:text-[var(--accent-brand)] transition-colors text-[10px] leading-none',
            className
          )}
        >
          i
        </button>
      </PopoverTrigger>
      <PopoverContent side={side} className={cn('w-auto max-w-[260px] space-y-1.5 p-2.5 text-[11px]', contentClassName)}>
        {children}
      </PopoverContent>
    </Popover>
  );
}
