
'use client';

import { useContext, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { TeacherDashboard } from '@/components/dashboard/teacher/teacher-dashboard';
import { StudentClasses } from '@/components/dashboard/student/student-classes';
import { useToast } from '@/hooks/use-toast';

function ClassesPageContent() {
  const { role, session, refetchClasses } = useContext(AppContext) as AppContextType;
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const joinCode = searchParams.get('join_code');
    if (joinCode) {
      const joinClass = async () => {
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

        try {
          const response = await fetch('/api/classes/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ class_code: joinCode }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to join class.');
          }
          
          toast({ title: 'Successfully joined class!' });
          await refetchClasses();

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


  return role === 'student' ? <StudentClasses /> : <TeacherDashboard />;
}


export default function ClassesPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ClassesPageContent />
        </Suspense>
    );
}
