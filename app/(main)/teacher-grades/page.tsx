'use client';

import { useState, useEffect } from 'react';
import { Plus, Download, Filter, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

type GradeSet = {
  id: string;
  title: string;
  className: string;
  status: 'draft' | 'published';
  gradedCount: number;
  totalCount: number;
  createdAt: string;
};

export default function TeacherGradesPage() {
  const [gradeSets, setGradeSets] = useState<GradeSet[]>([
    { id: '1', title: 'Quiz 1: Photosynthesis', className: 'Biology 3A', status: 'published', gradedCount: 28, totalCount: 30, createdAt: '2026-05-10' },
    { id: '2', title: 'Test 1: Ecosystems', className: 'Biology 3A', status: 'draft', gradedCount: 15, totalCount: 30, createdAt: '2026-05-12' },
    { id: '3', title: 'Assignment 2: Calculations', className: 'Math 2B', status: 'published', gradedCount: 25, totalCount: 25, createdAt: '2026-05-09' },
  ]);

  const [view, setView] = useState<'overview' | 'manage'>('overview');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [selectedSet, setSelectedSet] = useState<GradeSet | null>(null);
  const [editMode, setEditMode] = useState(false);

  const classes = [...new Set(gradeSets.map(g => g.className))];

  const filtered = filterClass === 'all'
    ? gradeSets
    : gradeSets.filter(g => g.className === filterClass);

  return (
    <div className="page-content max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Grading</h1>
          <p className="page-subtitle mt-0.5">{gradeSets.length} grade sets</p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Create Grade Set
        </Button>
      </div>

      {selectedSet ? (
        // Grade Set Detail View
        <div className="space-y-4">
          {/* Back Button */}
          <button
            onClick={() => {
              setSelectedSet(null);
              setEditMode(false);
            }}
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            ← Back to Grade Sets
          </button>

          {/* Set Header */}
          <div className="rounded-lg border border-border p-4 bg-background">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">{selectedSet.title}</h2>
                <p className="text-sm text-muted-foreground">{selectedSet.className}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditMode(!editMode)}>
                  {editMode ? 'Done' : 'Edit Grades'}
                </Button>
                <Button size="sm" variant="outline">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Progress */}
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-muted-foreground">Graded</span>
                <span className="font-medium">{selectedSet.gradedCount}/{selectedSet.totalCount}</span>
              </div>
              <div className="w-full h-2 bg-background border border-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--accent-brand)]"
                  style={{ width: `${(selectedSet.gradedCount / selectedSet.totalCount) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* View Tabs */}
          <div className="flex gap-1.5 border-b border-border">
            {(['overview', 'manage'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  view === v
                    ? 'border-[var(--accent-brand)] text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                {v === 'overview' ? 'Overview' : 'Manage Grades'}
              </button>
            ))}
          </div>

          {/* Overview Tab */}
          {view === 'overview' && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-3">
                <div className="p-3 rounded-lg border border-border bg-background">
                  <p className="text-xs text-muted-foreground mb-1">Average</p>
                  <p className="text-xl font-semibold">7.8</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-background">
                  <p className="text-xs text-muted-foreground mb-1">Highest</p>
                  <p className="text-xl font-semibold">9.8</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-background">
                  <p className="text-xs text-muted-foreground mb-1">Lowest</p>
                  <p className="text-xl font-semibold">4.2</p>
                </div>
                <div className="p-3 rounded-lg border border-border bg-background">
                  <p className="text-xs text-muted-foreground mb-1">Pending</p>
                  <p className="text-xl font-semibold">{selectedSet.totalCount - selectedSet.gradedCount}</p>
                </div>
              </div>

              {/* Distribution */}
              <div className="p-4 rounded-lg border border-border bg-background">
                <p className="text-sm font-semibold mb-3">Grade Distribution</p>
                <div className="space-y-2">
                  {[
                    { range: '8.5+', count: 8, color: 'bg-green-600' },
                    { range: '7-8.4', count: 12, color: 'bg-[var(--accent-brand)]' },
                    { range: '5.5-6.9', count: 6, color: 'bg-amber-600' },
                    { range: '<5.5', count: 2, color: 'bg-red-600' },
                  ].map(bucket => (
                    <div key={bucket.range} className="flex items-center gap-2">
                      <span className="text-xs w-12">{bucket.range}</span>
                      <div className="flex-1 h-6 bg-background border border-border rounded overflow-hidden">
                        <div
                          className={bucket.color}
                          style={{ width: `${(bucket.count / 28) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs w-4 text-right font-medium">{bucket.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Manage Grades Tab */}
          {view === 'manage' && (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {[
                { name: 'Alex Johnson', grade: '8.5' },
                { name: 'Sarah Smith', grade: '9.2' },
                { name: 'Emma Davis', grade: '7.0' },
                { name: 'John Brown', grade: '—' },
              ].map(student => (
                <div key={student.name} className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-background hover:bg-[hsl(var(--interactive-hover))] transition-colors">
                  <span className="text-sm font-medium">{student.name}</span>
                  {editMode ? (
                    <input
                      type="text"
                      defaultValue={student.grade}
                      className="w-20 px-2 py-1 border border-border rounded text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-brand)]"
                      placeholder="Grade"
                    />
                  ) : (
                    <span className="text-sm font-semibold text-right w-12">{student.grade}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        // Grade Sets List View
        <>
          {/* Filter */}
          {classes.length > 1 && (
            <div className="flex gap-1.5">
              <button
                onClick={() => setFilterClass('all')}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                  filterClass === 'all'
                    ? 'bg-[var(--accent-brand)] border-[var(--accent-brand)] text-white'
                    : 'bg-transparent border-border text-muted-foreground hover:border-[var(--accent-brand)]'
                }`}
              >
                All Classes
              </button>
              {classes.map(c => (
                <button
                  key={c}
                  onClick={() => setFilterClass(c)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    filterClass === c
                      ? 'bg-[var(--accent-brand)] border-[var(--accent-brand)] text-white'
                      : 'bg-transparent border-border text-muted-foreground hover:border-[var(--accent-brand)]'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}

          {/* Grade Sets List */}
          <div className="space-y-3">
            {filtered.map(set => (
              <div
                key={set.id}
                onClick={() => setSelectedSet(set)}
                className="p-4 rounded-lg border border-border bg-background hover:bg-[hsl(var(--interactive-hover))] cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold">{set.title}</h3>
                    <p className="text-xs text-muted-foreground">{set.className}</p>
                  </div>
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      set.status === 'published'
                        ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                    }`}
                  >
                    {set.status === 'published' ? 'Published' : 'Draft'}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">Graded</span>
                      <span className="font-medium">{set.gradedCount}/{set.totalCount}</span>
                    </div>
                    <div className="w-full h-1.5 bg-background border border-border rounded overflow-hidden">
                      <div
                        className="h-full bg-[var(--accent-brand)]"
                        style={{ width: `${(set.gradedCount / set.totalCount) * 100}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground ml-3 whitespace-nowrap">
                    {new Date(set.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
