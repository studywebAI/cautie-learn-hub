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
  '#FFA07A', // light salmon
  '#B5EAD7', // pastel green
  '#E2B0FF', // mauve
  '#FFDAC1', // peach
  '#9DE0AD', // seafoam
];

// Generate multiple diagonal strokes like ////// highlighter marks, top-right to bottom-left
function generateHighlighterStrokes(width: number, height: number, seed: number): string[] {
  const r = (base: number, variance: number, offset: number) =>
    base + ((seed * 13 + offset * 37 + variance * 7) % 100) / 100 * variance * 2 - variance;

  const strokes: string[] = [];
  const count = 5 + (seed % 4); // 5-8 diagonal strokes spread across the word
  const spacing = width / (count - 0.5);

  for (let i = 0; i < count; i++) {
    const centerX = spacing * (i + 0.25) + r(0, spacing * 0.15, i);
    // Each stroke goes from top-right to bottom-left (like a / shape)
    const topX = centerX + r(width * 0.06, width * 0.025, i * 3);
    const topY = r(-height * 0.08, height * 0.1, i * 5); // uneven top ends
    const botX = centerX - r(width * 0.06, width * 0.025, i * 7);
    const botY = height + r(height * 0.06, height * 0.1, i * 11); // uneven bottom ends

    // Stroke width varies slightly
    const strokeW = r(spacing * 0.7, spacing * 0.12, i * 13);

    // Wobbly midpoint
    const midX = (topX + botX) / 2 + r(0, width * 0.015, i * 17);
    const midY = height * 0.5 + r(0, height * 0.06, i * 19);

    // Left edge (going down)
    const lTopX = topX - strokeW / 2;
    const lBotX = botX - strokeW / 2;
    // Right edge (going up)
    const rTopX = topX + strokeW / 2;
    const rBotX = botX + strokeW / 2;

    strokes.push(`
      M ${lTopX} ${topY}
      Q ${midX - strokeW / 2 + r(0, 1.5, i * 23)} ${midY + r(0, 2, i * 29)}, ${lBotX} ${botY}
      L ${rBotX} ${botY}
      Q ${midX + strokeW / 2 + r(0, 1.5, i * 31)} ${midY + r(0, 2, i * 37)}, ${rTopX} ${topY}
      Z
    `);
  }

  return strokes;
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
