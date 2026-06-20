'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChevronDown, Plus, Trash2, Edit2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MindNode {
  id: string;
  label: string;
  color?: string;
  children?: MindNode[];
  x?: number;
  y?: number;
}

interface MindmapProps {
  title?: string;
  initialData?: MindNode;
  onSave?: (data: MindNode) => void;
}

const DEFAULT_COLORS = [
  '#7f8962', // sage (primary)
  '#d8956c', // warm tan
  '#6b9fbf', // ocean blue
  '#8b9b7f', // forest green
  '#d9967f', // rose
];

function getNodeColor(depth: number): string {
  return DEFAULT_COLORS[depth % DEFAULT_COLORS.length];
}

function calculateNodePositions(
  node: MindNode,
  x: number = 0,
  y: number = 0,
  angle: number = 0,
  depth: number = 0,
  positions: Map<string, { x: number; y: number }> = new Map()
): Map<string, { x: number; y: number }> {
  const radius = 100 + depth * 80; // Increase radius per depth
  const childCount = node.children?.length || 0;

  positions.set(node.id, { x, y });

  if (childCount === 0) return positions;

  // Distribute children in arc around parent
  const angleStep = (Math.PI * 2) / Math.max(childCount, 1);
  const angleOffset = angle - (angleStep * childCount) / 2;

  node.children?.forEach((child, idx) => {
    const childAngle = angleOffset + angleStep * idx;
    const childX = x + Math.cos(childAngle) * radius;
    const childY = y + Math.sin(childAngle) * radius;
    calculateNodePositions(child, childX, childY, childAngle, depth + 1, positions);
  });

  return positions;
}

function MindNode({
  node,
  depth,
  positions,
  onAddChild,
  onRemove,
  onEdit,
  selectedId,
  setSelectedId,
}: {
  node: MindNode;
  depth: number;
  positions: Map<string, { x: number; y: number }>;
  onAddChild: (parentId: string) => void;
  onRemove: (id: string) => void;
  onEdit: (id: string, label: string) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
}) {
  const pos = positions.get(node.id) || { x: 0, y: 0 };
  const isSelected = selectedId === node.id;
  const color = node.color || getNodeColor(depth);
  const isRoot = depth === 0;

  return (
    <g key={node.id}>
      {/* Connections to children */}
      {node.children?.map((child) => {
        const childPos = positions.get(child.id) || { x: 0, y: 0 };
        return (
          <line
            key={`line-${node.id}-${child.id}`}
            x1={pos.x}
            y1={pos.y}
            x2={childPos.x}
            y2={childPos.y}
            stroke="#e5e7eb"
            strokeWidth="2"
          />
        );
      })}

      {/* Node circle */}
      <circle
        cx={pos.x}
        cy={pos.y}
        r={isRoot ? 45 : 35}
        fill={isSelected ? color : `${color}20`}
        stroke={color}
        strokeWidth={isSelected ? 3 : 2}
        style={{ cursor: 'pointer', transition: 'all 0.2s' }}
        onClick={() => setSelectedId(node.id)}
      />

      {/* Node label */}
      <text
        x={pos.x}
        y={pos.y}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={isRoot ? 13 : 11}
        fontWeight={isRoot ? 600 : 500}
        fill={isSelected ? '#fff' : color}
        style={{
          pointerEvents: 'none',
          wordWrap: 'break-word',
          userSelect: 'none',
        }}
      >
        {node.label.length > (isRoot ? 15 : 12)
          ? node.label.substring(0, isRoot ? 15 : 12) + '...'
          : node.label}
      </text>

      {/* Render children */}
      {node.children?.map((child) => (
        <MindNode
          key={child.id}
          node={child}
          depth={depth + 1}
          positions={positions}
          onAddChild={onAddChild}
          onRemove={onRemove}
          onEdit={onEdit}
          selectedId={selectedId}
          setSelectedId={setSelectedId}
        />
      ))}
    </g>
  );
}

