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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { SubjectCard } from './subject-card';

type SubjectsGridProps = {
  classId?: string;
  isTeacher?: boolean;
};

export function SubjectsGrid({ classId, isTeacher = false }: SubjectsGridProps) {
  const [subjects, setSubjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSubjectTitle, setNewSubjectTitle] = useState('');
  const [newSubjectDescription, setNewSubjectDescription] = useState('');
  const [autoIcons, setAutoIcons] = useState(true);
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
        ? {
            title: newSubjectTitle,
            description: newSubjectDescription || undefined,
            class_label: newSubjectTitle,
            cover_type: autoIcons ? 'ai_icons' : 'custom',
          }
        : {
            title: newSubjectTitle,
            description: newSubjectDescription || undefined,
            classIds: selectedClassIds.length > 0 ? selectedClassIds : null,
            cover_type: autoIcons ? 'ai_icons' : 'custom',
          };

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
      setNewSubjectDescription('');
      setAutoIcons(true);
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
            <Button onClick={() => setIsCreateOpen(true)} size="sm" className="rounded-full">
              + Create Subject
            </Button>
          </div>
        )}

        {subjects.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-sm mb-4">No subjects yet</p>
            {isTeacher && (
              <Button onClick={() => setIsCreateOpen(true)} size="sm" className="rounded-full">
                Create First Subject
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {subjects.map((subject) => (
              <SubjectCard key={subject.id} subject={subject} />
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
              Add a new subject to your curriculum.
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

            {/* Auto icons switch */}
            <div className="flex items-center justify-between">
              <Label htmlFor="auto-icons" className="text-sm">Auto-generated cover icons</Label>
              <Switch
                id="auto-icons"
                checked={autoIcons}
                onCheckedChange={setAutoIcons}
              />
            </div>

            {autoIcons && (
              <div className="space-y-2">
                <Label htmlFor="subject-description">What is this subject about?</Label>
                <Textarea
                  id="subject-description"
                  placeholder="e.g., Study of living organisms, cells, genetics, and ecosystems..."
                  value={newSubjectDescription}
                  onChange={(e) => setNewSubjectDescription(e.target.value)}
                  rows={2}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  This helps generate relevant cover icons for the subject card.
                </p>
              </div>
            )}

            {!autoIcons && (
              <div className="space-y-2 p-3 border rounded bg-muted/30">
                <p className="text-xs text-muted-foreground">
                  Custom image upload will be available after creating the subject.
                  You can upload a cover image from the subject settings.
                </p>
              </div>
            )}

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
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} className="rounded-full">
              Cancel
            </Button>
            <Button onClick={handleCreateSubject} disabled={isCreating || !newSubjectTitle.trim()} className="rounded-full">
              {isCreating ? 'Creating...' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
