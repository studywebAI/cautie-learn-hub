'use client';

import React, { useRef, useState } from 'react';
import { BaseBlock, GraphPlotBlockContent } from './types';
import { Button } from '@/components/ui/button';

interface StudentGraphPlotBlockProps {
  block: BaseBlock & { data: GraphPlotBlockContent };
  onSubmit: (answerData: any) => Promise<{ ok: boolean; error?: string }>;
  isSubmitted?: boolean;
}

const W = 280;
const H = 180;

export const StudentGraphPlotBlock: React.FC<StudentGraphPlotBlockProps> = ({
  block,
  onSubmit,
  isSubmitted = false,
}) => {
  const { xMin, xMax, yMin, yMax, xLabel, yLabel } = block.data;
  const maxPoints = (block.data.correctPoints || []).length || 1;
  const [points, setPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const startedAtRef = useRef<string>(new Date().toISOString());

  const xRange = (xMax - xMin) || 1;
  const yRange = (yMax - yMin) || 1;
  const toSvgX = (x: number) => ((x - xMin) / xRange) * W;
  const toSvgY = (y: number) => H - ((y - yMin) / yRange) * H;
  const fromSvg = (px: number, py: number) => ({
    x: Math.round((xMin + (px / W) * xRange) * 10) / 10,
    y: Math.round((yMin + ((H - py) / H) * yRange) * 10) / 10,
  });

  const handleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    if (isSubmitted || isSubmitting || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const py = ((e.clientY - rect.top) / rect.height) * H;

    // Clicking near an existing point removes it, so students can correct placement.
    const clickIdx = points.findIndex((p) => Math.hypot(toSvgX(p.x) - px, toSvgY(p.y) - py) < 10);
    if (clickIdx !== -1) {
      setPoints((prev) => prev.filter((_, i) => i !== clickIdx));
      return;
    }
    if (points.length >= maxPoints) return;
    setPoints((prev) => [...prev, fromSvg(px, py)]);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    const result = await onSubmit({
      points,
      started_at: startedAtRef.current,
      submitted_at: new Date().toISOString(),
    });
    if (!result.ok) {
      setError(result.error || 'Failed to submit answer');
    }
    setIsSubmitting(false);
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Click the grid to plot {maxPoints} point{maxPoints > 1 ? 's' : ''} ({points.length}/{maxPoints}). Click a point to remove it.
      </p>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        onClick={handleClick}
        className="w-full max-w-sm rounded-md border border-border bg-background cursor-crosshair"
      >
        {[0, 0.25, 0.5, 0.75, 1].map((f) => (
          <React.Fragment key={f}>
            <line x1={0} y1={f * H} x2={W} y2={f * H} stroke="currentColor" className="text-border" strokeWidth={1} />
            <line x1={f * W} y1={0} x2={f * W} y2={H} stroke="currentColor" className="text-border" strokeWidth={1} />
          </React.Fragment>
        ))}
        {points.map((p, idx) => (
          <circle key={idx} cx={toSvgX(p.x)} cy={toSvgY(p.y)} r={5} className="fill-foreground" />
        ))}
      </svg>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{xLabel}: {xMin}–{xMax}</span>
        <span>{yLabel}: {yMin}–{yMax}</span>
      </div>
      {!isSubmitted && (
        <Button onClick={handleSubmit} disabled={points.length !== maxPoints || isSubmitting}>
          {isSubmitting ? 'Submitting...' : 'Submit Answer'}
        </Button>
      )}
      {isSubmitted && <div className="text-sm text-green-600 font-medium">Answer submitted successfully!</div>}
      {error && <div className="text-sm text-destructive">{error}</div>}
    </div>
  );
};
