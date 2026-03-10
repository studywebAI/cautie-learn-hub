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
  const WRITE_DURATION_MS = 2200;
  const DOT_POP_DURATION_MS = 350;
  const HIGHLIGHT_DELAY_MS = 2500;
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
            <svg
              className="pointer-events-none relative z-10 overflow-visible"
              viewBox="0 0 700 200"
              aria-hidden="true"
              style={{
                width: '420px',
                height: 'auto',
                display: 'block',
              }}
            >
              <rect
                id="highlight"
                x="30"
                y="90"
                width="640"
                height="50"
                rx="8"
                fill="rgba(255,230,0,0.45)"
                style={{
                  width: 0,
                  animation: `highlightSweep ${HIGHLIGHT_DURATION_MS}ms ease ${HIGHLIGHT_DELAY_MS}ms forwards`,
                }}
              />
              <path
                id="cautie-path"
                d="M40 120 C40 60 120 60 120 110 C120 150 60 150 60 110 M140 120 C160 70 220 70 240 110 C240 150 160 150 160 110 M260 120 C260 70 340 70 340 120 C340 170 260 170 260 120 M360 120 L420 120 M440 120 C460 70 520 70 540 110 C540 150 460 150 460 110"
                fill="none"
                stroke="white"
                strokeWidth={6}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={2000}
                style={{
                  strokeDasharray: 2000,
                  strokeDashoffset: 2000,
                  animation: `writeLogo ${WRITE_DURATION_MS}ms cubic-bezier(.33,1,.68,1) forwards`,
                  filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.35))',
                }}
              />
              <circle
                id="idot"
                cx="400"
                cy="80"
                r="6"
                fill="white"
                style={{
                  opacity: 0,
                  transformOrigin: '400px 80px',
                  transformBox: 'fill-box',
                  animation: `dotPop ${DOT_POP_DURATION_MS}ms ease ${WRITE_DURATION_MS}ms forwards`,
                }}
              />
            </svg>
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
