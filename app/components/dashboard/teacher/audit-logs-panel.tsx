'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, User, BookOpen, FileText, Settings, Plus, Edit, Trash2 } from 'lucide-react';

type AuditLog = {
  id: string;
  user_id: string;
  class_id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details: Record<string, any>;
  created_at: string;
  user_name?: string;
};

type AuditLogsPanelProps = {
  classId: string;
};

export function AuditLogsPanel({ classId }: AuditLogsPanelProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, [classId]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/classes/${classId}/audit-logs`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      }
    } catch (error) {
      console.error('Failed to fetch audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getActionIcon = (action: string) => {
    if (action.includes('create') || action.includes('add')) return <Plus className="h-4 w-4" />;
    if (action.includes('edit') || action.includes('update')) return <Edit className="h-4 w-4" />;
    if (action.includes('delete') || action.includes('remove')) return <Trash2 className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const getActionBadge = (action: string) => {
    if (action.includes('create') || action.includes('add')) return <Badge className="bg-green-500">Created</Badge>;
    if (action.includes('edit') || action.includes('update')) return <Badge className="bg-blue-500">Updated</Badge>;
    if (action.includes('delete') || action.includes('remove')) return <Badge variant="destructive">Deleted</Badge>;
    return <Badge variant="secondary">{action}</Badge>;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-headline flex items-center gap-2">
          <History className="h-5 w-5" />
          Activity Log
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">
            <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No activity recorded yet.</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {logs.map(log => (
                <div key={log.id} className="flex items-start gap-3 p-3 border rounded-lg">
                  <div className="mt-1">
                    {getActionIcon(log.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium capitalize">{log.action.replace(/_/g, ' ')}</span>
                      {getActionBadge(log.action)}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {log.entity_type} • {log.user_name || 'Unknown user'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(log.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
