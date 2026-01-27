'use client';

import React, { useState, useContext, useMemo, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, BookOpen } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Subject = {
  id: string;
  title: string;
  content?: {
    class_label?: string;
    cover_type?: string;
    cover_image_url?: string;
    ai_icon_seed?: string;
  };
  created_at: string;
  recentParagraphs?: Array<{
    id: string;
    title: string;
    progress: number;
  }>;
};

type SubjectsGridProps = {
  classId?: string; // Optional - if provided, filter subjects by class, otherwise show all subjects
  isTeacher?: boolean;
};

export function SubjectsGrid({ classId, isTeacher = true }: SubjectsGridProps) {
  console.log('DEBUG: SubjectsGrid render', { classId, isTeacher });

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newSubjectTitle, setNewSubjectTitle] = useState('');
  const [selectedCreateClassId, setSelectedCreateClassId] = useState<string>('');
  const [coverImage, setCoverImage] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [recentParagraphs, setRecentParagraphs] = useState<any[]>([]);
  const { toast } = useToast();
  const { classes, session } = useContext(AppContext) as AppContextType;

  console.log('DEBUG: SubjectsGrid context', { classes, session });

  // Memoize owned classes to avoid filtering in render
  const ownedClasses = useMemo(() => {
    if (!session?.user?.id) return [];
    console.log('DEBUG: All classes:', classes);
    console.log('DEBUG: User ID:', session.user.id);
    classes.forEach(c => console.log('DEBUG: Class', c.id, 'owner_id:', c.owner_id));
    const filtered = classes.filter(c => c.owner_id === session.user.id);
    console.log('DEBUG: Owned classes:', filtered);
    // TEMP: Show all classes for testing
    return classes;
  }, [classes, session?.user?.id]);

  const fetchSubjects = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('DEBUG: Fetching subjects for classId:', classId);

      // If classId is provided, fetch subjects for that specific class
      // Otherwise, fetch all subjects the user has access to
      const apiUrl = classId ? `/api/classes/${classId}/subjects` : '/api/subjects';

      const response = await fetch(apiUrl);
      console.log('DEBUG: Subjects response:', response.status, response.ok);
      if (!response.ok) throw new Error('Failed to fetch subjects');
      const data = await response.json();
      console.log('DEBUG: Subjects data:', data);

      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setSubjects([]);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to load subjects.',
      });
    } finally {
      setIsLoading(false);
    }
  }, [classId, toast]);

  const fetchRecentParagraphs = useCallback(async () => {
    if (!session?.user?.id || !isTeacher) return; // Only for students? Wait, the component has isTeacher, but recent for students.

    // Mock recent paragraphs with substantive descriptions
    const mockParagraphs = [
      { id: '1', chapterNumber: 1, paragraphNumber: 1, title: 'The Verb Worden - Present Tense Conjugation', progress: 85 },
      { id: '2', chapterNumber: 1, paragraphNumber: 2, title: 'Word Order in Dutch Sentences', progress: 45 },
      { id: '3', chapterNumber: 2, paragraphNumber: 1, title: 'Separable Verbs and Their Usage', progress: 20 },
    ];
    setRecentParagraphs(mockParagraphs);
  }, [session?.user?.id, isTeacher]);

  // Fetch subjects on mount
  React.useEffect(() => {
    fetchSubjects();
    fetchRecentParagraphs();
  }, [fetchSubjects, fetchRecentParagraphs]);

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
            class_label: newSubjectTitle,
            cover_type: 'ai_icons',
          }
        : {
            name: newSubjectTitle,
            class_id: selectedCreateClassId || null, // Optional class association
            cover_type: 'ai_icons',
          };

      console.log('DEBUG: Component sending request:', { apiUrl, requestBody });

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      console.log('DEBUG: Component received response:', { status: response.status, ok: response.ok });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create subject');
      }

      const newSubject = await response.json();

      // Refresh subjects list
      fetchSubjects();

      setNewSubjectTitle('');
      setSelectedCreateClassId('');
      setIsCreateOpen(false);

      toast({
        title: 'Subject Created',
        description: `"${newSubject.title || newSubject.name}" has been created successfully.`,
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error Creating Subject',
        description: error.message,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const generatePlaceholderIcon = (seed?: string) => {
    // Return a simple icon text
    return 'Book';
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="aspect-[4/3] bg-muted rounded-lg mb-4" />
              <div className="h-4 bg-muted rounded mb-2" />
              <div className="h-3 bg-muted rounded w-2/3" />
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
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-sm">Subjects</h2>
              <p className="text-sm">
                {classId
                  ? "Organize your class content into structured subjects"
                  : "Create and manage your learning subjects"
                }
              </p>
            </div>
            <Button onClick={() => {
              setNewSubjectTitle('');
              setSelectedCreateClassId('');
              setCoverImage(null);
              setIsCreateOpen(true);
            }}>
              <PlusCircle className="mr-2 h-4 w-4" />
              Create Subject
            </Button>
          </div>
        )}

        {subjects.length === 0 ? (
          <Card className="p-12 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="mb-2">No subjects yet</h3>
            <p className="text-muted-foreground mb-4">
              {classId
                ? isTeacher
                  ? "No subjects have been created for this class yet. Create the first subject to organize your content."
                  : "Your teacher hasn't created any subjects for this class yet."
                : isTeacher
                  ? "Create your first subject to start organizing your learning content."
                  : "No subjects available yet."
              }
            </p>
            {isTeacher && classes.length === 0 && (
              <div className="space-y-2">
                <Button onClick={() => window.location.href = '/classes'}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Class First
                </Button>
                <p className="text-xs text-muted-foreground">
                  Go to Classes page to create your first class
                </p>
              </div>
            )}
            {isTeacher && classes.length > 0 && (
              <Button onClick={() => setIsCreateOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Create First Subject
              </Button>
            )}
          </Card>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            {subjects.map((subject) => (
              <Card key={subject.id} className="group hover:shadow-lg transition-shadow cursor-pointer">
                <Link href={`/subjects/${subject.id}`}>
                  <CardContent className="p-0">
                    {/* Top half - Cover/Icon */}
                    <div className="aspect-[4/3] bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-950 dark:to-indigo-900 flex items-center justify-center relative overflow-hidden">
                      {subject.content?.cover_image_url ? (
                        <img
                          src={subject.content.cover_image_url}
                          alt={subject.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="text-6xl">
                          {generatePlaceholderIcon(subject.content?.ai_icon_seed)}
                        </div>
                      )}

                      {/* Title and class label overlay on left side */}
                      <div className="absolute left-4 top-4 max-w-[60%]">
                        <h3 className="text-sm text-white drop-shadow-lg mb-1">
                          {subject.title}
                        </h3>
                        <p className="text-xs text-white/80 drop-shadow">
                          {subject.content?.class_label || subject.title}
                        </p>
                      </div>

                      {/* Overlay gradient */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    </div>

                    {/* Progress preview in bottom section */}
                    <div className="p-4 bg-white dark:bg-gray-900">
                      <div className="space-y-2">
                        {subject.recentParagraphs?.slice(0, 3).map((paragraph, index) => (
                          <div key={paragraph.id}>
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-muted-foreground truncate">{paragraph.title}</span>
                              <span className="font-medium">{paragraph.progress}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-1.5">
                              <div
                                className="bg-primary h-1.5 rounded-full transition-all duration-300"
                                style={{ width: `${paragraph.progress}%` }}
                              />
                            </div>
                          </div>
                        ))}
                        {(!subject.recentParagraphs || subject.recentParagraphs.length === 0) && (
                          <p className="text-xs text-muted-foreground text-center py-2">No progress yet</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Link>
              </Card>
            ))}
          </div>
        )}

        {/* Recent Paragraphs */}
        <div className="mt-8">
          {recentParagraphs.length > 0 ? (
            <>
              <h3 className="text-sm mb-4">Recent Paragraphs</h3>
              <div className="space-y-2">
                {recentParagraphs.map((paragraph) => (
                  <div key={paragraph.id} className="cursor-pointer hover:bg-muted p-3 rounded border" onClick={() => {/* navigate to paragraph */}}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">{paragraph.chapterNumber}.{paragraph.paragraphNumber} {paragraph.title}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-16 bg-muted rounded-full h-2">
                          <div className="bg-primary h-2 rounded-full" style={{ width: `${paragraph.progress}%` }} />
                        </div>
                        <span className="text-sm">{paragraph.progress}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No progress yet</p>
          )}
        </div>
      </div>

      {/* Create Subject Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Subject</DialogTitle>
            <DialogDescription>
              The image will be used as cover for your subject. If no image is uploaded then an automatic icon-based cover will be used.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="subject-title">Subject Title</Label>
              <Input
                id="subject-title"
                placeholder="e.g., Nederlands, Mathematics, History"
                value={newSubjectTitle}
                onChange={(e) => setNewSubjectTitle(e.target.value)}
              />
            </div>
            {!classId && (
              <div className="space-y-2">
                <Label htmlFor="class-select">Class (Optional)</Label>
                {(() => { console.log('DEBUG: Rendering Select, ownedClasses:', ownedClasses); return null; })()}
                {ownedClasses.length > 0 ? (
                  <select
                    id="class-select"
                    value={selectedCreateClassId}
                    onChange={(e) => setSelectedCreateClassId(e.target.value)}
                    className="w-full p-2 border rounded"
                  >
                    <option value="">No class association (Global subject)</option>
                    {ownedClasses.map((classItem) => (
                      <option key={classItem.id} value={classItem.id}>
                        {classItem.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-muted-foreground">No classes available - subject will be global</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Optionally associate this subject with a class, or leave blank for a global subject.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="cover-image">Cover Image (Optional)</Label>
              <Input
                id="cover-image"
                type="file"
                accept="image/*"
                onChange={(e) => setCoverImage(e.target.files?.[0] || null)}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Upload an image to use as the subject cover. If no image is uploaded then an automatic icon-based cover will be used.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSubject} disabled={isCreating || !newSubjectTitle.trim()}>
              {isCreating ? 'Creating...' : 'Create Subject'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
