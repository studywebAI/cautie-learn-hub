'use client';

import { useContext, useEffect, useId, useState } from 'react';
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
      d: 'M58 74 C46 63 44 46 56 36 C71 24 94 28 104 44 C114 59 110 80 94 89 C78 98 62 90 54 78',
      length: 230,
      start: 0,
      duration: 520,
      strokeWidth: 22,
    },
    {
      d: 'M118 74 C110 59 112 44 126 35 C143 26 162 34 168 50 C174 66 166 82 150 88 C132 94 118 86 118 74 M166 50 L166 88',
      length: 250,
      start: 420,
      duration: 560,
      strokeWidth: 22,
    },
    {
      d: 'M184 46 L184 80 C186 95 198 99 212 91 C224 84 230 70 230 54 L230 42',
      length: 190,
      start: 860,
      duration: 500,
      strokeWidth: 21,
    },
    {
      d: 'M246 37 L246 88 M232 51 L266 49',
      length: 130,
      start: 1300,
      duration: 360,
      strokeWidth: 19,
    },
    {
      d: 'M278 49 L278 88',
      length: 85,
      start: 1620,
      duration: 240,
      strokeWidth: 19,
    },
    {
      d: 'M306 72 C300 58 308 43 324 36 C341 30 357 40 361 56 C365 72 356 84 341 88 C325 92 312 86 307 74 M307 74 L356 71',
      length: 250,
      start: 1840,
      duration: 660,
      strokeWidth: 21,
    },
  ] as const;
  const WRITE_DURATION_MS = 2500;
  const DOT_DELAY_MS = WRITE_DURATION_MS;
  const HIGHLIGHT_DELAY_MS = WRITE_DURATION_MS + 120;
  const HIGHLIGHT_DURATION_MS = 900;
  const maskId = `cautie-write-mask-${useId().replace(/:/g, '')}`;
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
          style={{ fontFamily: 'var(--font-caveat), var(--font-kalam), cursive' }}
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
                  fill={highlightColor}
                  style={{
                    transformOrigin: 'left center',
                    transform: 'scaleX(0)',
                    animation: `cautieHighlightSweep ${HIGHLIGHT_DURATION_MS}ms ease ${HIGHLIGHT_DELAY_MS}ms forwards`,
                  }}
                />
              </svg>

              <svg
                className="pointer-events-none absolute inset-0 z-20 overflow-visible"
                viewBox="0 0 430 120"
                aria-hidden="true"
                style={{
                  top: compact ? '-0.02em' : '-0.03em',
                  width: compact ? '5.85ch' : '6.05ch',
                  height: '1.08em',
                  display: 'block',
                }}
              >
                <defs>
                  <mask id={maskId} maskUnits="userSpaceOnUse">
                    <rect x="0" y="0" width="430" height="120" fill="black" />
                    {strokePlan.map((segment, index) => {
                      const dashSpan = segment.length + 12;
                      return (
                        <path
                          key={`mask-stroke-${index}`}
                          className="cautie-mask-stroke"
                          d={segment.d}
                          fill="none"
                          stroke="white"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={compact ? Math.max(14, segment.strokeWidth - 3) : segment.strokeWidth}
                          style={{
                            ['--stroke-start' as any]: dashSpan,
                            strokeDasharray: `${dashSpan} ${dashSpan}`,
                            strokeDashoffset: dashSpan,
                            animation: `cautieMaskDraw ${segment.duration}ms cubic-bezier(0.33, 1, 0.68, 1) ${segment.start}ms forwards`,
                          }}
                        />
                      );
                    })}
                    <circle
                      className="cautie-mask-dot"
                      cx="278"
                      cy="30"
                      r={compact ? 6 : 7}
                      fill="white"
                      style={{
                        opacity: 0,
                        transformOrigin: '278px 30px',
                        transform: 'scale(0)',
                        animation: `dotPop 300ms ease ${DOT_DELAY_MS}ms forwards`,
                      }}
                    />
                  </mask>
                </defs>

                <text
                  x="22"
                  y="84"
                  fill="var(--cautie-text-start)"
                  style={{
                    fontFamily: 'var(--font-caveat), var(--font-kalam), cursive',
                    fontSize: '104px',
                    fontWeight: 700,
                    letterSpacing: '0px',
                  }}
                >
                  cautie
                </text>

                <text
                  x="22"
                  y="84"
                  fill="var(--cautie-text-end)"
                  mask={`url(#${maskId})`}
                  style={{
                    fontFamily: 'var(--font-caveat), var(--font-kalam), cursive',
                    fontSize: '104px',
                    fontWeight: 700,
                    letterSpacing: '0px',
                    filter: 'drop-shadow(0 0 8px color-mix(in srgb, var(--cautie-text-end) 35%, transparent))',
                  }}
                >
                  cautie
                </text>
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
