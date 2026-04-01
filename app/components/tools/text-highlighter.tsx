'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Highlighter } from 'lucide-react';
import { cn } from '@/lib/utils';

const HIGHLIGHT_COLORS = [
  { name: 'yellow', bg: 'rgba(250, 204, 21, 0.4)' },
  { name: 'green', bg: 'rgba(52, 211, 153, 0.4)' },
  { name: 'blue', bg: 'rgba(96, 165, 250, 0.4)' },
  { name: 'pink', bg: 'rgba(244, 114, 182, 0.4)' },
  { name: 'purple', bg: 'rgba(167, 139, 250, 0.4)' },
];

type Highlight = {
  id: string;
  text: string;
  color: string;
  startOffset: number;
  endOffset: number;
  parentSelector: string;
};

type TextHighlighterProps = {
  active: boolean;
  onToggle: () => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  singleUse?: boolean;
  onApplied?: () => void;
  onContentChanged?: (html: string) => void;
};

export function TextHighlighterToolbar({
  active,
  onToggle,
  containerRef,
  singleUse = false,
  onApplied,
  onContentChanged,
}: TextHighlighterProps) {
  const [color, setColor] = useState(HIGHLIGHT_COLORS[0]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);

  const applyHighlight = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !containerRef.current) return;

    const range = selection.getRangeAt(0);
    if (!containerRef.current.contains(range.commonAncestorContainer)) return;

    try {
      const mark = document.createElement('mark');
      mark.style.backgroundColor = color.bg;
      mark.style.borderRadius = '2px';
      mark.style.padding = '0 1px';
      mark.dataset.highlightId = `hl-${Date.now()}`;
      range.surroundContents(mark);
      selection.removeAllRanges();

      setHighlights(prev => [...prev, {
        id: mark.dataset.highlightId!,
        text: mark.textContent || '',
        color: color.bg,
        startOffset: 0,
        endOffset: 0,
        parentSelector: '',
      }]);
      onContentChanged?.(containerRef.current.innerHTML);
      if (singleUse) onApplied?.();
    } catch {
      // Can't wrap across element boundaries — wrap each text node individually
      const fragment = range.cloneContents();
      const walker = document.createTreeWalker(fragment, NodeFilter.SHOW_TEXT);
      const textNodes: Text[] = [];
      while (walker.nextNode()) textNodes.push(walker.currentNode as Text);

      if (textNodes.length === 0) return;

      // For multi-element selections, highlight within the range
      const docWalker = document.createTreeWalker(
        range.commonAncestorContainer,
        NodeFilter.SHOW_TEXT
      );
      let inRange = false;
      const nodesToWrap: Text[] = [];
      while (docWalker.nextNode()) {
        const node = docWalker.currentNode as Text;
        if (node === range.startContainer) inRange = true;
        if (inRange && node.textContent?.trim()) nodesToWrap.push(node);
        if (node === range.endContainer) break;
      }

      nodesToWrap.forEach(node => {
        const mark = document.createElement('mark');
        mark.style.backgroundColor = color.bg;
        mark.style.borderRadius = '2px';
        mark.style.padding = '0 1px';
        mark.dataset.highlightId = `hl-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const parent = node.parentNode;
        if (parent) {
          parent.insertBefore(mark, node);
          mark.appendChild(node);
        }
      });

      selection.removeAllRanges();
      onContentChanged?.(containerRef.current.innerHTML);
      if (singleUse) onApplied?.();
    }
  }, [color, containerRef, onApplied, onContentChanged, singleUse]);

  // Listen for mouseup when active to apply highlights
  useEffect(() => {
    if (!active) return;

    const handleMouseUp = () => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        // Small delay to let selection finalize
        setTimeout(applyHighlight, 10);
      }
    };

    const container = containerRef.current;
    container?.addEventListener('mouseup', handleMouseUp);
    return () => container?.removeEventListener('mouseup', handleMouseUp);
  }, [active, applyHighlight, containerRef]);

  const clearHighlights = useCallback(() => {
    if (!containerRef.current) return;
    const marks = containerRef.current.querySelectorAll('mark[data-highlight-id]');
    marks.forEach(mark => {
      const parent = mark.parentNode;
      if (parent) {
        while (mark.firstChild) parent.insertBefore(mark.firstChild, mark);
        parent.removeChild(mark);
      }
    });
    setHighlights([]);
    onContentChanged?.(containerRef.current.innerHTML);
  }, [containerRef]);

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant={active ? 'default' : 'outline'}
        size="sm"
        className="rounded-full h-8 gap-1.5"
        onClick={onToggle}
      >
        <Highlighter className="h-3.5 w-3.5" />
        <span className="text-xs">Highlight</span>
      </Button>

      {active && (
        <>
          <div className="flex items-center gap-1">
            {HIGHLIGHT_COLORS.map(c => (
              <button
                key={c.name}
                className={cn(
                  'h-5 w-5 rounded-full border-2 transition-transform',
                  color.name === c.name ? 'border-foreground scale-110' : 'border-transparent'
                )}
                style={{ backgroundColor: c.bg }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          {highlights.length > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs rounded-full" onClick={clearHighlights}>
              Clear all
            </Button>
          )}
        </>
      )}
    </div>
  );
}
