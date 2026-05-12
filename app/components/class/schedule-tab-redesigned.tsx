'use client';

import React, { useState } from 'react';
import { Plus, X, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ScheduleSlot = {
  id: string;
  day: string;
  time: string;
  duration: string;
  room?: string;
};

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const TIME_SLOTS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00'];

export function ScheduleTabRedesigned({ classId }: { classId: string }) {
  const [schedule, setSchedule] = useState<ScheduleSlot[]>([
    { id: '1', day: 'Monday', time: '09:00', duration: '60 min', room: '3A' },
    { id: '2', day: 'Monday', time: '11:00', duration: '60 min', room: '3A' },
    { id: '3', day: 'Wednesday', time: '10:00', duration: '60 min', room: '3A' },
    { id: '4', day: 'Friday', time: '09:00', duration: '60 min', room: '3A' },
  ]);

  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({ day: 'Monday', time: '09:00', duration: '60 min', room: '' });

  const handleAddSlot = () => {
    if (!formData.day || !formData.time) return;
    const newSlot: ScheduleSlot = {
      id: String(Math.random()),
      ...formData,
    };
    setSchedule([...schedule, newSlot]);
    setFormData({ day: 'Monday', time: '09:00', duration: '60 min', room: '' });
    setShowAddForm(false);
  };

  const handleDeleteSlot = (id: string) => {
    setSchedule(schedule.filter(s => s.id !== id));
  };

  const sortedSchedule = [...schedule].sort((a, b) => {
    const dayIndex = (d: string) => DAYS.indexOf(d);
    const dayCompare = dayIndex(a.day) - dayIndex(b.day);
    if (dayCompare !== 0) return dayCompare;
    return a.time.localeCompare(b.time);
  });

  return (
    <div className="p-4 space-y-4 h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Schedule</h2>
          <p className="text-sm text-muted-foreground">{schedule.length} sessions</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-background border border-border rounded-lg p-1">
            {(['grid', 'list'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
                  view === v
                    ? 'bg-[var(--accent-brand)] text-white'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {v === 'grid' ? 'Grid' : 'List'}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => setShowAddForm(!showAddForm)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="p-4 rounded-lg border border-border bg-[hsl(var(--interactive-hover))] space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Day</label>
              <select
                value={formData.day}
                onChange={e => setFormData({ ...formData, day: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-brand)]"
              >
                {DAYS.map(d => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Time</label>
              <select
                value={formData.time}
                onChange={e => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-brand)]"
              >
                {TIME_SLOTS.map(t => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Duration</label>
              <input
                type="text"
                value={formData.duration}
                onChange={e => setFormData({ ...formData, duration: e.target.value })}
                placeholder="60 min"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-brand)]"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">Room</label>
              <input
                type="text"
                value={formData.room}
                onChange={e => setFormData({ ...formData, room: e.target.value })}
                placeholder="e.g. 3A"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-brand)]"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddSlot} className="flex-1">
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAddForm(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Grid View */}
      {view === 'grid' && (
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left p-2 font-semibold text-xs text-muted-foreground">Time</th>
                {DAYS.map(day => (
                  <th key={day} className="text-center p-2 font-semibold text-xs text-muted-foreground">
                    {day.slice(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {TIME_SLOTS.map(time => (
                <tr key={time} className="border-b border-border hover:bg-[hsl(var(--interactive-hover))]">
                  <td className="p-2 font-medium text-xs bg-background">{time}</td>
                  {DAYS.map(day => {
                    const slot = schedule.find(s => s.day === day && s.time === time);
                    return (
                      <td key={`${day}-${time}`} className="p-2 text-center text-xs">
                        {slot ? (
                          <div className="bg-[var(--accent-brand)] text-white px-2 py-1 rounded text-xs font-medium">
                            {slot.room || 'Class'}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* List View */}
      {view === 'list' && (
        <div className="flex-1 space-y-2 overflow-y-auto pr-2">
          {sortedSchedule.map(slot => (
            <div
              key={slot.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-background hover:bg-[hsl(var(--interactive-hover))] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold">{slot.day}</span>
                  <span className="text-xs text-muted-foreground">{slot.time}</span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {slot.duration} {slot.room && `· Room ${slot.room}`}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={() => setEditingId(slot.id)}
                  className="p-1 text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--interactive-hover))] rounded transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteSlot(slot.id)}
                  className="p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
