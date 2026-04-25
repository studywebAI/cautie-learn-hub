'use client';

import { useEffect, useMemo, useState, useContext } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePathname, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowUpRight } from 'lucide-react';
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
  cachedData?: { logs?: AuditLog[]; pagination?: { total?: number; hasNext?: boolean } } | null;
  parentLoading?: boolean;
};

type Category = 'all' | 'academic' | 'events' | 'custom_events' | 'roster';
type DateWindow = 'all' | 'today' | '7d' | '30d';

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

function formatActionLabel(log: AuditLog, isDutch: boolean) {
  const metadata = (log.metadata || {}) as Record<string, any>;
  const action = String(log.action || '');

  if (action === 'attendance_state_changed') {
    if (metadata.to_is_present === true) return isDutch ? 'Aanwezig gemarkeerd' : 'Marked present';
    if (metadata.to_is_present === false) return isDutch ? 'Afwezig gemarkeerd' : 'Marked absent';
    return isDutch ? 'Aanwezigheid bijgewerkt' : 'Attendance updated';
  }

  if (action === 'attendance_event_homework_incomplete') {
    if (metadata.to_active === true) return isDutch ? 'Huiswerk onvolledig aangezet' : 'Homework incomplete enabled';
    if (metadata.to_active === false) return isDutch ? 'Huiswerk onvolledig uitgezet' : 'Homework incomplete disabled';
    return isDutch ? 'Huiswerkstatus bijgewerkt' : 'Homework status updated';
  }

  if (action === 'attendance_event_late') {
    if (metadata.to_active === true) return isDutch ? 'Te laat aangezet' : 'Late flag enabled';
    if (metadata.to_active === false) return isDutch ? 'Te laat uitgezet' : 'Late flag disabled';
    return isDutch ? 'Te-laatstatus bijgewerkt' : 'Late status updated';
  }

  if (action === 'attendance_event_custom') {
    return isDutch ? 'Aangepaste notitie toegevoegd' : 'Custom note added';
  }

  return formatAction(action);
}

function formatDiffValue(value: unknown) {
  if (value === true) return 'on';
  if (value === false) return 'off';
  if (value === null || value === undefined || value === '') return 'none';
  return String(value);
}

