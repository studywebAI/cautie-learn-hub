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
          viewBox="0 0 320 110"
          preserveAspectRatio="none"
          aria-hidden="true"
          style={{
            top: compact ? '64%' : '62%',
            left: compact ? '-6%' : '-7%',
            width: compact ? '112%' : '114%',
            height: compact ? '0.56em' : '0.74em',
            transform: 'translateY(-50%)',
          }}
        >
          <path
            d="M6 28 C66 24 126 24 186 26 C230 27 272 26 314 24 L314 84 C272 87 230 88 186 88 C126 88 66 89 6 92 Z"
            fill={HIGHLIGHT_COLOR}
            style={{
              transform: `scaleX(${animated ? 0 : 1})`,
              transformOrigin: 'left center',
              animation: animated
                ? 'cautie-highlight-swipe 320ms cubic-bezier(0.22, 1, 0.36, 1) 820ms both'
                : undefined,
            }}
          />
        </svg>
        <span
          className="relative z-10"
          style={{
            color: animated ? 'var(--cautie-text-start)' : 'var(--cautie-text-end)',
            animation: animated ? 'cautie-text-emerge 820ms ease-out 0ms both' : undefined,
          }}
        >
          cautie
        </span>
      </span>
    </div>
  );
}
