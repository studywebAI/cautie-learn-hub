
'use client';

import { useContext, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { School } from 'lucide-react';

function ClassesPageContent() {
  const { role } = useContext(AppContext) as AppContextType;
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const joinCode = searchParams.get('join_code');
    if (joinCode) {
      const normalizedCode = joinCode.trim();
      if (!normalizedCode) {
        toast({
          variant: 'destructive',
          title: 'Could not join class',
          description: 'Join code is empty.',
        });
        return;
      }
      router.replace(`/classes/join/${encodeURIComponent(normalizedCode)}`);
      return;
    }
  }, [searchParams, router, toast]);

  useEffect(() => {
    if (role === 'student') {
      router.replace('/');
    }
  }, [role, router]);

  if (role === 'student') return null;

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
