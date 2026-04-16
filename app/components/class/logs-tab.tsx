'use client';

import { useEffect, useMemo, useState, useContext } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePathname, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { logClassTabEvent } from '@/lib/class-tab-telemetry';
import { AppContext, AppContextType } from '@/contexts/app-context';

type AuditLog = {
  id: string;
  user_id: string;
  class_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  log_code?: string;
  log_category?: string;
  user?: { display_name?: string | null; full_name?: string | null; email?: string | null };
  metadata_user_labels?: Record<string, string>;
};

type LogsTabProps = {
  classId: string;
};

type Category = 'all' | 'academic' | 'events' | 'custom_events' | 'roster';

const CATEGORY_LABELS: Record<Category, string> = {
  all: 'All',
  academic: 'Academic',
  events: 'Events',
  custom_events: 'Custom Events',
  roster: 'Roster & Roles',
};

function isImportantLog(log: AuditLog) {
  const action = String(log.action || '');
  const entityType = String(log.entity_type || '');
  if (action.startsWith('telemetry_') || entityType === 'class_tab') return false;
  return true;
}

function categorizeLog(log: AuditLog): Category {
  const topLevelCategory = String(log.log_category || '').toLowerCase();
  if (topLevelCategory === 'academic' || topLevelCategory === 'events' || topLevelCategory === 'custom_events' || topLevelCategory === 'roster') {
    return topLevelCategory as Category;
  }
  const metadataCategory = String((log.metadata as any)?.log_category || '').toLowerCase();
  if (metadataCategory === 'academic') return 'academic';
  if (metadataCategory === 'events') return 'events';
  if (metadataCategory === 'custom_events') return 'custom_events';
  if (metadataCategory === 'roster') return 'roster';

  const action = String(log.action || '');
  const entityType = String(log.entity_type || '');

  if (action.includes('attendance_event_custom') || Boolean((log.metadata as any)?.custom_message)) return 'custom_events';

  if (
    action.includes('attendance') ||
    action.includes('event_') ||
    entityType.includes('attendance') ||
    entityType.includes('event')
  ) {
    return 'events';
  }

  if (
    action.includes('member_') ||
    action.includes('teacher_invite') ||
    action.includes('join_request') ||
    action.includes('role') ||
    entityType.includes('member') ||
    entityType.includes('invite')
  ) {
    return 'roster';
  }

  return 'academic';
}

function formatAction(action: string) {
  return action.replace(/_/g, ' ');
}

function resolveLogCode(log: AuditLog) {
  const topLevelCode = String(log.log_code || '').trim();
  if (topLevelCode) return topLevelCode;
  const metadataCode = String((log.metadata as any)?.log_code || '').trim();
  if (metadataCode) return metadataCode;
  const action = String(log.action || '');
  if (action === 'attendance_state_changed') return 'EVT-ATT-001';
  if (action === 'attendance_event_homework_incomplete') return 'EVT-ATT-002';
  if (action === 'attendance_event_late') return 'EVT-ATT-003';
  if (action === 'attendance_event_custom') return 'EVT-CUS-001';
  if (action === 'member_rename') return 'ROS-MEM-001';
  return 'ACD-EDT-001';
}

function formatActor(log: AuditLog) {
  return log?.user?.display_name || log?.user?.full_name || log?.user?.email || log.user_id;
}

function toneIndex(input: string) {
  let sum = 0;
  for (let i = 0; i < input.length; i += 1) sum += input.charCodeAt(i);
  return sum % 3;
}

function getCategoryClass(categoryName: Category, action: string) {
  const tone = toneIndex(action || categoryName);
  if (categoryName === 'academic') {
    if (tone === 0) return 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/40 dark:text-blue-100 dark:border-blue-800';
    if (tone === 1) return 'bg-indigo-100 text-indigo-800 border-indigo-300 dark:bg-indigo-950/40 dark:text-indigo-100 dark:border-indigo-800';
    return 'bg-cyan-100 text-cyan-800 border-cyan-300 dark:bg-cyan-950/40 dark:text-cyan-100 dark:border-cyan-800';
  }
  if (categoryName === 'events') {
    if (tone === 0) return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-950/40 dark:text-green-100 dark:border-green-800';
    if (tone === 1) return 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-800';
    return 'bg-teal-100 text-teal-800 border-teal-300 dark:bg-teal-950/40 dark:text-teal-100 dark:border-teal-800';
  }
  if (categoryName === 'custom_events') {
    if (tone === 0) return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-950/40 dark:text-orange-100 dark:border-orange-800';
    if (tone === 1) return 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-800';
    return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-100 dark:border-yellow-800';
  }
  if (categoryName === 'roster') {
    if (tone === 0) return 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/40 dark:text-rose-100 dark:border-rose-800';
    if (tone === 1) return 'bg-pink-100 text-pink-800 border-pink-300 dark:bg-pink-950/40 dark:text-pink-100 dark:border-pink-800';
    return 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950/40 dark:text-red-100 dark:border-red-800';
  }
  return 'bg-muted text-foreground border-border';
}

