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
  { top: 50, left: -8, width: 130, rotate: -5.4, height: 0.22, duration: 520, delay: 0 },
  { top: 55, left: -7, width: 128, rotate: -5.1, height: 0.22, duration: 520, delay: 55 },
  { top: 60, left: -6, width: 126, rotate: -5.0, height: 0.21, duration: 520, delay: 110 },
  { top: 65, left: -7, width: 129, rotate: -4.8, height: 0.21, duration: 520, delay: 165 },
  { top: 70, left: -5, width: 125, rotate: -4.6, height: 0.2, duration: 520, delay: 220 },
  { top: 75, left: -6, width: 127, rotate: -4.4, height: 0.2, duration: 520, delay: 275 },
  { top: 79, left: -4, width: 123, rotate: -4.2, height: 0.19, duration: 520, delay: 330 },
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
          'relative inline-block lowercase tracking-tight text-[hsl(var(--success))] overflow-visible',
          compact ? 'text-xl font-semibold' : 'text-5xl font-bold',
          textClassName
        )}
      >
        {STROKES.map((stroke, index) => (
          <span
            key={index}
            className="pointer-events-none absolute z-0 block rounded-[0.14em]"
            style={{
              ['--cautie-rotate' as any]: `${stroke.rotate}deg`,
              top: `${stroke.top}%`,
              left: `${stroke.left}%`,
              width: `${stroke.width}%`,
              height: `${compact ? Math.max(0.19, stroke.height - 0.02) : stroke.height}em`,
              transform: `translateY(-50%) rotate(${stroke.rotate}deg) scaleX(${animated ? 0 : 1})`,
              transformOrigin: 'left center',
              backgroundColor: highlightColor,
              animation: animated
                ? `cautie-marker-draw ${stroke.duration}ms linear ${stroke.delay}ms forwards`
                : undefined,
            }}
          />
        ))}
        <span className="relative z-10">cautie</span>
      </span>
    </div>
  );
}
