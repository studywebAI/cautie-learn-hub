'use client';

import { Suspense, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { format, parseISO } from 'date-fns';
import { AppContext, AppContextType, PersonalTask } from '@/contexts/app-context';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CreateTaskDialog } from '@/components/agenda/create-task-dialog';
import { TodayPanel } from '@/components/agenda/today-panel';
import { WeekView } from '@/components/agenda/week-view';
import { ListView } from '@/components/agenda/list-view';
import { ViewToggle } from '@/components/agenda/view-toggle';
import { TeacherDeadlineDialog } from '@/components/agenda/teacher-deadline-dialog';
import { TeacherDeadlinesPanel } from '@/components/agenda/teacher-deadlines-panel';
import { AssignmentDetailsPanel } from '@/components/agenda/assignment-details-panel';
import { CautieLoader } from '@/components/ui/cautie-loader';
import { PlusCircle, Sparkles, SlidersHorizontal } from 'lucide-react';
import type { AiSuggestion, CalendarEvent } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

type ViewMode = 'week' | 'list';
type ScheduleSlot = {
  id: string;
  class_id: string;
  class_name?: string;
  day_of_week: number;
  period_index: number;
  title: string;
  start_time: string;
  end_time: string;
  is_break: boolean;
  notes?: string | null;
};

type StudysetAgendaItem = {
  id: string;
  studyset_id: string;
  title: string;
  plan_date: string;
  summary?: string | null;
  estimated_minutes: number;
  tasks: Array<{
    id: string;
    type: string;
    title: string;
    description?: string | null;
    estimated_minutes: number;
  }>;
};

const STUDYSET_TOOL_HREFS: Record<string, string> = {
  notes: '/tools/notes',
  flashcards: '/tools/flashcards',
  quiz: '/tools/quiz',
  wordweb: '/tools/notes',
};

type AgendaApiItem = {
  id: string;
  class_id: string;
  subject_id?: string | null;
  title: string;
  description?: string | null;
  item_type?: 'assignment' | 'quiz' | 'studyset' | 'event' | 'other';
  starts_at?: string | null;
  due_at?: string | null;
  visibility_state?: 'visible' | 'hidden' | 'scheduled';
  publish_at?: string | null;
  class_agenda_item_links?: Array<{
    id: string;
    link_type: string;
    link_ref_id?: string | null;
    label: string;
    metadata_json?: Record<string, any>;
    position?: number;
  }>;
  classes?: { id: string; name: string } | null;
  subjects?: { id: string; title: string } | null;
};

const OVERLAY_CLASSES_STORAGE_KEY = 'agenda-overlay-class-ids';

function startOfTodayLocal() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function dateForWeekdayInRange(base: Date, targetDayOfWeek: number, weekOffset: number) {
  const mondayBased = base.getDay() === 0 ? 7 : base.getDay();
  const diff = targetDayOfWeek - mondayBased + weekOffset * 7;
  const value = new Date(base);
  value.setDate(base.getDate() + diff);
  value.setHours(0, 0, 0, 0);
  return value;
}

function toDateWithTime(day: Date, timeValue: string) {
  const [hourPart, minutePart] = (timeValue || '00:00').split(':');
  const hour = Number(hourPart || 0);
  const minute = Number(minutePart || 0);
  const value = new Date(day);
  value.setHours(hour, minute, 0, 0);
  return value;
}

function agendaApiItemToEvent(item: AgendaApiItem): CalendarEvent {
  const dateIso = item.due_at || item.starts_at || new Date().toISOString();
  return {
    id: item.id,
    title: item.title,
    subject: item.subjects?.title || item.classes?.name || 'Class',
    class_id: item.class_id,
    class_name: item.classes?.name || undefined,
    subject_id: item.subject_id || null,
    date: parseISO(dateIso),
    type: 'agenda_item',
    item_type: item.item_type || 'assignment',
    visibility_state: item.visibility_state || 'visible',
    publish_at: item.publish_at || null,
    href: '/agenda',
    description: item.description || undefined,
    links: (item.class_agenda_item_links || []).map((link) => ({
      id: link.id,
      link_type: link.link_type,
      link_ref_id: link.link_ref_id || null,
      label: link.label,
      metadata_json: link.metadata_json || {},
      position: link.position,
    })),
  };
}

export default function AgendaPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[55vh] items-center justify-center">
          <CautieLoader label="Loading agenda" sublabel="Building your timeline" size="lg" />
        </div>
      }
    >
      <AgendaPageContent />
    </Suspense>
  );
}

function AgendaPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    assignments,
    classes,
    isLoading,
    role,
    personalTasks,
    createPersonalTask,
    updatePersonalTask,
  } = useContext(AppContext) as AppContextType;
  const { toast } = useToast();

  const [selectedDay, setSelectedDay] = useState<Date | undefined>(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [isTeacherDialogOpen, setIsTeacherDialogOpen] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<AiSuggestion | null>(null);
  const [isGeneratingSuggestion, setIsGeneratingSuggestion] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [overlayClassIds, setOverlayClassIds] = useState<string[]>([]);
  const [scheduleSlots, setScheduleSlots] = useState<ScheduleSlot[]>([]);
  const [studysetAgendaItems, setStudysetAgendaItems] = useState<StudysetAgendaItem[]>([]);
  const [teacherAgendaItems, setTeacherAgendaItems] = useState<AgendaApiItem[]>([]);
  const [studentAgendaItems, setStudentAgendaItems] = useState<AgendaApiItem[]>([]);

  const isStudent = role === 'student';
  const isTeacher = role === 'teacher';
  const classIdFromQuery = searchParams.get('classId') || '';

  useEffect(() => {
    if (!isTeacher) return;
    const teacherClasses = (classes || []).filter((classItem) => classItem.status !== 'archived');
    if (teacherClasses.length === 0) {
      setSelectedClassId('');
      setOverlayClassIds([]);
      return;
    }

    const savedClassId = typeof window !== 'undefined' ? window.localStorage.getItem('studyweb-last-class-id') : null;
    const preferredClassId = classIdFromQuery || savedClassId || teacherClasses[0].id;
    const resolvedClassId = teacherClasses.find((classItem) => classItem.id === preferredClassId)?.id || teacherClasses[0].id;

    setSelectedClassId(resolvedClassId);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('studyweb-last-class-id', resolvedClassId);
      const rawOverlay = window.localStorage.getItem(OVERLAY_CLASSES_STORAGE_KEY);
      const parsed = rawOverlay ? JSON.parse(rawOverlay) : [];
      const validOverlay = Array.isArray(parsed)
        ? parsed.filter((classId: string) => teacherClasses.some((classItem) => classItem.id === classId))
        : [];
      const merged = Array.from(new Set([resolvedClassId, ...validOverlay]));
      setOverlayClassIds(merged);
    } else {
      setOverlayClassIds([resolvedClassId]);
    }

    if (classIdFromQuery !== resolvedClassId) {
      router.replace(`/agenda?classId=${resolvedClassId}`);
    }
  }, [isTeacher, classes, classIdFromQuery, router]);

  useEffect(() => {
    if (!isTeacher || overlayClassIds.length === 0) return;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(OVERLAY_CLASSES_STORAGE_KEY, JSON.stringify(overlayClassIds));
    }
  }, [isTeacher, overlayClassIds]);

  useEffect(() => {
    if (isLoading) return;
    const controller = new AbortController();

    const loadSchedule = async () => {
      try {
        if (isTeacher) {
          if (!selectedClassId) {
            setScheduleSlots([]);
            return;
          }
          const response = await fetch(`/api/classes/${selectedClassId}/school-schedule`, { signal: controller.signal });
          if (!response.ok) {
            setScheduleSlots([]);
            return;
          }
          const data = await response.json();
          setScheduleSlots((data?.enabled ? data?.slots : []) || []);
          return;
        }

        if (isStudent) {
          const response = await fetch('/api/school-schedule', { signal: controller.signal });
          if (!response.ok) {
            setScheduleSlots([]);
            return;
          }
          const data = await response.json();
          setScheduleSlots(data?.slots || []);
          return;
        }

        setScheduleSlots([]);
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        setScheduleSlots([]);
      }
    };

    void loadSchedule();
    return () => controller.abort();
  }, [isLoading, isTeacher, isStudent, selectedClassId]);

  useEffect(() => {
    if (isLoading) {
      setStudysetAgendaItems([]);
      return;
    }

    const controller = new AbortController();
    const from = new Date().toISOString().slice(0, 10);
    const to = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10);

    const loadStudysetAgenda = async () => {
      try {
        const response = await fetch(`/api/studysets/agenda?from=${from}&to=${to}`, { signal: controller.signal });
        if (!response.ok) {
          setStudysetAgendaItems([]);
          return;
        }
        const data = await response.json();
        setStudysetAgendaItems(data?.items || []);
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        setStudysetAgendaItems([]);
      }
    };

    void loadStudysetAgenda();
    return () => controller.abort();
  }, [isLoading]);

  useEffect(() => {
    if (!isTeacher || isLoading || overlayClassIds.length === 0) {
      setTeacherAgendaItems([]);
      return;
    }
    const controller = new AbortController();
    const from = new Date().toISOString().slice(0, 10);
    const to = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10);

    const load = async () => {
      try {
        const params = new URLSearchParams();
        params.set('classIds', overlayClassIds.join(','));
        params.set('from', from);
        params.set('to', to);
        const response = await fetch(`/api/agenda/teacher-overlay?${params.toString()}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Failed to load teacher agenda');
        setTeacherAgendaItems(data?.items || []);
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        setTeacherAgendaItems([]);
      }
    };

    void load();
    return () => controller.abort();
  }, [isTeacher, isLoading, overlayClassIds]);

  useEffect(() => {
    if (!isStudent || isLoading) {
      setStudentAgendaItems([]);
      return;
    }

    const controller = new AbortController();
    const from = new Date().toISOString().slice(0, 10);
    const to = new Date(Date.now() + 1000 * 60 * 60 * 24 * 365).toISOString().slice(0, 10);

    const load = async () => {
      try {
        const response = await fetch(`/api/agenda/feed?from=${from}&to=${to}`, { signal: controller.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Failed to load agenda feed');
        setStudentAgendaItems(data?.items || []);
      } catch (error: any) {
        if (error?.name === 'AbortError') return;
        setStudentAgendaItems([]);
      }
    };

    void load();
    return () => controller.abort();
  }, [isStudent, isLoading]);

  const events: CalendarEvent[] = useMemo(() => {
    if (isLoading) return [];

    const scheduleEvents: CalendarEvent[] = [];
    if (scheduleSlots.length > 0) {
      const horizonWeeks = 52;
      const base = startOfTodayLocal();
      for (let weekOffset = 0; weekOffset < horizonWeeks; weekOffset++) {
        scheduleSlots.forEach((slot) => {
          if (!slot.day_of_week || slot.day_of_week < 1 || slot.day_of_week > 7) return;
          const dayDate = dateForWeekdayInRange(base, slot.day_of_week, weekOffset);
          if (dayDate < base) return;
          scheduleEvents.push({
            id: `schedule-${slot.id}-${format(dayDate, 'yyyy-MM-dd')}`,
            title: slot.is_break ? `Break · ${slot.title}` : slot.title,
            subject: (slot as any).class_name || 'School schedule',
            class_id: slot.class_id,
            class_name: slot.class_name,
            date: toDateWithTime(dayDate, slot.start_time),
            type: 'study_plan',
            href: '/agenda',
            estimated_duration: Math.max(
              0,
              Math.round(
                (toDateWithTime(dayDate, slot.end_time).getTime() - toDateWithTime(dayDate, slot.start_time).getTime()) / 60000
              )
            ),
            description: slot.notes || `${slot.start_time}-${slot.end_time}`,
          });
        });
      }
    }

    const studysetEvents: CalendarEvent[] = studysetAgendaItems
      .filter((item) => Boolean(item.plan_date))
      .flatMap((item) => {
        const dayDate = parseISO(item.plan_date);
        const tasks = (item.tasks || []).filter((task) => !task.completed);
        if (tasks.length === 0) {
          return [{
            id: `studyset-${item.id}`,
            title: item.title,
            subject: 'Studyset',
            date: toDateWithTime(dayDate, '18:00'),
            type: 'study_plan' as const,
            href: `/tools/studyset/${item.studyset_id}`,
            estimated_duration: item.estimated_minutes || undefined,
            description: item.summary || 'Studyset day',
          }];
        }

        return tasks.map((task, index) => {
          const hour = 17 + Math.floor(index / 2);
          const minute = index % 2 === 0 ? 0 : 30;
          const at = new Date(dayDate);
          at.setHours(hour, minute, 0, 0);
          const href = task.type === 'review'
            ? `/tools/studyset/${item.studyset_id}`
            : `${STUDYSET_TOOL_HREFS[task.type] || '/tools/notes'}?studysetId=${item.studyset_id}&taskId=${task.id}&launch=1`;
          return {
            id: `studyset-task-${task.id}`,
            title: task.title,
            subject: 'Studyset',
            date: at,
            type: 'study_plan' as const,
            href,
            estimated_duration: task.estimated_minutes || undefined,
            description: task.description || item.summary || undefined,
          };
        });
      });

    if (isTeacher) {
      const overlaySet = new Set(overlayClassIds);
      const agendaEvents = teacherAgendaItems
        .filter((item) => overlaySet.has(item.class_id))
        .map(agendaApiItemToEvent);
      return [...agendaEvents, ...scheduleEvents, ...studysetEvents];
    }

    const personalEvents = (personalTasks || []).map((task: PersonalTask) => ({
      id: task.id,
      title: task.title,
      subject: 'Personal',
      date: parseISO(task.due_date || task.created_at),
      type: 'personal' as const,
      href: `/agenda#${task.id}`,
      priority: (task as any).priority,
      estimated_duration: (task as any).estimated_duration,
      tags: (task as any).tags,
    }));

    const feedEvents = studentAgendaItems.map(agendaApiItemToEvent);
    return [...feedEvents, ...personalEvents, ...scheduleEvents, ...studysetEvents];
  }, [isLoading, isTeacher, isStudent, overlayClassIds, teacherAgendaItems, studentAgendaItems, personalTasks, scheduleSlots, studysetAgendaItems]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const dateString = format(event.date, 'yyyy-MM-dd');
      if (!map.has(dateString)) map.set(dateString, []);
      map.get(dateString)?.push(event);
    });
    return map;
  }, [events]);

  const selectedDayString = selectedDay ? format(selectedDay, 'yyyy-MM-dd') : '';
  const eventsForSelectedDay = eventsByDate.get(selectedDayString) || [];

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

    const relevantEvents = eventsForSelectedDay.filter((event) => event.type === 'assignment' || event.type === 'personal' || event.type === 'agenda_item');
    const tasksForAI = relevantEvents.map((event) => `Title: ${event.title}, Due: ${format(event.date, 'PPP')}, Type: ${event.type}`).join('\n');
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
            learningHabits: 'The student prefers to study in the evenings and focuses on one subject at a time.',
            calendar: "The student's calendar includes classes from 9 AM to 3 PM on weekdays, and weekends are free.",
          },
        }),
      });
      if (!response.ok) throw new Error(response.statusText);
      const result = await response.json();
      setAiSuggestion({ id: 'ai-plan', title: result.studyPlan, content: result.studyPlan, icon: 'BrainCircuit' });
    } catch {
      toast({
        variant: 'destructive',
        title: 'AI Suggestion Failed',
        description: 'Could not generate a study plan. Please try again later.',
      });
    } finally {
      setIsGeneratingSuggestion(false);
    }
  };

  const handleTaskCreated = async (newTask: Omit<PersonalTask, 'id' | 'created_at' | 'user_id'>) => {
    await createPersonalTask(newTask);
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (event.type === 'assignment' || event.type === 'agenda_item') {
      setSelectedEvent(event);
      return;
    }
    if (event.href) router.push(event.href);
  };

  const handleTeacherDeadlineCreated = async (item: {
    title: string;
    description: string;
    class_id: string;
    subject_id?: string | null;
    item_type: 'assignment' | 'quiz' | 'studyset' | 'event' | 'other';
    starts_at?: string | null;
    due_at?: string | null;
    visible: boolean;
    publish_at?: string | null;
    links?: Array<{
      link_type: string;
      link_ref_id?: string | null;
      label: string;
      metadata_json?: Record<string, any>;
      position?: number;
    }>;
  }) => {
    const response = await fetch(`/api/classes/${item.class_id}/agenda`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error || 'Failed to create agenda item');
    }

    const params = new URLSearchParams();
    params.set('classIds', overlayClassIds.join(','));
    const refreshed = await fetch(`/api/agenda/teacher-overlay?${params.toString()}`);
    if (refreshed.ok) {
      const data = await refreshed.json();
      setTeacherAgendaItems(data?.items || []);
    }
  };

  const handleEventMove = async (eventId: string, newDate: Date) => {
    const event = events.find((row) => row.id === eventId);
    if (event?.type === 'personal') {
      await updatePersonalTask(eventId, { due_date: format(newDate, 'yyyy-MM-dd') });
      return;
    }
    if (event?.type === 'agenda_item' && event.class_id) {
      const dueAt = new Date(newDate);
      dueAt.setHours(12, 0, 0, 0);
      const response = await fetch(`/api/classes/${event.class_id}/agenda/${event.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ due_at: dueAt.toISOString(), starts_at: dueAt.toISOString() }),
      });
      if (!response.ok) return;
      const updatedIso = dueAt.toISOString();
      setTeacherAgendaItems((prev) =>
        prev.map((item) =>
          item.id === event.id
            ? { ...item, due_at: updatedIso, starts_at: updatedIso }
            : item
        )
      );
    }
  };

  const teacherClasses = (classes || []).filter((classItem) => classItem.status !== 'archived');
  const toggleOverlayClass = (classId: string, checked: boolean) => {
    setOverlayClassIds((prev) => {
      const set = new Set(prev.length > 0 ? prev : [selectedClassId]);
      if (checked) set.add(classId);
      else set.delete(classId);
      if (!set.has(selectedClassId)) set.add(selectedClassId);
      return Array.from(set);
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center">
        <CautieLoader label="Loading agenda" sublabel="Syncing timeline data" size="lg" />
      </div>
    );
  }

  return (
    <div className="h-full p-2 md:p-3">
      <div className="flex h-full flex-col gap-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="text-xs text-muted-foreground">
            {isTeacher ? 'Plan once, overlay multiple classes, publish when ready.' : 'Your agenda combines class items, schedule, and personal tasks.'}
          </div>

          <div className="flex items-center gap-3">
            {isTeacher && (
              <>
                <select
                  value={selectedClassId}
                  onChange={(event) => {
                    const nextClassId = event.target.value;
                    setSelectedClassId(nextClassId);
                    setOverlayClassIds((prev) => {
                      const set = new Set(prev);
                      set.add(nextClassId);
                      return Array.from(set);
                    });
                    if (typeof window !== 'undefined') {
                      window.localStorage.setItem('studyweb-last-class-id', nextClassId);
                    }
                    router.replace(`/agenda?classId=${nextClassId}`);
                  }}
                  className="h-9 min-w-[190px] rounded-md border border-border bg-background px-2 text-sm"
                >
                  {teacherClasses.map((classItem) => (
                    <option key={classItem.id} value={classItem.id}>
                      {classItem.name}
                    </option>
                  ))}
                </select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-2">
                      <SlidersHorizontal className="h-4 w-4" />
                      Overlay ({overlayClassIds.length})
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-72">
                    <div className="space-y-3">
                      <p className="text-sm font-medium">Additional classes</p>
                      {teacherClasses.map((classItem) => {
                        const checked = overlayClassIds.includes(classItem.id);
                        const locked = classItem.id === selectedClassId;
                        return (
                          <label key={classItem.id} className="flex items-center justify-between gap-2 rounded-lg border p-2">
                            <span className="text-sm">{classItem.name}</span>
                            <Checkbox
                              checked={checked}
                              disabled={locked}
                              onCheckedChange={(value) => toggleOverlayClass(classItem.id, Boolean(value))}
                            />
                          </label>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              </>
            )}

            <ViewToggle currentView={viewMode} onViewChange={setViewMode} />

            {isStudent && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleGenerateAiSuggestion} disabled={isGeneratingSuggestion}>
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
                Add Agenda Item
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start flex-1">
          <div className="md:col-span-8 lg:col-span-9">
            {viewMode === 'week' ? (
              <WeekView
                events={events}
                selectedDay={selectedDay}
                onDaySelect={setSelectedDay}
                onEventMove={handleEventMove}
                onEventClick={handleEventClick}
              />
            ) : (
              <ListView events={events} onEventClick={handleEventClick} />
            )}
          </div>

          <div className="md:col-span-4 lg:col-span-3">
            {selectedEvent ? (
              <AssignmentDetailsPanel event={selectedEvent} classes={classes || []} isTeacher={isTeacher} isStudent={isStudent} />
            ) : isStudent ? (
              <TodayPanel
                selectedDay={selectedDay}
                events={eventsForSelectedDay}
                suggestion={showAiPanel ? aiSuggestion : null}
                isGeneratingSuggestion={isGeneratingSuggestion}
                personalTasks={personalTasks || []}
                assignments={assignments || []}
                classes={classes || []}
                onEventClick={handleEventClick}
              />
            ) : (
              <TeacherDeadlinesPanel events={events || []} selectedDay={selectedDay} onEventClick={handleEventClick} />
            )}

            {selectedEvent && (
              <Button variant="ghost" size="sm" className="mt-2 w-full" onClick={() => setSelectedEvent(null)}>
                Back to {isTeacher ? 'Agenda' : 'Today'}
              </Button>
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
          defaultClassId={selectedClassId}
          onDeadlineCreated={handleTeacherDeadlineCreated}
          initialDate={selectedDay}
        />
      )}
    </div>
  );
}
