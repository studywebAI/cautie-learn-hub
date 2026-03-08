'use client';

import { useMemo } from 'react';

const HIGHLIGHT_COLORS = [
  '#FFE066', // yellow
  '#7EC8E3', // sky blue
  '#FF9A9E', // pink
  '#A8E6CF', // mint
  '#FFB347', // orange
  '#C3B1E1', // lavender
  '#87CEEB', // light blue
  '#F0E68C', // khaki
  '#FF6B6B', // coral
  '#98D8C8', // teal
];

// Generate a slightly different hand-drawn highlighter path each time
function generateHighlighterPath(width: number, height: number, seed: number): string {
  const r = (base: number, variance: number) => base + ((seed * 13 + variance * 7) % 100) / 100 * variance * 2 - variance;
  
  const y1 = r(height * 0.15, height * 0.08);
  const y2 = r(height * 0.85, height * 0.08);
  const overshootLeft = r(-width * 0.03, width * 0.02);
  const overshootRight = r(width * 1.04, width * 0.03);
  
  // Slightly wobbly rectangle with overshoot
  const cp1y = r(height * 0.1, height * 0.06);
  const cp2y = r(height * 0.9, height * 0.06);
  const midDipTop = r(height * 0.18, height * 0.05);
  const midDipBot = r(height * 0.82, height * 0.05);
  
  return `
    M ${overshootLeft} ${y1}
    Q ${width * 0.15} ${cp1y}, ${width * 0.35} ${midDipTop}
    Q ${width * 0.55} ${r(height * 0.12, height * 0.04)}, ${width * 0.75} ${r(height * 0.16, height * 0.05)}
    L ${overshootRight} ${r(height * 0.14, height * 0.06)}
    L ${overshootRight} ${r(height * 0.86, height * 0.06)}
    Q ${width * 0.75} ${r(height * 0.88, height * 0.04)}, ${width * 0.55} ${midDipBot}
    Q ${width * 0.35} ${cp2y}, ${width * 0.15} ${r(height * 0.85, height * 0.05)}
    L ${overshootLeft} ${y2}
    Z
  `;
}

interface CautieLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function CautieLogo({ size = 'md', className = '' }: CautieLogoProps) {
  const { color, path, seed } = useMemo(() => {
    const s = Math.floor(Math.random() * 1000);
    const c = HIGHLIGHT_COLORS[s % HIGHLIGHT_COLORS.length];
    const p = generateHighlighterPath(100, 32, s);
    return { color: c, path: p, seed: s };
  }, []);

  const textSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-base';
  const svgH = size === 'sm' ? 22 : size === 'lg' ? 38 : 28;
  const svgW = size === 'sm' ? 52 : size === 'lg' ? 100 : 72;
  const padX = size === 'sm' ? 'px-1.5' : size === 'lg' ? 'px-3' : 'px-2';

  return (
    <span className={`relative inline-flex items-center ${padX} ${className}`}>
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox={`0 0 100 32`}
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%' }}
      >
        <path
          d={path}
          fill={color}
          opacity={0.45}
        />
      </svg>
      <span className={`relative ${textSize} tracking-tight lowercase font-medium`} style={{ zIndex: 1 }}>
        cautie
      </span>
    </span>
  );
}
