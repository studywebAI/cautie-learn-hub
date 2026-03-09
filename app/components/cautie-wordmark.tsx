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
  { top: 30, left: -24, width: 156, rotate: -31, opacity: 0.36, duration: 420, delay: 70 },
  { top: 38, left: -22, width: 150, rotate: -29, opacity: 0.4, duration: 380, delay: 120 },
  { top: 46, left: -20, width: 154, rotate: -33, opacity: 0.43, duration: 450, delay: 170 },
  { top: 54, left: -19, width: 148, rotate: -30, opacity: 0.39, duration: 410, delay: 230 },
  { top: 62, left: -21, width: 152, rotate: -32, opacity: 0.37, duration: 400, delay: 280 },
  { top: 70, left: -18, width: 146, rotate: -28, opacity: 0.33, duration: 430, delay: 340 },
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
    <div
      className={cn('inline-flex items-center justify-center', className)}
    >
      <span
        className={cn(
          'relative inline-block lowercase tracking-tight text-foreground',
          compact ? 'text-xl font-semibold' : 'text-5xl font-bold',
          textClassName
        )}
      >
        {STROKES.map((stroke, index) => (
          <span
            key={index}
            className="pointer-events-none absolute rounded-full mix-blend-multiply"
            style={{
              ['--cautie-rotate' as any]: `${stroke.rotate}deg`,
              top: `${stroke.top}%`,
              left: `${stroke.left}%`,
              width: `${stroke.width}%`,
              height: compact ? '0.4em' : '0.44em',
              transform: `translateY(-50%) rotate(${stroke.rotate}deg)`,
              backgroundColor: highlightColor,
              opacity: stroke.opacity,
              transformOrigin: 'left center',
              animation: animated
                ? `cautie-highlight-draw ${stroke.duration}ms ease-out ${stroke.delay}ms forwards`
                : `cautie-highlight-sweep 2600ms ease-in-out ${stroke.delay}ms infinite`,
            }}
          />
        ))}
        <span className="relative z-10">cautie</span>
      </span>
    </div>
  );
}
