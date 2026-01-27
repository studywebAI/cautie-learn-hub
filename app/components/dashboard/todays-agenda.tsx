
'use client';

import { useMemo } from 'react';
import { format, isToday, parseISO } from 'date-fns';
import type { ClassAssignment, ClassInfo, PersonalTask } from '@/contexts/app-context';
import { BrainCircuit, BookCheck } from 'lucide-react';
import { Button } from '../ui/button';
import Link from 'next/link';

type TodaysAgendaProps = {
  assignments: ClassAssignment[];
  personalTasks: PersonalTask[];
  classes: ClassInfo[];
};

export function TodaysAgenda({ assignments, personalTasks, classes }: TodaysAgendaProps) {
  const todaysEvents = useMemo(() => {
    const assignmentEvents = (Array.isArray(assignments) ? assignments : [])
      .filter(a => a.due_date && isToday(parseISO(a.due_date)))
      .map(a => {
        const className = classes.find(c => c.id === a.class_id)?.name || 'Class';
        return {
          id: a.id,
          title: a.title,
          subject: className,
          type: 'assignment' as const,
          material_id: null, // assignments don't have material_id directly
          class_id: a.class_id,
        };
      });

    const personalEvents = (Array.isArray(personalTasks) ? personalTasks : [])
      .filter(t => t.due_date && isToday(parseISO(t.due_date)))
      .map(t => ({
        id: t.id,
        title: t.title,
        subject: 'Personal',
        type: 'personal' as const,
        material_id: null,
        class_id: null,
      }));

    return [...assignmentEvents, ...personalEvents];
  }, [assignments, personalTasks, classes]);

  if (todaysEvents.length === 0) {
    return (
      <div className="text-center text-muted-foreground p-4">
        <p>You have nothing scheduled for today.</p>
        <Button variant="link" asChild className="mt-2">
          <Link href="/agenda">Go to Agenda to add tasks</Link>
        </Button>
      </div>
    );
  }

  const renderEvent = (event: typeof todaysEvents[0]) => {
    const content = (
        <div className="p-3 bg-muted/50 rounded-lg border-l-4 w-full"
             style={{ borderColor: `hsl(var(--${event.type === 'assignment' ? 'destructive' : 'primary'}))` }}>
          <div className='flex justify-between items-start'>
            <div>
              <p className="font-semibold">{event.title}</p>
              <p className="text-sm text-muted-foreground">{event.subject}</p>
            </div>
            {event.type === 'assignment'
              ? <BookCheck className="h-4 w-4 text-destructive flex-shrink-0" />
              : <BrainCircuit className="h-4 w-4 text-primary flex-shrink-0" />}
          </div>
        </div>
    );

    if (event.type === 'assignment') {
        const href = event.material_id ? `/material/${event.material_id}` : `/class/${event.class_id}`;
        return (
            <Link key={event.id} href={href} className="block hover:bg-muted/80 rounded-lg transition-colors">
                {content}
            </Link>
        )
    }

    // Personal tasks are not clickable for now
    return <div key={event.id}>{content}</div>;
  }

  return (
    <div className="space-y-3">
      {todaysEvents.map(renderEvent)}
    </div>
  );
}

    
