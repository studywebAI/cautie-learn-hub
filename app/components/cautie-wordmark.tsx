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
  { d: 'M -8 86 C 22 70, 58 50, 134 8', width: 10, opacity: 0.34, duration: 560, delay: 70 },
  { d: 'M -10 76 C 24 60, 64 40, 136 2', width: 10, opacity: 0.38, duration: 520, delay: 120 },
  { d: 'M -6 68 C 28 52, 68 32, 138 -4', width: 10, opacity: 0.42, duration: 600, delay: 180 },
  { d: 'M -12 58 C 22 44, 66 24, 132 -10', width: 9, opacity: 0.36, duration: 540, delay: 240 },
  { d: 'M -4 50 C 30 34, 76 16, 140 -16', width: 9, opacity: 0.34, duration: 580, delay: 300 },
  { d: 'M -10 42 C 24 28, 72 8, 136 -22', width: 8, opacity: 0.32, duration: 520, delay: 360 },
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
          className="pointer-events-none absolute -inset-x-[30%] -inset-y-[55%] z-0 mix-blend-multiply"
          viewBox="0 0 126 100"
          preserveAspectRatio="none"
        >
          {STROKES.map((stroke, index) => (
            <path
              key={index}
              d={stroke.d}
              fill="none"
              stroke={highlightColor}
              strokeWidth={compact ? Math.max(6, stroke.width - 2) : stroke.width}
              strokeLinecap="round"
              opacity={stroke.opacity}
              style={{
                strokeDasharray: 220,
                strokeDashoffset: 220,
                animation: animated
                  ? `cautie-stripe-draw ${stroke.duration}ms ease-out ${stroke.delay}ms forwards`
                  : `cautie-stripe-loop 3200ms ease-in-out ${stroke.delay}ms infinite`,
              }}
            />
          ))}
        </svg>
        <span className="relative z-10">cautie</span>
      </span>
    </div>
  );
}
