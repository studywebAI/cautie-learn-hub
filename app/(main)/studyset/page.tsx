'use client';

import { useEffect, useState, useContext } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { CautieLoader } from '@/components/ui/cautie-loader';
import { BookOpen, Calendar, Zap, Trash2, ArrowRight } from 'lucide-react';
import Link from 'next/link';

type StudySet = {
  id: string;
  name: string;
  description: string | null;
  subject: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

const BOT_UA_PATTERN = /(HeadlessChrome|vercel-screenshot|vercel-favicon|bot|crawler|spider)/i;

export default function StudySetsPage() {
  const { session, isLoading } = useContext(AppContext) as AppContextType;
  const [studysets, setStudysets] = useState<StudySet[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedStudysetId, setSelectedStudysetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isLoading || !session) {
      setLoading(true);
      return;
    }

    if (typeof window !== 'undefined' && BOT_UA_PATTERN.test(window.navigator.userAgent || '')) {
      setLoading(false);
      return;
    }

    const fetchStudysets = async () => {
      try {
        const res = await fetch('/api/studysets');
        if (res.ok) {
          const data = await res.json();
          setStudysets(Array.isArray(data?.studysets) ? data.studysets : []);
        }
      } catch (e) {
      } finally {
        setLoading(false);
      }
    };

    void fetchStudysets();
  }, [session, isLoading]);

  const handleDeleteClick = (e: React.MouseEvent, studysetId: string) => {
    e.preventDefault();
    setSelectedStudysetId(studysetId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedStudysetId) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/studysets/${selectedStudysetId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setStudysets(studysets.filter(ss => ss.id !== selectedStudysetId));
        toast({
          title: 'Success',
          description: 'StudySet deleted successfully',
        });
      } else {
        const data = await res.json();
        toast({
          title: 'Error',
          description: data.error || 'Failed to delete StudySet',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete StudySet',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
      setSelectedStudysetId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <CautieLoader size="md" label="Loading StudySets" sublabel="" />
      </div>
    );
  }

  if (studysets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] rounded-lg border border-dashed p-12 text-center">
        <BookOpen className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold text-lg mb-2">No StudySets yet</h3>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Create your first StudySet to start learning with AI-powered personalized study materials.
        </p>
        <Button asChild>
          <Link href="/studyset/create">Create Your First StudySet</Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {studysets.map(ss => (
          <Card
            key={ss.id}
            className="hover:shadow-md transition-shadow cursor-pointer group"
          >
            <CardHeader>
              <CardTitle className="line-clamp-2 group-hover:text-[var(--accent-brand)] transition-colors">
                {ss.name}
              </CardTitle>
              {ss.subject && (
                <CardDescription>{ss.subject}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {ss.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {ss.description}
                </p>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {new Date(ss.created_at).toLocaleDateString()}
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="flex-1"
                >
                  <Link href={`/studyset/${ss.id}`}>
                    Open
                    <ArrowRight className="h-3 w-3 ml-1" />
                  </Link>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => handleDeleteClick(e, ss.id)}
                  disabled={deleting}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete StudySet?</AlertDialogTitle>
            <AlertDialogDescription>
              This action is permanent. The StudySet and all its associated data will be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
