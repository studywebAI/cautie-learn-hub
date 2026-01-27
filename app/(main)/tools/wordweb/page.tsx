'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Pen, Eraser, Undo, Redo, Trash2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

type DrawingPath = {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  width: number;
};

type WordwebData = {
  type: 'wordweb';
  paths: DrawingPath[];
  text: string;
};

const PEN_COLORS = [
  '#000000', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500'
];

export default function WordwebPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentTool, setCurrentTool] = useState<'pen' | 'eraser'>('pen');
  const [currentColor, setCurrentColor] = useState(PEN_COLORS[0]);
  const [brushSize, setBrushSize] = useState(2);
  const [paths, setPaths] = useState<DrawingPath[]>([]);
  const [currentPath, setCurrentPath] = useState<DrawingPath | null>(null);
  const [text, setText] = useState('');
  const [materialId, setMaterialId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const supabase = createClient();
  const { toast } = useToast();

  // Load wordweb from Supabase
  useEffect(() => {
    const loadWordweb = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoading(false);
          return;
        }

        const { data: existingMaterial, error } = await supabase
          .from('materials')
          .select('*')
          .eq('user_id', user.id)
          .eq('type', 'wordweb')
          .eq('title', 'Wordweb Drawing')
          .single();

        if (existingMaterial && !error) {
          const data = existingMaterial.content as WordwebData;
          setPaths(data.paths || []);
          setText(data.text || '');
          setMaterialId(existingMaterial.id);
        }
      } catch (error) {
        console.error('Failed to load wordweb:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWordweb();
  }, [supabase]);

  // Autosave to Supabase
  useEffect(() => {
    if (isLoading) return;

    const saveTimeout = setTimeout(async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const wordwebData: WordwebData = {
          type: 'wordweb',
          paths,
          text
        };

        const materialData = {
          user_id: user.id,
          type: 'wordweb' as const,
          title: 'Wordweb Drawing',
          content: wordwebData,
          source_text: text,
          updated_at: new Date().toISOString()
        };

        if (materialId) {
          const { error } = await supabase
            .from('materials')
            .update(materialData)
            .eq('id', materialId);
          if (error) throw error;
        } else {
          const { data: newMaterial, error } = await supabase
            .from('materials')
            .insert(materialData)
            .select()
            .single();
          if (error) throw error;
          setMaterialId(newMaterial.id);
        }

        toast({
          title: "Saved",
          description: "Wordweb saved successfully",
        });
      } catch (error) {
        console.error('Failed to save wordweb:', error);
        toast({
          title: "Save failed",
          description: "Failed to save wordweb",
          variant: "destructive",
        });
      }
    }, 2000);

    return () => clearTimeout(saveTimeout);
  }, [paths, text, materialId, isLoading, supabase, toast]);

  // Redraw canvas when paths change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all paths
    paths.forEach(path => {
      if (path.points.length < 2) return;

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
    });
  }, [paths]);

  const getCanvasCoordinates = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const coords = getCanvasCoordinates(e);

    if (currentTool === 'pen') {
      const newPath: DrawingPath = {
        id: `path-${Date.now()}`,
        points: [coords],
        color: currentColor,
        width: brushSize
      };
      setCurrentPath(newPath);
      setIsDrawing(true);
    } else if (currentTool === 'eraser') {
      // Erase by removing paths that intersect with eraser
      setPaths(prev => prev.filter(path => {
        return !path.points.some(point => {
          const dx = point.x - coords.x;
          const dy = point.y - coords.y;
          return Math.sqrt(dx * dx + dy * dy) < brushSize * 2;
        });
      }));
    }
  }, [currentTool, currentColor, brushSize, getCanvasCoordinates]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !currentPath) return;

    const coords = getCanvasCoordinates(e);
    setCurrentPath(prev => prev ? {
      ...prev,
      points: [...prev.points, coords]
    } : null);
  }, [isDrawing, currentPath, getCanvasCoordinates]);

  const handleMouseUp = useCallback(() => {
    if (currentPath) {
      setPaths(prev => [...prev, currentPath]);
      setCurrentPath(null);
    }
    setIsDrawing(false);
  }, [currentPath]);

  const clearCanvas = useCallback(() => {
    setPaths([]);
  }, []);

  const undo = useCallback(() => {
    setPaths(prev => prev.slice(0, -1));
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading Wordweb...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="border-b p-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Tool Selection */}
          <div className="flex items-center gap-2">
            <Button
              variant={currentTool === 'pen' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentTool('pen')}
            >
              <Pen className="h-4 w-4 mr-2" />
              Pen
            </Button>
            <Button
              variant={currentTool === 'eraser' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setCurrentTool('eraser')}
            >
              <Eraser className="h-4 w-4 mr-2" />
              Eraser
            </Button>
          </div>

          {/* Color Picker */}
          {currentTool === 'pen' && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Color:</span>
              <div className="flex gap-1">
                {PEN_COLORS.map(color => (
                  <button
                    key={color}
                    className={`w-6 h-6 rounded border-2 ${currentColor === color ? 'border-gray-800' : 'border-gray-300'}`}
                    style={{ backgroundColor: color }}
                    onClick={() => setCurrentColor(color)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Brush Size */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">Size:</span>
            <input
              type="range"
              min="1"
              max="20"
              value={brushSize}
              onChange={(e) => setBrushSize(parseInt(e.target.value))}
              className="w-20"
            />
            <span className="text-sm text-muted-foreground">{brushSize}px</span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={undo} disabled={paths.length === 0}>
              <Undo className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={clearCanvas} disabled={paths.length === 0}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Canvas Area */}
      <div className="flex-1 flex">
        {/* Drawing Canvas */}
        <div className="flex-1 bg-white border-r">
          <canvas
            ref={canvasRef}
            width={800}
            height={600}
            className="w-full h-full cursor-crosshair"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          />
        </div>

        {/* Text Area */}
        <div className="w-80 p-4 bg-gray-50">
          <h3 className="font-semibold mb-2">Notes & Text</h3>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add notes, annotations, or text here..."
            className="w-full h-full p-3 border rounded resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>
    </div>
  );
}