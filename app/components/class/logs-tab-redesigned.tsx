'use client';

import { useState, useEffect, useContext } from 'react';
import { cn } from '@/lib/utils';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { CautieLoader } from '@/components/ui/cautie-loader';

type LogEntry = {
  id: string;
  type: 'attendance' | 'grade' | 'message' | 'student' | 'setting';
  action: string;
  actor: string;
  targetStudent?: string;
  details: string;
  timestamp: string;
};

type FilterType = 'all' | 'attendance' | 'grade' | 'message' | 'student' | 'setting';

export function LogsTabRedesigned({ classId }: { classId: string }) {
  const ctx = useContext(AppContext) as AppContextType | null;
  const isDutch = ctx?.language === 'nl';

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');

  useEffect(() => {
    void loadLogs();
  }, [classId]);

  async function loadLogs() {
    setLoading(true);
    try {
      const res = await fetch(`/api/classes/${classId}/audit-logs?limit=100&offset=0`);
      if (!res.ok) {
        setLogs([]);
        return;
      }
      const data = await res.json();
      // Map API data to LogEntry format
      const mapped = (data.logs || []).map((log: any) => ({
        id: String(log.id || Math.random()),
        type: inferLogType(log),
        action: log.action || log.type || 'Unknown',
        actor: log.actor_name || log.user_name || 'System',
        targetStudent: log.target_student_name,
        details: log.details || '',
        timestamp: log.created_at || new Date().toISOString(),
      }));
      setLogs(mapped);
    } catch (e) {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  function inferLogType(log: any): FilterType {
    const action = String(log.action || log.type || '').toLowerCase();
    if (action.includes('attendance') || action.includes('present') || action.includes('absent')) return 'attendance';
    if (action.includes('grade') || action.includes('score')) return 'grade';
    if (action.includes('message')) return 'message';
    if (action.includes('student') || action.includes('member')) return 'student';
    if (action.includes('setting')) return 'setting';
    return 'all';
  }

  function formatTime(iso: string): string {
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);

      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
             d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  }

  function getTypeColor(type: FilterType): string {
    switch (type) {
      case 'attendance':
        return 'text-[hsl(41,91%,50%)]'; // Orange for attendance
      case 'grade':
        return 'text-[hsl(75,17%,46%)]'; // Green for grades
      case 'message':
        return 'text-[hsl(209,74%,50%)]'; // Blue for messages
      case 'student':
        return 'text-[hsl(16,100%,40%)]'; // Orange-red for student changes
      case 'setting':
        return 'text-[hsl(210,15%,50%)]'; // Gray-blue for settings
      default:
        return 'text-[hsl(0,0%,50%)]'; // Gray for unknown
    }
  }

  function getTypeLabel(type: FilterType): string {
    if (isDutch) {
      switch (type) {
        case 'attendance': return 'Aanwezigheid';
        case 'grade': return 'Cijfers';
        case 'message': return 'Berichten';
        case 'student': return 'Students';
        case 'setting': return 'Instellingen';
        default: return 'Alle';
      }
    } else {
      switch (type) {
        case 'attendance': return 'Attendance';
        case 'grade': return 'Grades';
        case 'message': return 'Messages';
        case 'student': return 'Students';
        case 'setting': return 'Settings';
        default: return 'All';
      }
    }
  }

  const filtered = filter === 'all' ? logs : logs.filter(log => inferLogType(log) === filter);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <CautieLoader size="md" label="" sublabel="" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Topbar */}
      <div>
        <h3 className="text-[13px] font-600 text-foreground mb-3">
          {isDutch ? 'Filter op type:' : 'Filter by type:'}
        </h3>
        <div className="flex flex-wrap gap-2">
          {(['all', 'attendance', 'grade', 'message', 'student', 'setting'] as const).map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={cn(
                'px-3 py-1.5 rounded-md text-[12px] font-500 transition-colors border',
                filter === type
                  ? 'bg-[#7f8962] text-white border-[#7f8962]'
                  : 'bg-background border-border text-foreground/70 hover:border-foreground/50'
              )}
            >
              {getTypeLabel(type)}
            </button>
          ))}
        </div>
      </div>

      {/* Logs table */}
      <div className="rounded-lg border border-border bg-white dark:bg-[hsl(var(--surface-1))] overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                {isDutch ? 'Activiteit' : 'Activity'}
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                {isDutch ? 'Betrokken personen' : 'Involved Parties'}
              </th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                {isDutch ? 'Details' : 'Details'}
              </th>
              <th className="px-4 py-3 text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground/60">
                {isDutch ? 'Tijd' : 'Time'}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-[12px] text-muted-foreground">
                  {isDutch ? 'Geen logs gevonden.' : 'No logs found.'}
                </td>
              </tr>
            ) : (
              filtered.map((log, idx) => (
                <tr key={log.id} className={cn('border-t border-border hover:bg-muted/30 transition-colors',
                  idx % 2 === 1 && 'bg-muted/10'
                )}>
                  <td className="px-4 py-3">
                    <span className={cn('text-[12px] font-600', getTypeColor(log.type as FilterType))}>
                      {log.action}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-foreground/80">
                    <div>
                      <p className="font-500">{log.actor}</p>
                      {log.targetStudent && (
                        <p className="text-[11px] text-muted-foreground">{log.targetStudent}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">
                    {log.details}
                  </td>
                  <td className="px-4 py-3 text-right text-[11px] text-muted-foreground">
                    {formatTime(log.timestamp)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Summary footer */}
      {filtered.length > 0 && (
        <div className="text-[12px] text-muted-foreground px-4 py-2">
          {isDutch ? `Showing ${filtered.length} entries` : `Showing ${filtered.length} entries`}
        </div>
      )}
    </div>
  );
}
