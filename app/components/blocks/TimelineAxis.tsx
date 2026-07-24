'use client';

import React, { useMemo, useState } from 'react';

export interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  description?: string;
}

export interface TimelineData {
  startLabel: string;
  startDate: string;
  endLabel: string;
  endDate: string;
  events: TimelineEvent[];
}

interface PositionedEvent extends TimelineEvent {
  percent: number;
  side: 'top' | 'bottom';
}

// Dates can be real ISO dates or free text ("44 BC", "Steentijd") -- fall back
// to even spacing by array order whenever Date.parse can't make sense of them,
// rather than clumping everything unparseable at position 0.
function toTimeValue(dateStr: string, fallbackIndex: number, fallbackCount: number): number {
  const parsed = Date.parse(dateStr);
  if (!Number.isNaN(parsed)) return parsed;
  return fallbackCount > 1 ? fallbackIndex / (fallbackCount - 1) : 0;
}

// Rough pixel width estimate from title length, just enough to decide whether
// two neighboring pills on the same side would visually collide -- doesn't
// need to be exact, only good enough to avoid the common case.
function estimateWidth(title: string): number {
  return Math.max(40, title.length * 6.2 + 20);
}

function computeLayout(data: TimelineData): PositionedEvent[] {
  const events = data.events || [];
  const startTime = toTimeValue(data.startDate, 0, events.length + 2);
  const endTime = toTimeValue(data.endDate, events.length + 1, events.length + 2);
  const span = endTime - startTime || 1;

  const withTime = events.map((e, i) => ({
    ...e,
    time: toTimeValue(e.date, i + 1, events.length + 2),
  }));
  withTime.sort((a, b) => a.time - b.time);

  let lastRange: { top: [number, number] | null; bottom: [number, number] | null } = { top: null, bottom: null };
  let preferTop = true;
  const positioned: PositionedEvent[] = withTime.map((e) => {
    const percent = Math.min(100, Math.max(0, ((e.time - startTime) / span) * 100));
    const halfWidthPct = (estimateWidth(e.title) / 2 / 6) ; // rough px->% fudge for a ~600px-wide axis
    const range: [number, number] = [percent - halfWidthPct, percent + halfWidthPct];

    const fits = (side: 'top' | 'bottom') => {
      const last = lastRange[side];
      if (!last) return true;
      return range[0] > last[1];
    };

    let side: 'top' | 'bottom' = preferTop ? 'top' : 'bottom';
    if (!fits(side)) side = side === 'top' ? 'bottom' : 'top';
    lastRange[side] = range;
    preferTop = !preferTop;

    return { ...e, percent, side };
  });

  return positioned;
}

export function TimelineAxis({
  data,
  editable = false,
  onEventClick,
}: {
  data: TimelineData;
  editable?: boolean;
  onEventClick?: (event: TimelineEvent) => void;
}) {
  const positioned = useMemo(() => computeLayout(data), [data]);
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="relative pt-10 pb-10 px-4">
      <div className="relative h-0.5 bg-border">
        <div className="absolute -left-1 -top-2.5 h-6 w-1 rounded-full bg-foreground" />
        <div className="absolute -right-1 -top-2.5 h-6 w-1 rounded-full bg-foreground" />

        {positioned.map((event) => (
          <div
            key={event.id}
            className="absolute -translate-x-1/2"
            style={{ left: `${event.percent}%`, [event.side === 'top' ? 'bottom' : 'top']: '2px' } as React.CSSProperties}
          >
            <div className={cnFlex(event.side)}>
              {event.side === 'bottom' && <span className="block h-3 w-px bg-border mx-auto" />}
              <button
                type="button"
                onClick={() => {
                  setOpenId(openId === event.id ? null : event.id);
                  onEventClick?.(event);
                }}
                className="whitespace-nowrap rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium hover:border-accent-brand transition-colors"
              >
                {event.title || (editable ? 'Untitled event' : '')}
              </button>
              {event.side === 'top' && <span className="block h-3 w-px bg-border mx-auto" />}
            </div>
            {openId === event.id && (event.description || editable) && (
              <div className="absolute left-1/2 -translate-x-1/2 mt-1 w-56 rounded-md border border-border bg-popover p-2 text-xs text-popover-foreground shadow-md z-10" style={event.side === 'top' ? { top: '100%' } : { bottom: '100%', marginBottom: '4px' }}>
                {event.description || <span className="text-muted-foreground">No description yet.</span>}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <div>
          <div className="font-semibold text-foreground">{data.startLabel || (editable ? 'Start' : '')}</div>
          <div>{data.startDate}</div>
        </div>
        <div className="text-right">
          <div className="font-semibold text-foreground">{data.endLabel || (editable ? 'End' : '')}</div>
          <div>{data.endDate}</div>
        </div>
      </div>
    </div>
  );
}

function cnFlex(side: 'top' | 'bottom') {
  return side === 'top' ? 'flex flex-col items-center' : 'flex flex-col-reverse items-center';
}
