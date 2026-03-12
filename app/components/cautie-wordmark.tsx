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

  const LETTER_STAGGER_MS = 70;
  const LETTER_DURATION_MS = 95;
  const HIGHLIGHT_DELAY_MS = 0;
  const HIGHLIGHT_DURATION_MS = 95;
  const animatedWordWidth = compact ? '5.2ch' : '5.85ch';
  const animatedWordHeight = compact ? '1.1em' : '1.26em';
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
                   top: '-0.1em',
                   left: '0',
                   width: '100%',
                   height: 'calc(100% + 0.14em)',
                 }}
              >
                <rect
                  id="highlight"
                  className="cautie-highlight-rect"
                  x="72"
                  y="56"
                  width="848"
                  height="58"
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
                  x="72"
                  y="56"
                  width="848"
                  height="58"
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
                className="relative z-10 inline-flex items-baseline lowercase"
                style={{
                  color: 'var(--cautie-text-end)',
                  lineHeight: 1,
                }}
              >
                {'cautie'.split('').map((letter, index) => (
                  <span
                    key={`${letter}-${index}`}
                    className="cautie-letter-step inline-block"
                    style={{
                      opacity: 0,
                      animation: `cautie-letter-step ${LETTER_DURATION_MS}ms ease-out ${index * LETTER_STAGGER_MS}ms forwards`,
                    }}
                  >
                    {letter}
                  </span>
                ))}
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
                   top: '-0.1em',
                   left: '0',
                   width: '100%',
                   height: 'calc(100% + 0.14em)',
                 }}
               >
                 <rect
                   x="72"
                   y="56"
                   width="848"
                   height="58"
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
