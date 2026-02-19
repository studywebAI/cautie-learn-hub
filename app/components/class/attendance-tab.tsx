'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Check, X, AlertCircle, MessageSquare, CheckCircle, Clock, BookOpen, UserMinus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type StudentAttendance = {
  id: string;
  name: string;
  avatarUrl: string | null;
  isPresent: boolean | null;
  hasHomeworkIncomplete: boolean;
  wasSentOut: boolean;
  wasTooLate: boolean;
  note: string | null;
  noteCreatedAt: string | null;
  notedBy: string | null;
  stats: {
    totalAbsent: number;
    totalHomeworkIncomplete: number;
    totalSentOut: number;
    totalTooLate: number;
  };
};

type AttendanceTabProps = {
  classId: string;
};

export function AttendanceTab({ classId }: AttendanceTabProps) {
  const [students, setStudents] = useState<StudentAttendance[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<StudentAttendance | null>(null);
  const [isNoteDialogOpen, setIsNoteDialogOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    studentId: string;
    isPresent: boolean;
    hasHomeworkIncomplete?: boolean;
    wasSentOut?: boolean;
    wasTooLate?: boolean;
  } | null>(null);
  const { toast } = useToast();

  // Check if data was passed via props (from cache) or fetch it
  const fetchAttendance = async (forceRefresh = false) => {
    // If we already have students and not forcing refresh, skip
    if (!forceRefresh && students.length > 0) {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`/api/classes/${classId}/attendance`);
      if (response.ok) {
        const data = await response.json();
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [classId]);

  // Method to refresh data after making changes
  const refreshData = useCallback(() => {
    fetchAttendance(true);
  }, []);

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleAttendanceToggle = (studentId: string, isPresent: boolean) => {
    setPendingAction({ studentId, isPresent });
    setIsConfirmDialogOpen(true);
  };

  const handleConfirm = async () => {
    if (!pendingAction) return;

    try {
      const response = await fetch(`/api/classes/${classId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pendingAction)
      });

      if (response.ok) {
        toast({ title: 'Attendance updated' });
        fetchAttendance();
      }
    } catch (error) {
      console.error('Failed to update attendance:', error);
    }

    setIsConfirmDialogOpen(false);
    setPendingAction(null);
  };

  const handleSaveNote = async () => {
    if (!selectedStudent || !noteText.trim()) return;

    try {
      const response = await fetch(`/api/classes/${classId}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          isPresent: selectedStudent.isPresent ?? true,
          note: noteText.trim()
        })
      });

      if (response.ok) {
        toast({ title: 'Note saved' });
        fetchAttendance();
      }
    } catch (error) {
      console.error('Failed to save note:', error);
    }

    setIsNoteDialogOpen(false);
    setNoteText('');
  };

  const handleCheckbox = (studentId: string, field: 'hasHomeworkIncomplete' | 'wasSentOut' | 'wasTooLate', value: boolean) => {
    const student = students.find(s => s.id === studentId);
    if (!student) return;

    setPendingAction({
      studentId,
      isPresent: student.isPresent ?? true,
      [field]: value
    });
    setIsConfirmDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Attendance</h2>
        <p className="text-sm text-muted-foreground">{students.length} students</p>
      </div>

      <div className="space-y-3">
        {students.map(student => (
          <Card key={student.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <Avatar className="h-10 w-10">
                  <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                </Avatar>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{student.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {student.note && (
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        Note
                      </span>
                    )}
                  </div>
                </div>

                {/* V or X - Present/Absent */}
                <div className="flex items-center gap-1">
                  <Button
                    variant={student.isPresent === true ? 'default' : 'outline'}
                    size="sm"
                    className={`h-8 w-8 p-0 ${student.isPresent === true ? 'bg-green-500 hover:bg-green-600' : ''}`}
                    onClick={() => handleAttendanceToggle(student.id, true)}
                    title="Present (V)"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={student.isPresent === false ? 'destructive' : 'outline'}
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={() => handleAttendanceToggle(student.id, false)}
                    title="Absent (X)"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="h-6 w-px bg-border"></div>

                {/* Checkboxes */}
                <div className="flex items-center gap-2">
                  <Button
                    variant={student.hasHomeworkIncomplete ? 'destructive' : 'outline'}
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => handleCheckbox(student.id, 'hasHomeworkIncomplete', !student.hasHomeworkIncomplete)}
                    title="Homework Incomplete"
                  >
                    <BookOpen className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={student.wasSentOut ? 'destructive' : 'outline'}
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => handleCheckbox(student.id, 'wasSentOut', !student.wasSentOut)}
                    title="Sent Out"
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={student.wasTooLate ? 'destructive' : 'outline'}
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => handleCheckbox(student.id, 'wasTooLate', !student.wasTooLate)}
                    title="Too Late"
                  >
                    <Clock className="h-4 w-4" />
                  </Button>
                </div>

                <div className="h-6 w-px bg-border"></div>

                {/* Note button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedStudent(student);
                    setNoteText(student.note || '');
                    setIsNoteDialogOpen(true);
                  }}
                >
                  <MessageSquare className="h-4 w-4" />
                </Button>

                {/* Stats */}
                <div className="flex items-center gap-2 text-xs">
                  {student.stats.totalAbsent > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      <X className="h-3 w-3 mr-1" />
                      {student.stats.totalAbsent}
                    </Badge>
                  )}
                  {student.stats.totalHomeworkIncomplete > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {student.stats.totalHomeworkIncomplete}
                    </Badge>
                  )}
                  {student.stats.totalSentOut > 0 && (
                    <Badge variant="destructive" className="text-xs">
                      <UserMinus className="h-3 w-3 mr-1" />
                      {student.stats.totalSentOut}
                    </Badge>
                  )}
                  {student.stats.totalTooLate > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="h-3 w-3 mr-1" />
                      {student.stats.totalTooLate}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Note preview */}
              {student.note && (
                <div className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded">
                  {student.note}
                  {student.noteCreatedAt && (
                    <span className="ml-2">
                      {new Date(student.noteCreatedAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {students.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No students in this class yet.
          </CardContent>
        </Card>
      )}

      {/* Confirm Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Attendance</DialogTitle>
            <DialogDescription>
              Are you sure you want to update this student's attendance?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirm}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={isNoteDialogOpen} onOpenChange={setIsNoteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Note for {selectedStudent?.name}</DialogTitle>
            <DialogDescription>
              Add a note that other teachers can see.
            </DialogDescription>
          </DialogHeader>
          <textarea
            className="w-full min-h-[100px] p-3 border rounded-md"
            placeholder="Enter note..."
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsNoteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveNote}>
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
