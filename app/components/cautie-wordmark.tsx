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
  const WRITE_DURATION_MS = 2400;
  const DOT_POP_DURATION_MS = 300;
  const HIGHLIGHT_DELAY_MS = 2700;
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
              viewBox="0 0 900 200"
              aria-hidden="true"
              style={{
                width: '520px',
                height: 'auto',
                display: 'block',
              }}
            >
              <rect
                id="highlight"
                x="60"
                y="95"
                width="760"
                height="55"
                rx="10"
                fill="rgba(255,235,0,0.45)"
                style={{
                  width: 0,
                  animation: `highlightSweep ${HIGHLIGHT_DURATION_MS}ms ease ${HIGHLIGHT_DELAY_MS}ms forwards`,
                }}
              />
              <path
                id="cautie-path"
                d="M100 118 C84 116 78 96 86 80 C94 64 124 64 138 80 C150 94 146 116 128 124 C112 132 98 124 100 110 C104 92 132 88 152 98 C172 108 180 132 200 136 C224 142 244 126 242 102 C240 82 214 76 198 90 C182 104 188 132 210 142 C238 154 278 138 288 108 L288 126 C288 140 304 146 314 134 C324 122 322 100 322 84 L322 104 C322 122 334 138 348 138 C362 138 374 122 374 104 L374 88 C374 78 384 74 390 82 C396 90 394 106 394 122 L394 142 L394 96 L434 96 L458 96 L458 140 C458 152 472 156 480 146 C488 136 488 118 488 104 L488 92 C488 82 498 78 504 86 C510 94 508 108 508 122 L508 140 C508 152 522 156 532 146 C542 136 546 120 554 106 C566 86 596 82 614 98 C630 112 626 140 604 146 C582 152 562 132 568 112 C574 92 604 90 626 100"
                fill="none"
                stroke="white"
                strokeWidth={8}
                strokeLinecap="round"
                strokeLinejoin="round"
                pathLength={2500}
                style={{
                  strokeDasharray: 2500,
                  strokeDashoffset: 2500,
                  animation: `writeLogo ${WRITE_DURATION_MS}ms cubic-bezier(.33,1,.68,1) forwards`,
                  filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.35))',
                }}
              />
              <circle
                id="idot"
                cx="498"
                cy="66"
                r="6"
                fill="white"
                style={{
                  opacity: 0,
                  transformOrigin: '498px 66px',
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
