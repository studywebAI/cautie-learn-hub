'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useContext } from 'react';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function JoinClassPage() {
  const { code } = useParams();
  const router = useRouter();
  const { session, refetchClasses } = useContext(AppContext) as AppContextType;
  const { toast } = useToast();
  const [classData, setClassData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    const fetchClass = async () => {
      if (!code) return;

      try {
        const response = await fetch(`/api/classes/join?code=${code}`);
        if (!response.ok) {
          throw new Error('Class not found');
        }
        const data = await response.json();
        setClassData(data);
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Class not found',
          description: error.message,
        });
        router.push('/classes');
      } finally {
        setLoading(false);
      }
    };

    fetchClass();
  }, [code, router, toast]);

  const handleJoin = async () => {
    if (!session) {
      router.push(`/login?redirect=/classes/join/${code}`);
      return;
    }

    setJoining(true);
    try {
      const response = await fetch('/api/classes/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ class_code: code }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join class');
      }

      toast({ title: 'Successfully joined class!' });
      await refetchClasses();
      router.push('/classes');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Could not join class',
        description: error.message,
      });
    } finally {
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!classData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Class not found</CardTitle>
            <CardDescription>The join code is invalid or the class no longer exists.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/classes')}>Go back</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Join Class</CardTitle>
          <CardDescription>You've been invited to join this class.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="font-semibold text-lg">{classData.name}</h3>
            {classData.description && (
              <p className="text-muted-foreground mt-1">{classData.description}</p>
            )}
          </div>
          <Button onClick={handleJoin} disabled={joining} className="w-full">
            {joining && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {session ? 'Join Class' : 'Login to Join'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}