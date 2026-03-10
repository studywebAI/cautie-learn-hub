'use client';

import { useContext, useEffect, useState } from 'react';
import { AppContext, type AppContextType } from '@/contexts/app-context';
import { cn } from '@/lib/utils';

const HIGHLIGHT_COLORS = [
  'rgba(250, 204, 21, 0.66)',
  'rgba(253, 224, 71, 0.66)',
  'rgba(254, 240, 138, 0.66)',
  'rgba(251, 191, 36, 0.64)',
  'rgba(253, 186, 116, 0.64)',
  'rgba(252, 165, 165, 0.62)',
  'rgba(253, 164, 175, 0.62)',
  'rgba(249, 168, 212, 0.62)',
  'rgba(216, 180, 254, 0.62)',
  'rgba(196, 181, 253, 0.62)',
  'rgba(165, 180, 252, 0.62)',
  'rgba(147, 197, 253, 0.62)',
  'rgba(103, 232, 249, 0.6)',
  'rgba(134, 239, 172, 0.6)',
  'rgba(190, 242, 100, 0.6)',
];
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
  const strokePlan = [
    {
      d: 'M56 84 C48 66 54 44 72 36 C90 28 110 34 118 50 C124 64 120 80 108 90 C94 102 72 102 56 84',
      length: 230,
      start: 0,
      duration: 300,
    },
    {
      d: 'M132 86 C126 68 134 50 152 44 C170 38 188 48 192 66 C196 84 184 96 168 98 C150 100 136 92 132 80 M190 66 L190 100',
      length: 250,
      start: 260,
      duration: 360,
    },
    {
      d: 'M210 56 L210 90 C210 104 222 112 234 104 C246 96 250 82 250 64 L250 56',
      length: 190,
      start: 560,
      duration: 320,
    },
    {
      d: 'M278 54 L278 104 M262 62 L296 62',
      length: 120,
      start: 840,
      duration: 260,
    },
    {
      d: 'M320 62 L320 104',
      length: 90,
      start: 1060,
      duration: 220,
    },
    {
      d: 'M346 82 C338 64 348 46 366 40 C384 34 402 42 408 58 C412 72 406 86 392 92 C378 98 360 94 350 84 M350 84 L406 84',
      length: 230,
      start: 1260,
      duration: 340,
    },
  ] as const;
  const WRITE_DURATION_MS = 1680;
  const HIGHLIGHT_DELAY_MS = 1960;
  const HIGHLIGHT_DURATION_MS = 900;
  const context = useContext(AppContext) as AppContextType | null;
  const [resolvedTextColor, setResolvedTextColor] = useState('#000000');
  const [highlightColor, setHighlightColor] = useState(HIGHLIGHT_COLORS[0]);

  useEffect(() => {
    setResolvedTextColor(resolveTextColor(context?.theme));
  }, [context?.theme]);

  useEffect(() => {
    const key = 'cautie-highlight-color';
    const savedColor = typeof window !== 'undefined' ? window.sessionStorage.getItem(key) : null;
    if (savedColor && HIGHLIGHT_COLORS.includes(savedColor)) {
      setHighlightColor(savedColor);
      return;
    }

    const next = HIGHLIGHT_COLORS[Math.floor(Math.random() * HIGHLIGHT_COLORS.length)];
    if (typeof window !== 'undefined') {
      window.sessionStorage.setItem(key, next);
    }
    setHighlightColor(next);
  }, []);

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
            'relative inline-block lowercase tracking-tight overflow-visible',
            compact ? 'text-xl font-semibold' : 'text-5xl font-bold',
            textClassName
          )}
          style={{ fontFamily: 'var(--font-kalam), cursive' }}
        >
          {animated ? (
            <span className="relative inline-block">
              <svg
                className="pointer-events-none absolute z-0 overflow-visible"
                viewBox="0 0 1000 160"
                preserveAspectRatio="none"
                aria-hidden="true"
                style={{
                  top: '-0.28em',
                  left: '-0.18em',
                  width: 'calc(100% + 0.36em)',
                  height: '1.58em',
                }}
              >
                <rect
                  id="highlight"
                  className="cautie-highlight-rect"
                  x="0"
                  y="46"
                  width="1000"
                  height="78"
                  rx="14"
                  fill="rgba(255,235,0,0.45)"
                  style={{
                    transformOrigin: 'left center',
                    transform: 'scaleX(0)',
                    animation: `cautieHighlightSweep ${HIGHLIGHT_DURATION_MS}ms ease ${HIGHLIGHT_DELAY_MS}ms forwards`,
                  }}
                />
              </svg>

              <svg
                className="pointer-events-none relative z-20 overflow-visible"
                viewBox="0 0 430 120"
                aria-hidden="true"
                style={{
                  top: compact ? '-0.02em' : '-0.03em',
                  width: compact ? '5.9ch' : '6.1ch',
                  height: '1.08em',
                  display: 'block',
                }}
              >
                {strokePlan.map((stroke, index) => {
                  return (
                    <path
                      key={`stroke-${index}`}
                      className="cautie-stroke-segment"
                      d={stroke.d}
                      fill="none"
                      stroke="var(--cautie-text-end)"
                      strokeWidth={compact ? 8.8 : 10.4}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        ['--stroke-length' as any]: stroke.length,
                        strokeDasharray: stroke.length,
                        strokeDashoffset: stroke.length,
                        animation: `cautieStrokeDraw ${stroke.duration}ms cubic-bezier(0.33, 1, 0.68, 1) ${stroke.start}ms forwards`,
                      }}
                    />
                  );
                })}
                <circle
                  className="cautie-i-dot"
                  cx="320"
                  cy="42"
                  r={compact ? 3.6 : 4.3}
                  fill="var(--cautie-text-end)"
                  style={{
                    opacity: 0,
                    transformOrigin: '320px 42px',
                    animation: `dotPop 220ms ease 1180ms forwards`,
                  }}
                />
              </svg>
            </span>
          ) : (
            <>
              <svg
                className="pointer-events-none absolute z-0 overflow-visible"
                viewBox="0 0 320 120"
                preserveAspectRatio="none"
                aria-hidden="true"
                style={{
                  top: compact ? '47%' : '45%',
                  left: compact ? '-7%' : '-8%',
                  width: compact ? '108%' : '109%',
                  height: compact ? '0.86em' : '1.16em',
                  transform: 'translateY(-50%)',
                }}
              >
                <path
                  d="M6 20 C66 14 126 12 186 14 C230 16 272 15 314 12 L314 102 C272 106 230 108 186 108 C126 108 66 106 6 104 Z"
                  fill={highlightColor}
                />
              </svg>
              <span className="relative z-10" style={{ color: 'var(--cautie-text-end)' }}>
                cautie
              </span>
            </>
          )}
      </span>
    </div>
  );
}
