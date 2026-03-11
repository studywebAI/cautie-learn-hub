'use client';

import { useContext, useEffect, useId, useState } from 'react';
import { AppContext, type AppContextType } from '@/contexts/app-context';
import { cn } from '@/lib/utils';
import { SHOW_CAUTIE_LOGO } from '@/lib/branding';

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
  if (!SHOW_CAUTIE_LOGO) return null;

  const letters = ['c', 'a', 'u', 't', 'i', 'e'] as const;
  const letterXs = [22, 82, 142, 198, 250, 298] as const;
  const strokePlan = [
    {
      d: 'M60 74 C48 60 49 41 63 33 C79 24 98 30 107 45 C113 57 110 76 97 86 C82 96 65 91 56 78',
      start: 0,
      duration: 300,
      strokeWidth: 30,
    },
    {
      d: 'M122 75 C116 60 119 44 133 36 C148 28 165 34 171 48 C176 62 170 77 156 85 C142 93 127 90 122 75',
      start: 300,
      duration: 260,
      strokeWidth: 30,
    },
    {
      d: 'M168 48 L168 88',
      start: 560,
      duration: 120,
      strokeWidth: 26,
    },
    {
      d: 'M188 48 L188 80 C190 94 204 100 218 92 C229 86 236 72 236 54 L236 44',
      start: 680,
      duration: 300,
      strokeWidth: 28,
    },
    {
      d: 'M256 36 L256 89',
      start: 980,
      duration: 150,
      strokeWidth: 24,
    },
    {
      d: 'M242 50 L272 50',
      start: 1130,
      duration: 90,
      strokeWidth: 20,
    },
    {
      d: 'M282 50 L282 89',
      start: 1220,
      duration: 130,
      strokeWidth: 22,
    },
    {
      d: 'M282 31 L282 31.01',
      start: 1350,
      duration: 90,
      strokeWidth: 15,
    },
    {
      d: 'M306 73 C300 59 307 44 322 37 C338 30 355 38 361 53 C366 68 358 82 344 88 C330 94 314 90 307 77 M307 76 L355 73',
      start: 1440,
      duration: 260,
      strokeWidth: 30,
    },
  ] as const;
  const WRITE_START_DELAY_MS = 120;
  const WRITE_DURATION_MS = WRITE_START_DELAY_MS + 1700;
  const HIGHLIGHT_DELAY_MS = WRITE_DURATION_MS + 40;
  const HIGHLIGHT_DURATION_MS = 520;
  const maskId = `cautie-write-mask-${useId().replace(/:/g, '')}`;
  const animatedWordWidth = compact ? '6.05ch' : '7.25ch';
  const animatedWordHeight = compact ? '1.06em' : '1.26em';
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
            compact ? 'text-xl font-semibold' : 'text-6xl font-bold',
            textClassName
          )}
          style={{ fontFamily: 'var(--font-caveat), var(--font-kalam), cursive' }}
        >
          {animated ? (
            <span className="relative inline-block" style={{ width: animatedWordWidth, height: animatedWordHeight }}>
              <svg
                className="pointer-events-none absolute z-0 overflow-visible"
                viewBox="0 0 1000 160"
                preserveAspectRatio="none"
                aria-hidden="true"
                style={{
                  top: '-0.12em',
                  left: '-0.1em',
                  width: 'calc(100% + 0.2em)',
                  height: 'calc(100% + 0.24em)',
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
                    animation: `cautieHighlightSweep ${HIGHLIGHT_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) ${HIGHLIGHT_DELAY_MS}ms forwards`,
                  }}
                />
              </svg>

              <svg
                className="pointer-events-none absolute inset-0 z-20 overflow-visible"
                viewBox="0 0 430 120"
                aria-hidden="true"
                style={{
                  top: compact ? '-0.01em' : '-0.02em',
                  width: '100%',
                  height: '100%',
                  display: 'block',
                }}
              >
                <defs>
                  <mask id={maskId} maskUnits="userSpaceOnUse">
                    <rect x="0" y="0" width="430" height="120" fill="black" />
                    {strokePlan.map((segment, index) => {
                      return (
                        <path
                          key={`mask-stroke-${index}`}
                          className="cautie-mask-stroke"
                          d={segment.d}
                          pathLength={1}
                          fill="none"
                          stroke="white"
                          strokeLinecap="butt"
                          strokeLinejoin="round"
                          strokeWidth={compact ? Math.max(14, segment.strokeWidth - 5) : segment.strokeWidth}
                          style={{
                            ['--stroke-start' as any]: 1,
                            strokeDasharray: '1',
                            strokeDashoffset: 1,
                            animation: `cautieMaskDraw ${segment.duration}ms cubic-bezier(0.33, 1, 0.68, 1) ${WRITE_START_DELAY_MS + segment.start}ms forwards`,
                          }}
                        />
                      );
                    })}
                  </mask>
                </defs>

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
                  }}
                >
                  cautie
                </text>

                {letters.map((letter, index) => {
                  const lockMoments = [250, 650, 930, 1200, 1400, 1660] as const;
                  const lockAt = WRITE_START_DELAY_MS + lockMoments[index];
                  return (
                    <text
                      key={`lock-${letter}-${index}`}
                      className="cautie-letter-lock"
                      x={letterXs[index]}
                      y="84"
                      fill="var(--cautie-text-end)"
                      style={{
                        fontFamily: 'var(--font-caveat), var(--font-kalam), cursive',
                        fontSize: '104px',
                        fontWeight: 700,
                        letterSpacing: '0px',
                        opacity: 0,
                        animation: `cautieFinalInk 80ms linear ${lockAt}ms forwards`,
                      }}
                    >
                      {letter}
                    </text>
                  );
                })}
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
