'use client';

import { useState, useContext, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JoinClassDialog } from './join-class-dialog';
import { PlusCircle, Search } from 'lucide-react';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { ClassCard } from '../teacher/class-card';
import Loader from '@/components/ui/loader';
import { useToast } from '@/hooks/use-toast';


export function StudentClasses() {
  const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
  const [initialCode, setInitialCode] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const { classes, isLoading, refetchClasses, session } = useContext(AppContext) as AppContextType;
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const joinCode = searchParams.get('join_code');
    if (joinCode) {
      if (!session) {
        toast({
          variant: 'destructive',
          title: 'You must be logged in',
          description: 'Please log in to join a class.',
        });
        // Redirect to login but keep the join_code in the URL
        router.push(`/login?redirect=/classes?join_code=${joinCode}`);
        return;
      }
      setInitialCode(joinCode);
      setIsJoinDialogOpen(true);
      // Clean the URL
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('join_code');
      router.replace(newUrl.toString(), { scroll: false });
    }
  }, [searchParams, router, toast, session]);


  const handleClassJoined = async (classCode: string): Promise<boolean | { success?: boolean; alreadyJoined?: boolean; message?: string }> => {
    if (!session) {
        toast({
            variant: 'destructive',
            title: 'You must be logged in',
            description: 'Please log in or create an account to join a class.',
        });
        return false;
    }
    
    const normalizedCode = classCode.trim();
    if (!normalizedCode) {
      toast({
        variant: 'destructive',
        title: 'Could not join class',
        description: 'Please enter a valid class code.',
      });
      return false;
    }

    try {
      const response = await fetch('/api/classes/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_code: normalizedCode }),
      });

      const data = await response.json();

      // Check if already a member (API returns 200 with alreadyJoined flag)
      if (response.ok && data.alreadyJoined) {
        await refetchClasses();
        return { success: true, alreadyJoined: true, message: data.message };
      }

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join class.');
      }

      await refetchClasses();
      return true;
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not join class',
        description: error.message,
      });
      return false;
    }
  };

  const handleLeaveClass = async (classId: string, className: string) => {
    const confirmed = window.confirm(`Leave "${className}"?`);
    if (!confirmed) return;

    try {
      const response = await fetch(`/api/classes/${classId}/members`, {
        method: 'DELETE',
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data?.error || 'Failed to leave class.');
      }

      toast({
        title: 'Left class',
        description: `You left ${className}.`,
      });
      await refetchClasses();
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not leave class',
        description: error?.message || 'Try again.',
      });
    }
  };
  
  // For students, the /api/classes endpoint already returns only classes they're members of.
  // No need to filter by user_id — just apply search filter.
  const enrolledClasses = classes
    .filter(cls =>
      cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cls.description && cls.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  if (isLoading || !classes) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <CautieLoader label="Loading classes" sublabel="Fetching your enrolled classes" size="lg" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="page-title">My Classes</h1>
          <p className="page-subtitle mt-0.5">Classes you are enrolled in</p>
        </div>
        <Button onClick={() => {
            setInitialCode(undefined);
            setIsJoinDialogOpen(true);
        }}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Join a Class
        </Button>
      </div>

      {enrolledClasses.length > 3 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search classes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      )}

      {enrolledClasses.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed p-12 text-center">
          <div className="flex flex-col items-center gap-2">
            <h3 className="page-title">You are not in any classes yet.</h3>
            <p className="page-subtitle">
              Join a class using a code from your teacher to get started.
            </p>
            <Button className="mt-4" onClick={() => {
                 setInitialCode(undefined);
                 setIsJoinDialogOpen(true);
            }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Join a Class
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {enrolledClasses.map((classInfo) => (
            <div key={classInfo.id} className="space-y-2">
              <ClassCard classInfo={classInfo} isArchived={false} />
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground hover:text-destructive text-xs"
                onClick={() => handleLeaveClass(classInfo.id, classInfo.name)}
              >
                Leave class
              </Button>
            </div>
          ))}
        </div>
      )}

      <JoinClassDialog
        isOpen={isJoinDialogOpen}
        setIsOpen={setIsJoinDialogOpen}
        onClassJoined={handleClassJoined}
        initialCode={initialCode}
      />
    </div>
  );
}
