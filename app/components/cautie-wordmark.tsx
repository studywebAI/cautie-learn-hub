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
  { top: 50, left: -20, width: 162, rotate: -5.5, height: 0.24, duration: 560, delay: 0 },
  { top: 56, left: -19, width: 160, rotate: -5.2, height: 0.24, duration: 560, delay: 70 },
  { top: 62, left: -18, width: 158, rotate: -5.1, height: 0.23, duration: 560, delay: 140 },
  { top: 68, left: -19, width: 160, rotate: -4.9, height: 0.23, duration: 560, delay: 210 },
  { top: 74, left: -17, width: 156, rotate: -4.7, height: 0.22, duration: 560, delay: 280 },
  { top: 80, left: -16, width: 154, rotate: -4.4, height: 0.22, duration: 560, delay: 350 },
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
