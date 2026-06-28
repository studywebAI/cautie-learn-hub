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
  const highlightDuration = 1200; // ms

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
    <div className="relative w-full h-full flex items-center justify-start">
      {/* Text container */}
      <div className="relative inline-block">
        {/* Text */}
        <div className="text-9xl font-black tracking-tighter text-foreground relative z-10">
          {displayText}
          {/* Cursor blink during typing */}
          {!isComplete && displayText.length < fullText.length && (
            <span className="animate-pulse">|</span>
          )}
        </div>

        {/* Highlight sweep overlay - bottom to top */}
        {highlightActive && (
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: 'linear-gradient(180deg, transparent 0%, #d97757 45%, #d97757 55%, transparent 100%)',
              animation: `highlightSweep ${highlightDuration}ms ease-in-out forwards`,
              opacity: 0.4,
            }}
          />
        )}
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes highlightSweep {
          0% {
            transform: translateY(100%);
            opacity: 0;
          }
          10% {
            opacity: 0.4;
          }
          90% {
            opacity: 0.4;
          }
          100% {
            transform: translateY(-100%);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
