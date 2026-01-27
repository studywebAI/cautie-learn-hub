
'use client';

import { useState, useContext, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { JoinClassDialog } from './join-class-dialog';
import { PlusCircle, Search } from 'lucide-react';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { ClassCard } from '../teacher/class-card';
import { Skeleton } from '@/components/ui/skeleton';
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


  const handleClassJoined = async (classCode: string): Promise<boolean> => {
    if (!session) {
        toast({
            variant: 'destructive',
            title: 'You must be logged in',
            description: 'Please log in or create an account to join a class.',
        });
        return false;
    }
    
    try {
      const response = await fetch('/api/classes/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_code: classCode }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join class.');
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
  
  const enrolledClasses = classes
    .filter(c => c.user_id !== session?.user?.id)
    .filter(cls =>
      cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cls.description && cls.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );

  if (isLoading || !classes) {
      return (
         <div className="flex flex-col gap-8">
            <header className="flex justify-between items-center">
                 <div>
                    <Skeleton className="h-10 w-64" />
                    <Skeleton className="h-4 w-96 mt-2" />
                </div>
                <Skeleton className="h-10 w-36" />
            </header>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64" />)}
            </div>
        </div>
      );
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold font-headline">Your Classes</h1>
          <p className="text-muted-foreground">
            All the classes you are enrolled in.
          </p>
        </div>
        <Button onClick={() => {
            setInitialCode(undefined);
            setIsJoinDialogOpen(true);
        }}>
          <PlusCircle className="mr-2 h-4 w-4" />
          Join a Class
        </Button>
      </header>

      {/* Search Bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
        <Input
          placeholder="Search classes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10 rounded-full"
        />
      </div>

      {enrolledClasses.length === 0 ? (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm p-12 text-center">
          <div className="flex flex-col items-center gap-2">
            <h3 className="text-2xl font-bold tracking-tight">
              You are not in any classes yet.
            </h3>
            <p className="text-sm text-muted-foreground">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {enrolledClasses.map((classInfo) => (
            <ClassCard key={classInfo.id} classInfo={classInfo} isArchived={false} />
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
