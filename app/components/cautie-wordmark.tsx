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

  const TYPE_DURATION_MS = 320;
  const HIGHLIGHT_DELAY_MS = TYPE_DURATION_MS + 18;
  const HIGHLIGHT_DURATION_MS = 170;
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

  useEffect(() => {
    if (!animated) return;

    let audioCtx: AudioContext | null = null;
    const playTypingClicks = async () => {
      try {
        const AudioContextCtor =
          window.AudioContext ||
          (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

        if (!AudioContextCtor) return;
        audioCtx = new AudioContextCtor();
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume().catch(() => {});
        }
        if (audioCtx.state !== 'running') return;

        const clicks = 6;
        const stepMs = TYPE_DURATION_MS / clicks;
        for (let i = 0; i < clicks; i++) {
          const when = audioCtx.currentTime + 0.02 + (stepMs * i) / 1000;
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(700 + i * 24, when);
          gain.gain.setValueAtTime(0.0001, when);
          gain.gain.exponentialRampToValueAtTime(0.03, when + 0.006);
          gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);

          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.start(when);
          osc.stop(when + 0.055);
        }

        window.setTimeout(() => {
          audioCtx?.close().catch(() => {});
          audioCtx = null;
        }, TYPE_DURATION_MS + 260);
      } catch {
        // Ignore audio errors (autoplay restrictions / unsupported contexts).
      }
    };

    void playTypingClicks();

    return () => {
      audioCtx?.close().catch(() => {});
      audioCtx = null;
    };
  }, [animated, TYPE_DURATION_MS]);

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
                    animation: `cautieHighlightSweep ${HIGHLIGHT_DURATION_MS}ms cubic-bezier(0.2, 0.9, 0.2, 1) ${HIGHLIGHT_DELAY_MS}ms forwards`,
                  }}
                />
                <rect
                  className="cautie-highlight-glint"
                  x="0"
                  y="46"
                  width="1000"
                  height="78"
                  rx="14"
                  fill="rgba(255,255,255,0.26)"
                  style={{
                    opacity: 0,
                    transformOrigin: 'left center',
                    animation: `cautie-highlight-glint ${HIGHLIGHT_DURATION_MS}ms ease-out ${HIGHLIGHT_DELAY_MS + 30}ms forwards`,
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
