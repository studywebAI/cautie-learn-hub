'use client';

import { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { logClassTabEvent } from '@/lib/class-tab-telemetry';

type AuditLog = {
  id: string;
  user_id: string;
  class_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  user?: { full_name?: string | null; email?: string | null };
  metadata_user_labels?: Record<string, string>;
};

type LogsTabProps = {
  classId: string;
};

type Category = 'all' | 'teacher_invites' | 'join_requests' | 'settings' | 'attendance' | 'grades' | 'subjects' | 'assignments' | 'other';
type QuickPreset = 'none' | 'pending_teacher_joins' | 'invite_codes_used' | 'rejected_requests' | 'config_changes';

const CATEGORY_LABELS: Record<Category, string> = {
  all: 'All',
  teacher_invites: 'Teacher Invites',
  join_requests: 'Join Requests',
  settings: 'Settings',
  attendance: 'Attendance',
  grades: 'Grades',
  subjects: 'Subjects',
  assignments: 'Assignments',
  other: 'Other',
};

const IMPORTANT_ACTION_HINTS = [
  'grade',
  'attendance',
  'teacher_invite_code_',
  'teacher_join_request_',
  'update_profile',
  'update_preferences',
  'regenerate_invite_codes',
  'archive',
  'subject',
  'assignment',
];

function isImportantLog(log: AuditLog) {
  const action = String(log.action || '');
  const entityType = String(log.entity_type || '');
  if (action.startsWith('telemetry_') || entityType === 'class_tab') return false;
  if (IMPORTANT_ACTION_HINTS.some((hint) => action.includes(hint))) return true;
  if (entityType.includes('subject') || entityType.includes('assignment') || entityType.includes('grade') || entityType.includes('attendance')) return true;
  return false;
}

function categorizeLog(log: AuditLog): Category {
  const action = String(log.action || '');
  const entityType = String(log.entity_type || '');

  if (action.startsWith('teacher_invite_code_') || entityType === 'teacher_invite_code') return 'teacher_invites';
  if (action.startsWith('teacher_join_request_') || action.includes('join_request')) return 'join_requests';
  if (action.startsWith('update_preferences') || action.startsWith('update_profile') || action.startsWith('regenerate_invite_codes') || action === 'archive') return 'settings';
  if (action.includes('attendance') || entityType.includes('attendance')) return 'attendance';
  if (action.includes('grade') || entityType.includes('grade')) return 'grades';
  if (action.includes('subject') || entityType.includes('subject')) return 'subjects';
  if (action.includes('assignment') || entityType.includes('assignment')) return 'assignments';
  return 'other';
}

function formatAction(action: string) {
  return action.replace(/_/g, ' ');
}

function formatActor(log: AuditLog) {
  return log?.user?.email || log?.user?.full_name || log.user_id;
}

export function LogsTab({ classId }: LogsTabProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<Category>('all');
  const [quickPreset, setQuickPreset] = useState<QuickPreset>('none');
  const [limit] = useState(100);

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
      const response = await fetch(`/api/classes/${classId}/audit-logs?limit=${limit}&offset=${nextOffset}`);
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
      void logClassTabEvent({
        classId,
        tab: 'logs',
        event: 'load_success',
        stage: 'data',
        level: 'debug',
        meta: { count: deduped.length, returned: rows.length, has_next: !!pagination.hasNext },
      });
    } catch (error: any) {
      void logClassTabEvent({
        classId,
        tab: 'logs',
        event: 'load_error',
        stage: 'data',
        level: 'error',
        message: error?.message || 'Unknown error',
      });
    } finally {
      if (mode === 'replace') setLoading(false);
      if (mode === 'append') setLoadingMore(false);
    }
  };

  useEffect(() => {
    void logClassTabEvent({
      classId,
      tab: 'logs',
      event: 'mount',
      stage: 'ui',
      level: 'info',
    });
    void loadLogs('replace');
  }, [classId]);

  const metadataUserFromLabels = (log: AuditLog, key: string): string | null => {
    const labels = log.metadata_user_labels || {};
    return labels[key] || null;
  };

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((log) => {
      const logCategory = categorizeLog(log);
      if (category !== 'all' && logCategory !== category) return false;
      if (quickPreset !== 'none') {
        const metadata = log.metadata || {};
        if (quickPreset === 'pending_teacher_joins') {
          const isJoinRequest = String(log.action).includes('teacher_join_request_created');
          if (!isJoinRequest) return false;
        }
        if (quickPreset === 'invite_codes_used') {
          const isUsedCode = String(log.action).includes('teacher_invite_code_used');
          const hasUsedBy = Boolean(metadata.used_by || metadata.used_by_user_id || metadataUserFromLabels(log, 'used_by'));
          if (!isUsedCode && !hasUsedBy) return false;
        }
        if (quickPreset === 'rejected_requests') {
          if (!String(log.action).includes('rejected')) return false;
        }
        if (quickPreset === 'config_changes') {
          const configActions = ['update_preferences', 'update_profile', 'regenerate_invite_codes'];
          if (!configActions.some((a) => String(log.action).includes(a))) return false;
        }
      }
      if (!q) return true;

      const actor = formatActor(log).toLowerCase();
      const action = formatAction(log.action).toLowerCase();
      const entity = (log.entity_type || '').toLowerCase();
      const metadataText = JSON.stringify(log.metadata || {}).toLowerCase();

      return actor.includes(q) || action.includes(q) || entity.includes(q) || metadataText.includes(q);
    });
  }, [logs, search, category, quickPreset]);

  const counts = useMemo(() => {
    const base: Record<Category, number> = {
      all: logs.length,
      teacher_invites: 0,
      join_requests: 0,
      settings: 0,
      attendance: 0,
      grades: 0,
      subjects: 0,
      assignments: 0,
      other: 0,
    };
    for (const log of logs) {
      base[categorizeLog(log)] += 1;
    }
    return base;
  }, [logs]);

  const categories: Category[] = ['all', 'teacher_invites', 'join_requests', 'settings', 'attendance', 'grades', 'subjects', 'assignments', 'other'];
  const presets: Array<{ id: QuickPreset; label: string }> = [
    { id: 'none', label: 'No preset' },
    { id: 'pending_teacher_joins', label: 'Pending teacher joins' },
    { id: 'invite_codes_used', label: 'Invite codes used' },
    { id: 'rejected_requests', label: 'Rejected requests' },
    { id: 'config_changes', label: 'Config changes' },
  ];

  const getCategoryClass = (categoryName: Category) => {
    switch (categoryName) {
      case 'teacher_invites':
        return 'bg-blue-900/90 text-white border-blue-700';
      case 'join_requests':
        return 'bg-sky-700/90 text-white border-sky-600';
      case 'settings':
        return 'bg-pink-100 text-pink-700 border-pink-300';
      case 'attendance':
        return 'bg-rose-100 text-rose-700 border-rose-300';
      case 'grades':
        return 'bg-emerald-100 text-emerald-700 border-emerald-300';
      case 'subjects':
        return 'bg-amber-100 text-amber-700 border-amber-300';
      case 'assignments':
        return 'bg-violet-100 text-violet-700 border-violet-300';
      default:
        return 'bg-muted text-foreground border-border';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Logs</CardTitle>
          <CardDescription>
            Full class activity timeline by category: who did what, when, and request outcomes.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <Button
                key={preset.id}
                variant={quickPreset === preset.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setQuickPreset(preset.id)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder=""
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="h-10 rounded-md border border-input bg-background px-3 text-sm"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]} ({counts[c]})
                </option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => void loadLogs()}>
                Refresh
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  void loadLogs('append');
                }}
                disabled={!hasNext || loadingMore}
              >
                {loadingMore ? 'Loading...' : 'Load more'}
              </Button>
            </div>
          </div>
          <div className="text-xs text-muted-foreground">
            Showing {filteredLogs.length} of {totalCount || logs.length} logs
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="text-center py-10 text-muted-foreground">Loading logs...</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">No logs found for this filter.</div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <div key={log.id} className="rounded-lg border p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="font-medium truncate capitalize">{formatAction(log.action)}</p>
                      <Badge variant="outline" className={getCategoryClass(categorizeLog(log))}>
                        {CATEGORY_LABELS[categorizeLog(log)]}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground shrink-0">{new Date(log.created_at).toLocaleString()}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">{formatActor(log)}</span> on <span className="font-mono">{log.entity_type}</span>
                    {log.entity_id ? `:${log.entity_id}` : ''}
                  </p>
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
