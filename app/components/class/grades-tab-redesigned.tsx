'use client';

import React, { useState } from 'react';
import { Edit2, Save, X, History, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';

type GradeEntry = {
  id: string;
  studentName: string;
  grade: string;
  gradeType?: 'numeric' | 'letter'; // numeric: 1-10, letter: A-F, percentage: 0-100, custom
  lastModified?: string;
};

export function GradesTabRedesigned({ classId }: { classId: string }) {
  const [gradeSet, setGradeSet] = useState('Quiz 1: Photosynthesis');
  const [entries, setEntries] = useState<GradeEntry[]>([
    { id: '1', studentName: 'Alex Johnson', grade: '8.5', gradeType: 'numeric' },
    { id: '2', studentName: 'Sarah Smith', grade: '9.2', gradeType: 'numeric' },
    { id: '3', studentName: 'Emma Davis', grade: '7.0', gradeType: 'numeric' },
  ]);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [view, setView] = useState<'current' | 'history' | 'analytics'>('current');
  const [searchQuery, setSearchQuery] = useState('');

  const handleEditStart = (id: string, currentGrade: string) => {
    setEditingId(id);
    setEditValue(currentGrade);
  };

  const handleEditSave = (id: string) => {
    setEntries(prev =>
      prev.map(e =>
        e.id === id
          ? { ...e, grade: editValue, lastModified: new Date().toISOString() }
          : e
      )
    );
    setEditingId(null);
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditValue('');
  };

  const filtered = entries.filter(e =>
    e.studentName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate stats
  const numericGrades = entries
    .filter(e => e.gradeType === 'numeric')
    .map(e => parseFloat(e.grade))
    .filter(g => !isNaN(g));

  const average = numericGrades.length > 0
    ? (numericGrades.reduce((a, b) => a + b, 0) / numericGrades.length).toFixed(1)
    : null;

  const stats = {
    highest: numericGrades.length > 0 ? Math.max(...numericGrades).toFixed(1) : null,
    lowest: numericGrades.length > 0 ? Math.min(...numericGrades).toFixed(1) : null,
  };

  return (
    <div className="p-4 space-y-4 h-full flex flex-col">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">{gradeSet}</h2>
        <p className="text-sm text-muted-foreground">{entries.length} students graded</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 border-b border-border">
        {(['current', 'history', 'analytics'] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
              view === v
                ? 'border-[var(--accent-brand)] text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {v === 'current' ? 'Current' : v === 'history' ? 'History' : 'Analytics'}
          </button>
        ))}
        <button
          className="ml-auto px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground flex items-center gap-2"
          title="View Logs"
        >
          <History className="h-4 w-4" />
          Logs
        </button>
      </div>

      {/* Current Grades View */}
      {view === 'current' && (
        <div className="flex-1 space-y-3 overflow-y-auto">
          {/* Search */}
          <input
            type="text"
            placeholder="Search student..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-brand)]"
          />

          {/* Grade Entries */}
          {filtered.map(entry => (
            <div
              key={entry.id}
              className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-background hover:bg-[hsl(var(--interactive-hover))] transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{entry.studentName}</p>
              </div>

              {editingId === entry.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editValue}
                    onChange={e => setEditValue(e.target.value)}
                    autoFocus
                    className="w-20 px-2 py-1 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-brand)]"
                    placeholder="Grade..."
                  />
                  <button
                    onClick={() => handleEditSave(entry.id)}
                    className="p-1 text-green-600 hover:bg-green-50 rounded transition-colors"
                  >
                    <Save className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleEditCancel}
                    className="p-1 text-muted-foreground hover:bg-[hsl(var(--interactive-hover))] rounded transition-colors"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground min-w-[3rem] text-right">
                    {entry.grade}
                  </span>
                  <button
                    onClick={() => handleEditStart(entry.id, entry.grade)}
                    className="p-1 text-muted-foreground hover:text-foreground hover:bg-[hsl(var(--interactive-hover))] rounded transition-colors"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* History View */}
      {view === 'history' && (
        <div className="flex-1 space-y-3 overflow-y-auto">
          <div className="text-sm text-muted-foreground space-y-2">
            {entries
              .filter(e => e.lastModified)
              .map(e => (
                <div key={e.id} className="flex justify-between p-2 rounded bg-background border border-border">
                  <span>{e.studentName}</span>
                  <span className="font-medium">{e.grade}</span>
                  {e.lastModified && (
                    <span className="text-xs">{new Date(e.lastModified).toLocaleString()}</span>
                  )}
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Analytics View */}
      {view === 'analytics' && (
        <div className="flex-1 space-y-4">
          {/* Stats Cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-xs text-muted-foreground mb-1">Average</p>
              <p className="text-xl font-semibold">{average || '—'}</p>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-xs text-muted-foreground mb-1">Highest</p>
              <p className="text-xl font-semibold">{stats.highest || '—'}</p>
            </div>
            <div className="p-3 rounded-lg bg-background border border-border">
              <p className="text-xs text-muted-foreground mb-1">Lowest</p>
              <p className="text-xl font-semibold">{stats.lowest || '—'}</p>
            </div>
          </div>

          {/* Grade Distribution */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-3 uppercase">Distribution</p>
            <div className="space-y-2">
              {[
                { range: '8.5+', count: entries.filter(e => parseFloat(e.grade) >= 8.5).length },
                { range: '7-8.4', count: entries.filter(e => {const g = parseFloat(e.grade); return g >= 7 && g < 8.5;}).length },
                { range: '5.5-6.9', count: entries.filter(e => {const g = parseFloat(e.grade); return g >= 5.5 && g < 7;}).length },
                { range: '<5.5', count: entries.filter(e => parseFloat(e.grade) < 5.5).length },
              ].map(bucket => (
                <div key={bucket.range} className="flex items-center gap-2">
                  <span className="text-xs w-12">{bucket.range}</span>
                  <div className="flex-1 h-6 bg-background border border-border rounded overflow-hidden">
                    <div
                      className="h-full bg-[var(--accent-brand)]"
                      style={{ width: `${(bucket.count / entries.length) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs w-4 text-right">{bucket.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
