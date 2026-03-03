
'use client';

import { useContext, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { StudentClasses } from '@/components/dashboard/student/student-classes';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { School } from 'lucide-react';

function ClassesPageContent() {
  const { role, session, refetchClasses } = useContext(AppContext) as AppContextType;
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


  if (role === 'student') {
    return <StudentClasses />;
  }

  return (
    <div className="h-full p-4 md:p-6">
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5" />
            Select a class
          </CardTitle>
          <CardDescription>
            Use Manage in the sidebar to open the class list, then pick a class.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          The full class overview page is disabled for cleaner navigation and faster loading.
        </CardContent>
      </Card>
    </div>
  );
}


export default function ClassesPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <ClassesPageContent />
        </Suspense>
    );
}
