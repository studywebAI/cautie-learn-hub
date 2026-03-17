
'use client';

import { Suspense, useContext, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { StudentClasses } from '@/components/dashboard/student/student-classes';
import { useToast } from '@/hooks/use-toast';

function ClassesPageContent() {
  const { role, session, refetchClasses, classes } = useContext(AppContext) as AppContextType;
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const joinCode = searchParams.get('join_code');
    if (joinCode) {
      const joinClass = async () => {
        const normalizedCode = joinCode.trim();
        if (!normalizedCode) {
          toast({
            variant: 'destructive',
            title: 'Could not join class',
            description: 'Join code is empty.',
          });
          return;
        }

        if (!session) {
          toast({
            variant: 'destructive',
            title: 'You must be logged in',
            description: 'Please log in to join a class.',
          });
          // Redirect to login but keep the join_code in the URL
          router.push(`/login?redirect=/classes?join_code=${encodeURIComponent(normalizedCode)}`);
          return;
        }

        try {
          const response = await fetch('/api/classes/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ class_code: normalizedCode }),
          });

          const data = await response.json();

          // Handle already joined case
          if (response.ok && data.alreadyJoined) {
            toast({ title: data.message || 'You are already a member of this class.' });
            await refetchClasses();
          } else if (response.ok) {
            toast({ title: 'Successfully joined class!' });
            await refetchClasses();
          } else {
            throw new Error(data.error || 'Failed to join class.');
          }

        } catch (error: any) {
          toast({
            variant: 'destructive',
            title: 'Could not join class',
            description: error.message,
          });
        } finally {
            // Remove the join_code from the URL
            const newPath = window.location.pathname;
            window.history.replaceState({}, '', newPath);
        }
      };
      
      joinClass();
    }
  }, [searchParams, router, toast, session, refetchClasses]);

  useEffect(() => {
    if (role !== 'teacher') return;
    const activeClasses = (Array.isArray(classes) ? classes : []).filter(
      (classItem) => classItem.status !== 'archived'
    );
    if (activeClasses.length === 0) return;

    const preferredClassId =
      (typeof window !== 'undefined' ? window.localStorage.getItem('studyweb-last-class-id') : null) ||
      activeClasses[0].id;
    const preferredClass = activeClasses.find((classItem) => classItem.id === preferredClassId) || activeClasses[0];
    if (!preferredClass?.id) return;

    router.replace(`/class/${preferredClass.id}?tab=subjects`);
  }, [role, classes, router]);

  if (role === 'student') {
    return <StudentClasses />;
  }

  return null;
}


export default function ClassesPage() {
    return (
      <Suspense fallback={null}>
        <ClassesPageContent />
      </Suspense>
    );
}