export function LogsTab({ classId }: LogsTabProps) {
  const appContext = useContext(AppContext) as AppContextType | null;
  const isDutch = appContext?.language === 'nl';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [studentFilter, setStudentFilter] = useState<string>('all');
  const [limit] = useState(100);
  const [loadError, setLoadError] = useState<string | null>(null);
  const labelByCategory: Record<Category, string> = {
    all: isDutch ? 'Alles' : 'All',
    academic: isDutch ? 'Academisch' : 'Academic',
    events: isDutch ? 'Events' : 'Events',
    custom_events: isDutch ? 'Aangepaste events' : 'Custom Events',
    roster: isDutch ? 'Leden & rollen' : 'Roster & Roles',
  };

  const loadLogs = async (mode: 'replace' | 'append' = 'replace') => {
    if (mode === 'replace') setLoading(true);
    if (mode === 'append') setLoadingMore(true);
    const nextOffset = mode === 'append' ? offset : 0;
    void logClassTabEvent({
      classId,
      tab: 'logs',
      event: 'load_start',
      stage: 'data',
      level: 'debug',
      meta: { limit, offset: nextOffset, mode },
    });
    try {
      setLoadError(null);
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('offset', String(nextOffset));
      if (studentFilter !== 'all') params.set('student_id', studentFilter);
      const response = await fetch(`/api/classes/${classId}/audit-logs?${params.toString()}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load logs');
      const rows: AuditLog[] = (data.logs || []).filter((log: AuditLog) => isImportantLog(log));
      const deduped = (() => {
        if (mode === 'replace') return rows;
        const map = new Map<string, AuditLog>();
        [...logs, ...rows].forEach((row) => map.set(row.id, row));
        return Array.from(map.values());
      })();
      setLogs(deduped);
      const pagination = data.pagination || {};
      setTotalCount(Number(pagination.total || deduped.length));
      setHasNext(Boolean(pagination.hasNext));
      setOffset(mode === 'append' ? nextOffset + rows.length : rows.length);
    } catch (error: any) {
      setLoadError(error?.message || 'Failed to load logs');
    } finally {
      if (mode === 'replace') setLoading(false);
      if (mode === 'append') setLoadingMore(false);
    }
  };

  useEffect(() => {
    void loadLogs('replace');
  }, [classId]);

  useEffect(() => {
    const requestedUserId = searchParams?.get('student_id') || searchParams?.get('user_id') || 'all';
    setStudentFilter(requestedUserId);
  }, [searchParams]);

  const applyStudentFilter = (nextStudentId: string) => {
    const nextParams = new URLSearchParams(searchParams?.toString() || '');
    nextParams.set('tab', 'logs');
    if (nextStudentId === 'all') {
      nextParams.delete('student_id');
      nextParams.delete('user_id');
    } else {
      nextParams.set('student_id', nextStudentId);
      nextParams.delete('user_id');
    }
    router.replace(`${pathname}?${nextParams.toString()}`);
  };

  useEffect(() => {
    setOffset(0);
    setHasNext(false);
    setTotalCount(0);
    void loadLogs('replace');
  }, [studentFilter]);

  const metadataUserFromLabels = (log: AuditLog, key: string): string | null => {
    const labels = log.metadata_user_labels || {};
    return labels[key] || null;
  };

  const studentOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const log of logs) {
      const actorId = String(log.user_id || '');
      const actorLabel = formatActor(log);
      if (actorId) map.set(actorId, actorLabel);
      const affectedStudentId = String((log.metadata as any)?.student_id || '');
      const affectedStudentLabel = metadataUserFromLabels(log, 'student_id') || affectedStudentId;
      if (affectedStudentId) map.set(affectedStudentId, affectedStudentLabel);
    }
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [logs]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      const logCategory = categorizeLog(log);
      if (category !== 'all' && logCategory !== category) return false;

      if (studentFilter !== 'all') {
        const actorId = String(log.user_id || '');
        const affectedStudentId = String((log.metadata as any)?.student_id || '');
        if (actorId !== studentFilter && affectedStudentId !== studentFilter) return false;
      }
      if (!q) return true;

      const actor = formatActor(log).toLowerCase();
      const action = formatAction(log.action).toLowerCase();
      const entity = (log.entity_type || '').toLowerCase();
      const metadataText = JSON.stringify(log.metadata || {}).toLowerCase();

      return actor.includes(q) || action.includes(q) || entity.includes(q) || metadataText.includes(q);
    });
  }, [logs, search, category, studentFilter]);

  const counts = useMemo(() => {
    const base: Record<Category, number> = {
      all: logs.length,
      academic: 0,
      events: 0,
      custom_events: 0,
      roster: 0,
    };
    for (const log of logs) {
      base[categorizeLog(log)] += 1;
    }
    return base;
  }, [logs]);

  const categories: Category[] = ['all', 'academic', 'events', 'custom_events', 'roster'];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{isDutch ? 'Logs' : 'Logs'}</CardTitle>
          <CardDescription>
            {isDutch
              ? 'Klaslogs gegroepeerd in Academisch, Events, Aangepaste events en Leden & rollen.'
              : 'Class logs grouped into Academic, Events, Custom Events, and Roster & Roles.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={isDutch ? 'Zoek acties, gebruikers, metadata...' : 'Search actions, actors, metadata...'}
            />
            <Select value={category} onValueChange={(value) => setCategory(value as Category)}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c} value={c}>
                    {labelByCategory[c]} ({counts[c]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={studentFilter} onValueChange={applyStudentFilter}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isDutch ? 'Alle leerlingen/gebruikers' : 'All students/actors'}</SelectItem>
                {studentOptions.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => void loadLogs()}>
                {isDutch ? 'Vernieuwen' : 'Refresh'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  void loadLogs('append');
                }}
                disabled={!hasNext || loadingMore}
              >
                {loadingMore ? (isDutch ? 'Laden...' : 'Loading...') : (isDutch ? 'Meer laden' : 'Load more')}
              </Button>
            </div>
          </div>
          <div className="rounded-md border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            {isDutch
              ? 'Categorieen groeperen betekenis. Leerling/gebruiker-filter vernauwt de tijdlijn. Zoeken matcht ook metadata en aangepaste eventberichten.'
              : 'Category groups log meaning. Student/actor filter narrows timeline ownership. Search also matches metadata and custom event messages.'}
          </div>
          <div className="rounded-md border border-border/60 bg-muted/15 px-3 py-2 text-xs text-muted-foreground">
            {isDutch
              ? 'Gebruik codezoeker in Instellingen > Logcodes voor uitleg van codes zoals EVT-ATT-001 en ROS-MEM-001.'
              : 'Use Settings > Log codes to look up explanations for codes like EVT-ATT-001 and ROS-MEM-001.'}
          </div>

          {loadError && (
            <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
              {loadError}
            </div>
          )}

          <div className="text-xs text-muted-foreground">
            {isDutch ? 'Toont' : 'Showing'} {filteredLogs.length} {isDutch ? 'van' : 'of'} {totalCount || logs.length} {isDutch ? 'logs' : 'logs'}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="py-10 text-center text-muted-foreground">{isDutch ? 'Logs laden...' : 'Loading logs...'}</div>
          ) : filteredLogs.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">{isDutch ? 'Geen logs voor dit filter.' : 'No logs found for this filter.'}</div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div key={log.id} className="space-y-1.5 rounded-lg border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0 items-center gap-2">
                      <p className="truncate capitalize">{formatAction(log.action)}</p>
                    </div>
                    <p className="shrink-0 text-xs text-muted-foreground">{new Date(log.created_at).toLocaleString()}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getCategoryClass(categorizeLog(log), log.action)}>
                      {labelByCategory[categorizeLog(log)]}
                    </Badge>
                    <Badge variant="outline" className="font-mono">
                      {resolveLogCode(log)}
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      <span className="text-foreground">{formatActor(log)}</span> on <span className="font-mono">{log.entity_type}</span>
                    </p>
                  </div>

                  {(log.metadata_user_labels?.student_id || (log.metadata as any)?.student_id) && (
                    <p className="text-xs text-muted-foreground">
                      {isDutch ? 'Leerling' : 'Student'}: <span className="text-foreground">{log.metadata_user_labels?.student_id || String((log.metadata as any)?.student_id)}</span>
                    </p>
                  )}

                  {(log.metadata as any)?.custom_message && (
                    <p className="text-xs text-muted-foreground">{String((log.metadata as any)?.custom_message)}</p>
                  )}

                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="rounded-md bg-muted/35 p-2 text-xs">
                      <pre className="whitespace-pre-wrap break-words">
                        {JSON.stringify(
                          {
                            ...log.metadata,
                            ...(log.metadata_user_labels ? { metadata_user_labels: log.metadata_user_labels } : {}),
                          },
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
