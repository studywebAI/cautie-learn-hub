'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CheckCircle, XCircle, Clock, Users, Plus, Calendar } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type AttendanceSession = {
  id: string;
  date: string;
  is_active: boolean;
  attendance_records: {
    user_id: string;
    status: 'present' | 'absent' | 'late' | 'excused';
    student_name?: string;
  }[];
};

type AttendancePanelProps = {
  classId: string;
};

export function AttendancePanel({ classId }: AttendancePanelProps) {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchSessions();
  }, [classId]);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/classes/${classId}/attendance`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const createSession = async () => {
    setIsCreating(true);
    try {
      const response = await fetch(`/api/classes/${classId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: new Date().toISOString() })
      });

      if (response.ok) {
        toast({ title: 'Attendance session created' });
        fetchSessions();
      }
    } catch (error) {
      console.error('Failed to create session:', error);
      toast({ title: 'Failed to create session', variant: 'destructive' });
    } finally {
      setIsCreating(false);
    }
  };

  const getStatusCounts = (session: AttendanceSession) => {
    const records = session.attendance_records || [];
    return {
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      late: records.filter(r => r.status === 'late').length,
      excused: records.filter(r => r.status === 'excused').length,
    };
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-headline flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Attendance
          </CardTitle>
        </div>
        <Button size="sm" onClick={createSession} disabled={isCreating}>
          <Plus className="mr-2 h-4 w-4" />
          Take Attendance
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-8">
            <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No attendance sessions yet.</p>
            <p className="text-sm text-muted-foreground">Click "Take Attendance" to start tracking.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sessions.slice(0, 5).map(session => {
              const counts = getStatusCounts(session);
              const total = Object.values(counts).reduce((a, b) => a + b, 0);
              return (
                <div key={session.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <p className="font-medium">{new Date(session.date).toLocaleDateString()}</p>
                    <p className="text-sm text-muted-foreground">{total} students</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant="default" className="bg-green-500">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      {counts.present}
                    </Badge>
                    <Badge variant="destructive">
                      <XCircle className="mr-1 h-3 w-3" />
                      {counts.absent}
                    </Badge>
                    <Badge variant="secondary">
                      <Clock className="mr-1 h-3 w-3" />
                      {counts.late}
                    </Badge>
                  </div>
                </div>
              );
            })}
            {sessions.length > 5 && (
              <p className="text-sm text-muted-foreground text-center">
                +{sessions.length - 5} more sessions
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
