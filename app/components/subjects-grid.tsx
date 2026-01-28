'use client';

import React, { useState, useContext, useMemo, useCallback, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AppContext, AppContextType } from '@/contexts/app-context';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type RecentParagraph = {
  id: string;
  chapterNumber: number;
  paragraphNumber: number;
  title: string;
  progress: number;
};

type Subject = {
  id: string;
  title: string;
  class_label?: string;
  cover_image_url?: string;
  recentParagraphs?: RecentParagraph[];
};

type SubjectsGridProps = {
  classId?: string;
  isTeacher?: boolean;
};

// Simple placeholder icons using emojis in a scattered pattern
function PlaceholderCover({ title }: { title: string }) {
  // Generate deterministic emojis based on title
  const getEmojis = (str: string) => {
    const educationEmojis = ['📚', '📖', '✏️', '📝', '🎓', '💡', '🔬', '🌍', '📐', '🧮', '🎨', '🎵', '⚽', '🏛️', '🔢'];
    const hash = str.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const selected = [];
    for (let i = 0; i < 5; i++) {
      selected.push(educationEmojis[(hash + i * 7) % educationEmojis.length]);
    }
    return selected;
  };

  const emojis = getEmojis(title);
  
  return (
    <div className="w-full h-full bg-muted flex items-center justify-center relative overflow-hidden">
      {/* Scattered emoji pattern */}
      <div className="absolute inset-0 flex flex-wrap items-center justify-center gap-6 p-4 opacity-60">
        {emojis.map((emoji, i) => (
          <span 
            key={i} 
            className="text-3xl"
            style={{
              transform: `rotate(${(i * 15) - 30}deg)`,
            }}
          >
            {emoji}
          </span>
        ))}
      </div>
    </div>
  );
}

export function SubjectsGrid({ classId, isTeacher = false }: SubjectsGridProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSubjectTitle, setNewSubjectTitle] = useState('');
  const [selectedCreateClassId, setSelectedCreateClassId] = useState<string>('');
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { classes, session } = useContext(AppContext) as AppContextType;

  const fetchSubjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const apiUrl = classId ? `/api/classes/${classId}/subjects` : '/api/subjects';
      const response = await fetch(apiUrl);
      if (!response.ok) throw new Error('Failed to fetch subjects');
      const data = await response.json();
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setSubjects([]);
    } finally {
      setIsLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchSubjects();
  }, [fetchSubjects]);

  const handleCreateSubject = async () => {
    if (!newSubjectTitle.trim()) {
      toast({
        variant: 'destructive',
        title: 'Missing title',
        description: 'Please provide a title for the subject.',
      });
      return;
    }

    setIsCreating(true);
    try {
      const apiUrl = classId ? `/api/classes/${classId}/subjects` : '/api/subjects';
      const requestBody = classId
        ? { title: newSubjectTitle, class_label: newSubjectTitle, cover_type: 'ai_icons' }
        : { name: newSubjectTitle, class_id: selectedCreateClassId || null, cover_type: 'ai_icons' };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create subject');
      }

      fetchSubjects();
      setNewSubjectTitle('');
      setSelectedCreateClassId('');
      setIsCreateOpen(false);

      toast({
        title: 'Subject Created',
        description: 'Your subject has been created.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-0">
              <div className="aspect-[4/3] bg-muted" />
              <div className="p-4 space-y-2">
                <div className="h-3 bg-muted rounded w-3/4" />
                <div className="h-2 bg-muted rounded w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {isTeacher && (
          <div className="flex justify-end">
            <Button onClick={() => setIsCreateOpen(true)} size="sm">
              + Create Subject
            </Button>
          </div>
        )}

        {subjects.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm mb-4">No subjects yet</p>
            {isTeacher && (
              <Button onClick={() => setIsCreateOpen(true)} size="sm">
                Create First Subject
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {subjects.map((subject) => (
              <Link key={subject.id} href={`/subjects/${subject.id}`}>
                <Card className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer h-full">
                  <CardContent className="p-0">
                    {/* Top half - Cover image or placeholder */}
                    <div className="aspect-[4/3] relative">
                      {subject.cover_image_url ? (
                        <img
                          src={subject.cover_image_url}
                          alt={subject.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <PlaceholderCover title={subject.title} />
                      )}
                      
                      {/* Title overlay - top left */}
                      <div className="absolute top-3 left-3">
                        <p className="text-sm text-foreground bg-background/80 px-2 py-1 rounded">
                          {subject.title}
                        </p>
                      </div>
                      
                      {/* Class label - bottom left */}
                      {subject.class_label && (
                        <div className="absolute bottom-3 left-3">
                          <p className="text-xs text-muted-foreground bg-background/80 px-2 py-0.5 rounded">
                            {subject.class_label}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Bottom half - Recent paragraphs */}
                    <div className="p-3 space-y-2 bg-background">
                      {subject.recentParagraphs && subject.recentParagraphs.length > 0 ? (
                        subject.recentParagraphs.slice(0, 3).map((p) => (
                          <div key={p.id} className="flex items-center gap-2 text-xs">
                            <span className="bg-muted px-1.5 py-0.5 rounded text-muted-foreground shrink-0">
                              {p.chapterNumber}.{p.paragraphNumber}
                            </span>
                            <span className="truncate flex-1">{p.title}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-muted-foreground w-8 text-right">{p.progress}%</span>
                              <div className="w-12 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div 
                                  className="h-full bg-primary rounded-full"
                                  style={{ width: `${p.progress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-xs text-muted-foreground text-center py-2">No progress yet</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Subject Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Subject</DialogTitle>
            <DialogDescription>
              Add a new subject. You can add a cover image later.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject-title">Title</Label>
              <Input
                id="subject-title"
                placeholder="e.g., Nederlands, Mathematics"
                value={newSubjectTitle}
                onChange={(e) => setNewSubjectTitle(e.target.value)}
              />
            </div>
            {!classId && classes.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="class-select">Class (optional)</Label>
                <select
                  id="class-select"
                  value={selectedCreateClassId}
                  onChange={(e) => setSelectedCreateClassId(e.target.value)}
                  className="w-full p-2 border rounded bg-background"
                >
                  <option value="">No class</option>
                  {classes.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubject} disabled={isCreating || !newSubjectTitle.trim()}>
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
