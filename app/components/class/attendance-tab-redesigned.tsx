'use client';

import React, { useState, useEffect } from 'react';
import { ChevronRight, Filter, Download, History } from 'lucide-react';
import { Button } from '@/components/ui/button';

type AttendanceStatus = 'present' | 'absent' | 'missing-material';
type StudentAttendance = {
  id: string;
  name: string;
  status: AttendanceStatus;
  notes?: string;
  lastModified?: string;
};

export function AttendanceTabRedesigned({ classId }: { classId: string }) {
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'absent' | 'missing-material'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showLogs, setShowLogs] = useState(false);

  useEffect(() => {
    // Mock load students
    const mockStudents: StudentAttendance[] = [
      { id: '1', name: 'Alex Johnson', status: 'present', notes: '' },
      { id: '2', name: 'Sarah Smith', status: 'present', notes: '' },
      { id: '3', name: 'Emma Davis', status: 'absent', notes: 'Sick' },
      { id: '4', name: 'John Brown', status: 'missing-material', notes: 'Forgot assignment' },
    ];
    setStudents(mockStudents);
    setLoading(false);
  }, [classId]);

  const handleStatusChange = (studentId: string, newStatus: AttendanceStatus) => {
    setStudents(prev =>
      prev.map(s =>
        s.id === studentId
          ? { ...s, status: newStatus, lastModified: new Date().toISOString() }
          : s
      )
    );
    // Log to database will happen here
  };

  const filtered = students.filter(s => {
    const matchesFilter = filter === 'all' || s.status === filter;
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const stats = {
    present: students.filter(s => s.status === 'present').length,
    absent: students.filter(s => s.status === 'absent').length,
    missingMaterial: students.filter(s => s.status === 'missing-material').length,
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="space-y-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Attendance</h2>
          <p className="text-sm text-muted-foreground">
            {students.length} students · {stats.present} present · {stats.absent} absent
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowLogs(!showLogs)}
            className="gap-2"
          >
            <History className="h-4 w-4" />
            Logs
          </Button>
          <Button size="sm" variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex gap-3">
        <input
          type="text"
          placeholder="Search students..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-brand)]"
        />
        <div className="flex gap-1.5">
          {(['all', 'present', 'absent', 'missing-material'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f === 'present' ? 'all' : f)}
              className={`px-3 py-2 text-xs font-medium rounded-lg border transition-colors ${
                (f === 'present' && filter === 'all') || filter === f
                  ? 'bg-[var(--accent-brand)] text-white border-[var(--accent-brand)]'
                  : 'bg-background text-muted-foreground border-border hover:border-[var(--accent-brand)]'
              }`}
            >
              {f === 'all' ? 'All' : f === 'missing-material' ? 'Missing' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Students List */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {filtered.map(student => (
          <div
            key={student.id}
            className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border bg-background hover:bg-[hsl(var(--interactive-hover))] transition-colors"
          >
            {/* Name */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{student.name}</p>
              {student.notes && (
                <p className="text-xs text-muted-foreground">{student.notes}</p>
              )}
            </div>

            {/* Status Buttons */}
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => handleStatusChange(student.id, 'present')}
                className={`w-10 h-10 rounded-lg border-2 font-semibold text-sm transition-all flex items-center justify-center ${
                  student.status === 'present'
                    ? 'border-green-600 bg-green-50 text-green-700'
                    : 'border-border bg-background text-muted-foreground hover:border-green-600'
                }`}
                title="Present"
              >
                ✓
              </button>
              <button
                onClick={() => handleStatusChange(student.id, 'absent')}
                className={`w-10 h-10 rounded-lg border-2 font-semibold text-sm transition-all flex items-center justify-center ${
                  student.status === 'absent'
                    ? 'border-red-600 bg-red-50 text-red-700'
                    : 'border-border bg-background text-muted-foreground hover:border-red-600'
                }`}
                title="Absent"
              >
                ✕
              </button>
              <button
                onClick={() => handleStatusChange(student.id, 'missing-material')}
                className={`w-10 h-10 rounded-lg border-2 font-semibold text-sm transition-all flex items-center justify-center ${
                  student.status === 'missing-material'
                    ? 'border-amber-600 bg-amber-50 text-amber-700'
                    : 'border-border bg-background text-muted-foreground hover:border-amber-600'
                }`}
                title="Missing Material"
              >
                !
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Logs Modal/Section */}
      {showLogs && (
        <div className="mt-6 p-4 rounded-lg border border-border bg-[hsl(var(--interactive-hover))]">
          <h3 className="text-sm font-semibold mb-3">Attendance Logs</h3>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {students
              .filter(s => s.lastModified)
              .map(s => (
                <div key={s.id} className="text-xs text-muted-foreground flex justify-between">
                  <span>{s.name}</span>
                  <span>
                    {s.status === 'present' ? '✓ Present' : s.status === 'absent' ? '✕ Absent' : '! Missing'}
                  </span>
                  {s.lastModified && <span>{new Date(s.lastModified).toLocaleTimeString()}</span>}
                </div>
              ))}
          </div>
          <Button size="sm" className="mt-3 w-full" variant="outline">
            View Full Logs
          </Button>
        </div>
      )}
    </div>
  );
}
