'use client';

import { useMemo, useState } from 'react';
import type { CanonicalDocument } from '@/lib/tools/canonical-model';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

type Props = {
  document: CanonicalDocument;
  onChange: (nextDocument: CanonicalDocument) => void;
  settings?: {
    rangeStartYear?: number;
    rangeEndYear?: number;
    scaleMode?: 'year' | 'month' | 'day' | 'log';
  };
};

type TimelineItem = {
  id: string;
  title: string;
  body: string;
  startAt: string;
  endAt: string;
  lane: string;
};

function toDate(iso: string) {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toIsoDate(ms: number) {
  const date = new Date(ms);
  const year = date.getUTCFullYear();
  const month = `${date.getUTCMonth() + 1}`.padStart(2, '0');
  const day = `${date.getUTCDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function TimelineBoard({ document, onChange, settings }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [displayMode, setDisplayMode] = useState<'auto' | 'year' | 'month' | 'custom'>('auto');
  const [customMode, setCustomMode] = useState<'date' | 'month' | 'text'>('date');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [customStartMonth, setCustomStartMonth] = useState('');
  const [customEndMonth, setCustomEndMonth] = useState('');
  const [customQuery, setCustomQuery] = useState('');
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newStart, setNewStart] = useState('');
  const [newEnd, setNewEnd] = useState('');
  const [newLane, setNewLane] = useState('General');
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const items = useMemo<TimelineItem[]>(() => {
    const nodeById = new Map(document.nodes.map((node) => [node.id, node]));
    return document.temporal
      .map((entry) => {
        const node = nodeById.get(entry.nodeId);
        if (!node) return null;
        return {
          id: node.id,
          title: node.title,
          body: node.body || '',
          startAt: entry.startAt || '',
          endAt: entry.endAt || entry.startAt || '',
          lane: node.tags?.[0] || 'General',
        };
      })
      .filter((item): item is TimelineItem => Boolean(item))
      .filter((item) => item.startAt)
      .sort((a, b) => String(a.startAt).localeCompare(String(b.startAt)));
  }, [document.nodes, document.temporal]);

  const filtered = useMemo(() => {
    const startFromSettings = settings?.rangeStartYear ? `${settings.rangeStartYear}-01-01` : '';
    const endFromSettings = settings?.rangeEndYear ? `${settings.rangeEndYear}-12-31` : '';
    const monthStartIso = customStartMonth ? `${customStartMonth}-01` : '';
    const monthEndIso = customEndMonth ? `${customEndMonth}-31` : '';
    const customMinIso =
      customMode === 'month'
        ? monthStartIso
        : customMode === 'date'
          ? customStart
          : '';
    const customMaxIso =
      customMode === 'month'
        ? monthEndIso
        : customMode === 'date'
          ? customEnd
          : '';
    const minIso = displayMode === 'custom' ? customMinIso || startFromSettings : startFromSettings;
    const maxIso = displayMode === 'custom' ? customMaxIso || endFromSettings : endFromSettings;
    const minMs = minIso ? toDate(minIso)?.getTime() ?? null : null;
    const maxMs = maxIso ? toDate(maxIso)?.getTime() ?? null : null;
    return items.filter((item) => {
      if (displayMode === 'custom' && customMode === 'text' && customQuery.trim()) {
        const haystack = `${item.title} ${item.body} ${item.lane}`.toLowerCase();
        if (!haystack.includes(customQuery.trim().toLowerCase())) return false;
      }
      const ms = toDate(item.startAt)?.getTime();
      if (ms == null) return false;
      if (minMs != null && ms < minMs) return false;
      if (maxMs != null && ms > maxMs) return false;
      return true;
    });
  }, [customEnd, customEndMonth, customMode, customQuery, customStart, customStartMonth, displayMode, items, settings?.rangeEndYear, settings?.rangeStartYear]);

  const range = useMemo(() => {
    if (filtered.length === 0) {
      const now = Date.now();
      return { min: now - 86400000, max: now + 86400000 };
    }
    const allTimes = filtered
      .map((item) => toDate(item.startAt)?.getTime())
      .filter((value): value is number => typeof value === 'number');
    const min = Math.min(...allTimes);
    const max = Math.max(...allTimes);
    return { min, max: Math.max(max, min + 86400000) };
  }, [filtered]);

  const effectiveScale = useMemo(() => {
    if (displayMode === 'year') return 'year';
    if (displayMode === 'month') return 'month';
    if (displayMode === 'custom') return settings?.scaleMode === 'month' ? 'month' : 'year';
    const spanDays = (range.max - range.min) / 86400000;
    if (spanDays <= 120) return 'day';
    if (spanDays <= 900) return 'month';
    return 'year';
  }, [displayMode, range.max, range.min, settings?.scaleMode]);

  const placed = useMemo(() => {
    const span = Math.max(1, range.max - range.min);
    const TRACK_MIN_WIDTH_PX = 980;
    const CARD_WIDTH_PX = 230;
    const COLLISION_GAP_PX = 18;
    const CARD_WIDTH_PCT = (CARD_WIDTH_PX / TRACK_MIN_WIDTH_PX) * 100;
    const GAP_PCT = (COLLISION_GAP_PX / TRACK_MIN_WIDTH_PX) * 100;
    const upRows: number[] = [];
    const downRows: number[] = [];

    const nextRowForLeft = (rows: number[], left: number) => {
      for (let i = 0; i < rows.length; i += 1) {
        if (left >= rows[i] + GAP_PCT) {
          rows[i] = left + CARD_WIDTH_PCT;
          return i;
        }
      }
      rows.push(left + CARD_WIDTH_PCT);
      return rows.length - 1;
    };

    return filtered.map((item, index) => {
      const t = toDate(item.startAt)?.getTime() ?? range.min;
      const markerX = ((t - range.min) / span) * 100;
      const clampedX = Math.max(CARD_WIDTH_PCT / 2, Math.min(100 - CARD_WIDTH_PCT / 2, markerX));
      const left = clampedX - CARD_WIDTH_PCT / 2;
      const side = index % 2 === 0 ? 'up' : 'down';
      const row = side === 'up' ? nextRowForLeft(upRows, left) : nextRowForLeft(downRows, left);
      return { ...item, markerX, cardX: clampedX, side, row };
    });
  }, [filtered, range.max, range.min]);

  const selected = placed.find((item) => item.id === selectedId) || null;

  const effectiveRangeLabel = useMemo(() => {
    if (displayMode !== 'custom') return 'Auto range';
    if (customMode === 'text' && customQuery.trim()) return `Filtered by "${customQuery.trim()}"`;
    if (customMode === 'month' && (customStartMonth || customEndMonth)) {
      return `${customStartMonth || '...'} -> ${customEndMonth || '...'}`;
    }
    if (customStart || customEnd) return `${customStart || '...'} -> ${customEnd || '...'}`;
    return 'Custom range';
  }, [customEnd, customEndMonth, customMode, customQuery, customStart, customStartMonth, displayMode]);

  const upsertNode = (nodeId: string, patch: Partial<{ title: string; body: string; lane: string; startAt: string; endAt: string }>) => {
    const nextNodes = document.nodes.map((node) =>
      node.id === nodeId
        ? {
            ...node,
            ...(patch.title !== undefined ? { title: patch.title } : {}),
            ...(patch.body !== undefined ? { body: patch.body } : {}),
            ...(patch.lane !== undefined ? { tags: [patch.lane] } : {}),
          }
        : node
    );
    const hasTemporal = document.temporal.some((entry) => entry.nodeId === nodeId);
    const nextTemporal = hasTemporal
      ? document.temporal.map((entry) =>
          entry.nodeId === nodeId
            ? {
                ...entry,
                ...(patch.startAt ? { startAt: patch.startAt } : {}),
                ...(patch.endAt ? { endAt: patch.endAt } : {}),
                precision: effectiveScale,
              }
            : entry
        )
      : [
          ...document.temporal,
          {
            nodeId,
            startAt: patch.startAt || toIsoDate(Date.now()),
            endAt: patch.endAt || patch.startAt || toIsoDate(Date.now()),
            precision: effectiveScale,
          },
        ];
    onChange({ ...document, nodes: nextNodes, temporal: nextTemporal });
  };

  const addEvent = () => {
    if (!newTitle.trim() || !newStart) return;
    const id = `timeline-${Date.now()}`;
    const nextNodes = [...document.nodes, { id, type: 'event', title: newTitle.trim(), body: newBody.trim(), tags: [newLane || 'General'] }];
    const nextEdges = [...document.edges, { id: `edge-root-${id}`, from: 'root-notes', to: id, relation: 'contains' as const }];
    const nextTemporal = [...document.temporal, { nodeId: id, startAt: newStart, endAt: newEnd || newStart, precision: effectiveScale }];
    onChange({ ...document, nodes: nextNodes, edges: nextEdges, temporal: nextTemporal });
    setSelectedId(id);
    setNewTitle('');
    setNewBody('');
    setNewStart('');
    setNewEnd('');
  };

  const dragToDate = (clientX: number, host: HTMLDivElement, item: TimelineItem) => {
    const rect = host.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const span = Math.max(1, range.max - range.min);
    const nextStartMs = range.min + pct * span;
    const oldStartMs = toDate(item.startAt)?.getTime() ?? nextStartMs;
    const oldEndMs = toDate(item.endAt)?.getTime() ?? oldStartMs;
    const duration = Math.max(0, oldEndMs - oldStartMs);
    upsertNode(item.id, {
      startAt: toIsoDate(nextStartMs),
      endAt: toIsoDate(nextStartMs + duration),
    });
  };

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="rounded-2xl border surface-panel p-4">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant={isEditMode ? 'default' : 'outline'} onClick={() => setIsEditMode((v) => !v)}>
            {isEditMode ? 'Edit mode on' : 'Edit mode off'}
          </Button>
          <Button type="button" size="sm" variant={displayMode === 'auto' ? 'default' : 'outline'} onClick={() => setDisplayMode('auto')}>Auto</Button>
          <Button type="button" size="sm" variant={displayMode === 'year' ? 'default' : 'outline'} onClick={() => setDisplayMode('year')}>Year</Button>
          <Button type="button" size="sm" variant={displayMode === 'month' ? 'default' : 'outline'} onClick={() => setDisplayMode('month')}>Month</Button>
          <Button type="button" size="sm" variant={displayMode === 'custom' ? 'default' : 'outline'} onClick={() => setDisplayMode('custom')}>Custom range</Button>
          <span className="rounded-full surface-interactive px-2 py-0.5 text-xs text-muted-foreground">{effectiveRangeLabel}</span>
          {isEditMode ? <span className="text-xs text-muted-foreground">Drag event dots to reorder by date.</span> : null}
        </div>

        {displayMode === 'custom' ? (
          <div className="mb-3 space-y-2">
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant={customMode === 'date' ? 'default' : 'outline'} onClick={() => setCustomMode('date')}>Date to date</Button>
              <Button type="button" size="sm" variant={customMode === 'month' ? 'default' : 'outline'} onClick={() => setCustomMode('month')}>Month to month</Button>
              <Button type="button" size="sm" variant={customMode === 'text' ? 'default' : 'outline'} onClick={() => setCustomMode('text')}>Custom text</Button>
            </div>
            {customMode === 'date' ? (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
              </div>
            ) : null}
            {customMode === 'month' ? (
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <Input type="month" value={customStartMonth} onChange={(e) => setCustomStartMonth(e.target.value)} />
                <Input type="month" value={customEndMonth} onChange={(e) => setCustomEndMonth(e.target.value)} />
              </div>
            ) : null}
            {customMode === 'text' ? (
              <Input value={customQuery} onChange={(e) => setCustomQuery(e.target.value)} placeholder="Filter events by title, lane, or description" />
            ) : null}
          </div>
        ) : null}

        <div className="relative min-h-[460px] overflow-x-auto rounded-xl border border-border/70 p-4">
          <div data-timeline-track className="relative mx-auto h-[420px] min-w-[980px]">
            <div className="absolute left-0 right-0 top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-gradient-to-r from-sky-400 via-emerald-400 to-orange-400" />
            <p className="absolute left-0 top-[56%] rounded-full surface-panel px-2 py-0.5 text-[10px] text-muted-foreground">{toIsoDate(range.min)}</p>
            <p className="absolute right-0 top-[56%] rounded-full surface-panel px-2 py-0.5 text-[10px] text-muted-foreground">{toIsoDate(range.max)}</p>

            {placed.map((item) => {
              const isSelected = selectedId === item.id;
              const stemHeight = 88 + item.row * 44;
              const isUp = item.side === 'up';
              return (
                <div key={item.id} className="absolute top-1/2 -translate-y-1/2" style={{ left: `${item.markerX}%` }}>
                  <button
                    type="button"
                    className={`absolute left-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 shadow-sm ${isSelected ? 'bg-foreground' : 'bg-background'} border-foreground ${isEditMode ? 'cursor-ew-resize' : ''}`}
                    onClick={() => setSelectedId(item.id)}
                    title={item.title}
                    onPointerDown={(event) => {
                      if (!isEditMode) return;
                      const host = event.currentTarget.closest('[data-timeline-track]') as HTMLDivElement | null;
                      if (!host) return;
                      event.currentTarget.setPointerCapture(event.pointerId);
                      setDraggingId(item.id);
                      dragToDate(event.clientX, host, item);
                    }}
                    onPointerMove={(event) => {
                      if (!isEditMode || draggingId !== item.id) return;
                      const host = event.currentTarget.closest('[data-timeline-track]') as HTMLDivElement | null;
                      if (!host) return;
                      dragToDate(event.clientX, host, item);
                    }}
                    onPointerUp={(event) => {
                      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                        event.currentTarget.releasePointerCapture(event.pointerId);
                      }
                      setDraggingId(null);
                    }}
                  />
                  <div className="absolute left-1/2 w-[2px] -translate-x-1/2 bg-foreground/85" style={isUp ? { bottom: '50%', height: `${stemHeight}px` } : { top: '50%', height: `${stemHeight}px` }} />
                  <button
                    type="button"
                    className={`absolute left-1/2 w-[230px] -translate-x-1/2 rounded-xl border px-2.5 py-2 text-left text-xs shadow-sm ${isSelected ? 'surface-chip border-foreground/30' : 'surface-panel border-border'}`}
                    style={isUp ? { left: `${item.cardX - item.markerX}%`, bottom: `calc(50% + ${stemHeight + 8}px)` } : { left: `${item.cardX - item.markerX}%`, top: `calc(50% + ${stemHeight + 8}px)` }}
                    onClick={() => setSelectedId(item.id)}
                  >
                    <p className="truncate">
                      <span className="rounded-full bg-foreground text-background px-1.5 py-0.5 text-[10px] font-medium">{item.title}</span>
                    </p>
                    <p className="truncate text-muted-foreground">{item.startAt}{item.endAt && item.endAt !== item.startAt ? ` -> ${item.endAt}` : ''}</p>
                    <p className="mt-1 inline-flex rounded-full surface-interactive px-1.5 py-0.5 text-[10px] text-muted-foreground">{item.lane}</p>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <aside className="rounded-2xl border surface-panel p-4 space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm">Add event</h3>
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Title" className="h-8 text-sm" />
          <Textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} placeholder="Description" className="min-h-[74px] text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">Start</Label>
              <Input type="date" value={newStart} onChange={(e) => setNewStart(e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">End</Label>
              <Input type="date" value={newEnd} onChange={(e) => setNewEnd(e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <Input value={newLane} onChange={(e) => setNewLane(e.target.value)} placeholder="Group (optional)" className="h-8 text-sm" />
          <Button size="sm" onClick={addEvent} disabled={!newTitle.trim() || !newStart}>Add event</Button>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm">Selected event</h3>
          {!selected ? (
            <p className="text-xs text-muted-foreground">Click an event on the timeline.</p>
          ) : (
            <div className="space-y-2 rounded-md surface-interactive p-2">
              {isEditMode ? (
                <>
                  <Input value={selected.title} onChange={(e) => upsertNode(selected.id, { title: e.target.value })} className="h-8 text-sm" />
                  <Textarea value={selected.body} onChange={(e) => upsertNode(selected.id, { body: e.target.value })} className="min-h-[80px] text-sm" />
                  <div className="grid grid-cols-2 gap-1">
                    <Input type="date" value={selected.startAt} onChange={(e) => upsertNode(selected.id, { startAt: e.target.value })} className="h-8 text-xs" />
                    <Input type="date" value={selected.endAt} onChange={(e) => upsertNode(selected.id, { endAt: e.target.value })} className="h-8 text-xs" />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium">{selected.title}</p>
                  <p className="text-xs text-muted-foreground">{selected.startAt}{selected.endAt && selected.endAt !== selected.startAt ? ` -> ${selected.endAt}` : ''}</p>
                  <p className="text-sm whitespace-pre-wrap">{selected.body || 'No description yet.'}</p>
                </>
              )}
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
