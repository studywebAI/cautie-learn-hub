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
  const TEXT_REVEAL_DURATION_MS = 2200;
  const HIGHLIGHT_DELAY_AFTER_TEXT_MS = 120;
  const HIGHLIGHT_DRAW_DURATION_MS = 800;
  const HIGHLIGHT_SWEEP_DURATION_MS = 800;
  const highlightDelayMs = TEXT_REVEAL_DURATION_MS + HIGHLIGHT_DELAY_AFTER_TEXT_MS;
  const textFillDelayMs = TEXT_REVEAL_DURATION_MS - 120;
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
              className="pointer-events-none absolute z-20 overflow-visible cautie-handwrite-layer"
              viewBox="0 0 600 200"
              preserveAspectRatio="none"
              aria-hidden="true"
              style={{
                left: '0',
                top: compact ? '-0.14em' : '-0.18em',
                width: '100%',
                height: compact ? '1.5em' : '1.58em',
              }}
            >
              <path
                className="cautie-handwrite-path"
                d="M26 126 C 32 96, 52 82, 72 84 C 92 87, 102 112, 95 128 C 87 144, 66 143, 56 127 C 46 110, 59 86, 94 84 C 126 82, 142 105, 145 124 C 148 143, 165 145, 176 130 C 186 115, 178 91, 160 88 C 142 85, 130 108, 141 125 C 152 142, 171 146, 189 139 C 209 132, 223 111, 229 91 C 234 76, 245 74, 253 84 C 261 93, 259 114, 272 129 C 284 143, 304 141, 313 126 C 322 112, 315 89, 299 85 C 283 81, 272 97, 275 113 C 279 132, 301 141, 324 136 C 341 132, 354 120, 352 106 C 350 93, 334 90, 328 78 C 322 67, 328 50, 343 48 C 358 46, 367 59, 367 74 C 367 95, 359 117, 360 136 C 361 154, 375 161, 388 153 C 397 147, 406 133, 412 118 C 420 95, 440 84, 460 90 C 478 96, 487 116, 480 132 C 473 148, 453 152, 437 145 C 422 138, 414 121, 420 105 C 427 86, 448 76, 474 77 C 500 78, 521 91, 531 112"
                pathLength={1000}
                style={{
                  fill: 'none',
                  stroke: 'var(--cautie-text-end)',
                  strokeWidth: compact ? 8 : 7,
                  strokeLinecap: 'round',
                  strokeLinejoin: 'round',
                  filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))',
                  strokeDasharray: 1000,
                  strokeDashoffset: 1000,
                  animation: `cautie-handwrite-stroke ${TEXT_REVEAL_DURATION_MS}ms cubic-bezier(0.33, 1, 0.68, 1) 0ms forwards`,
                }}
              />
            </svg>
          ) : null}
          <svg
            className="pointer-events-none absolute z-0 overflow-visible"
            viewBox="0 0 320 120"
            preserveAspectRatio="none"
            aria-hidden="true"
            style={{
              top: compact ? 'calc(47% - 0.043em)' : 'calc(45% - 0.058em)',
              left: compact ? '-7%' : '-8%',
              width: compact ? '108%' : '109%',
              height: compact ? '0.946em' : '1.276em',
              transform: 'translateY(-50%)',
            }}
          >
          <path
            className={cn(animated && 'cautie-highlight-fill')}
            d="M6 20 C66 14 126 12 186 14 C230 16 272 15 314 12 L314 102 C272 106 230 108 186 108 C126 108 66 106 6 104 Z"
            fill={highlightColor}
            style={{
              transform: `scaleX(${animated ? 0 : 1})`,
              transformOrigin: 'left center',
              animation: animated
                ? `cautie-highlight-fill ${HIGHLIGHT_DRAW_DURATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1) ${highlightDelayMs}ms both`
                : undefined,
            }}
          />
          <path
            className={cn(animated && 'cautie-highlight-glint')}
            d="M16 24 C84 18 142 16 198 18 C238 20 270 20 304 18"
            stroke="rgba(255,255,255,0.24)"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
            style={{
              opacity: animated ? 0 : 0.18,
              animation: animated
                ? `cautie-highlight-glint ${HIGHLIGHT_SWEEP_DURATION_MS}ms cubic-bezier(0.2, 0.72, 0.2, 1) ${highlightDelayMs + 40}ms both`
                : undefined,
            }}
          />
        </svg>
        <span
          className={cn('relative z-10', animated && 'cautie-wordmark-text')}
          style={{
            display: 'inline-block',
            whiteSpace: 'nowrap',
            overflow: 'visible',
            color: 'var(--cautie-text-end)',
            animation: animated
              ? `cautie-handwrite-fill 260ms ease ${textFillDelayMs}ms forwards`
              : undefined,
            opacity: animated ? 0 : 1,
          }}
        >
          cautie
        </span>
      </span>
    </div>
  );
}
