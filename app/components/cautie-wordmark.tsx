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
  { d: 'M -8 54 C 30 50, 82 44, 176 34', width: 11, opacity: 0.34, duration: 520, delay: 70 },
  { d: 'M -10 50 C 32 46, 86 40, 180 30', width: 11, opacity: 0.38, duration: 480, delay: 120 },
  { d: 'M -6 46 C 36 42, 90 36, 184 26', width: 10, opacity: 0.4, duration: 540, delay: 170 },
  { d: 'M -12 42 C 30 38, 88 32, 178 22', width: 10, opacity: 0.35, duration: 500, delay: 230 },
  { d: 'M -8 38 C 36 34, 94 28, 186 18', width: 9, opacity: 0.32, duration: 520, delay: 290 },
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
            'pointer-events-none absolute z-0 mix-blend-multiply',
            compact
              ? '-left-[8%] -right-[28%] -top-[14%] -bottom-[2%]'
              : '-left-[6%] -right-[22%] -top-[12%] -bottom-[2%]'
          )}
          viewBox="0 0 180 72"
          preserveAspectRatio="none"
        >
          {STROKES.map((stroke, index) => (
            <path
              key={index}
              d={stroke.d}
              pathLength={100}
              fill="none"
              stroke={highlightColor}
              strokeWidth={compact ? Math.max(8, stroke.width - 2) : stroke.width}
              strokeLinecap="round"
              opacity={stroke.opacity}
              style={{
                strokeDasharray: 100,
                strokeDashoffset: animated ? 100 : 0,
                animation: animated
                  ? `cautie-stripe-draw ${stroke.duration}ms ease-out ${stroke.delay}ms forwards`
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
