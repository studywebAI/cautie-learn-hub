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

type StrokeDef = {
  id: string;
  d: string;
  delay: number;
  duration?: number;
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

  const STROKE_STEP_MS = 115;
  const STROKES: StrokeDef[] = [
    { id: 'c', d: 'M58 102 C43 100 34 87 34 72 C34 56 45 44 61 44 C69 44 75 47 79 51', delay: 0, duration: 210 },
    { id: 'a-loop', d: 'M88 83 C88 65 101 56 114 60 C123 63 128 72 126 84 C124 95 116 103 106 103 C96 103 88 95 88 83', delay: 1 * STROKE_STEP_MS, duration: 230 },
    { id: 'a-tail', d: 'M126 84 C128 96 134 104 144 104 C153 104 158 97 158 86 L158 60', delay: 2 * STROKE_STEP_MS, duration: 195 },
    { id: 'u', d: 'M178 62 L178 89 C178 99 183 104 191 104 C200 104 206 97 206 86 L206 62 M206 86 C206 97 212 104 221 104 C230 104 236 97 236 86 L236 62', delay: 3 * STROKE_STEP_MS, duration: 255 },
    { id: 't-stem', d: 'M252 44 L252 104', delay: 4 * STROKE_STEP_MS, duration: 165 },
    { id: 't-cross', d: 'M238 68 L272 68', delay: 5 * STROKE_STEP_MS, duration: 145 },
    { id: 'i-stem', d: 'M294 62 L294 104', delay: 6 * STROKE_STEP_MS, duration: 185 },
    { id: 'i-dot', d: 'M294 48 L294 48', delay: 7 * STROKE_STEP_MS, duration: 80 },
    { id: 'e-mid', d: 'M324 84 C334 82 344 83 352 86', delay: 8 * STROKE_STEP_MS, duration: 175 },
    { id: 'e-top', d: 'M324 84 C327 71 338 62 350 65 C359 67 364 73 364 81', delay: 9 * STROKE_STEP_MS, duration: 195 },
    { id: 'e-bottom', d: 'M324 84 C329 97 341 106 355 104 C364 103 369 96 368 90', delay: 10 * STROKE_STEP_MS, duration: 205 },
  ];

  const WRITE_DURATION_MS = STROKES.reduce((max, stroke) => {
    const duration = stroke.duration ?? 170;
    return Math.max(max, stroke.delay + duration);
  }, 0);
  const HIGHLIGHT_DELAY_MS = WRITE_DURATION_MS + 120;
  const HIGHLIGHT_DURATION_MS = 300;
  const animatedWordWidth = compact ? '5.25ch' : '5.9ch';
  const animatedWordHeight = compact ? '1.12em' : '1.3em';

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
          <span className="relative inline-block" style={{ width: animatedWordWidth, height: animatedWordHeight, lineHeight: 1 }}>
            <svg className="pointer-events-none absolute inset-0 z-0 overflow-visible" viewBox="0 0 400 160" preserveAspectRatio="none" aria-hidden="true">
              <rect x="18" y="52" width="368" height="70" rx="28" fill={highlightColor} style={{
                transformOrigin: 'left center',
                transformBox: 'fill-box',
                transform: 'scaleX(0)',
                opacity: 0,
                animation: `cautie-logo-highlight ${HIGHLIGHT_DURATION_MS}ms cubic-bezier(0.12, 0.85, 0.22, 1) ${HIGHLIGHT_DELAY_MS}ms forwards`
              }}
              />
              <rect x="10" y="48" width="384" height="78" rx="31" fill={highlightColor} style={{
                transformOrigin: 'left center',
                transformBox: 'fill-box',
                transform: 'scaleX(0)',
                opacity: 0,
                animation: `cautie-logo-highlight-spill ${HIGHLIGHT_DURATION_MS + 40}ms cubic-bezier(0.12, 0.85, 0.22, 1) ${HIGHLIGHT_DELAY_MS + 20}ms forwards`
              }}
              />
              <g fill="none" stroke="var(--cautie-text-end)" strokeWidth={compact ? 7.1 : 8.0} strokeLinecap="round" strokeLinejoin="round">
                {STROKES.map((stroke) => (
                  <path key={stroke.id} d={stroke.d} pathLength={1} style={{
                    strokeDasharray: 1,
                    strokeDashoffset: 1,
                    animation: `cautie-logo-stroke ${stroke.duration ?? 170}ms linear ${stroke.delay}ms forwards`
                  }}
                  />
                ))}
                <circle cx="294" cy="48" r={compact ? 3.4 : 4.0} fill="var(--cautie-text-end)" stroke="none" style={{
                  opacity: 0,
                  animation: `dotPop 120ms ease-out ${7 * STROKE_STEP_MS + 40}ms forwards`
                }}
                />
              </g>
            </svg>
          </span>
        ) : (
          <>
            <span aria-hidden="true" className="pointer-events-none absolute left-[-2%] top-[58%] z-0 h-[0.54em] w-[104%] -translate-y-1/2 rounded-[999px]" style={{ background: highlightColor, opacity: 0.82 }} />
            <span className="relative z-10" style={{ color: 'var(--cautie-text-end)' }}>
              cautie
            </span>
          </>
        )}
      </span>
    </div>
  );
}
