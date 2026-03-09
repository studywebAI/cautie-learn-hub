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
  { top: 52, left: -4, width: 108, rotate: -8, opacity: 0.46, duration: 420, delay: 80 },
  { top: 44, left: 2, width: 102, rotate: -4, opacity: 0.39, duration: 380, delay: 130 },
  { top: 59, left: 7, width: 96, rotate: -12, opacity: 0.48, duration: 450, delay: 190 },
  { top: 49, left: -2, width: 104, rotate: -2, opacity: 0.42, duration: 410, delay: 250 },
  { top: 56, left: 4, width: 98, rotate: -6, opacity: 0.44, duration: 400, delay: 300 },
  { top: 47, left: 10, width: 92, rotate: -10, opacity: 0.36, duration: 430, delay: 350 },
];

type CautieWordmarkProps = {
  className?: string;
  textClassName?: string;
  animated?: boolean;
  angled?: boolean;
  compact?: boolean;
};

export function CautieWordmark({
  className,
  textClassName,
  animated = false,
  angled = true,
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
      className={cn(
        'inline-flex items-center justify-center',
        angled && 'origin-center rotate-[-62deg]',
        className
      )}
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
              height: compact ? '0.34em' : '0.38em',
              transform: `translateY(-50%) rotate(${stroke.rotate}deg)`,
              backgroundColor: highlightColor,
              opacity: stroke.opacity,
              transformOrigin: 'left center',
              animation: animated
                ? `cautie-highlight-draw ${stroke.duration}ms ease-out ${stroke.delay}ms forwards`
                : undefined,
            }}
          />
        ))}
        <span className="relative z-10">cautie</span>
      </span>
    </div>
  );
}
