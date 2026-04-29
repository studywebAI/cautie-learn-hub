'use client';

import { useMemo, useState } from 'react';
import type { CanonicalDocument } from '@/lib/tools/canonical-model';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';

type Props = {
  document: CanonicalDocument;
  onChange: (nextDocument: CanonicalDocument) => void;
};

type TimelineItem = {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  lane: string;
};

export function TimelineBoard({ document, onChange }: Props) {
  const [timeScale, setTimeScale] = useState<'year' | 'month'>('year');
  const [newTitle, setNewTitle] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newLane, setNewLane] = useState('General');

  const items = useMemo<TimelineItem[]>(() => {
    const byId = new Map(document.nodes.map((node) => [node.id, node]));
    const fromTemporal = document.temporal
      .map((entry) => {
        const node = byId.get(entry.nodeId);
        if (!node) return null;
        const lane = (node.tags && node.tags[0]) || 'General';
        return {
          id: node.id,
          title: node.title,
          startAt: entry.startAt || '',
          endAt: entry.endAt || entry.startAt || '',
          lane,
        };
      })
      .filter((item): item is TimelineItem => Boolean(item));

    if (fromTemporal.length > 0) {
      return fromTemporal.sort((a, b) => String(a.startAt).localeCompare(String(b.startAt)));
    }

    return document.nodes
      .filter((node) => node.id !== 'root-notes')
      .map((node, idx) => ({
        id: node.id,
        title: node.title,
        startAt: `${2000 + idx}-01-01`,
        endAt: `${2000 + idx}-12-31`,
        lane: (node.tags && node.tags[0]) || 'General',
      }))
      .sort((a, b) => String(a.startAt).localeCompare(String(b.startAt)));
  }, [document]);

  const lanes = useMemo(() => {
    const unique = Array.from(new Set(items.map((item) => item.lane || 'General')));
    return unique.length > 0 ? unique : ['General'];
  }, [items]);

  const minTime = items.length > 0 ? Math.min(...items.map((item) => new Date(item.startAt).getTime())) : Date.now();
  const maxTime = items.length > 0 ? Math.max(...items.map((item) => new Date(item.endAt || item.startAt).getTime())) : Date.now() + 86400000;
  const span = Math.max(86400000, maxTime - minTime);

  const itemX = (iso: string) => ((new Date(iso).getTime() - minTime) / span) * 100;
  const laneY = (lane: string) => lanes.indexOf(lane) * 92 + 48;

  const updateItem = (nodeId: string, patch: Partial<{ title: string; startAt: string; endAt: string; lane: string }>) => {
    const nextNodes = document.nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            ...(patch.title ? { title: patch.title } : {}),
            ...(patch.lane ? { tags: [patch.lane] } : {}),
          }
        : node
    );
    const nextTemporal = document.temporal.map((entry) =>
      entry.nodeId === nodeId
        ? {
            ...entry,
            ...(patch.startAt ? { startAt: patch.startAt } : {}),
            ...(patch.endAt ? { endAt: patch.endAt } : {}),
            precision: timeScale === 'month' ? 'month' : 'year',
          }
        : entry
    );
    onChange({ ...document, nodes: nextNodes, temporal: nextTemporal });
  };

  const addTimelineItem = () => {
    if (!newTitle.trim() || !newStart) return;
    const id = `timeline-${Date.now()}`;
    const nextNodes = [
      ...document.nodes,
      {
        id,
        type: 'event',
        title: newTitle.trim(),
        body: '',
        tags: [newLane || 'General'],
      },
    ];
    const nextEdges = [
      ...document.edges,
      {
        id: `edge-root-${id}`,
        from: 'root-notes',
        to: id,
        relation: 'contains' as const,
      },
    ];
    const nextTemporal = [
      ...document.temporal,
      {
        nodeId: id,
        startAt: newStart,
        endAt: newEnd || newStart,
        precision: timeScale === 'month' ? 'month' : 'year',
      },
    ];
    onChange({ ...document, nodes: nextNodes, edges: nextEdges, temporal: nextTemporal });
    setNewTitle('');
    setNewStart('');
    setNewEnd('');
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-2xl border surface-panel p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button size="sm" variant={timeScale === 'year' ? 'default' : 'outline'} onClick={() => setTimeScale('year')}>
            Year scale
          </Button>
          <Button size="sm" variant={timeScale === 'month' ? 'default' : 'outline'} onClick={() => setTimeScale('month')}>
            Month scale
          </Button>
        </div>
        <div className="relative h-[420px] overflow-x-auto">
          <div className="relative h-full min-w-[980px]">
            {lanes.map((lane, idx) => (
              <div key={lane} className="absolute left-0 right-0" style={{ top: `${idx * 92 + 48}px` }}>
                <div className="mb-1 text-xs text-muted-foreground">{lane}</div>
                <div className="h-px bg-border" />
              </div>
            ))}
            {items.map((item) => {
              const xStart = itemX(item.startAt);
              const xEnd = itemX(item.endAt || item.startAt);
              const widthPct = Math.max(6, xEnd - xStart);
              const y = laneY(item.lane);
              return (
                <div key={item.id} className="absolute" style={{ left: `${xStart}%`, top: `${y - 32}px`, width: `${widthPct}%` }}>
                  <div className="rounded-md surface-interactive p-2 text-xs shadow-[inset_0_0_0_1px_hsl(var(--border))]">
                    <p className="line-clamp-2 font-medium">{item.title}</p>
                    <p className="text-muted-foreground">{item.startAt} {item.endAt && item.endAt !== item.startAt ? `→ ${item.endAt}` : ''}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="rounded-2xl border surface-panel p-4 space-y-3">
        <div className="space-y-2">
          <h3 className="text-sm">Add event</h3>
          <Input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder="Event title" className="h-8 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Start</Label>
              <Input type="date" value={newStart} onChange={(event) => setNewStart(event.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End</Label>
              <Input type="date" value={newEnd} onChange={(event) => setNewEnd(event.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <Input value={newLane} onChange={(event) => setNewLane(event.target.value)} placeholder="Lane (e.g. History)" className="h-8 text-sm" />
          <Button size="sm" onClick={addTimelineItem} disabled={!newTitle.trim() || !newStart}>
            Add event
          </Button>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm">Edit events</h3>
          <div className="max-h-[260px] space-y-2 overflow-auto pr-1">
            {items.map((item) => (
              <div key={`edit-${item.id}`} className="rounded-md surface-interactive p-2">
                <Input
                  value={item.title}
                  onChange={(event) => updateItem(item.id, { title: event.target.value })}
                  className="mb-1 h-8 text-xs"
                />
                <div className="grid grid-cols-2 gap-1">
                  <Input
                    type="date"
                    value={item.startAt}
                    onChange={(event) => updateItem(item.id, { startAt: event.target.value })}
                    className="h-8 text-[11px]"
                  />
                  <Input
                    type="date"
                    value={item.endAt}
                    onChange={(event) => updateItem(item.id, { endAt: event.target.value })}
                    className="h-8 text-[11px]"
                  />
                </div>
                <Input
                  value={item.lane}
                  onChange={(event) => updateItem(item.id, { lane: event.target.value })}
                  className="mt-1 h-8 text-xs"
                />
              </div>
            ))}
            {items.length === 0 ? <p className="text-xs text-muted-foreground">No events yet.</p> : null}
          </div>
        </div>
      </aside>
    </div>
  )
}
