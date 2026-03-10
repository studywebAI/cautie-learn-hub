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
  const letters = ['c', 'a', 'u', 't', 'i', 'e'];
  const strokePlan = [
    { d: 'M66 84 C56 66 62 42 84 34 C106 26 128 34 136 52 C142 68 134 88 114 96 C94 104 72 98 66 84', length: 230, start: 0, duration: 560 },
    { d: 'M164 96 C154 80 160 58 180 50 C199 42 221 50 228 68 C235 86 224 102 206 106 C188 110 168 104 164 96 M226 68 L226 104', length: 260, start: 380, duration: 620 },
    { d: 'M266 56 L266 92 C266 108 278 114 290 106 C300 100 306 88 306 72 L306 56', length: 190, start: 820, duration: 500 },
    { d: 'M334 58 L382 58 M358 58 L358 108', length: 150, start: 1180, duration: 420 },
    { d: 'M414 58 L414 108', length: 120, start: 1480, duration: 360 },
    { d: 'M452 84 C442 66 448 44 470 36 C492 28 514 36 522 54 C530 72 522 92 502 100 C482 108 460 102 452 84 M452 84 L522 84', length: 280, start: 1760, duration: 640 },
  ] as const;
  const WRITE_DURATION_MS = 2600;
  const HIGHLIGHT_DELAY_MS = 2860;
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

              <span className="relative z-10 inline-flex">
                {letters.map((letter, index) => (
                  <span key={`base-${letter}-${index}`} style={{ color: 'var(--cautie-text-start)' }}>
                    {letter}
                  </span>
                ))}
              </span>

              <span className="pointer-events-none absolute inset-0 z-20 inline-flex">
                {letters.map((letter, index) => {
                  const plan = strokePlan[index];
                  const revealDelay = plan.start + plan.duration - 70;
                  return (
                    <span
                      key={`ink-${letter}-${index}`}
                      className="inline-block cautie-letter-reveal"
                      style={{
                        color: 'var(--cautie-text-end)',
                        opacity: 0,
                        animation: `cautieLetterReveal 90ms linear ${revealDelay}ms forwards`,
                      }}
                    >
                      {letter}
                    </span>
                  );
                })}
              </span>

              <svg
                className="pointer-events-none absolute z-30 overflow-visible"
                viewBox="0 0 620 140"
                aria-hidden="true"
                style={{
                  top: '-0.22em',
                  left: '-0.12em',
                  width: 'calc(100% + 0.24em)',
                  height: '1.42em',
                }}
              >
                {strokePlan.map((stroke, index) => (
                  <path
                    key={`stroke-${index}`}
                    className="cautie-stroke-segment"
                    d={stroke.d}
                    fill="none"
                    stroke="var(--cautie-text-end)"
                    strokeWidth={compact ? 5 : 4.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      ['--stroke-length' as any]: stroke.length,
                      strokeDasharray: stroke.length,
                      strokeDashoffset: stroke.length,
                      filter: 'drop-shadow(0 0 4px color-mix(in srgb, var(--cautie-text-end) 24%, transparent))',
                      animation: `cautieStrokeDraw ${stroke.duration}ms cubic-bezier(0.33, 1, 0.68, 1) ${stroke.start}ms forwards`,
                    }}
                  />
                ))}

                <circle
                  className="cautie-i-dot"
                  cx="414"
                  cy="42"
                  r="4.4"
                  fill="var(--cautie-text-end)"
                  style={{
                    opacity: 0,
                    transformOrigin: '414px 42px',
                    animation: `dotPop 260ms ease ${1660}ms forwards`,
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
