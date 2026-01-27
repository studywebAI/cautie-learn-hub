'use client';
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createClient } from '@/lib/supabase/client';
import { useToast } from '@/hooks/use-toast';

type MindmapNode = {
  id: string;
  title: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  level: number;
  color?: string;
};

type MindmapConnection = {
  id: string;
  from: string;
  to: string;
  color?: string;
};

type MindmapData = {
  type: 'mindmap';
  central: string;
  branches: Array<{
    topic: string;
    subs?: string[];
  }>;
  customNodes?: MindmapNode[];
  customConnections?: MindmapConnection[];
};

type ProfessionalMindmapRendererProps = {
  data: MindmapData;
  title?: string;
};

const NODE_COLORS = [
  '#e5e7eb', '#fef3c7', '#dbeafe', '#dcfce7', '#fce7f3',
  '#fed7aa', '#ddd6fe', '#cffafe'
];

export function ProfessionalMindmapRenderer({ data, title }: ProfessionalMindmapRendererProps) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const [mindmapData, setMindmapData] = useState<MindmapData>(() => {
    // Load from localStorage if available
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(`mindmap-${title || data.central}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to load saved mindmap:', e);
        }
      }
    }
    return {
      ...data,
      customNodes: data.customNodes || [],
      customConnections: data.customConnections || []
    };
  });

  // Save to localStorage whenever mindmapData changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`mindmap-${title || data.central}`, JSON.stringify(mindmapData));
    }
  }, [mindmapData, title, data.central]);

  // Node editing state
  const [editingNode, setEditingNode] = useState<MindmapNode | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editColor, setEditColor] = useState('');

  // Node dragging state
  const [draggingNode, setDraggingNode] = useState<MindmapNode | null>(null);
  const [nodeDragStart, setNodeDragStart] = useState({ x: 0, y: 0 });

  // Connection creation state
  const [connectionMode, setConnectionMode] = useState(false);
  const [firstSelectedNode, setFirstSelectedNode] = useState<MindmapNode | null>(null);
  const [connectionColor, setConnectionColor] = useState('#374151');

  // Add node dialog
  const [showAddNodeDialog, setShowAddNodeDialog] = useState(false);
  const [newNodeTitle, setNewNodeTitle] = useState('');
  const [newNodeColor, setNewNodeColor] = useState(NODE_COLORS[0]);

  const svgRef = useRef<SVGSVGElement>(null);

  // Touch event handlers for mobile support
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const rect = svgRef.current?.getBoundingClientRect();
    if (rect) {
      const x = (touch.clientX - rect.left - pan.x) / zoom;
      const y = (touch.clientY - rect.top - pan.y) / zoom;
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
      setIsDragging(true);
    }
  }, [pan, zoom]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setPan({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
    }
  }, [dragStart]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  // Calculate dimensions - make it full screen
  const sidebarWidth = 0; // Remove sidebar space
  const containerPadding = 20;
  const availableWidth = typeof window !== 'undefined' ? window.innerWidth - containerPadding * 2 : 1200;
  const availableHeight = typeof window !== 'undefined' ? window.innerHeight - 100 : 800; // Account for header
  const size = Math.min(availableWidth, availableHeight);
  const svgWidth = size;
  const svgHeight = size;
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;

  // Build nodes from data - now includes branches and subs
  const nodes = React.useMemo(() => {
    const allNodes: MindmapNode[] = [];

    // Central node
    const centralText = title || data.central;
    const centralWidth = Math.max(140, Math.min(220, centralText.length * 10));
    const centralHeight = 70;

    allNodes.push({
      id: 'central',
      title: centralText,
      description: `Main topic: ${centralText}`,
      x: centerX - centralWidth / 2,
      y: centerY - centralHeight / 2,
      width: centralWidth,
      height: centralHeight,
      level: 0,
      color: '#e5e7eb'
    });

    // Add branch nodes
    if (data.branches && data.branches.length > 0) {
      const branchCount = data.branches.length;
      const radius = 250; // Increased radius for better spacing
      const angleStep = (2 * Math.PI) / branchCount;

      data.branches.forEach((branch, index) => {
        const angle = index * angleStep - Math.PI / 2; // Start from top
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        const width = Math.max(120, branch.topic.length * 8);
        const height = 55;

        allNodes.push({
          id: `branch-${index}`,
          title: branch.topic,
          description: `Branch: ${branch.topic}`,
          x: x - width / 2,
          y: y - height / 2,
          width,
          height,
          level: 1,
          color: NODE_COLORS[index % NODE_COLORS.length]
        });

        // Add sub-nodes with collision detection
        if (branch.subs && branch.subs.length > 0) {
          const subRadius = 150;
          const subAngleStep = Math.PI / 8; // Spread subs around the branch
          const baseAngle = angle;

          branch.subs.forEach((sub, subIndex) => {
            const subAngle = baseAngle + (subIndex - (branch.subs!.length - 1) / 2) * subAngleStep;
            let subX = x + Math.cos(subAngle) * subRadius;
            let subY = y + Math.sin(subAngle) * subRadius;
            const subWidth = Math.max(100, sub.length * 7);
            const subHeight = 45;

            // Collision detection - ensure nodes don't overlap
            let attempts = 0;
            const maxAttempts = 20;
            while (attempts < maxAttempts) {
              let hasCollision = false;
              for (const existingNode of allNodes) {
                const dx = Math.abs(subX - (existingNode.x + existingNode.width / 2));
                const dy = Math.abs(subY - (existingNode.y + existingNode.height / 2));
                const minDistance = (subWidth + existingNode.width) / 2 + 20;

                if (dx < minDistance && dy < minDistance) {
                  hasCollision = true;
                  // Try a different angle
                  const newAngle = subAngle + (attempts + 1) * 0.3;
                  subX = x + Math.cos(newAngle) * (subRadius + attempts * 10);
                  subY = y + Math.sin(newAngle) * (subRadius + attempts * 10);
                  break;
                }
              }

              if (!hasCollision) break;
              attempts++;
            }

            allNodes.push({
              id: `sub-${index}-${subIndex}`,
              title: sub,
              description: `Sub-topic: ${sub}`,
              x: subX - subWidth / 2,
              y: subY - subHeight / 2,
              width: subWidth,
              height: subHeight,
              level: 2,
              color: NODE_COLORS[(index + subIndex) % NODE_COLORS.length]
            });
          });
        }
      });
    }

    // Add custom nodes
    mindmapData.customNodes?.forEach(node => {
      allNodes.push(node);
    });

    return allNodes;
  }, [mindmapData, data, title, centerX, centerY]);

  const connections = React.useMemo(() => {
    const allConnections: MindmapConnection[] = [];

    // Add connections from branches to center
    if (data.branches) {
      data.branches.forEach((branch, index) => {
        allConnections.push({
          id: `conn-central-branch-${index}`,
          from: 'central',
          to: `branch-${index}`,
          color: '#6b7280'
        });

        // Add connections from subs to branches
        if (branch.subs) {
          branch.subs.forEach((sub, subIndex) => {
            allConnections.push({
              id: `conn-branch-${index}-sub-${subIndex}`,
              from: `branch-${index}`,
              to: `sub-${index}-${subIndex}`,
              color: '#9ca3af'
            });
          });
        }
      });
    }

    // Add custom connections
    if (mindmapData.customConnections) {
      allConnections.push(...mindmapData.customConnections);
    }

    return allConnections;
  }, [mindmapData.customConnections, data.branches]);

  // Event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current && e.button === 0) {
      // Left click for panning
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (draggingNode) {
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        const svgX = (e.clientX - rect.left - pan.x) / zoom;
        const svgY = (e.clientY - rect.top - pan.y) / zoom;
        const deltaX = svgX - nodeDragStart.x;
        const deltaY = svgY - nodeDragStart.y;

        setMindmapData(prev => ({
          ...prev,
          customNodes: prev.customNodes?.map(node =>
            node.id === draggingNode.id
              ? { ...node, x: node.x + deltaX, y: node.y + deltaY }
              : node
          ) || []
        }));

        setNodeDragStart({ x: svgX, y: svgY });
      }
    } else if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  }, [draggingNode, isDragging, pan, zoom, dragStart, nodeDragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setDraggingNode(null);
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.3, Math.min(3, prev * zoomFactor)));
  }, []);

  const handleNodeDoubleClick = useCallback((node: MindmapNode, e: React.MouseEvent) => {
    e.preventDefault(); // Prevent text selection
    e.stopPropagation();

    // Start editing the node title
    setEditingNode(node);
    setEditTitle(node.title);
    setEditDescription(node.description);
    setEditColor(node.color || NODE_COLORS[0]);
  }, []);

  const handleNodeClick = useCallback((node: MindmapNode, e: React.MouseEvent) => {
    e.stopPropagation();

    if (connectionMode) {
      if (!firstSelectedNode) {
        setFirstSelectedNode(node);
      } else if (firstSelectedNode.id !== node.id) {
        // Create connection
        const newConnection: MindmapConnection = {
          id: `conn-${firstSelectedNode.id}-${node.id}-${Date.now()}`,
          from: firstSelectedNode.id,
          to: node.id,
          color: connectionColor
        };

        setMindmapData(prev => ({
          ...prev,
          customConnections: [...(prev.customConnections || []), newConnection]
        }));

        setFirstSelectedNode(null);
        setConnectionMode(false);
      }
    }
  }, [connectionMode, firstSelectedNode, connectionColor]);

  const handleNodeContextMenu = useCallback((node: MindmapNode, e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      node
    });
  }, []);

  const handleCanvasContextMenu = useCallback((e: React.MouseEvent) => {
    if (e.target === svgRef.current) {
      e.preventDefault();
      setContextMenu({
        x: e.clientX,
        y: e.clientY
      });
    }
  }, []);

  const handleNodeMouseDown = useCallback((node: MindmapNode, e: React.MouseEvent) => {
    if (e.button === 0) { // Left click for dragging
      e.stopPropagation();
      setDraggingNode(node);
      const rect = svgRef.current?.getBoundingClientRect();
      if (rect) {
        setNodeDragStart({
          x: (e.clientX - rect.left - pan.x) / zoom,
          y: (e.clientY - rect.top - pan.y) / zoom
        });
      }
    }
  }, [pan, zoom]);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    node?: MindmapNode;
  } | null>(null);

  // Context menu actions
  const editNode = useCallback((node: MindmapNode) => {
    setEditingNode(node);
    setEditTitle(node.title);
    setEditDescription(node.description);
    setEditColor(node.color || NODE_COLORS[0]);
    setContextMenu(null);
  }, []);

  const deleteNode = useCallback((nodeId: string) => {
    setMindmapData(prev => ({
      ...prev,
      customNodes: prev.customNodes?.filter(node => node.id !== nodeId) || [],
      customConnections: prev.customConnections?.filter(conn =>
        conn.from !== nodeId && conn.to !== nodeId
      ) || []
    }));
    setContextMenu(null);
  }, []);

  const deleteConnection = useCallback((connectionId: string) => {
    setMindmapData(prev => ({
      ...prev,
      customConnections: prev.customConnections?.filter(conn => conn.id !== connectionId) || []
    }));
    setContextMenu(null);
  }, []);

  const addConnection = useCallback((node: MindmapNode) => {
    setFirstSelectedNode(node);
    setConnectionMode(true);
    setContextMenu(null);
  }, []);

  const saveNodeEdit = useCallback(() => {
    if (editingNode) {
      setMindmapData(prev => ({
        ...prev,
        customNodes: prev.customNodes?.map(node =>
          node.id === editingNode.id
            ? { ...node, title: editTitle, description: editDescription, color: editColor }
            : node
        ) || []
      }));
      setEditingNode(null);
    }
  }, [editingNode, editTitle, editDescription, editColor]);

  const addNewNode = useCallback(() => {
    if (newNodeTitle.trim()) {
      const newNode: MindmapNode = {
        id: `custom-${Date.now()}`,
        title: newNodeTitle,
        description: `Custom node: ${newNodeTitle}`,
        x: centerX + Math.random() * 200 - 100,
        y: centerY + Math.random() * 200 - 100,
        width: Math.max(100, newNodeTitle.length * 8),
        height: 50,
        level: -1,
        color: newNodeColor
      };

      setMindmapData(prev => ({
        ...prev,
        customNodes: [...(prev.customNodes || []), newNode]
      }));

      setNewNodeTitle('');
      setNewNodeColor(NODE_COLORS[0]);
      setShowAddNodeDialog(false);
    }
  }, [newNodeTitle, newNodeColor, centerX, centerY, nodes]);

  const wrapText = useCallback((text: string, maxWidth: number, fontSize: number = 12) => {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine + (currentLine ? ' ' : '') + word;
      const testWidth = testLine.length * (fontSize * 0.6);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) lines.push(currentLine);
    return lines;
  }, []);

  return (
    <div className="fixed inset-0 bg-background select-none">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 flex gap-2 flex-wrap">
        <Button
          size="sm"
          onClick={() => setShowAddNodeDialog(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          Add Node
        </Button>

        {connectionMode ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {firstSelectedNode ? 'Click second node' : 'Click first node'}
            </span>
            <Select value={connectionColor} onValueChange={setConnectionColor}>
              <SelectTrigger className="w-20">
                <div
                  className="w-4 h-4 rounded border"
                  style={{ backgroundColor: connectionColor }}
                />
              </SelectTrigger>
              <SelectContent>
                {['#374151', '#dc2626', '#ea580c', '#ca8a04', '#16a34a', '#0891b2', '#2563eb', '#7c3aed', '#c026d3'].map(color => (
                  <SelectItem key={color} value={color}>
                    <div
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: color }}
                    />
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setConnectionMode(false);
                setFirstSelectedNode(null);
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setConnectionMode(true)}
          >
            Connect Nodes
          </Button>
        )}
      </div>

      <svg
        ref={svgRef}
        width={svgWidth}
        height={svgHeight}
        className="cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onWheel={handleWheel}
        onContextMenu={handleCanvasContextMenu}
        style={{ touchAction: 'none' }}
      >
        <g
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center'
          }}
        >
          {/* Arrow markers */}
          <defs>
            <marker
              id="arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon points="0 0, 10 3.5, 0 7" fill="#000000" />
            </marker>
          </defs>

          {/* Connections */}
          {connections.map((conn) => {
            const fromNode = nodes.find(n => n.id === conn.from);
            const toNode = nodes.find(n => n.id === conn.to);
            if (!fromNode || !toNode) return null;

            const fromCenterX = fromNode.x + fromNode.width / 2;
            const fromCenterY = fromNode.y + fromNode.height / 2;
            const toCenterX = toNode.x + toNode.width / 2;
            const toCenterY = toNode.y + toNode.height / 2;

            return (
              <line
                key={conn.id}
                x1={fromCenterX}
                y1={fromCenterY}
                x2={toCenterX}
                y2={toCenterY}
                stroke={conn.color || '#6b7280'}
                strokeWidth="2"
                markerEnd="url(#arrowhead)"
                className="drop-shadow-sm"
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => (
            <g key={node.id}>
              {/* Node rectangle */}
              <rect
                x={node.x}
                y={node.y}
                width={node.width}
                height={node.height}
                fill={node.color || '#e5e7eb'}
                stroke={firstSelectedNode?.id === node.id ? '#2563eb' : '#cccccc'}
                strokeWidth={firstSelectedNode?.id === node.id ? '3' : '2'}
                className="cursor-move hover:stroke-gray-400"
                onClick={(e) => handleNodeClick(node, e)}
                onDoubleClick={(e) => handleNodeDoubleClick(node, e)}
                onContextMenu={(e) => handleNodeContextMenu(node, e)}
                onMouseDown={(e) => handleNodeMouseDown(node, e)}
              />

              {/* Node text */}
              <text
                x={node.x + node.width / 2}
                y={node.y + node.height / 2}
                textAnchor="middle"
                dy="0.35em"
                fill="#000000"
                fontSize={node.level === 0 ? "14" : node.level === 1 ? "12" : "11"}
                fontWeight="600"
                className="pointer-events-none select-none"
                style={{ userSelect: 'none' }}
              >
                {wrapText(node.title, node.width - 16, parseInt(node.level === 0 ? "14" : node.level === 1 ? "12" : "11")).map((line, i) => (
                  <tspan key={i} x={node.x + node.width / 2} dy={i === 0 ? 0 : '1.1em'}>{line}</tspan>
                ))}
              </text>
            </g>
          ))}
        </g>
      </svg>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="absolute z-50 bg-white border rounded shadow-lg py-1 min-w-48"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={() => setContextMenu(null)}
        >
          {contextMenu.node ? (
            <>
              <button
                className="w-full text-left px-3 py-2 hover:bg-gray-100"
                onClick={() => editNode(contextMenu.node!)}
              >
                Edit Node
              </button>
              <button
                className="w-full text-left px-3 py-2 hover:bg-gray-100"
                onClick={() => addConnection(contextMenu.node!)}
              >
                Add Connection
              </button>
              {contextMenu.node.level === -1 && (
                <button
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 text-red-600"
                  onClick={() => deleteNode(contextMenu.node!.id)}
                >
                  Delete Node
                </button>
              )}
            </>
          ) : (
            <button
              className="w-full text-left px-3 py-2 hover:bg-gray-100"
              onClick={() => setShowAddNodeDialog(true)}
            >

            </button>
          )}
        </div>
      )}

      {/* Add Node Dialog */}
      <Dialog open={showAddNodeDialog} onOpenChange={setShowAddNodeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Node</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={newNodeTitle}
                onChange={(e) => setNewNodeTitle(e.target.value)}
                placeholder="Node title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Color</label>
              <Select value={newNodeColor} onValueChange={setNewNodeColor}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: newNodeColor }}
                    />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {NODE_COLORS.map(color => (
                    <SelectItem key={color} value={color}>
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: color }}
                      />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddNodeDialog(false)}>
                Cancel
              </Button>
              <Button onClick={addNewNode}>
                Add Node
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingNode} onOpenChange={() => setEditingNode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Node</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Title</label>
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                placeholder="Node title"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Detailed description"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Color</label>
              <Select value={editColor} onValueChange={setEditColor}>
                <SelectTrigger>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded border"
                      style={{ backgroundColor: editColor }}
                    />
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {NODE_COLORS.map(color => (
                    <SelectItem key={color} value={color}>
                      <div
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: color }}
                      />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingNode(null)}>
                Cancel
              </Button>
              <Button onClick={saveNodeEdit}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}