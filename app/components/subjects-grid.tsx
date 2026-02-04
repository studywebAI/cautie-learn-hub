'use client';

import React, { useState, useContext, useCallback, useEffect } from 'react';
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
import { InputWithTypingPlaceholder } from '@/components/ui/input-with-typing-placeholder';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

type RecentParagraph = {
  id: string;
  chapterNumber: number;
  paragraphNumber: number;
  title: string;
  progress: number;
};

type LinkedClass = {
  id: string;
  name: string;
};

type Subject = {
  id: string;
  title: string;
  class_label?: string;
  cover_image_url?: string;
  recentParagraphs?: RecentParagraph[];
  classes?: LinkedClass[];
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
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { classes, session } = useContext(AppContext) as AppContextType;

  const toggleClassSelection = (classItemId: string) => {
    setSelectedClassIds(prev =>
      prev.includes(classItemId)
        ? prev.filter(id => id !== classItemId)
        : [...prev, classItemId]
    );
  };

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
        : { title: newSubjectTitle, classIds: selectedClassIds.length > 0 ? selectedClassIds : null, cover_type: 'ai_icons' };

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
      setSelectedClassIds([]);
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
                      
                      {/* Linked classes - bottom left */}
                      {subject.classes && subject.classes.length > 0 && (
                        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1">
                          {subject.classes.slice(0, 2).map((cls) => (
                            <span key={cls.id} className="text-xs text-muted-foreground bg-background/80 px-2 py-0.5 rounded">
                              {cls.name}
                            </span>
                          ))}
                          {subject.classes.length > 2 && (
                            <span className="text-xs text-muted-foreground bg-background/80 px-2 py-0.5 rounded">
                              +{subject.classes.length - 2}
                            </span>
                          )}
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
              <InputWithTypingPlaceholder
                id="subject-title"
                placeholders={["Biology", "Mathematics", "Nederlands", "History", "Physics", "Chemistry"]}
                value={newSubjectTitle}
                onChange={(e) => setNewSubjectTitle(e.target.value)}
              />
            </div>
            {!classId && classes.length > 0 && (
              <div className="space-y-2">
                <Label>Link to classes (optional)</Label>
                <div className="space-y-2 max-h-40 overflow-y-auto border rounded p-2 bg-muted/30">
                  {classes.map((classItem) => (
                    <div key={classItem.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`class-${classItem.id}`}
                        checked={selectedClassIds.includes(classItem.id)}
                        onCheckedChange={() => toggleClassSelection(classItem.id)}
                      />
                      <label
                        htmlFor={`class-${classItem.id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        {classItem.name}
                      </label>
                    </div>
                  ))}
                </div>
                {selectedClassIds.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedClassIds.length} class{selectedClassIds.length !== 1 ? 'es' : ''} selected
                  </p>
                )}
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
