'use client';

import { useEffect, useState } from 'react';
import { SHOW_CAUTIE_LOGO } from '@/lib/branding';

interface CautieLogoAnimationProps {
  onComplete?: () => void;
  autoPlay?: boolean;
}

export function CautieLogoAnimation({ onComplete, autoPlay = true }: CautieLogoAnimationProps) {
  if (!SHOW_CAUTIE_LOGO) return null;

  const [displayText, setDisplayText] = useState('');
  const [highlightActive, setHighlightActive] = useState(false);
  const [isComplete, setIsComplete] = useState(false);

  const fullText = 'cautie';
  const charDelay = 120; // ms per character
  const typingDuration = fullText.length * charDelay; // ~720ms
  const highlightDuration = 1400; // ms

  useEffect(() => {
    if (!autoPlay) return;

    // Typing animation
    let charIndex = 0;
    const typingInterval = setInterval(() => {
      if (charIndex <= fullText.length) {
        setDisplayText(fullText.slice(0, charIndex));
        charIndex++;
      } else {
        clearInterval(typingInterval);
        // Start highlight after typing completes
        setTimeout(() => {
          setHighlightActive(true);
          // Complete animation after highlight
          setTimeout(() => {
            setIsComplete(true);
            onComplete?.();
          }, highlightDuration);
        }, 200);
      }
    }, charDelay);

    return () => clearInterval(typingInterval);
  }, [autoPlay, onComplete]);

  return (
    <div className="relative w-full h-screen flex items-center justify-center overflow-hidden">
      {/* Full screen text container */}
      <div className="relative w-full text-center px-8">
        {/* Main text - normal font weight */}
        <div className="text-[180px] md:text-[220px] lg:text-[280px] font-medium tracking-tight text-foreground relative inline-block w-full">
          {displayText}

          {/* Highlight effect - looks like marker highlighter */}
          {highlightActive && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                // Marker highlight effect with blur and opacity
                background: `linear-gradient(
                  180deg,
                  transparent 0%,
                  rgba(217, 119, 87, 0) 15%,
                  rgba(217, 119, 87, 0.5) 35%,
                  rgba(217, 119, 87, 0.6) 50%,
                  rgba(217, 119, 87, 0.5) 65%,
                  rgba(217, 119, 87, 0) 85%,
                  transparent 100%
                )`,
                backdropFilter: 'blur(0.5px)',
                animation: `highlightSweep ${highlightDuration}ms ease-in-out forwards`,
                WebkitBackdropFilter: 'blur(0.5px)',
              }}
            />
          )}
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes highlightSweep {
          0% {
            transform: translateY(150%);
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          95% {
            opacity: 1;
          }
          100% {
            transform: translateY(-150%);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