export function Mindmap({ title = 'Mindmap', initialData, onSave }: MindmapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [data, setData] = useState<MindNode>(
    initialData || { id: '0', label: 'Central Idea', children: [] }
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [viewBox, setViewBox] = useState({ x: 0, y: 0, width: 800, height: 600 });

  const positions = calculateNodePositions(data);

  // Calculate bounds
  useEffect(() => {
    if (positions.size === 0) return;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;

    positions.forEach(({ x, y }) => {
      minX = Math.min(minX, x - 60);
      minY = Math.min(minY, y - 60);
      maxX = Math.max(maxX, x + 60);
      maxY = Math.max(maxY, y + 60);
    });

    const padding = 40;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    setViewBox({
      x: minX - padding,
      y: minY - padding,
      width: Math.max(width, 400),
      height: Math.max(height, 300),
    });
  }, [positions]);

  const findNode = (nodes: MindNode[], id: string): MindNode | null => {
    if (nodes.id === id) return nodes;
    for (const child of nodes.children || []) {
      const result = findNode(child, id);
      if (result) return result;
    }
    return null;
  };

  const updateNode = (nodes: MindNode, id: string, updates: Partial<MindNode>): MindNode => {
    if (nodes.id === id) {
      return { ...nodes, ...updates };
    }
    return {
      ...nodes,
      children: (nodes.children || []).map((child) => updateNode(child, id, updates)),
    };
  };

  const handleAddChild = useCallback(
    (parentId: string) => {
      const newId = Math.random().toString(36).substr(2, 9);
      const newChild: MindNode = { id: newId, label: 'New Topic', children: [] };
      setData((prev) => {
        const updated = updateNode(prev, parentId, {
          children: [...(findNode(prev, parentId)?.children || []), newChild],
        });
        onSave?.(updated);
        return updated;
      });
      setSelectedId(newId);
    },
    [onSave]
  );

  const handleRemove = useCallback(
    (id: string) => {
      if (id === data.id) return; // Can't remove root
      const removeFromNodes = (nodes: MindNode): MindNode => {
        return {
          ...nodes,
          children: (nodes.children || [])
            .filter((child) => child.id !== id)
            .map(removeFromNodes),
        };
      };
      const updated = removeFromNodes(data);
      setData(updated);
      onSave?.(updated);
      setSelectedId(null);
    },
    [data, onSave]
  );

  const handleEdit = useCallback(
    (id: string, label: string) => {
      const updated = updateNode(data, id, { label });
      setData(updated);
      onSave?.(updated);
      setEditingId(null);
    },
    [data, onSave]
  );

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-background rounded-lg border border-border">
        <h2 className="text-sm flex-1">{title}</h2>
        <div className="flex items-center gap-2">
          {selectedId && selectedId !== data.id && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAddChild(selectedId)}
              >
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Add
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const node = findNode(data, selectedId);
                  if (node) {
                    setEditingId(selectedId);
                    setEditLabel(node.label);
                  }
                }}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleRemove(selectedId)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const link = document.createElement('a');
              link.href = `data:application/json,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
              link.download = 'mindmap.json';
              link.click();
            }}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="flex-1 rounded-lg border border-border bg-background overflow-hidden">
        <svg
          ref={svgRef}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          className="w-full h-full"
        >
          <MindNode
            node={data}
            depth={0}
            positions={positions}
            onAddChild={handleAddChild}
            onRemove={handleRemove}
            onEdit={handleEdit}
            selectedId={selectedId}
            setSelectedId={setSelectedId}
          />
        </svg>
      </div>

      {/* Edit Dialog */}
      {editingId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-background border border-border rounded-lg p-4 shadow-lg max-w-sm">
            <p className="text-sm font-medium mb-3">Edit node</p>
            <input
              autoFocus
              type="text"
              value={editLabel}
              onChange={(e) => setEditLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleEdit(editingId, editLabel);
              }}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-[var(--accent-brand)]"
            />
            <div className="flex gap-2 justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingId(null)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => handleEdit(editingId, editLabel)}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
