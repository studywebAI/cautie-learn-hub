'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreVertical, User, Copy, QrCode, Link as LinkIcon, Users, GraduationCap, UserPlus, CheckSquare, Trash2, Mail, Loader2 } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import type { Student } from '@/lib/teacher-types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

type StudentInviteDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  classInfo: { id: string; name: string; join_code: string | null };
};

function StudentInviteDialog({ isOpen, setIsOpen, classInfo }: StudentInviteDialogProps) {
    const { toast } = useToast();
    const [joinCode, setJoinCode] = useState(classInfo.join_code || '');
    const [isLoadingCode, setIsLoadingCode] = useState(true);

    useEffect(() => {
        if (isOpen && classInfo.id) {
            setIsLoadingCode(true);
            fetch(`/api/classes/${classInfo.id}`)
                .then(response => response.json())
                .then(data => {
                    if (data.class) {
                        setJoinCode(data.class.join_code || '');
                    }
                })
                .catch(error => {
                    console.error('Failed to fetch join code:', error);
                })
                .finally(() => {
                    setIsLoadingCode(false);
                });
        }
    }, [isOpen, classInfo.id]);

    const studentInviteLink = joinCode ? `${window.location.origin}/classes?join_code=${joinCode}` : '';
    const studentQrCodeUrl = studentInviteLink ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(studentInviteLink)}&format=png` : '';

    const copyToClipboard = (text: string, type: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Copied to Clipboard!",
            description: `The ${type} has been copied.`,
        });
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Invite Students</DialogTitle>
                    <DialogDescription>
                        Share this code with your students to join the class.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="flex flex-col items-center gap-4">
                    {studentInviteLink && !isLoadingCode && (
                        <div className="p-4 bg-white rounded-lg border">
                            <img src={studentQrCodeUrl} alt="Student Invite QR Code" width={200} height={200} className="rounded" />
                        </div>
                    )}
                    {isLoadingCode && (
                        <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    )}
                    <div className='w-full space-y-2'>
                        <p className='text-sm font-medium text-muted-foreground'>Student Join Code</p>
                        <div className="flex w-full items-center space-x-2">
                           <Input type="text" value={joinCode || 'Loading...'} readOnly disabled={isLoadingCode} />
                           <Button type="submit" size="icon" onClick={() => copyToClipboard(joinCode, 'student code')} disabled={isLoadingCode || !joinCode}>
                             <Copy className="h-4 w-4" />
                           </Button>
                        </div>
                    </div>
                    {studentInviteLink && (
                        <div className='w-full space-y-2'>
                            <p className='text-sm font-medium text-muted-foreground'>Invite Link</p>
                            <div className="flex w-full items-center space-x-2">
                               <Input type="text" value={studentInviteLink} readOnly />
                               <Button type="submit" size="icon" onClick={() => copyToClipboard(studentInviteLink, 'student invite link')}>
                                 <LinkIcon className="h-4 w-4" />
                               </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

type TeacherInviteDialogProps = {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  classInfo: { id: string; name: string; teacher_join_code: string | null };
};

function TeacherInviteDialog({ isOpen, setIsOpen, classInfo }: TeacherInviteDialogProps) {
    const { toast } = useToast();
    const [teacherJoinCode, setTeacherJoinCode] = useState(classInfo.teacher_join_code || '');
    const [isLoadingCode, setIsLoadingCode] = useState(true);

    useEffect(() => {
        if (isOpen && classInfo.id) {
            setIsLoadingCode(true);
            fetch(`/api/classes/${classInfo.id}`)
                .then(response => response.json())
                .then(data => {
                    if (data.class) {
                        setTeacherJoinCode(data.class.teacher_join_code || '');
                    }
                })
                .catch(error => {
                    console.error('Failed to fetch teacher join code:', error);
                })
                .finally(() => {
                    setIsLoadingCode(false);
                });
        }
    }, [isOpen, classInfo.id]);

    const teacherInviteLink = teacherJoinCode ? `${window.location.origin}/classes/join/${teacherJoinCode}` : '';

    const copyToClipboard = (text: string, type: string) => {
        navigator.clipboard.writeText(text);
        toast({
            title: "Copied to Clipboard!",
            description: `The ${type} has been copied.`,
        });
    }

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Invite Teachers</DialogTitle>
                    <DialogDescription>
                        Share this code with other teachers to invite them to collaborate in this class.
                    </DialogDescription>
                </DialogHeader>
                
                <div className="flex flex-col items-center gap-4">
                    {isLoadingCode && (
                        <div className="flex items-center justify-center p-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                        </div>
                    )}
                    <div className='w-full space-y-2'>
                        <p className='text-sm font-medium text-muted-foreground'>Teacher Join Code</p>
                        <div className="flex w-full items-center space-x-2">
                           <Input type="text" value={teacherJoinCode || 'Loading...'} readOnly disabled={isLoadingCode} />
                           <Button type="submit" size="icon" onClick={() => copyToClipboard(teacherJoinCode, 'teacher code')} disabled={isLoadingCode || !teacherJoinCode}>
                             <Copy className="h-4 w-4" />
                           </Button>
                        </div>
                    </div>
                    {teacherInviteLink && (
                        <div className='w-full space-y-2'>
                            <p className='text-sm font-medium text-muted-foreground'>Invite Link</p>
                            <div className="flex w-full items-center space-x-2">
                               <Input type="text" value={teacherInviteLink} readOnly />
                               <Button type="submit" size="icon" onClick={() => copyToClipboard(teacherInviteLink, 'teacher invite link')}>
                                 <LinkIcon className="h-4 w-4" />
                               </Button>
                            </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}


type StudentListProps = {
  students: Student[];
  isLoading: boolean;
  classInfo?: { id: string; name: string; join_code?: string | null; teacher_join_code?: string | null };
};

export function StudentList({ students, isLoading, classInfo }: StudentListProps) {
    const [isStudentInviteOpen, setIsStudentInviteOpen] = useState(false);
    const [isTeacherInviteOpen, setIsTeacherInviteOpen] = useState(false);
    const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
    const [isBulkMode, setIsBulkMode] = useState(false);
    const [isRemoving, setIsRemoving] = useState(false);
    const { toast } = useToast();

    const toggleSelectAll = () => {
        if (selectedStudents.size === students.length) {
            setSelectedStudents(new Set());
        } else {
            setSelectedStudents(new Set(students.map(s => s.id)));
        }
    };

    const toggleStudent = (studentId: string) => {
        const newSelected = new Set(selectedStudents);
        if (newSelected.has(studentId)) {
            newSelected.delete(studentId);
        } else {
            newSelected.add(studentId);
        }
        setSelectedStudents(newSelected);
    };

    const removeSelectedStudents = async () => {
        if (!classInfo?.id || selectedStudents.size === 0) return;
        
        setIsRemoving(true);
        try {
            const response = await fetch(`/api/classes/${classInfo.id}/members/bulk`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_ids: Array.from(selectedStudents) })
            });

            if (response.ok) {
                toast({ title: `Removed ${selectedStudents.size} student(s) successfully` });
                setSelectedStudents(new Set());
                setIsBulkMode(false);
                window.location.reload();
            } else {
                const data = await response.json();
                toast({ title: 'Failed to remove students', description: data.error, variant: 'destructive' });
            }
        } catch (error) {
            console.error('Failed to remove students:', error);
            toast({ title: 'Failed to remove students', variant: 'destructive' });
        } finally {
            setIsRemoving(false);
        }
    };

    const editDisplayName = async (userId: string, currentName: string | null | undefined) => {
        if (!classInfo?.id) return;
        const nextName = prompt('Enter new display name', currentName || '');
        if (nextName === null) return;

        try {
            const response = await fetch(`/api/classes/${classInfo.id}/members`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: userId, display_name: nextName.trim() })
            });

            if (response.ok) {
                toast({ title: 'Name updated' });
                window.location.reload();
            } else {
                const data = await response.json();
                toast({ title: 'Failed to update name', description: data.error, variant: 'destructive' });
            }
        } catch (error) {
            console.error('Failed to update name:', error);
            toast({ title: 'Failed to update name', variant: 'destructive' });
        }
    };

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="font-headline">Students</CardTitle>
          <CardDescription>All students enrolled in this class.</CardDescription>
        </div>
        <div className="flex gap-2">
            {isBulkMode && selectedStudents.size > 0 && (
                <Button variant="destructive" size="sm" onClick={removeSelectedStudents} disabled={isRemoving}>
                    {isRemoving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Remove ({selectedStudents.size})
                </Button>
            )}
            <Button 
                variant={isBulkMode ? "default" : "outline"} 
                size="sm" 
                onClick={() => {
                    setIsBulkMode(!isBulkMode);
                    if (!isBulkMode) setSelectedStudents(new Set());
                }}
            >
                <CheckSquare className="mr-2 h-4 w-4" />
                {isBulkMode ? 'Done' : 'Select'}
            </Button>
            <Button variant="outline" onClick={() => setIsTeacherInviteOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Add Teacher
            </Button>
            <Button variant="outline" onClick={() => setIsStudentInviteOpen(true)}>
                <QrCode className="mr-2 h-4 w-4" />
                Invite Students
            </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className='flex-1 space-y-2'>
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : students.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">No students have joined this class yet. Share the class code to invite them.</p>
        ) : (
          <>
            {isBulkMode && (
                <div className="flex items-center gap-2 pb-2 border-b">
                    <Checkbox 
                        checked={selectedStudents.size === students.length && students.length > 0}
                        onCheckedChange={toggleSelectAll}
                    />
                    <span className="text-sm text-muted-foreground">Select all ({students.length})</span>
                </div>
            )}
            {students.map((student) => (
            <div key={student.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isBulkMode && (
                    <Checkbox 
                        checked={selectedStudents.has(student.id)}
                        onCheckedChange={() => toggleStudent(student.id)}
                    />
                )}
                <Avatar>
                  <AvatarImage src={student.avatarUrl || undefined} alt={student.name || 'Student'} />
                  <AvatarFallback>{student.name ? student.name.split(' ').map(n => n[0]).join('') : <User />}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">{student.name || student.email}</p>
                  <p className="text-xs text-muted-foreground">{student.email || 'No email'}</p>
                  {/* Progress will render here once per-student analytics is connected. */}
                </div>
              </div>
              {!isBulkMode && (
               <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                          <span className="sr-only">Student options</span>
                      </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => editDisplayName(student.id, student.name)}>
                        Edit name
                      </DropdownMenuItem>
                      <DropdownMenuItem>View Progress</DropdownMenuItem>
                      <DropdownMenuItem>Send Message</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">Remove from Class</DropdownMenuItem>
                  </DropdownMenuContent>
               </DropdownMenu>
              )}
            </div>
          ))}
          </>
        )}
      </CardContent>
    </Card>
    {classInfo && (
        <>
            <StudentInviteDialog 
                isOpen={isStudentInviteOpen} 
                setIsOpen={setIsStudentInviteOpen} 
                classInfo={{ id: classInfo.id, name: classInfo.name, join_code: classInfo.join_code ?? null }} 
            />
            <TeacherInviteDialog 
                isOpen={isTeacherInviteOpen} 
                setIsOpen={setIsTeacherInviteOpen} 
                classInfo={{ id: classInfo.id, name: classInfo.name, teacher_join_code: classInfo.teacher_join_code ?? null }} 
            />
        </>
    )}
    </>
  );
}


