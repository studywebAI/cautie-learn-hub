'use client';

import { cn } from '@/lib/utils';

const HIGHLIGHT_COLOR = '#facc15';

type CautieWordmarkProps = {
  className?: string;
  textClassName?: string;
  animated?: boolean;
  compact?: boolean;
};

export function CautieWordmark({
  className,
  textClassName,
  animated = false,
  compact = false,
}: CautieWordmarkProps) {
  return (
    <div className={cn('inline-flex items-center justify-center overflow-visible', className)}>
      <span
        className={cn(
          'relative inline-block lowercase tracking-tight font-headline overflow-visible',
          compact ? 'text-xl font-semibold' : 'text-5xl font-bold',
          textClassName
        )}
      >
        <span
          className="pointer-events-none absolute z-0 block rounded-[0.14em]"
          style={{
            top: compact ? '66%' : '65%',
            left: compact ? '-3%' : '-4%',
            width: compact ? '108%' : '110%',
            height: compact ? '0.33em' : '0.45em',
            transform: `translateY(-50%) scaleX(${animated ? 0 : 1})`,
            transformOrigin: 'left center',
            backgroundColor: HIGHLIGHT_COLOR,
            animation: animated
              ? 'cautie-highlight-swipe 430ms cubic-bezier(0.22, 1, 0.36, 1) 320ms forwards'
              : undefined,
          }}
        />
        <span
          className="relative z-10"
          style={{
            color: animated ? 'hsl(var(--background))' : 'hsl(var(--foreground))',
            animation: animated ? 'cautie-text-emerge 320ms ease-out 0ms forwards' : undefined,
          }}
        >
          cautie
        </span>
      </span>
    </div>
  );
}
