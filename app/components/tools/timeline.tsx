'use client';

import React, { useState, useCallback } from 'react';
import { Plus, Trash2, Edit2, Download, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface TimelineEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // ISO string
  color?: string;
}

interface TimelineProps {
  title?: string;
  initialEvents?: TimelineEvent[];
  onSave?: (events: TimelineEvent[]) => void;
}

const DEFAULT_COLORS = [
  '#7f8962', // sage
  '#d8956c', // tan
  '#6b9fbf', // ocean
  '#8b9b7f', // forest
  '#d9967f', // rose
];

export function Timeline({ title = 'Timeline', initialEvents = [], onSave }: TimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>(initialEvents);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<TimelineEvent | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  // Sort events by date
  const sortedEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const handleAddEvent = useCallback(() => {
    const newId = Math.random().toString(36).substr(2, 9);
    const newEvent: TimelineEvent = {
      id: newId,
      title: 'New Event',
      date: new Date().toISOString(),
      color: DEFAULT_COLORS[events.length % DEFAULT_COLORS.length],
    };
    const updated = [...events, newEvent];
    setEvents(updated);
    onSave?.(updated);
  }, [events, onSave]);

  const handleEdit = useCallback(
    (id: string, updates: Partial<TimelineEvent>) => {
      const updated = events.map((e) => (e.id === id ? { ...e, ...updates } : e));
      setEvents(updated);
      onSave?.(updated);
    },
    [events, onSave]
  );

  const handleRemove = useCallback(
    (id: string) => {
      const updated = events.filter((e) => e.id !== id);
      setEvents(updated);
      onSave?.(updated);
      setEditingId(null);
    },
    [events, onSave]
  );

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) return;

    const draggedIndex = events.findIndex((e) => e.id === draggedId);
    const targetIndex = events.findIndex((e) => e.id === targetId);

    if (draggedIndex === -1 || targetIndex === -1) return;

    const updated = [...events];
    const [draggedEvent] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, draggedEvent);

    setEvents(updated);
    onSave?.(updated);
    setDraggedId(null);
  };

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-4 py-3 bg-background rounded-lg border border-border">
        <h2 className="text-sm flex-1">{title}</h2>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleAddEvent}>
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Event
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const link = document.createElement('a');
              link.href = `data:application/json,${encodeURIComponent(JSON.stringify(events, null, 2))}`;
              link.download = 'timeline.json';
              link.click();
            }}
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Timeline Container */}
      <div className="flex-1 rounded-lg border border-border bg-background overflow-y-auto p-6">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-muted-foreground mb-3">No events yet. Add one to get started.</p>
            <Button size="sm" onClick={handleAddEvent}>
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Create Event
            </Button>
          </div>
        ) : (
          <div className="relative">
            {/* Center line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-muted-foreground/20 to-muted-foreground/5" />

            {/* Events */}
            <div className="space-y-8">
              {sortedEvents.map((event, idx) => (
                <div
                  key={event.id}
                  draggable
                  onDragStart={() => handleDragStart(event.id)}
                  onDragOver={handleDragOver}
                  onDrop={() => handleDrop(event.id)}
                  className={`flex gap-6 cursor-move transition-opacity ${
                    draggedId === event.id ? 'opacity-50' : 'opacity-100'
                  }`}
                >
                  {/* Timeline dot */}
                  <div className="relative flex flex-col items-center pt-1 shrink-0">
                    <div
                      className="w-4 h-4 rounded-full border-2 border-background shadow-lg relative z-10"
                      style={{ backgroundColor: event.color }}
                    />
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground/50 mt-2" />
                  </div>

                  {/* Event content */}
                  <div className="flex-1 pb-2">
                    {editingId === event.id ? (
                      <div className="space-y-3 p-4 rounded-lg bg-[hsl(var(--interactive-hover))] border border-border">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1">
                            Title
                          </label>
                          <input
                            type="text"
                            value={editData?.title || ''}
                            onChange={(e) =>
                              setEditData({ ...editData!, title: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-brand)]"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1">
                            Date
                          </label>
                          <input
                            type="datetime-local"
                            value={editData?.date ? new Date(editData.date).toISOString().slice(0, 16) : ''}
                            onChange={(e) =>
                              setEditData({
                                ...editData!,
                                date: new Date(e.target.value).toISOString(),
                              })
                            }
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-brand)]"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-muted-foreground block mb-1">
                            Description
                          </label>
                          <textarea
                            value={editData?.description || ''}
                            onChange={(e) =>
                              setEditData({ ...editData!, description: e.target.value })
                            }
                            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-brand)] resize-none"
                            rows={3}
                          />
                        </div>

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
                            onClick={() => {
                              if (editData) {
                                handleEdit(event.id, editData);
                                setEditingId(null);
                              }
                            }}
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div
                        className="group p-4 rounded-lg border border-border bg-background hover:bg-[hsl(var(--interactive-hover))] transition-colors"
                        onDoubleClick={() => {
                          setEditingId(event.id);
                          setEditData(event);
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <h3 className="font-medium text-sm text-foreground">
                              {event.title}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(event.date).toLocaleDateString('en-GB', {
                                weekday: 'short',
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                              {' at '}
                              {new Date(event.date).toLocaleTimeString('en-GB', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </p>
                            {event.description && (
                              <p className="text-xs text-foreground/70 mt-2 leading-relaxed">
                                {event.description}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <button
                              onClick={() => {
                                setEditingId(event.id);
                                setEditData(event);
                              }}
                              className="p-1.5 rounded hover:bg-[hsl(var(--interactive-hover))]"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                            </button>
                            <button
                              onClick={() => handleRemove(event.id)}
                              className="p-1.5 rounded hover:bg-destructive/10"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-destructive" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
