import { useMemo } from 'react';
import { SHOW_CAUTIE_LOGO } from '@/lib/branding';

const HIGHLIGHT_COLORS = [
  '#FFE066', '#7EC8E3', '#FF9A9E', '#A8E6CF', '#FFB347',
  '#C3B1E1', '#87CEEB', '#F0E68C', '#FF6B6B', '#98D8C8',
  '#FFA07A', '#B5EAD7', '#E2B0FF', '#FFDAC1', '#9DE0AD',
];

// Generate horizontal scribble strokes like someone went back and forth with a highlighter
function generateScribbleStrokes(width: number, height: number, seed: number): string[] {
  const r = (base: number, variance: number, offset: number) =>
    base + ((seed * 13 + offset * 37 + variance * 7) % 100) / 100 * variance * 2 - variance;

  const strokes: string[] = [];
  const count = 10 + (seed % 5); // Increased from 6-8 to 10-14 strokes
  const verticalSpacing = height / (count + 1);

  for (let i = 0; i < count; i++) {
    const y = verticalSpacing * (i + 0.5) + r(0, verticalSpacing * 0.3, i * 3);
    const strokeH = r(verticalSpacing * 0.9, verticalSpacing * 0.2, i * 7);

    // Each stroke goes roughly left to right with wobble
    const startX = r(-width * 0.06, width * 0.04, i * 5);
    const endX = width + r(width * 0.06, width * 0.04, i * 11);

    // Wobble control points
    const cp1x = width * 0.25 + r(0, width * 0.06, i * 13);
    const cp1yTop = y - strokeH / 2 + r(0, 2, i * 17);
    const cp1yBot = y + strokeH / 2 + r(0, 2, i * 19);

    const cp2x = width * 0.75 + r(0, width * 0.06, i * 23);
    const cp2yTop = y - strokeH / 2 + r(0, 2, i * 29);
    const cp2yBot = y + strokeH / 2 + r(0, 2, i * 31);

    const topStartY = y - strokeH / 2 + r(0, 1.5, i * 37);
    const topEndY = y - strokeH / 2 + r(0, 1.5, i * 41);
    const botStartY = y + strokeH / 2 + r(0, 1.5, i * 43);
    const botEndY = y + strokeH / 2 + r(0, 1.5, i * 47);

    strokes.push(`
      M ${startX} ${topStartY}
      C ${cp1x} ${cp1yTop}, ${cp2x} ${cp2yTop}, ${endX} ${topEndY}
      L ${endX} ${botEndY}
      C ${cp2x} ${cp2yBot}, ${cp1x} ${cp1yBot}, ${startX} ${botStartY}
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
  if (!SHOW_CAUTIE_LOGO) return null;

  const { color, strokes } = useMemo(() => {
    const s = Math.floor(Math.random() * 1000);
    const c = HIGHLIGHT_COLORS[s % HIGHLIGHT_COLORS.length];
    const paths = generateScribbleStrokes(100, 32, s);
    return { color: c, strokes: paths };
  }, []);

  const textSize = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-2xl' : 'text-base';
  const padX = size === 'sm' ? 'px-1.5' : size === 'lg' ? 'px-3' : 'px-2';

  return (
    <span className={`relative inline-flex items-center ${padX} ${className}`}>
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 100 32"
        preserveAspectRatio="none"
        style={{ width: '100%', height: '100%' }}
      >
        {strokes.map((d, i) => (
          <path key={i} d={d} fill={color} opacity={0.3} />
        ))}
      </svg>
      <span className={`relative ${textSize} tracking-tight lowercase font-medium`} style={{ zIndex: 1 }}>
        cautie
      </span>
    </span>
  );
}
