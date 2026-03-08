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

// Generate a slightly different hand-drawn highlighter path each time
function generateHighlighterPath(width: number, height: number, seed: number): string {
  const r = (base: number, variance: number) => base + ((seed * 13 + variance * 7) % 100) / 100 * variance * 2 - variance;
  
  // Main stroke: a thick, angled swipe like dragging a highlighter bottom-left to top-right
  const startX = r(-width * 0.06, width * 0.03);
  const startY = r(height * 0.92, height * 0.06);
  const endX = r(width * 1.08, width * 0.04);
  const endY = r(height * 0.08, height * 0.06);
  
  // Thickness of the stroke (highlighter width)
  const thick = r(height * 0.55, height * 0.08);
  
  // Angle perpendicular to the stroke direction for thickness
  const dx = endX - startX;
  const dy = endY - startY;
  const len = Math.sqrt(dx * dx + dy * dy);
  const nx = (-dy / len) * thick;
  const ny = (dx / len) * thick;
  
  // Wobbly control points along the stroke
  const mid1x = r(width * 0.3, width * 0.06);
  const mid1y = r(height * 0.65, height * 0.08);
  const mid2x = r(width * 0.65, width * 0.06);
  const mid2y = r(height * 0.35, height * 0.08);
  
  // The stroke is two wobbly edges offset by the thickness
  return `
    M ${startX} ${startY}
    C ${mid1x} ${mid1y + r(0, height * 0.04)}, ${mid2x} ${mid2y + r(0, height * 0.04)}, ${endX} ${endY}
    L ${endX + nx * r(1, 0.15)} ${endY + ny * r(1, 0.15)}
    C ${mid2x + nx + r(0, width * 0.03)} ${mid2y + ny + r(0, height * 0.04)}, ${mid1x + nx + r(0, width * 0.03)} ${mid1y + ny + r(0, height * 0.04)}, ${startX + nx * r(1, 0.12)} ${startY + ny * r(1, 0.12)}
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
