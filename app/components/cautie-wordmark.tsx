'use client';

import { useContext, useEffect, useState } from 'react';
import { AppContext, type AppContextType } from '@/contexts/app-context';
import { cn } from '@/lib/utils';

const HIGHLIGHT_COLOR = '#facc15';
const LIGHT_THEME_SET = new Set(['light', 'ocean', 'forest', 'sunset', 'rose']);
const DARK_THEME_SET = new Set(['dark']);

type CautieWordmarkProps = {
  className?: string;
  textClassName?: string;
  animated?: boolean;
  compact?: boolean;
};

const resolveTextColor = (theme?: string | null) => {
  if (theme && DARK_THEME_SET.has(theme)) return '#ffffff';
  if (theme && LIGHT_THEME_SET.has(theme)) return '#000000';
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return '#ffffff';
  }
  return '#000000';
};

export function CautieWordmark({
  className,
  textClassName,
  animated = false,
  compact = false,
}: CautieWordmarkProps) {
  const context = useContext(AppContext) as AppContextType | null;
  const [resolvedTextColor, setResolvedTextColor] = useState('#000000');

  useEffect(() => {
    setResolvedTextColor(resolveTextColor(context?.theme));
  }, [context?.theme]);

  return (
    <div
      className={cn('inline-flex items-center justify-center overflow-visible', className)}
      style={{
        ['--cautie-text-start' as any]: 'hsl(var(--background))',
        ['--cautie-text-end' as any]: resolvedTextColor,
      }}
    >
      <span
        className={cn(
          'relative inline-block lowercase tracking-tight font-headline overflow-visible',
          compact ? 'text-xl font-semibold' : 'text-5xl font-bold',
          textClassName
        )}
      >
        <svg
          className="pointer-events-none absolute z-0 overflow-visible"
          viewBox="0 0 320 120"
          preserveAspectRatio="none"
          aria-hidden="true"
          style={{
            top: compact ? '58%' : '56%',
            left: compact ? '-6%' : '-7%',
            width: compact ? '112%' : '114%',
            height: compact ? '0.74em' : '1.05em',
            transform: 'translateY(-50%)',
          }}
        >
          <path
            d="M6 20 C66 14 126 12 186 14 C230 16 272 15 314 12 L314 102 C272 106 230 108 186 108 C126 108 66 106 6 104 Z"
            fill={HIGHLIGHT_COLOR}
            style={{
              transform: `scaleX(${animated ? 0 : 1})`,
              transformOrigin: 'left center',
              animation: animated
                ? 'cautie-highlight-swipe 320ms cubic-bezier(0.22, 1, 0.36, 1) 940ms both'
                : undefined,
            }}
          />
        </svg>
        <span
          className="relative z-10"
          style={{
            display: 'inline-block',
            whiteSpace: 'nowrap',
            overflow: animated ? 'hidden' : 'visible',
            width: animated ? '0ch' : '6ch',
            color: 'var(--cautie-text-end)',
            animation: animated ? 'cautie-type 760ms steps(6, end) 0ms forwards' : undefined,
          }}
        >
          cautie
        </span>
      </span>
    </div>
  );
}
