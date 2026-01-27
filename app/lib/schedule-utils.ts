import { PersonalTask, ClassAssignment } from '@/contexts/app-context';
import { format, parseISO, isSameDay, addMinutes } from 'date-fns';

export interface TaskWithSchedule {
  id: string;
  title: string;
  date?: string;
  time?: string;
  duration?: number;
  priority?: 'low' | 'medium' | 'high';
  dependencies?: string[];
  type: 'personal' | 'assignment';
}

export interface ScheduleConflict {
  taskId1: string;
  taskId2: string;
  conflictType: 'time_overlap' | 'dependency_violation';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
}

export function detectConflicts(tasks: TaskWithSchedule[]): ScheduleConflict[] {
  const conflicts: ScheduleConflict[] = [];

  // Group tasks by date
  const tasksByDate: Record<string, TaskWithSchedule[]> = {};
  tasks.forEach(task => {
    if (task.date) {
      if (!tasksByDate[task.date]) {
        tasksByDate[task.date] = [];
      }
      tasksByDate[task.date].push(task);
    }
  });

  // Check for time overlaps on the same date
  Object.values(tasksByDate).forEach(dayTasks => {
    const scheduledTasks = dayTasks.filter(t => t.time && t.duration);
    for (let i = 0; i < scheduledTasks.length; i++) {
      for (let j = i + 1; j < scheduledTasks.length; j++) {
        const task1 = scheduledTasks[i];
        const task2 = scheduledTasks[j];

        if (hasTimeOverlap(task1, task2)) {
          conflicts.push({
            taskId1: task1.id,
            taskId2: task2.id,
            conflictType: 'time_overlap',
            severity: 'high',
            description: `${task1.title} and ${task2.title} overlap in time on ${task1.date}`,
            suggestion: 'Reschedule one of the tasks to a different time slot.',
          });
        }
      }
    }
  });

  // Check for dependency violations
  tasks.forEach(task => {
    if (task.dependencies && task.dependencies.length > 0) {
      task.dependencies.forEach(depId => {
        const depTask = tasks.find(t => t.id === depId);
        if (depTask && task.date && depTask.date) {
          const taskDate = parseISO(task.date);
          const depDate = parseISO(depTask.date);

          if (taskDate < depDate) {
            conflicts.push({
              taskId1: task.id,
              taskId2: depId,
              conflictType: 'dependency_violation',
              severity: 'high',
              description: `${task.title} is scheduled before its dependency ${depTask.title}`,
              suggestion: 'Move the dependent task to after the dependency is completed.',
            });
          }
        }
      });
    }
  });

  return conflicts;
}

function hasTimeOverlap(task1: TaskWithSchedule, task2: TaskWithSchedule): boolean {
  if (!task1.time || !task2.time || !task1.duration || !task2.duration) {
    return false;
  }

  const [h1, m1] = task1.time.split(':').map(Number);
  const start1 = h1 * 60 + m1;
  const end1 = start1 + (task1.duration || 60);

  const [h2, m2] = task2.time.split(':').map(Number);
  const start2 = h2 * 60 + m2;
  const end2 = start2 + (task2.duration || 60);

  return start1 < end2 && start2 < end1;
}

export function convertToTaskWithSchedule(
  personalTasks: PersonalTask[],
  assignments: ClassAssignment[],
  classes: { id: string; name: string }[]
): TaskWithSchedule[] {
  const personal: TaskWithSchedule[] = personalTasks.map(t => ({
    id: t.id,
    title: t.title,
    date: (t as any).date ? format(parseISO((t as any).date), 'yyyy-MM-dd') : undefined,
    time: undefined, // No time field yet
    duration: (t as any).estimated_duration || 60,
    priority: (t as any).priority || 'medium',
    dependencies: (t as any).dependencies || [],
    type: 'personal' as const,
  }));

  const assign: TaskWithSchedule[] = assignments.map(a => {
    const className = classes.find(c => c.id === a.class_id)?.name || 'Class';
    return {
      id: a.id,
      title: a.title,
      date: a.due_date ? format(parseISO(a.due_date), 'yyyy-MM-dd') : undefined,
      time: undefined,
      duration: 120, // Assume 2 hours for assignments
      priority: 'high' as const,
      dependencies: [],
      type: 'assignment' as const,
    };
  });

  return [...personal, ...assign];
}

export function optimizeSchedule(
  tasks: TaskWithSchedule[],
  availableSlots: { date: string; startTime: string; endTime: string }[]
): { taskId: string; suggestedDate: string; suggestedTime: string; reasoning: string }[] {
  const optimizations: { taskId: string; suggestedDate: string; suggestedTime: string; reasoning: string }[] = [];

  // Sort tasks by priority and due date
  const sortedTasks = tasks
    .filter(t => !t.date) // Only optimize unscheduled tasks
    .sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority || 'medium'];
      const bPriority = priorityOrder[b.priority || 'medium'];
      if (aPriority !== bPriority) return bPriority - aPriority;
      // Then by type (assignments first)
      if (a.type !== b.type) return a.type === 'assignment' ? -1 : 1;
      return 0;
    });

  for (const task of sortedTasks) {
    // Find best available slot
    for (const slot of availableSlots) {
      const slotStart = parseInt(slot.startTime.replace(':', ''));
      const slotEnd = parseInt(slot.endTime.replace(':', ''));
      const duration = task.duration || 60;
      const durationMinutes = duration;

      if (slotEnd - slotStart >= durationMinutes) {
        optimizations.push({
          taskId: task.id,
          suggestedDate: slot.date,
          suggestedTime: slot.startTime,
          reasoning: `Scheduled ${task.title} in available slot based on priority ${task.priority}`,
        });
        break;
      }
    }
  }

  return optimizations;
}

export function suggestBreaks(tasks: TaskWithSchedule[]): { date: string; time: string; duration: number; reason: string }[] {
  const breaks: { date: string; time: string; duration: number; reason: string }[] = [];
  const tasksByDate = tasks.reduce((acc, task) => {
    if (task.date) {
      if (!acc[task.date]) acc[task.date] = [];
      acc[task.date].push(task);
    }
    return acc;
  }, {} as Record<string, TaskWithSchedule[]>);

  Object.entries(tasksByDate).forEach(([date, dayTasks]) => {
    const scheduledTasks = dayTasks.filter(t => t.time).sort((a, b) =>
      (a.time || '').localeCompare(b.time || '')
    );

    for (let i = 0; i < scheduledTasks.length - 1; i++) {
      const current = scheduledTasks[i];
      const next = scheduledTasks[i + 1];
      if (current.time && next.time && current.duration) {
        const currentEnd = addMinutes(parseISO(`${date}T${current.time}`), current.duration);
        const nextStart = parseISO(`${date}T${next.time}`);
        const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60);

        if (gapMinutes >= 30) {
          breaks.push({
            date,
            time: format(currentEnd, 'HH:mm'),
            duration: Math.min(gapMinutes - 10, 15), // 15 min break, leave 10 min buffer
            reason: `Break between ${current.title} and ${next.title}`,
          });
        }
      }
    }
  });

  return breaks;
}