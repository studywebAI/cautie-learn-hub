'use client';

import { useEffect, useState, useRef } from 'react';
import { SHOW_CAUTIE_LOGO } from '@/lib/branding';

interface CautieLogoAnimationProps {
  onComplete?: () => void;
  autoPlay?: boolean;
}

export function CautieLogoAnimation({ onComplete, autoPlay = true }: CautieLogoAnimationProps) {
  if (!SHOW_CAUTIE_LOGO) return null;

  const [phase, setPhase] = useState<'writing' | 'highlighting' | 'complete'>('writing');
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!autoPlay) return;

    // Writing animation: 2.5 seconds
    const writingTimer = setTimeout(() => {
      setPhase('highlighting');
    }, 2500);

    // Highlight animation: 1.2 seconds after writing completes
    const highlightTimer = setTimeout(() => {
      setPhase('complete');
      onComplete?.();
    }, 2500 + 1200);

    return () => {
      clearTimeout(writingTimer);
      clearTimeout(highlightTimer);
    };
  }, [autoPlay, onComplete]);

  return (
    <div className="relative w-full h-full flex items-center justify-start pl-8">
      {/* Main SVG with handwriting and highlight */}
      <svg
        ref={svgRef}
        viewBox="0 0 400 120"
        className="w-full max-w-4xl"
        preserveAspectRatio="xMinYMid meet"
      >
        <defs>
          {/* Gradient for the highlight sweep effect */}
          <linearGradient
            id="highlightGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="transparent" />
            <stop offset="40%" stopColor="#d97757" stopOpacity="0.6" />
            <stop offset="60%" stopColor="#d97757" stopOpacity="0.4" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>

          {/* Clipping path for the text */}
          <clipPath id="textClip">
            <text
              x="50%"
              y="50%"
              dominantBaseline="middle"
              textAnchor="middle"
              fontSize="72"
              fontWeight="600"
              fontFamily="Plus Jakarta Sans, sans-serif"
              letterSpacing="-2"
            >
              cautie
            </text>
          </clipPath>
        </defs>

        {/* Background text (for reference) - invisible */}
        <text
          x="50%"
          y="50%"
          dominantBaseline="middle"
          textAnchor="middle"
          fontSize="72"
          fontWeight="600"
          fontFamily="Plus Jakarta Sans, sans-serif"
          letterSpacing="-2"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0"
        >
          cautie
        </text>

        {/* Writing animation - animated strokes */}
        {phase !== 'complete' && (
          <g clipPath="url(#textClip)">
            {/* Each letter gets its own animated stroke for better control */}
            {['c', 'a', 'u', 't', 'i', 'e'].map((letter, idx) => (
              <text
                key={`writing-${idx}`}
                x="50%"
                y="50%"
                dominantBaseline="middle"
                textAnchor="middle"
                fontSize="72"
                fontWeight="600"
                fontFamily="Plus Jakarta Sans, sans-serif"
                letterSpacing="-2"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  animation: `drawStroke 2.5s ease-in-out forwards`,
                  animationDelay: `${idx * 0.35}s`,
                  opacity: phase === 'writing' ? 1 : 0,
                  transition: 'opacity 0.3s ease-out',
                }}
              >
                {letter}
              </text>
            ))}
          </g>
        )}

        {/* Final text - visible after animations */}
        {(phase === 'highlighting' || phase === 'complete') && (
          <>
            {/* Static text */}
            <text
              x="50%"
              y="50%"
              dominantBaseline="middle"
              textAnchor="middle"
              fontSize="72"
              fontWeight="600"
              fontFamily="Plus Jakarta Sans, sans-serif"
              letterSpacing="-2"
              fill="currentColor"
              style={{
                opacity: phase === 'highlighting' || phase === 'complete' ? 1 : 0,
                transition: 'opacity 0.3s ease-out',
              }}
            >
              cautie
            </text>

            {/* Highlight sweep effect */}
            {phase === 'highlighting' && (
              <rect
                x="0"
                y="0"
                width="400"
                height="120"
                fill="url(#highlightGradient)"
                style={{
                  animation: 'highlightSweep 1.2s ease-in-out forwards',
                  transformOrigin: '0 0',
                }}
              />
            )}
          </>
        )}
      </svg>

      {/* CSS Animations */}
      <style>{`
        @keyframes drawStroke {
          from {
            stroke-dasharray: 1000;
            stroke-dashoffset: 1000;
            opacity: 1;
          }
          to {
            stroke-dasharray: 1000;
            stroke-dashoffset: 0;
            opacity: 1;
          }
        }

        @keyframes highlightSweep {
          from {
            transform: translateX(-120px) translateY(-120px) rotate(25deg);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          to {
            transform: translateX(420px) translateY(120px) rotate(25deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
