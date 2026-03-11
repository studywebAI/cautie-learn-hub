'use client';

import { useContext, useEffect, useState } from 'react';
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

  const TYPE_DURATION_MS = 680;
  const HIGHLIGHT_DELAY_MS = TYPE_DURATION_MS + 12;
  const HIGHLIGHT_DURATION_MS = 95;
  const animatedWordWidth = compact ? '6.9ch' : '8.1ch';
  const animatedWordHeight = compact ? '1.18em' : '1.34em';
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
            compact ? 'text-2xl font-semibold' : 'text-7xl font-bold',
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
                  left: '-0.04em',
                  width: 'calc(100% + 0.08em)',
                  height: 'calc(100% + 0.18em)',
                }}
              >
                <rect
                  id="highlight"
                  className="cautie-highlight-rect"
                  x="0"
                  y="50"
                  width="1000"
                  height="70"
                  rx="14"
                  fill={highlightColor}
                  style={{
                    transformOrigin: 'left center',
                    transform: 'scaleX(0)',
                    animation: `cautieHighlightSweep ${HIGHLIGHT_DURATION_MS}ms cubic-bezier(0.2, 0.9, 0.2, 1) ${HIGHLIGHT_DELAY_MS}ms forwards`,
                  }}
                />
                <rect
                  className="cautie-highlight-glint"
                  x="0"
                  y="50"
                  width="1000"
                  height="70"
                  rx="14"
                  fill="rgba(255,255,255,0.26)"
                  style={{
                    opacity: 0,
                    transformOrigin: 'left center',
                    animation: `cautie-highlight-glint-tight ${HIGHLIGHT_DURATION_MS}ms ease-out ${HIGHLIGHT_DELAY_MS + 10}ms forwards`,
                  }}
                />
              </svg>

              <span
                className="cautie-type-text relative z-10 inline-block overflow-hidden whitespace-nowrap lowercase"
                style={{
                  width: '0ch',
                  color: 'var(--cautie-text-end)',
                  lineHeight: 1,
                  willChange: 'width',
                  animation: `cautie-type ${TYPE_DURATION_MS}ms steps(6, end) 0ms forwards`,
                }}
              >
                cautie
              </span>
            </span>
          ) : (
            <>
              <svg
                className="pointer-events-none absolute z-0 overflow-visible"
                viewBox="0 0 1000 160"
                preserveAspectRatio="none"
                aria-hidden="true"
                style={{
                  top: '-0.12em',
                  left: '-0.04em',
                  width: 'calc(100% + 0.08em)',
                  height: 'calc(100% + 0.18em)',
                }}
              >
                <rect
                  x="0"
                  y="50"
                  width="1000"
                  height="70"
                  rx="14"
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
