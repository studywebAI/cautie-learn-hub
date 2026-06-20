'use client';

import { useState, useEffect, useContext } from 'react';
import { cn } from '@/lib/utils';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { CautieLoader } from '@/components/ui/cautie-loader';
import { X } from 'lucide-react';

type LogEntry = {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  log_category: 'academic' | 'events' | 'custom_events' | 'roster' | string;
  log_code: string;
  created_at: string;
  metadata: Record<string, any>;
  user: {
    display_name: string | null;
    full_name: string | null;
    email: string | null;
    avatar_url: string | null;
  } | null;
  metadata_user_labels: Record<string, string>;
};

type FilterType = 'all' | 'academic' | 'events' | 'custom_events' | 'roster';

export function LogsTabRedesigned({
  classId,
  cachedData,
  parentLoading,
}: {
  classId: string;
  cachedData?: { logs?: any[]; pagination?: any } | null;
  parentLoading?: boolean;
}) {
  const ctx = useContext(AppContext) as AppContextType | null;
  const isDutch = ctx?.language === 'nl';

  const [logs, setLogs] = useState<LogEntry[]>(cachedData?.logs || []);
  const [loading, setLoading] = useState(!cachedData && !parentLoading);
  const [filter, setFilter] = useState<FilterType>('all');
  const [selectedLog, setSelectedLog] = useState<LogEntry | null>(null);

  useEffect(() => {
    setLogs(cachedData?.logs || []);
    setLoading(!cachedData && !parentLoading);
  }, [cachedData, parentLoading, classId]);

  useEffect(() => {
    if (!cachedData) void loadLogs();
  }, [classId, cachedData]);

  async function loadLogs() {
    setLoading(true);
    try {
      const res = await fetch(`/api/classes/${classId}/audit-logs?limit=100&offset=0`);
      if (!res.ok) { setLogs([]); return; }
      const data = await res.json();
      setLogs(data.logs || []);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }

  function actorName(log: LogEntry): string {
    const u = log.user;
    if (!u) return 'System';
    return u.display_name || u.full_name || u.email?.split('@')[0] || 'User';
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
    } catch { return ''; }
  }

  function formatFullTime(iso: string): string {
    try {
      return new Date(iso).toLocaleString([], {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit', second: '2-digit',
      });
    } catch { return iso; }
  }

  function categoryColor(cat: string): string {
    switch (cat) {
      case 'academic': return 'text-[hsl(75,17%,46%)]';
      case 'events': return 'text-[hsl(41,91%,40%)]';
      case 'custom_events': return 'text-[hsl(16,100%,40%)]';
      case 'roster': return 'text-[hsl(209,74%,50%)]';
      default: return 'text-muted-foreground';
    }
  }

  function categoryBadge(cat: string): string {
    switch (cat) {
      case 'academic': return 'bg-[hsl(75,17%,90%)] text-[hsl(75,17%,30%)]';
      case 'events': return 'bg-[hsl(41,91%,92%)] text-[hsl(41,60%,30%)]';
      case 'custom_events': return 'bg-[hsl(16,100%,92%)] text-[hsl(16,70%,30%)]';
      case 'roster': return 'bg-[hsl(209,74%,92%)] text-[hsl(209,60%,30%)]';
      default: return 'bg-muted text-muted-foreground';
    }
  }

  function categoryLabel(cat: string): string {
    if (isDutch) {
      switch (cat) {
        case 'academic': return 'Academisch';
        case 'events': return 'Evenementen';
        case 'custom_events': return 'Aangepast';
        case 'roster': return 'Rooster';
        default: return 'Alle';
      }
    }
    switch (cat) {
      case 'academic': return 'Academic';
      case 'events': return 'Events';
      case 'custom_events': return 'Custom';
      case 'roster': return 'Roster';
      default: return 'All';
    }
  }

  function humanizeAction(action: string): string {
    return action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  }

  function buildSummary(log: LogEntry): string {
    const meta = log.metadata || {};
    // Try to build a meaningful summary from metadata
    if (meta.old_value !== undefined && meta.new_value !== undefined) {
      return `${meta.old_value} → ${meta.new_value}`;
    }
    if (meta.student_name) return meta.student_name;
    if (meta.title) return meta.title;
    if (meta.custom_message) return meta.custom_message;
    if (meta.subject_title) return meta.subject_title;
    return '';
  }

  const FILTER_TYPES: FilterType[] = ['all', 'academic', 'events', 'custom_events', 'roster'];

  const filtered = filter === 'all'
    ? logs
    : logs.filter(log => log.log_category === filter);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <CautieLoader size="md" label="" sublabel="" />
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      {/* Main list */}
      <div className="min-w-0 flex-1 space-y-4">
        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          {FILTER_TYPES.map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={cn(
                'px-3 py-1.5 rounded-md text-[12px] font-500 transition-colors border',
                filter === type
                  ? 'bg-[var(--accent-brand)] text-background border-[var(--accent-brand)]'
                  : 'bg-background border-border text-foreground/70 hover:border-foreground/50'
              )}
            >
              {categoryLabel(type)}
            </button>
          ))}
        </div>

        {/* Log table */}
        <div className="rounded-lg border border-border bg-white dark:bg-[hsl(var(--surface-1))] overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left text-[11px] text-muted-foreground/60">
                  {isDutch ? 'Actie' : 'Action'}
                </th>
                <th className="px-4 py-3 text-left text-[11px] text-muted-foreground/60 hidden sm:table-cell">
                  {isDutch ? 'Door' : 'By'}
                </th>
                <th className="px-4 py-3 text-left text-[11px] text-muted-foreground/60 hidden md:table-cell">
                  {isDutch ? 'Samenvatting' : 'Summary'}
                </th>
                <th className="px-4 py-3 text-right text-[11px] text-muted-foreground/60">
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
                filtered.map((log, idx) => {
                  const summary = buildSummary(log);
                  const isSelected = selectedLog?.id === log.id;
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(isSelected ? null : log)}
                      className={cn(
                        'border-t border-border transition-colors cursor-pointer',
                        isSelected
                          ? 'bg-[#edf1e5] dark:bg-[hsl(var(--accent-brand)/0.12)]'
                          : idx % 2 === 1
                            ? 'bg-muted/10 hover:bg-muted/30'
                            : 'hover:bg-muted/30'
                      )}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className={cn('inline-block rounded px-1.5 py-0.5 text-[11px]', categoryBadge(log.log_category))}>
                            {log.log_code}
                          </span>
                          <span className={cn('text-[12px] font-600', categoryColor(log.log_category))}>
                            {humanizeAction(log.action)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-foreground/80 hidden sm:table-cell">
                        {actorName(log)}
                      </td>
                      <td className="px-4 py-3 text-[12px] text-muted-foreground hidden md:table-cell truncate max-w-[200px]">
                        {summary}
                      </td>
                      <td className="px-4 py-3 text-right text-[11px] text-muted-foreground whitespace-nowrap">
                        {formatTime(log.created_at)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filtered.length > 0 && (
          <p className="text-[12px] text-muted-foreground px-1">
            {isDutch ? `${filtered.length} vermeldingen` : `${filtered.length} entries`}
          </p>
        )}
      </div>

      {/* Detail panel */}
      {selectedLog && (
        <div className="w-80 shrink-0 rounded-lg border border-border bg-white dark:bg-[hsl(var(--surface-1))] self-start sticky top-4">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <h3 className="text-[14px] text-foreground">
              {isDutch ? 'Details' : 'Details'}
            </h3>
            <button
              type="button"
              onClick={() => setSelectedLog(null)}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-3 text-[12px]">
            {/* Action */}
            <DetailRow label={isDutch ? 'Actie' : 'Action'}>
              <span className={cn('text-[13px]', categoryColor(selectedLog.log_category))}>
                {humanizeAction(selectedLog.action)}
              </span>
            </DetailRow>

            {/* Code */}
            <DetailRow label={isDutch ? 'Code' : 'Code'}>
              <span className={cn('rounded px-1.5 py-0.5 text-[11px]', categoryBadge(selectedLog.log_category))}>
                {selectedLog.log_code}
              </span>
            </DetailRow>

            {/* Category */}
            <DetailRow label={isDutch ? 'Categorie' : 'Category'}>
              {categoryLabel(selectedLog.log_category)}
            </DetailRow>

            {/* Who */}
            <DetailRow label={isDutch ? 'Door' : 'By'}>
              {actorName(selectedLog)}
              {selectedLog.user?.email && (
                <div className="text-[11px] text-muted-foreground">{selectedLog.user.email}</div>
              )}
            </DetailRow>

            {/* When */}
            <DetailRow label={isDutch ? 'Wanneer' : 'When'}>
              {formatFullTime(selectedLog.created_at)}
            </DetailRow>

            {/* Entity */}
            {selectedLog.entity_type && (
              <DetailRow label={isDutch ? 'Object' : 'Entity'}>
                <span className="font-mono text-[11px]">{selectedLog.entity_type}</span>
                {selectedLog.entity_id && (
                  <div className="text-[10px] text-muted-foreground font-mono truncate">{selectedLog.entity_id}</div>
                )}
              </DetailRow>
            )}

            {/* Metadata key-value pairs */}
            {Object.keys(selectedLog.metadata || {}).length > 0 && (
              <div>
                <p className="text-[11px] text-muted-foreground/60 mb-2">
                  {isDutch ? 'Context' : 'Context'}
                </p>
                <div className="space-y-1.5 rounded-md bg-muted/40 p-3">
                  {Object.entries(selectedLog.metadata || {}).map(([key, val]) => {
                    const label = selectedLog.metadata_user_labels?.[key];
                    const display = label || (typeof val === 'object' ? JSON.stringify(val) : String(val ?? ''));
                    if (!display) return null;
                    return (
                      <div key={key} className="grid gap-1" style={{ gridTemplateColumns: '100px 1fr' }}>
                        <span className="text-[11px] text-muted-foreground truncate">{key.replace(/_/g, ' ')}</span>
                        <span className="text-[11px] font-medium text-foreground break-all">{display}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: '80px 1fr' }}>
      <span className="text-[11px] text-muted-foreground pt-0.5">{label}</span>
      <div className="text-[12px] text-foreground">{children}</div>
    </div>
  );
}
