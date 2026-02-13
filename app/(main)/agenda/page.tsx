'use client';

import { useState, useContext, useMemo, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { AppContext, AppContextType, PersonalTask, ClassAssignment, ClassInfo, useDictionary } from '@/contexts/app-context';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CreateTaskDialog } from '@/components/agenda/create-task-dialog';
import { TodayPanel } from '@/components/agenda/today-panel';
import { WeekView } from '@/components/agenda/week-view';
import { ListView } from '@/components/agenda/list-view';
import { ViewToggle } from '@/components/agenda/view-toggle';
import { TeacherDeadlineDialog } from '@/components/agenda/teacher-deadline-dialog';
import { TeacherDeadlinesPanel } from '@/components/agenda/teacher-deadlines-panel';
import { PlusCircle, Sparkles } from 'lucide-react';
import type { AiSuggestion, CalendarEvent } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

type ViewMode = 'week' | 'list';

export default function AgendaPage() {
  const { assignments, classes, isLoading, role, personalTasks, createPersonalTask, updatePersonalTask } = useContext(AppContext) as AppContextType;
  const { dictionary } = useDictionary();
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isTeacherDialogOpen, setIsTeacherDialogOpen] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const [chapters, setChapters] = useState<Map<string, { id: string; title: string }>>(new Map());
  const { toast } = useToast();

  const isStudent = role === 'student';
  const isTeacher = role === 'teacher';

  // Fetch chapter data for assignments with chapter_id
  useEffect(() => {
    const fetchChapters = async () => {
      const classIdsWithChapters = new Set(
        (assignments || [])
          .filter(a => a.chapter_id)
          .map(a => a.class_id)
      );

      if (classIdsWithChapters.size === 0) return;

      const chapterPromises = Array.from(classIdsWithChapters).map(async (classId) => {
        try {
          const response = await fetch(`/api/classes/${classId}/chapters`);
          if (response.ok) {
            const data = await response.json();
            return data.chapters || [];
          }
        } catch (error) {
          console.error('Failed to fetch chapters for class:', classId, error);
        }
        return [];
      });

      const chapterResults = await Promise.all(chapterPromises);
      const chapterMap = new Map();
      chapterResults.flat().forEach(chapter => {
        chapterMap.set(chapter.id, { id: chapter.id, title: chapter.title });
      });
      setChapters(chapterMap);
    };

    fetchChapters();
  }, [assignments]);

  const events: CalendarEvent[] = useMemo(() => {
    if (isLoading) return [];

    let allEvents: CalendarEvent[] = [];

    const assignmentEvents = (assignments || [])
      .filter((assignment: ClassAssignment) => assignment.scheduled_start_at)
      .map((assignment: ClassAssignment) => {
        const className = (classes || []).find((c: ClassInfo) => c.id === assignment.class_id)?.name || 'Class';
        const href = `/class/${assignment.class_id}`;
        const chapter = assignment.chapter_id ? chapters.get(assignment.chapter_id) : undefined;
        return {
          id: assignment.id,
          title: assignment.title,
          subject: className,
          date: parseISO(assignment.scheduled_start_at!),
          type: 'assignment' as const,
          href: href,
          chapter_id: assignment.chapter_id || undefined,
          chapter_title: chapter?.title,
        };
      });

    if (isStudent) {
      const personalEvents = (personalTasks || []).map((t: PersonalTask) => ({
        id: t.id,
        title: t.title,
        subject: 'Personal',
        date: parseISO(t.due_date || t.created_at),
        type: 'personal' as const,
        href: `/agenda#${t.id}`,
        priority: (t as any).priority,
        estimated_duration: (t as any).estimated_duration,
        tags: (t as any).tags,
      }));

      allEvents = [...assignmentEvents, ...personalEvents];
    } else {
      // Teacher view - only show assignments from their classes
      const teacherAssignmentEvents = assignmentEvents.filter(event => 
        (classes || []).some((c: ClassInfo) => c.id === event.href.replace('/class/', ''))
      );
      allEvents = teacherAssignmentEvents;
    }

    return allEvents;
  }, [assignments, classes, isStudent, personalTasks, isLoading, chapters]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach(event => {
      const dateString = format(event.date, 'yyyy-MM-dd');
      if (!map.has(dateString)) {
        map.set(dateString, []);
      }
      map.get(dateString)?.push(event);
    });
    return map;
  }, [events]);

  const selectedDayString = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : '';
  const eventsForSelectedDay = eventsByDate.get(selectedDayString) || [];

  // AI generation - only when explicitly requested
  const handleGenerateAiSuggestion = async () => {
    if (!selectedDay || !eventsForSelectedDay.length) {
      toast({
        title: 'No events',
        description: 'Select a day with events to get AI suggestions.',
      });
      return;
    }

    setIsGeneratingSuggestion(true);
    setAiSuggestion(null);
    setShowAiPanel(true);

    const relevantEvents = eventsForSelectedDay.filter(event => event.type === 'assignment' || event.type === 'personal');
    const tasksForAI = relevantEvents.map(event => `Title: ${event.title}, Due: ${format(event.date, 'PPP')}, Type: ${event.type}`).join("\n");

    if (!tasksForAI) {
      setIsGeneratingSuggestion(false);
      return;
    }

    try {
      const response = await fetch('/api/ai/handle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flowName: 'generatePersonalizedStudyPlan',
          input: {
            deadlines: tasksForAI,
            learningHabits: "The student prefers to study in the evenings and focuses on one subject at a time.",
            calendar: "The student's calendar includes classes from 9 AM to 3 PM on weekdays, and weekends are free.",
          },
        }),
      });
      if (!response.ok) {
        let errorMessage = response.statusText;
        try {
          const errorData = await response.json();
          if (errorData.detail) errorMessage = errorData.detail;
          if (errorData.code === "MISSING_API_KEY") {
            errorMessage = "AI is not configured (Missing API Key). Please check server logs.";
          }
        } catch (e) { /* ignore */ }
        throw new Error(errorMessage);
      }
      const result = await response.json();
      setAiSuggestion({ id: 'ai-plan', title: result.studyPlan, content: result.studyPlan, icon: 'BrainCircuit' });
    } catch (error) {
      console.error("Failed to generate study plan suggestion:", error);
      toast({
        variant: "destructive",
        title: "AI Suggestion Failed",
        description: "Could not generate a study plan. Please try again later.",
      });
    } finally {
      setIsGeneratingSuggestion(false);
    }
  };

  const handleTaskCreated = async (newTask: Omit<PersonalTask, 'id' | 'created_at' | 'user_id'>) => {
    await createPersonalTask(newTask);
  };

  const handleTeacherDeadlineCreated = async (deadline: {
    title: string;
    description: string;
    due_date: string;
    class_id: string;
    type: 'homework' | 'small_test' | 'big_test';
    linked_content?: { type: 'material' | 'subject' | 'assignment'; url: string; title: string; path?: string }[];
  }) => {
    try {
      // Create the assignment via API
      const response = await fetch('/api/assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_id: deadline.class_id,
          title: deadline.title,
          description: deadline.description,
          scheduled_start_at: deadline.due_date,
          scheduled_end_at: deadline.due_date,
          scheduled_answer_release_at: deadline.due_date,
          type: deadline.type,
          linked_content: deadline.linked_content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create assignment');
      }

      const typeLabels = { homework: 'Homework', small_test: 'Small Test', big_test: 'Big Test' };
      toast({
        title: `${typeLabels[deadline.type]} Created`,
        description: `"${deadline.title}" has been added.`,
      });

      // No need to call createAssignment - we already created via API
    } catch (error) {
      console.error('Failed to create deadline:', error);
      throw error;
    }
  };

  const handleEventMove = async (eventId: string, newDate: Date) => {
    const event = events.find(e => e.id === eventId);
    if (event?.type === 'personal') {
      const dateString = format(newDate, 'yyyy-MM-dd');
      await updatePersonalTask(eventId, { due_date: dateString });
    }
  };
  
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        <div className="lg:col-span-2">
          <Skeleton className="h-[400px] w-full" />
        </div>
        <div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-8 h-full">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl">{dictionary.agenda.title}</h1>
            <p className="text-muted-foreground">{dictionary.agenda.description}</p>
          </div>
          <div className="flex items-center gap-3">
            <ViewToggle currentView={viewMode} onViewChange={setViewMode} />
            
            {isStudent && (
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleGenerateAiSuggestion}
                  disabled={isGeneratingSuggestion}
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Help
                </Button>
                <Button onClick={() => setIsCreateTaskOpen(true)}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Activity
                </Button>
              </div>
            )}

            {isTeacher && (
              <Button onClick={() => setIsTeacherDialogOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Add Deadline
              </Button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start flex-1">
          <div className="md:col-span-8 lg:col-span-9">
            {viewMode === 'week' ? (
              <WeekView
                events={events}
                selectedDay={selectedDay}
                onDaySelect={setSelectedDay}
                onEventMove={handleEventMove}
              />
            ) : (
              <ListView events={events} />
            )}
          </div>

          <div className="md:col-span-4 lg:col-span-3">
            {isStudent && (
              <TodayPanel 
                selectedDay={selectedDay}
                events={eventsForSelectedDay}
                suggestion={showAiPanel ? aiSuggestion : null}
                isGeneratingSuggestion={isGeneratingSuggestion}
                personalTasks={personalTasks || []}
                assignments={assignments || []}
                classes={classes || []}
              />
            )}
            {isTeacher && (
              <TeacherDeadlinesPanel
                events={events || []}
                selectedDay={selectedDay}
              />
            )}
          </div>
        </div>
      </div>

      {isStudent && (
        <CreateTaskDialog 
          isOpen={isCreateTaskOpen}
          setIsOpen={setIsCreateTaskOpen}
          onTaskCreated={handleTaskCreated}
          initialDate={selectedDay}
        />
      )}

      {isTeacher && (
        <TeacherDeadlineDialog
          isOpen={isTeacherDialogOpen}
          setIsOpen={setIsTeacherDialogOpen}
          classes={classes || []}
          onDeadlineCreated={handleTeacherDeadlineCreated}
          initialDate={selectedDay}
        />
      )}
    </>
  );
}
