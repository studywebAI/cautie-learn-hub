'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Plus, Calendar, CheckCircle, XCircle, Clock, UserX } from 'lucide-react';

type AttendanceSession = {
  id: string;
  title: string;
  date: string;
  start_time?: string;
  end_time?: string;
  is_active: boolean;
  attendance_records: Array<{
    id: string;
    user_id: string;
    status: string;
    marked_at: string;
    notes?: string;
    profiles: {
      full_name: string;
      avatar_url?: string;
    } | null;
  }>;
};

type Student = {
  user_id: string;
  role: string;
  profiles: {
    full_name: string;
    avatar_url?: string;
  } | null;
};

type AttendanceManagerProps = {
  classId: string;
  className: string;
};

export function AttendanceManager({ classId, className }: AttendanceManagerProps) {
  const [sessions, setSessions] = useState<AttendanceSession[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newSession, setNewSession] = useState({
    title: '',
    date: new Date().toISOString().split('T')[0],
    startTime: '',
    endTime: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchAttendanceData();
  }, [classId]);

  const fetchAttendanceData = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/classes/${classId}/attendance`);
      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions);
        setStudents(data.students);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Failed to load attendance data',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load attendance data',
      });
    }
    setIsLoading(false);
  };

  const createSession = async () => {
    try {
      const response = await fetch(`/api/classes/${classId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSession)
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Attendance session created successfully',
        });
        setShowCreateDialog(false);
        setNewSession({
          title: '',
          date: new Date().toISOString().split('T')[0],
          startTime: '',
          endTime: ''
        });
        fetchAttendanceData();
      } else {
        const error = await response.json();
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.error || 'Failed to create session',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to create session',
      });
    }
  };

  const markAttendance = async (sessionId: string, studentId: string, status: string) => {
    try {
      const response = await fetch('/api/attendance/mark', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, studentId, status })
      });

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Attendance marked successfully',
        });
        fetchAttendanceData();
      } else {
        const error = await response.json();
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.error || 'Failed to mark attendance',
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to mark attendance',
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'absent':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'late':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'excused':
        return <UserX className="h-4 w-4 text-blue-500" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      present: 'default',
      absent: 'destructive',
      late: 'secondary',
      excused: 'outline'
    } as const;

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-3/4"></div>
                <div className="h-3 bg-muted rounded w-1/2"></div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Attendance Management</h2>
          <p className="text-muted-foreground">{className}</p>
        </div>

        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Session
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Attendance Session</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Session Title</Label>
                <Input
                  id="title"
                  value={newSession.title}
                  onChange={(e) => setNewSession(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="e.g., Week 1 Lecture"
                />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={newSession.date}
                  onChange={(e) => setNewSession(prev => ({ ...prev, date: e.target.value }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={newSession.startTime}
                    onChange={(e) => setNewSession(prev => ({ ...prev, startTime: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={newSession.endTime}
                    onChange={(e) => setNewSession(prev => ({ ...prev, endTime: e.target.value }))}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={createSession} disabled={!newSession.title}>
                  Create Session
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4">
        {sessions.map((session) => (
          <Card key={session.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {session.title}
                    {session.is_active && (
                      <Badge variant="outline">Active</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {new Date(session.date).toLocaleDateString()}
                    {session.start_time && ` ${session.start_time}`}
                    {session.end_time && ` - ${session.end_time}`}
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Marked At</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => {
                    const record = session.attendance_records.find(r => r.user_id === student.user_id);
                    return (
                      <TableRow key={student.user_id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={student.profiles?.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {student.profiles?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {student.profiles?.full_name || 'Unknown Student'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {record ? getStatusBadge(record.status) : <Badge variant="outline">Not marked</Badge>}
                        </TableCell>
                        <TableCell>
                          {record ? new Date(record.marked_at).toLocaleString() : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {(['present', 'absent', 'late', 'excused'] as const).map((status) => (
                              <Button
                                key={status}
                                variant={record?.status === status ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => markAttendance(session.id, student.user_id, status)}
                              >
                                {getStatusIcon(status)}
                                <span className="sr-only">{status}</span>
                              </Button>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        ))}

        {sessions.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No attendance sessions yet</h3>
              <p className="text-muted-foreground text-center mb-4">
                Create your first attendance session to start tracking student attendance.
              </p>
              <Button onClick={() => setShowCreateDialog(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create First Session
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}