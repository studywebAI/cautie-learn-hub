'use client';

import { useMemo, useState, type PointerEvent as ReactPointerEvent } from 'react';
import type { CanonicalDocument, CanonicalLayoutState, CanonicalRelationType } from '@/lib/tools/canonical-model';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  document: CanonicalDocument;
  onChange: (nextDocument: CanonicalDocument) => void;
  settings?: {
    wordwebDensity?: number;
    interactionRequired?: boolean;
  };
};

type PositionedNode = {
  id: string;
  title: string;
  x: number;
  y: number;
  level: number;
};

function getWordwebLayout(document: CanonicalDocument): CanonicalLayoutState | null {
  return document.layouts?.find((layout) => layout.view === 'wordweb') || null;
}

function setWordwebLayout(document: CanonicalDocument, nodePositions: Record<string, { x: number; y: number }>) {
  const layouts = [...(document.layouts || [])];
  const index = layouts.findIndex((layout) => layout.view === 'wordweb');
  const nextLayout: CanonicalLayoutState = {
    view: 'wordweb',
    ...(layouts[index] || {}),
    nodePositions,
  };
  if (index >= 0) layouts[index] = nextLayout;
  else layouts.push(nextLayout);
  return { ...document, layouts };
}

export function WordwebCanvas({ document, onChange, settings }: Props) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [relationFrom, setRelationFrom] = useState('');
  const [relationTo, setRelationTo] = useState('');
  const [relationType, setRelationType] = useState<CanonicalRelationType>('references');
  const [relationLabel, setRelationLabel] = useState('');
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  const [dragNodeId, setDragNodeId] = useState<string | null>(null);

  const { positioned, links } = useMemo(() => {
    const nodeMap = new Map(document.nodes.map((node) => [node.id, node]));
    const rootId = document.nodes.find((node) => node.id === 'root-notes')?.id || document.nodes[0]?.id;
    if (!rootId) return { positioned: [] as PositionedNode[], links: [] as Array<{ id: string; from: string; to: string; label?: string | null; relation?: CanonicalRelationType }> };

    const childrenByParent = document.edges.reduce<Record<string, string[]>>((acc, edge) => {
      if (edge.relation !== 'contains') return acc;
      acc[edge.from] = acc[edge.from] || [];
      acc[edge.from].push(edge.to);
      return acc;
    }, {});

    const positionedNodes: PositionedNode[] = [];
    const linksOut: Array<{ id: string; from: string; to: string; label?: string | null; relation?: CanonicalRelationType }> = [];
    const levelSpacingX = 240;
    const rowSpacingY = 110;

    const walk = (nodeId: string, level: number, startY: number): number => {
      const children = childrenByParent[nodeId] || [];
      if (children.length === 0) {
        positionedNodes.push({
          id: nodeId,
          title: nodeMap.get(nodeId)?.title || 'Node',
          x: level * levelSpacingX,
          y: startY,
          level,
        });
        return startY + rowSpacingY;
      }

      const initialY = startY;
      let cursorY = startY;
      for (const childId of children) {
        const edge = document.edges.find((candidate) => candidate.from === nodeId && candidate.to === childId && candidate.relation === 'contains');
        linksOut.push({ id: edge?.id || `${nodeId}-${childId}`, from: nodeId, to: childId, label: edge?.label || null, relation: edge?.relation });
        cursorY = walk(childId, level + 1, cursorY);
      }
      const middleY = (initialY + cursorY - rowSpacingY) / 2;
      positionedNodes.push({
        id: nodeId,
        title: nodeMap.get(nodeId)?.title || 'Node',
        x: level * levelSpacingX,
        y: middleY,
        level,
      });
      return cursorY;
    };

    for (const edge of document.edges) {
      if (edge.relation === 'contains') continue;
      const fromNode = nodeMap.get(edge.from);
      const toNode = nodeMap.get(edge.to);
      if (!fromNode || !toNode) continue;
      linksOut.push({ id: edge.id, from: edge.from, to: edge.to, label: edge.label || edge.relation, relation: edge.relation });
    }
    walk(rootId, 0, 40);

    const layoutPositions = getWordwebLayout(document)?.nodePositions || {};
    const patchedPositioned = positionedNodes.map((node) => {
      const saved = layoutPositions[node.id];
      return saved ? { ...node, x: saved.x, y: saved.y } : node;
    });
    const density = Math.max(8, Math.min(240, settings?.wordwebDensity ?? 80));
    const limited = patchedPositioned.slice(0, density);
    const allowedNodeIds = new Set(limited.map((node) => node.id));
    const filteredLinks = linksOut.filter((link) => allowedNodeIds.has(link.from) && allowedNodeIds.has(link.to));

    return { positioned: limited, links: filteredLinks };
  }, [document, settings?.wordwebDensity]);

  const byId = useMemo(() => new Map(positioned.map((node) => [node.id, node])), [positioned]);
  const selectedNode = document.nodes.find((node) => node.id === selectedNodeId) || null;
  const relationCandidates = document.nodes.filter((node) => node.id !== 'root-notes');

  const updateNode = (nodeId: string, patch: { title?: string; body?: string | null }) => {
    const nextNodes = document.nodes.map((node) =>
      node.id === nodeId
        ? { ...node, ...(typeof patch.title === 'string' ? { title: patch.title } : {}), ...(patch.body !== undefined ? { body: patch.body } : {}) }
        : node
    );
    onChange({ ...document, nodes: nextNodes });
  };

  const updateEdgeLabel = (edgeId: string, label: string) => {
    const nextEdges = document.edges.map((edge) =>
      edge.id === edgeId
        ? {
            ...edge,
            label: label.trim() ? label.trim() : null,
          }
        : edge
    );
    onChange({ ...document, edges: nextEdges });
  };

  const addRelation = () => {
    if (!relationFrom || !relationTo || relationFrom === relationTo) return;
    const existing = document.edges.find(
      (edge) => edge.from === relationFrom && edge.to === relationTo && edge.relation === relationType
    );
    if (existing) return;
    const edgeId = `edge-rel-${Date.now()}`;
    const nextEdges = [
      ...document.edges,
      {
        id: edgeId,
        from: relationFrom,
        to: relationTo,
        relation: relationType,
        label: relationLabel.trim() || null,
      },
    ];
    onChange({ ...document, edges: nextEdges });
    setRelationLabel('');
  };

  const removeRelation = (edgeId: string) => {
    const nextEdges = document.edges.filter((edge) => edge.id !== edgeId);
    onChange({ ...document, edges: nextEdges });
  };

  const handleNodePointerDown = (event: ReactPointerEvent<HTMLButtonElement>, nodeId: string) => {
    if (settings?.interactionRequired && selectedNodeId !== nodeId) {
      setSelectedNodeId(nodeId);
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragNodeId(nodeId);
  };

  const handleNodePointerMove = (event: ReactPointerEvent<HTMLButtonElement>, nodeId: string) => {
    if (dragNodeId !== nodeId) return;
    const host = event.currentTarget.closest('[data-wordweb-host]') as HTMLDivElement | null;
    if (!host) return;
    const hostRect = host.getBoundingClientRect();
    const x = Math.max(0, event.clientX - hostRect.left - 90);
    const y = Math.max(0, event.clientY - hostRect.top - 18);
    const current = getWordwebLayout(document)?.nodePositions || {};
    const nextPositions = {
      ...current,
      [nodeId]: { x, y },
    };
    onChange(setWordwebLayout(document, nextPositions));
  };

  const handleNodePointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragNodeId(null);
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div data-wordweb-host className="relative min-h-[560px] overflow-auto rounded-2xl border surface-panel p-4">
        <svg className="absolute inset-0 h-full w-full pointer-events-none">
          {links.map((link) => {
            const from = byId.get(link.from);
            const to = byId.get(link.to);
            if (!from || !to) return null;
            const midX = (from.x + to.x + 180) / 2;
            const midY = (from.y + to.y + 48) / 2;
            const edge = document.edges.find((item) => item.id === link.id) || null;
            return (
              <g key={link.id}>
                <path
                  d={`M ${from.x + 180} ${from.y + 24} C ${from.x + 210} ${from.y + 24}, ${to.x - 30} ${to.y + 24}, ${to.x} ${to.y + 24}`}
                  fill="none"
                  stroke="hsl(var(--border))"
                  strokeWidth={1.5}
                />
                <foreignObject x={midX - 80} y={midY - 18} width="160" height="28" className="pointer-events-auto">
                  <input
                    value={editingEdgeId === link.id ? relationLabel : edge?.label || ''}
                    onFocus={() => {
                      setEditingEdgeId(link.id);
                      setRelationLabel(edge?.label || '');
                    }}
                    onChange={(event) => setRelationLabel(event.target.value)}
                    onBlur={() => {
                      updateEdgeLabel(link.id, relationLabel);
                      setEditingEdgeId(null);
                      setRelationLabel('');
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') {
                        updateEdgeLabel(link.id, relationLabel);
                        setEditingEdgeId(null);
                        setRelationLabel('');
                      }
                    }}
                    placeholder="label"
                    className="h-6 w-full rounded border border-border bg-background px-1 text-[10px]"
                  />
                </foreignObject>
              </g>
            );
          })}
        </svg>

        <div className="relative">
          {positioned.map((node) => (
            <button
              type="button"
              key={node.id}
              className={`absolute w-[180px] cursor-grab rounded-md px-3 py-2 text-left text-sm shadow-[inset_0_0_0_1px_hsl(var(--border))] ${
                selectedNodeId === node.id ? 'surface-chip' : 'surface-interactive'
              }`}
              style={{ left: `${node.x}px`, top: `${node.y}px` }}
              title={node.title}
              onClick={() => setSelectedNodeId(node.id)}
              onPointerDown={(event) => handleNodePointerDown(event, node.id)}
              onPointerMove={(event) => handleNodePointerMove(event, node.id)}
              onPointerUp={handleNodePointerUp}
            >
              <p className="line-clamp-2">{node.title}</p>
            </button>
          ))}
        </div>
      </div>

      <aside className="rounded-2xl border surface-panel p-4 space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm">Node editor</h3>
          {!selectedNode ? (
            <p className="text-xs text-muted-foreground">Select a node in the graph to edit.</p>
          ) : (
            <>
              <div className="space-y-1">
                <Label className="text-xs">Title</Label>
                <Input
                  value={selectedNode.title}
                  onChange={(event) => updateNode(selectedNode.id, { title: event.target.value })}
                  className="h-8 text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Body</Label>
                <Textarea
                  value={selectedNode.body || ''}
                  onChange={(event) => updateNode(selectedNode.id, { body: event.target.value })}
                  className="min-h-[90px] text-sm"
                />
              </div>
            </>
          )}
        </div>

        <div className="space-y-2">
          <h3 className="text-sm">Relations</h3>
          <div className="grid gap-2">
            <select
              value={relationFrom}
              onChange={(event) => setRelationFrom(event.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs"
            >
              <option value="">From node</option>
              {relationCandidates.map((node) => (
                <option key={`from-${node.id}`} value={node.id}>
                  {node.title}
                </option>
              ))}
            </select>
            <select
              value={relationTo}
              onChange={(event) => setRelationTo(event.target.value)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs"
            >
              <option value="">To node</option>
              {relationCandidates.map((node) => (
                <option key={`to-${node.id}`} value={node.id}>
                  {node.title}
                </option>
              ))}
            </select>
            <select
              value={relationType}
              onChange={(event) => setRelationType(event.target.value as CanonicalRelationType)}
              className="h-8 rounded-md border border-border bg-background px-2 text-xs"
            >
              <option value="references">references</option>
              <option value="causes">causes</option>
              <option value="depends_on">depends_on</option>
              <option value="part_of">part_of</option>
              <option value="example_of">example_of</option>
              <option value="next">next</option>
            </select>
            <Input
              value={relationLabel}
              onChange={(event) => setRelationLabel(event.target.value)}
              placeholder="Relation label (optional)"
              className="h-8 text-sm"
            />
            <Button size="sm" onClick={addRelation} disabled={!relationFrom || !relationTo || relationFrom === relationTo}>
              Add relation
            </Button>
          </div>

          <div className="max-h-44 space-y-1 overflow-auto rounded-md surface-interactive p-2">
            {document.edges.filter((edge) => edge.relation !== 'contains').length === 0 ? (
              <p className="text-xs text-muted-foreground">No custom relations yet.</p>
            ) : (
              document.edges
                .filter((edge) => edge.relation !== 'contains')
                .map((edge) => (
                  <div key={edge.id} className="flex items-center justify-between gap-2 rounded-md surface-panel px-2 py-1">
                    <p className="min-w-0 truncate text-xs">
                      {edge.relation}: {edge.label || `${edge.from} -> ${edge.to}`}
                    </p>
                    <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={() => removeRelation(edge.id)}>
                      Remove
                    </Button>
                  </div>
                ))
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
