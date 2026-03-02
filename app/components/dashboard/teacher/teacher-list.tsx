'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreVertical, User, Crown, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect } from 'react';

type Teacher = {
  id: string;
  user_id: string;
  role: 'teacher' | 'management' | 'owner';
  created_at: string;
  profile?: {
    full_name: string | null;
    email?: string | null;
    avatar_url: string | null;
  };
};

type TeacherListProps = {
  classId: string;
  currentUserId: string;
  isLoading: boolean;
  classOwnerId: string;
};

export function TeacherList({ classId, currentUserId, isLoading, classOwnerId }: TeacherListProps) {
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [loadingTeachers, setLoadingTeachers] = useState(true);
    const { toast } = useToast();
    
    const isOwner = classOwnerId === currentUserId;

    useEffect(() => {
        fetchTeachers();
    }, [classId]);

    const fetchTeachers = async () => {
        setLoadingTeachers(true);
        try {
            const response = await fetch(`/api/classes/${classId}/members`);
            if (response.ok) {
                const data = await response.json();
                const teachersOnly = data.filter((m: any) => m.role === 'teacher' || m.role === 'owner' || m.role === 'management');
                setTeachers(teachersOnly);
            }
        } catch (error) {
            console.error('Failed to fetch teachers:', error);
        } finally {
            setLoadingTeachers(false);
        }
    };

    const removeTeacher = async (teacherId: string) => {
        try {
            const response = await fetch(`/api/classes/${classId}/members`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: teacherId })
            });
            
            if (response.ok) {
                toast({ title: 'Teacher removed successfully' });
                fetchTeachers();
            } else {
                const data = await response.json();
                toast({ title: 'Failed to remove teacher', description: data.error, variant: 'destructive' });
            }
        } catch (error) {
            console.error('Failed to remove teacher:', error);
            toast({ title: 'Failed to remove teacher', variant: 'destructive' });
        }
    };

    const editDisplayName = async (teacherId: string, currentName: string | null | undefined) => {
        const nextName = prompt('Enter new display name', currentName || '');
        if (nextName === null) return;

        try {
            const response = await fetch(`/api/classes/${classId}/members`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: teacherId, display_name: nextName.trim() })
            });

            if (response.ok) {
                toast({ title: 'Name updated' });
                fetchTeachers();
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
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle className="font-headline">Teachers</CardTitle>
                    <CardDescription>Teachers collaborating in this class.</CardDescription>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                {loadingTeachers || isLoading ? (
                    <div className="space-y-4">
                        {[...Array(2)].map((_, i) => (
                            <div key={i} className="flex items-center gap-3">
                                <Skeleton className="h-10 w-10 rounded-full" />
                                <div className='flex-1 space-y-2'>
                                    <Skeleton className="h-4 w-2/3" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : teachers.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No other teachers in this class yet. Use the "Add Teacher" button to invite colleagues.
                    </p>
                ) : (
                    teachers.map((teacher) => (
                        <div key={teacher.id} className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Avatar>
                                    <AvatarImage src={teacher.profile?.avatar_url || undefined} alt={teacher.profile?.full_name || 'Teacher'} />
                                    <AvatarFallback>
                                        {teacher.profile?.full_name ? teacher.profile.full_name.split(' ').map(n => n[0]).join('') : <User />}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                     <div className="flex items-center gap-2">
                                        <p className="font-medium">{teacher.profile?.full_name || (teacher.profile?.email ? teacher.profile.email.split('@')[0] : 'Unknown Teacher')}</p>
                                         {teacher.role === 'owner' && (
                                             <Crown className="h-4 w-4 text-yellow-500" />
                                         )}
                                     </div>
                                     <p className="text-xs text-muted-foreground">{teacher.profile?.email || 'No email'}</p>
                                     <p className="text-xs text-muted-foreground capitalize">{teacher.role}</p>
                                 </div>
                             </div>
                            {(teacher.user_id !== currentUserId) && (
                                 <DropdownMenu>
                                     <DropdownMenuTrigger asChild>
                                         <Button variant="ghost" size="icon">
                                            <MoreVertical className="h-4 w-4" />
                                            <span className="sr-only">Teacher options</span>
                                        </Button>
                                     </DropdownMenuTrigger>
                                     <DropdownMenuContent align="end">
                                         <DropdownMenuItem onClick={() => editDisplayName(teacher.user_id, teacher.profile?.full_name)}>
                                             Edit name
                                         </DropdownMenuItem>
                                         {isOwner && teacher.role !== 'owner' && (
                                         <DropdownMenuItem 
                                             className="text-destructive"
                                             onClick={() => removeTeacher(teacher.user_id)}
                                         >
                                             <Trash2 className="mr-2 h-4 w-4" />
                                             Remove from class
                                         </DropdownMenuItem>
                                         )}
                                     </DropdownMenuContent>
                                 </DropdownMenu>
                             )}
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}
