'use client';

import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

const HIGHLIGHT_COLORS = [
  '#fef08a',
  '#fde047',
  '#facc15',
  '#fbbf24',
  '#fdba74',
  '#fca5a5',
  '#fda4af',
  '#f9a8d4',
  '#c4b5fd',
  '#a5b4fc',
  '#93c5fd',
  '#67e8f9',
  '#86efac',
  '#bef264',
  '#d9f99d',
];

const STROKES = [
  { d: 'M -4 25 C 22 23, 56 19, 124 12', width: 8, duration: 760, delay: 0 },
  { d: 'M -6 22 C 24 20, 60 16, 126 9', width: 8, duration: 760, delay: 70 },
  { d: 'M -3 19 C 27 17, 62 13, 128 6', width: 7, duration: 760, delay: 130 },
  { d: 'M -7 16 C 24 14, 64 10, 126 3', width: 7, duration: 760, delay: 190 },
  { d: 'M -2 13 C 30 11, 68 8, 130 0', width: 6, duration: 760, delay: 250 },
];

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
  const fallbackColor = useMemo(
    () => HIGHLIGHT_COLORS[Math.floor(Math.random() * HIGHLIGHT_COLORS.length)],
    []
  );
  const [highlightColor, setHighlightColor] = useState(fallbackColor);

  useEffect(() => {
    const key = 'cautie-highlight-color';
    const saved = window.sessionStorage.getItem(key);
    if (saved) {
      setHighlightColor(saved);
      return;
    }

    const next = HIGHLIGHT_COLORS[Math.floor(Math.random() * HIGHLIGHT_COLORS.length)];
    window.sessionStorage.setItem(key, next);
    setHighlightColor(next);
  }, []);

  return (
    <div className={cn('inline-flex items-center justify-center overflow-visible', className)}>
      <span
        className={cn(
          'relative inline-block lowercase tracking-tight text-foreground overflow-visible',
          compact ? 'text-xl font-semibold' : 'text-5xl font-bold',
          textClassName
        )}
      >
        <svg
          className={cn(
            'pointer-events-none absolute z-0',
            compact
              ? '-left-[4%] -right-[8%] -top-[10%] -bottom-[-6%]'
              : '-left-[3%] -right-[8%] -top-[8%] -bottom-[-6%]'
          )}
          viewBox="0 0 128 30"
          preserveAspectRatio="none"
        >
          {STROKES.map((stroke, index) => (
            <path
              key={index}
              d={stroke.d}
              pathLength={100}
              fill="none"
              stroke={highlightColor}
              strokeWidth={compact ? Math.max(5, stroke.width - 2) : stroke.width}
              strokeLinecap="round"
              style={{
                strokeDasharray: 100,
                strokeDashoffset: animated ? 100 : 0,
                animation: animated
                  ? `cautie-stripe-draw ${stroke.duration}ms linear ${stroke.delay}ms forwards`
                  : undefined,
              }}
            />
          ))}
        </svg>
        <span className="relative z-10">cautie</span>
      </span>
    </div>
  );
}