function getDiffSummary(log: AuditLog, isDutch: boolean): string[] {
  const metadata = (log.metadata || {}) as Record<string, any>;
  const diffs: string[] = [];

  if ('from_is_present' in metadata || 'to_is_present' in metadata) {
    diffs.push(`${isDutch ? 'Aanwezigheid' : 'Attendance'}: ${formatDiffValue(metadata.from_is_present)} -> ${formatDiffValue(metadata.to_is_present)}`);
  }
  if ('from_active' in metadata || 'to_active' in metadata) {
    diffs.push(`${isDutch ? 'Status' : 'Status'}: ${formatDiffValue(metadata.from_active)} -> ${formatDiffValue(metadata.to_active)}`);
  }
  if ('from' in metadata || 'to' in metadata) {
    diffs.push(`${isDutch ? 'Waarde' : 'Value'}: ${formatDiffValue(metadata.from)} -> ${formatDiffValue(metadata.to)}`);
  }
  return diffs;
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

export function LogsTab({ classId, cachedData = null, parentLoading = false }: LogsTabProps) {
  const appContext = useContext(AppContext) as AppContextType | null;
  const isDutch = appContext?.language === 'nl';
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [logs, setLogs] = useState<AuditLog[]>(cachedData?.logs || []);
  const [loading, setLoading] = useState(!cachedData && !parentLoading);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [studentFilter, setStudentFilter] = useState<string>('all');
  const [dateWindow, setDateWindow] = useState<DateWindow>('all');
  const [limit] = useState(100);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [classStudents, setClassStudents] = useState<Array<{ id: string; label: string }>>([]);
  const labelByCategory: Record<Category, string> = {
    all: isDutch ? 'Alles' : 'All',
    academic: isDutch ? 'Academisch' : 'Academic',
    events: isDutch ? 'Events' : 'Events',
    custom_events: isDutch ? 'Aangepaste events' : 'Custom Events',
    roster: isDutch ? 'Leden & rollen' : 'Roster & Roles',
  };

  useEffect(() => {
    setLogs(cachedData?.logs || []);
    setLoading(!cachedData && !parentLoading);
  }, [classId, cachedData, parentLoading]);

  useEffect(() => {
    if (!cachedData) return;
    const nextLogs = (cachedData.logs || []).filter((log) => isImportantLog(log));
    setLogs(nextLogs);
    const pagination = cachedData.pagination || {};
    setTotalCount(Number(pagination.total || nextLogs.length));
    setHasNext(Boolean(pagination.hasNext));
    setOffset(nextLogs.length);
    setLoading(false);
  }, [cachedData]);

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
    if (cachedData?.logs?.length) return;
    void loadLogs('replace');
  }, [classId, cachedData]);

  useEffect(() => {
    const requestedUserId = searchParams?.get('student_id') || searchParams?.get('user_id') || 'all';
    setStudentFilter(requestedUserId);
    const requestedCategory = String(searchParams?.get('category') || '').toLowerCase();
    if (requestedCategory === 'academic' || requestedCategory === 'events' || requestedCategory === 'custom_events' || requestedCategory === 'roster') {
      setCategory(requestedCategory);
    } else {
      setCategory('all');
    }
    const requestedSearch = searchParams?.get('q') || '';
    setSearch(requestedSearch);
    const requestedDate = String(searchParams?.get('date') || '').toLowerCase();
    if (requestedDate === 'today' || requestedDate === '7d' || requestedDate === '30d') {
      setDateWindow(requestedDate as DateWindow);
    } else {
      setDateWindow('all');
    }
  }, [searchParams]);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const response = await fetch(`/api/classes/${classId}/group`);
        if (!response.ok) return;
        const data = await response.json();
        const rows = Array.isArray(data?.students) ? data.students : [];
        const mapped = rows.map((row: any) => {
          const name = String(row?.name || '').trim();
          const email = String(row?.email || '').trim();
          return {
            id: String(row?.id || ''),
            label: name || email || (isDutch ? 'Naamloze leerling' : 'Unnamed student'),
          };
        }).filter((row: { id: string }) => Boolean(row.id));
        setClassStudents(mapped);
      } catch {
        // Best-effort enhancement for student selector.
      }
    };
    void loadStudents();
  }, [classId, isDutch]);

  const updateFiltersInQuery = (next: { studentId?: string; categoryValue?: Category; queryValue?: string; dateValue?: DateWindow }) => {
    const nextParams = new URLSearchParams(searchParams?.toString() || '');
    nextParams.set('tab', 'logs');
    const nextStudentId = next.studentId ?? studentFilter;
    const nextCategory = next.categoryValue ?? category;
    const nextQuery = next.queryValue ?? search;
    const nextDate = next.dateValue ?? dateWindow;

    if (nextStudentId === 'all') {
      nextParams.delete('student_id');
      nextParams.delete('user_id');
    } else {
      nextParams.set('student_id', nextStudentId);
      nextParams.delete('user_id');
    }
    if (nextCategory === 'all') nextParams.delete('category');
    else nextParams.set('category', nextCategory);
    if (!nextQuery.trim()) nextParams.delete('q');
    else nextParams.set('q', nextQuery.trim());
    if (nextDate === 'all') nextParams.delete('date');
    else nextParams.set('date', nextDate);

    router.replace(`${pathname}?${nextParams.toString()}`);
  };

  const applyStudentFilter = (nextStudentId: string) => {
    updateFiltersInQuery({ studentId: nextStudentId });
  };

  const getAffectedStudentId = (log: AuditLog) => String((log.metadata as any)?.student_id || '').trim();

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
    classStudents.forEach((student) => map.set(student.id, student.label));
    for (const log of logs) {
      const actorId = String(log.user_id || '');
      const actorLabel = formatActor(log);
      if (actorId && !map.has(actorId)) map.set(actorId, actorLabel);
      const affectedStudentId = String((log.metadata as any)?.student_id || '');
      const affectedStudentLabel = metadataUserFromLabels(log, 'student_id') || affectedStudentId;
      if (affectedStudentId && !map.has(affectedStudentId)) map.set(affectedStudentId, affectedStudentLabel);
    }
    return Array.from(map.entries())
      .map(([id, label]) => ({ id, label }))
      .sort((a, b) => a.label.localeCompare(b.label));
  }, [classStudents, logs]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    const now = Date.now();
    const minTimestamp = (() => {
      if (dateWindow === 'today') {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        return date.getTime();
      }
      if (dateWindow === '7d') return now - 7 * 24 * 60 * 60 * 1000;
      if (dateWindow === '30d') return now - 30 * 24 * 60 * 60 * 1000;
      return 0;
    })();

    return logs.filter((log) => {
      const logCategory = categorizeLog(log);
      if (category !== 'all' && logCategory !== category) return false;
      if (minTimestamp > 0 && new Date(log.created_at).getTime() < minTimestamp) return false;

      if (studentFilter !== 'all') {
        const actorId = String(log.user_id || '');
        const affectedStudentId = String((log.metadata as any)?.student_id || '');
        if (actorId !== studentFilter && affectedStudentId !== studentFilter) return false;
      }
      if (!q) return true;

      const actor = formatActor(log).toLowerCase();
      const action = formatActionLabel(log, isDutch).toLowerCase();
      const rawAction = String(log.action || '').toLowerCase();
      const entity = (log.entity_type || '').toLowerCase();
      const metadataText = JSON.stringify(log.metadata || {}).toLowerCase();

      return actor.includes(q) || action.includes(q) || rawAction.includes(q) || entity.includes(q) || metadataText.includes(q);
    });
  }, [logs, search, category, studentFilter, isDutch, dateWindow]);

  const groupedLogs = useMemo(() => {
    const groups: Array<{ id: string; logs: AuditLog[] }> = [];
    const thresholdMs = 45 * 1000;
    for (const log of filteredLogs) {
      const lastGroup = groups[groups.length - 1];
      if (!lastGroup) {
        groups.push({ id: log.id, logs: [log] });
        continue;
      }
      const previous = lastGroup.logs[lastGroup.logs.length - 1];
      const sameActor = String(previous.user_id || '') === String(log.user_id || '');
      const sameStudent = String((previous.metadata as any)?.student_id || '') === String((log.metadata as any)?.student_id || '');
      const sameCategory = categorizeLog(previous) === categorizeLog(log);
      const previousGroupId = String((previous.metadata as any)?.attendance_change_group_id || '');
      const currentGroupId = String((log.metadata as any)?.attendance_change_group_id || '');
      const sameChangeGroup = Boolean(previousGroupId && currentGroupId && previousGroupId === currentGroupId);
      const delta = Math.abs(new Date(previous.created_at).getTime() - new Date(log.created_at).getTime());

      if (sameChangeGroup || (sameActor && sameStudent && sameCategory && delta <= thresholdMs)) {
        lastGroup.logs.push(log);
      } else {
        groups.push({ id: log.id, logs: [log] });
      }
    }
    return groups;
  }, [filteredLogs]);

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
              onChange={(e) => updateFiltersInQuery({ queryValue: e.target.value })}
              placeholder={isDutch ? 'Zoek acties, gebruikers, metadata...' : 'Search actions, actors, metadata...'}
            />
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
            <Select value={dateWindow} onValueChange={(value) => updateFiltersInQuery({ dateValue: value as DateWindow })}>
              <SelectTrigger className="h-10 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{isDutch ? 'Alle datums' : 'All dates'}</SelectItem>
                <SelectItem value="today">{isDutch ? 'Vandaag' : 'Today'}</SelectItem>
                <SelectItem value="7d">{isDutch ? 'Laatste 7 dagen' : 'Last 7 days'}</SelectItem>
                <SelectItem value="30d">{isDutch ? 'Laatste 30 dagen' : 'Last 30 days'}</SelectItem>
              </SelectContent>
            </Select>
            <div className="md:col-span-3 flex flex-wrap items-center gap-2">
              {categories.map((c) => {
                const active = category === c;
                return (
                  <Button
                    key={c}
                    type="button"
                    variant={active ? 'default' : 'outline'}
                    size="sm"
                    className="h-9 rounded-xl px-3 text-xs"
                    onClick={() => updateFiltersInQuery({ categoryValue: c })}
                  >
                    {labelByCategory[c]} ({counts[c]})
                  </Button>
                );
              })}
            </div>
            <div className="md:col-span-3 flex gap-2">
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
              {groupedLogs.map((group) => {
                const leadLog = group.logs[0];
                const affectedStudentId = getAffectedStudentId(leadLog);
                const affectedStudentLabel = leadLog.metadata_user_labels?.student_id || affectedStudentId;
                const canOpenAttendance = Boolean(affectedStudentId);
                return (
                  <div key={group.id} className="space-y-2 rounded-lg border bg-[hsl(var(--surface-1))] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium">
                          {group.logs.length > 1
                            ? `${group.logs.length} ${isDutch ? 'gerelateerde updates' : 'related updates'}`
                            : formatActionLabel(leadLog, isDutch)}
                        </p>
                        <p className="text-xs text-muted-foreground">{new Date(leadLog.created_at).toLocaleString()}</p>
                      </div>
                      {canOpenAttendance && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 px-2 text-xs"
                          onClick={() => router.replace(`/class/${classId}?tab=attendance&studentId=${affectedStudentId}&quick=timeline`)}
                        >
                          {isDutch ? 'Open aanwezigheidskaart' : 'Open attendance'}
                          <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className={getCategoryClass(categorizeLog(leadLog), leadLog.action)}>
                        {labelByCategory[categorizeLog(leadLog)]}
                      </Badge>
                      <Badge variant="outline" className="font-mono">
                        {resolveLogCode(leadLog)}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {isDutch ? 'Actor' : 'Actor'}: {formatActor(leadLog)}
                      </Badge>
                      {affectedStudentLabel && (
                        <Badge variant="secondary" className="text-xs">
                          {isDutch ? 'Leerling' : 'Student'}: {affectedStudentLabel}
                        </Badge>
                      )}
                    </div>

                    {(leadLog.metadata as any)?.custom_message && (
                      <div className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-2 py-1.5 text-xs">
                        {String((leadLog.metadata as any)?.custom_message)}
                      </div>
                    )}

                    <div className="space-y-1">
                      {group.logs.map((log) => {
                        const diffLines = getDiffSummary(log, isDutch);
                        return (
                          <div key={log.id} className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--surface-2))] px-2 py-1.5">
                            <p className="text-xs font-medium">{formatActionLabel(log, isDutch)}</p>
                            {diffLines.map((line) => (
                              <p key={line} className="text-[11px] text-muted-foreground">{line}</p>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
