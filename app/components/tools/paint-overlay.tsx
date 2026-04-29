'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Pen, Eraser, Undo, Trash2, Highlighter, Type, X } from 'lucide-react';
import { cn } from '@/lib/utils';

type DrawingPath = {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
  opacity: number;
};

type PaintTool = 'pen' | 'highlighter' | 'eraser';

const PEN_COLORS = [
  'hsl(var(--foreground))',
  '#EF4444', '#F97316', '#EAB308',
  '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899',
];

const HIGHLIGHTER_COLORS = [
  '#FBBF24', '#34D399', '#60A5FA',
  '#F472B6', '#A78BFA', '#FB923C',
];

type PaintOverlayProps = {
  active: boolean;
  onClose: () => void;
  singleUse?: boolean;
  initialPaths?: DrawingPath[];
  onPathsChange?: (paths: DrawingPath[]) => void;
};

export function PaintOverlay({
  active,
  onClose,
  singleUse = false,
  initialPaths,
  onPathsChange,
}: PaintOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<PaintTool>('pen');
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [highlighterColor, setHighlighterColor] = useState(HIGHLIGHTER_COLORS[0]);
  const [brushSize, setBrushSize] = useState(3);
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);

  useEffect(() => {
    if (!Array.isArray(initialPaths)) return;
    setPaths(initialPaths);
  }, [initialPaths]);

  // Resize canvas to match container
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [active]);

  // Redraw
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const drawPath = (path: DrawingPath) => {
      if (path.points.length < 2) return;
      ctx.globalAlpha = path.opacity;
      ctx.strokeStyle = path.color;
      ctx.lineWidth = path.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(path.points[0].x, path.points[0].y);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(path.points[i].x, path.points[i].y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    };

    paths.forEach(drawPath);
    if (currentPath) drawPath(currentPath);
  }, [paths, currentPath]);

  useEffect(() => {
    onPathsChange?.(paths);
  }, [onPathsChange, paths]);

  const getCoords = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height),
    };
  }, []);

  const startDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (tool === 'eraser') {
      const coords = getCoords(e);
      setPaths(prev => prev.filter(p =>
        !p.points.some(pt => Math.hypot(pt.x - coords.x, pt.y - coords.y) < brushSize * 3)
      ));
      setIsDrawing(true);
      return;
    }

    const coords = getCoords(e);
    const isHighlighter = tool === 'highlighter';
    const newPath: DrawingPath = {
      id: `p-${Date.now()}`,
      points: [coords],
      color: isHighlighter ? highlighterColor : penColor,
      width: isHighlighter ? brushSize * 4 : brushSize,
      opacity: isHighlighter ? 0.35 : 1,
    };
    setCurrentPath(newPath);
    setIsDrawing(true);
  }, [tool, penColor, highlighterColor, brushSize, getCoords]);

  const moveDraw = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const coords = getCoords(e);

    if (tool === 'eraser') {
      setPaths(prev => prev.filter(p =>
        !p.points.some(pt => Math.hypot(pt.x - coords.x, pt.y - coords.y) < brushSize * 3)
      ));
      return;
    }

    setCurrentPath(prev => prev ? { ...prev, points: [...prev.points, coords] } : null);
  }, [isDrawing, tool, brushSize, getCoords]);

  const endDraw = useCallback(() => {
    if (currentPath) {
      setPaths(prev => {
        const next = [...prev, currentPath];
        return next;
      });
      setCurrentPath(null);
      if (singleUse) onClose();
    }
    setIsDrawing(false);
  }, [currentPath, onClose, singleUse]);

  const activeColors = tool === 'highlighter' ? HIGHLIGHTER_COLORS : PEN_COLORS;
  const activeColor = tool === 'highlighter' ? highlighterColor : penColor;
  const setActiveColor = tool === 'highlighter' ? setHighlighterColor : setPenColor;

  return (
    <div
      ref={containerRef}
      className={cn(
        'absolute inset-0 z-20',
        active ? 'pointer-events-auto' : 'pointer-events-none'
      )}
    >
      {/* Toolbar */}
      {active && (
      <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 rounded-full border surface-panel backdrop-blur-sm shadow-lg px-3 py-1.5">
        <Button
          variant={tool === 'pen' ? 'default' : 'ghost'}
          size="icon"
          className="h-7 w-7 rounded-full"
          onClick={() => setTool('pen')}
        >
          <Pen className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={tool === 'highlighter' ? 'default' : 'ghost'}
          size="icon"
          className="h-7 w-7 rounded-full"
          onClick={() => setTool('highlighter')}
        >
          <Highlighter className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant={tool === 'eraser' ? 'default' : 'ghost'}
          size="icon"
          className="h-7 w-7 rounded-full"
          onClick={() => setTool('eraser')}
        >
          <Eraser className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        {tool !== 'eraser' && (
          <div className="flex items-center gap-1">
            {activeColors.map(c => (
              <button
                key={c}
                className={cn(
                  'h-5 w-5 rounded-full border-2 transition-transform',
                  activeColor === c ? 'border-foreground scale-110' : 'border-transparent'
                )}
                style={{ backgroundColor: c }}
                onClick={() => setActiveColor(c)}
              />
            ))}
          </div>
        )}

        <div className="w-px h-5 bg-border mx-1" />

        <input
          type="range"
          min="1"
          max="12"
          value={brushSize}
          onChange={e => setBrushSize(Number(e.target.value))}
          className="w-16 h-1 accent-primary"
        />

        <div className="w-px h-5 bg-border mx-1" />

        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setPaths(p => p.slice(0, -1))} disabled={paths.length === 0}>
          <Undo className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setPaths([])} disabled={paths.length === 0}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      )}

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        className={cn(
          'absolute inset-0 w-full h-full',
          active
            ? (tool === 'eraser' ? 'cursor-cell' : 'cursor-crosshair')
            : 'pointer-events-none'
        )}
        onMouseDown={startDraw}
        onMouseMove={moveDraw}
        onMouseUp={endDraw}
        onMouseLeave={endDraw}
        onTouchStart={startDraw}
        onTouchMove={moveDraw}
        onTouchEnd={endDraw}
      />
    </div>
  );
}
