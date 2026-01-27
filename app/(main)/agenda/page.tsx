
'use client';

import { useState, useContext, useMemo, useEffect } from 'react';
import { format, parseISO } from 'date-fns';
import { AppContext, AppContextType, PersonalTask, ClassAssignment, ClassInfo, useDictionary } from '@/contexts/app-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { CreateTaskDialog } from '@/components/agenda/create-task-dialog';
import { TodayPanel } from '@/components/agenda/today-panel';
import { WeekView } from '@/components/agenda/week-view';
import { PlusCircle, BookCheck } from 'lucide-react';
import type { AiSuggestion } from '@/lib/types';
import Link from 'next/link';
// import { generatePersonalizedStudyPlan } from '@/ai/flows/generate-personalized-study-plan'; // Removed direct import
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';


import type { CalendarEvent } from '@/lib/types';

export default function AgendaPage() {
  const { assignments, classes, isLoading, role, personalTasks, createPersonalTask, updatePersonalTask } = useContext(AppContext) as AppContextType;
  const { dictionary } = useDictionary();
  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const [chapters, setChapters] = useState<Map<string, { id: string; title: string }>>(new Map());
  const { toast } = useToast();

  const isStudent = role === 'student';

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

    if (isStudent) {
      const studentAssignmentEvents = (assignments || [])
        .filter((assignment: ClassAssignment) => assignment.due_date)
        .map((assignment: ClassAssignment) => {
            const className = (classes || []).find((c: ClassInfo) => c.id === assignment.class_id)?.name || 'Class';
            const href = `/class/${assignment.class_id}`;
            const chapter = assignment.chapter_id ? chapters.get(assignment.chapter_id) : undefined;
            return {
                id: assignment.id,
                title: assignment.title,
                subject: className,
                date: parseISO(assignment.due_date!),
                type: 'assignment' as const,
                href: href,
                chapter_id: assignment.chapter_id || undefined,
                chapter_title: chapter?.title,
            }
        });

      const personalEvents = (personalTasks || []).map((t: PersonalTask) => ({
          id: t.id,
          title: t.title,
          subject: 'Personal',
          date: parseISO(t.due_date || t.created_at),
          type: 'personal' as const,
          href: `/agenda#${t.id}`
      }));

      allEvents = [...studentAssignmentEvents, ...personalEvents];
    } else { // Teacher view
        const teacherAssignmentEvents = (assignments || [])
            .filter((assignment: ClassAssignment) => assignment.due_date && (classes || []).some((c: ClassInfo) => c.id === assignment.class_id))
            .map((assignment: ClassAssignment) => {
                const className = (classes || []).find((c: ClassInfo) => c.id === assignment.class_id)?.name || 'Class';
                const href = `/class/${assignment.class_id}`;
                const chapter = assignment.chapter_id ? chapters.get(assignment.chapter_id) : undefined;
                return {
                    id: assignment.id,
                    title: assignment.title,
                    subject: className,
                    date: parseISO(assignment.due_date!),
                    type: 'assignment' as const,
                    href: href,
                    chapter_id: assignment.chapter_id || undefined,
                    chapter_title: chapter?.title,
                }
            });
        allEvents = [...teacherAssignmentEvents];
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
  
  const eventDays = Array.from(eventsByDate.keys()).map(dateString => parseISO(dateString));
  
  useEffect(() => {
    if (!selectedDay || !isStudent || !eventsForSelectedDay.length) {
      setAiSuggestion(null);
      return;
    }

    const generateSuggestion = async () => {
      setIsGeneratingSuggestion(true);
      setAiSuggestion(null);

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

    generateSuggestion();
  }, [selectedDay, isStudent, eventsForSelectedDay, toast, assignments, classes, personalTasks]);


  const handleTaskCreated = async (newTask: Omit<PersonalTask, 'id' | 'created_at' | 'user_id'>) => {
    await createPersonalTask(newTask);
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
      <header className="flex justify-between items-center">
        <div>
            <h1 className="text-3xl font-bold font-headline">{dictionary.agenda.title}</h1>
            <p className="text-muted-foreground">{dictionary.agenda.description}</p>
        </div>
        {isStudent && (
          <Button onClick={() => setIsCreateTaskOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              {isStudent ? 'Add Activity' : 'Add Assignment'}
          </Button>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start flex-1">
        <div className="md:col-span-8 lg:col-span-9">
            <WeekView
              events={events}
              selectedDay={selectedDay}
              onDaySelect={setSelectedDay}
              onEventMove={handleEventMove}
            />
        </div>

        <div className="md:col-span-4 lg:col-span-3">
           {isStudent && (
             <TodayPanel 
                selectedDay={selectedDay}
                events={eventsForSelectedDay}
                suggestion={aiSuggestion}
                isGeneratingSuggestion={isGeneratingSuggestion}
                personalTasks={personalTasks || []}
                assignments={assignments || []}
                classes={classes || []}
             />
           )}
           {!isStudent && (
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-lg">Upcoming Deadlines</CardTitle>
                        <CardDescription>All assignments due soon across your classes.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 min-h-[200px]">
                        {eventsForSelectedDay.length > 0 ? (
                            eventsForSelectedDay.map(event => (
                                <Link key={event.id} href={event.href} className="block group hover:bg-muted transition-colors rounded-lg">
                                    <div className="p-3 bg-muted/50 rounded-lg border-l-4" 
                                         style={{borderColor: `hsl(var(--destructive))`}}>
                                        <div className='flex justify-between items-start'>
                                            <div className="flex-1">
                                                <p className="font-semibold">{event.title}</p>
                                                <p className="text-sm text-muted-foreground">{event.subject}</p>
                                                {event.chapter_title && (
                                                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                                    <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full"></span>
                                                    {event.chapter_title}
                                                  </p>
                                                )}
                                            </div>
                                            <BookCheck className="h-4 w-4 text-destructive"/>
                                        </div>
                                    </div>
                                </Link>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                No assignments due on this day.
                            </p>
                        )}
                    </CardContent>
                </Card>
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
    </>
  );
}
