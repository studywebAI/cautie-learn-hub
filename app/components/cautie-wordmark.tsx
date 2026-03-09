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
  { d: 'M -8 72 C 18 61, 68 42, 166 4', width: 13, opacity: 0.34, duration: 540, delay: 70 },
  { d: 'M -10 67 C 20 56, 72 36, 170 0', width: 13, opacity: 0.38, duration: 500, delay: 120 },
  { d: 'M -7 62 C 24 50, 78 31, 172 -4', width: 12, opacity: 0.41, duration: 560, delay: 170 },
  { d: 'M -11 57 C 18 46, 70 27, 168 -8', width: 12, opacity: 0.36, duration: 520, delay: 230 },
  { d: 'M -6 52 C 26 40, 82 21, 174 -12', width: 11, opacity: 0.34, duration: 540, delay: 290 },
  { d: 'M -9 47 C 20 36, 74 17, 170 -16', width: 11, opacity: 0.3, duration: 500, delay: 350 },
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
          className="pointer-events-none absolute -left-[18%] -right-[48%] -inset-y-[38%] z-0 mix-blend-multiply"
          viewBox="0 0 170 100"
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
                strokeDashoffset: 100,
                animation: animated
                  ? `cautie-stripe-draw ${stroke.duration}ms ease-out ${stroke.delay}ms forwards`
                  : `cautie-stripe-loop 2600ms linear ${stroke.delay}ms infinite`,
              }}
            />
          ))}
        </svg>
        <span className="relative z-10">cautie</span>
      </span>
    </div>
  );
}
