'use client';

import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useDictionary } from '@/contexts/app-context';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Home,
  Circle,
  Square,
  BookCheck,
  ChevronRight,
  BookOpen,
  FileText
} from 'lucide-react';
import type { CalendarEvent } from '@/lib/types';
import type { ClassInfo } from '@/contexts/app-context';

interface AssignmentDetailsPanelProps {
  event: CalendarEvent | null;
  classes: ClassInfo[];
  isTeacher: boolean;
  isStudent: boolean;
  onEdit?: (assignmentId: string) => void;
}

export function AssignmentDetailsPanel({ event, classes, isTeacher, isStudent, onEdit }: AssignmentDetailsPanelProps) {
  const { dictionary } = useDictionary();
  const { toast } = useToast();
  const router = useRouter();

  if (!event) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground">
        <p className="text-sm">Select an item to view details</p>
      </div>
    );
  }

  const assignmentType = (event as any).assignment_type || 'homework';
  const isAgendaItem = event.type === 'agenda_item';
  const isStudysetPlan =
    event.type === 'study_plan' &&
    (event.subject === 'Studyset' || String(event.href || '').includes('studysetId='));
  const getClassChipColor = (classId?: string) => {
    if (!classId) return 'hsl(var(--muted))';
    let hash = 0;
    for (let i = 0; i < classId.length; i += 1) hash = (hash * 31 + classId.charCodeAt(i)) | 0;
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue} 65% 52%)`;
  };

  const getTypeStyle = () => {
    if (isStudysetPlan) {
      return {
        borderColor: '#87A96B',
        bgColor: 'rgba(135, 169, 107, 0.12)',
        icon: BookCheck,
        iconColor: 'text-[#87A96B]',
        label: 'Studyset task',
      };
    }

    if (isAgendaItem) {
      const agendaType = (event.item_type || 'assignment') as string;
      if (agendaType === 'quiz') {
        return {
          borderColor: 'rgb(245, 158, 11)',
          bgColor: 'rgba(245, 158, 11, 0.1)',
          icon: Circle,
          iconColor: 'text-amber-500',
          label: 'Quiz',
        };
      }
      if (agendaType === 'studyset') {
        return {
          borderColor: 'rgb(139, 92, 246)',
          bgColor: 'rgba(139, 92, 246, 0.1)',
          icon: BookCheck,
          iconColor: 'text-violet-500',
          label: 'Studyset',
        };
      }
      if (agendaType === 'event') {
        return {
          borderColor: 'rgb(14, 165, 233)',
          bgColor: 'rgba(14, 165, 233, 0.1)',
          icon: Square,
          iconColor: 'text-sky-500',
          label: 'Event',
        };
      }
      return {
        borderColor: 'rgb(59, 130, 246)',
        bgColor: 'rgba(59, 130, 246, 0.1)',
        icon: Home,
        iconColor: 'text-blue-500',
        label: 'Agenda',
      };
    }

    switch (assignmentType) {
      case 'homework':
        return {
          borderColor: 'rgb(59, 130, 246)',
          bgColor: 'rgba(59, 130, 246, 0.1)',
          icon: Home,
          iconColor: 'text-blue-500',
          label: 'Homework'
        };
      case 'small_test':
        return {
          borderColor: 'rgb(249, 115, 22)',
          bgColor: 'rgba(249, 115, 22, 0.1)',
          icon: Circle,
          iconColor: 'text-orange-500',
          label: 'Small Test'
        };
      case 'big_test':
        return {
          borderColor: 'rgb(239, 68, 68)',
          bgColor: 'rgba(239, 68, 68, 0.1)',
          icon: Square,
          iconColor: 'text-red-500',
          label: 'Big Test'
        };
      default:
        return {
          borderColor: 'hsl(var(--muted))',
          bgColor: 'hsl(var(--muted) / 0.1)',
          icon: BookCheck,
          iconColor: 'text-muted-foreground',
          label: 'Assignment'
        };
    }
  };

  const typeStyle = getTypeStyle();
  const IconComponent = typeStyle.icon;

  // Simple breadcrumb
  const breadcrumbs = [
    { label: event.subject, href: event.href, icon: BookOpen },
  ];

  const handleEdit = () => {
    if (onEdit) {
      onEdit(event.id);
    } else if (event.type === 'assignment') {
      router.push(`/class/${event.href.replace('/class/', '')}/assignments/${event.id}/edit`);
    } else if (event.type === 'agenda_item' && event.class_id) {
      router.push(`/agenda?classId=${event.class_id}`);
    }
  };

  const handleStartNow = () => {
    if (!event.href) return;
    router.push(event.href);
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        {breadcrumbs.map((crumb, index) => (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && <ChevronRight className="h-4 w-4" />}
            {crumb.icon && <crumb.icon className="h-4 w-4" />}
            <Link prefetch={false} href={crumb.href} className="hover:underline">
              {crumb.label}
            </Link>
          </div>
        ))}
      </nav>

      {/* Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className={`flex-shrink-0 w-10 h-10 rounded-lg ${typeStyle.bgColor} flex items-center justify-center border-2`} style={{ borderColor: typeStyle.borderColor }}>
              <IconComponent className={`h-5 w-5 ${typeStyle.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{event.title}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Badge variant="outline">{typeStyle.label}</Badge>
                {event.class_name && (
                  <Badge
                    variant="secondary"
                    className="text-white border-transparent"
                    style={{ backgroundColor: getClassChipColor(event.class_id) }}
                  >
                    {event.class_name}
                  </Badge>
                )}
                {event.visibility_state && (
                  <Badge variant={event.visibility_state === 'visible' ? 'default' : 'outline'}>
                    {event.visibility_state}
                  </Badge>
                )}
                <span className="text-xs">
                  {format(event.date, 'PPP')}
                </span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {event.href && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Action</CardTitle>
          </CardHeader>
          <CardContent>
            <Button onClick={handleStartNow} className="w-full">
              {isStudysetPlan ? 'Do now' : 'Open'}
            </Button>
            {isStudysetPlan && (
              <p className="mt-2 text-xs text-muted-foreground">
                Opens this studyset task and runs the guided setup steps automatically.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-1">Title</h4>
              <p className="text-muted-foreground">{event.title}</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Subject</h4>
              <p className="text-muted-foreground">{event.subject || 'Optional'}</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Date</h4>
              <p className="text-muted-foreground">{format(event.date, 'MMM d, yyyy')}</p>
            </div>
            {typeof event.estimated_duration === 'number' && event.estimated_duration > 0 && (
              <div>
                <h4 className="font-medium mb-1">Duration</h4>
                <p className="text-muted-foreground">{event.estimated_duration} min</p>
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-medium mb-2">Description</h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {event.description?.trim() || 'Optional'}
            </p>
          </div>

          {event.chapter_title && !isStudysetPlan && (
            <div>
              <h4 className="text-sm font-medium mb-1">Chapter</h4>
              <p className="text-sm text-muted-foreground">{event.chapter_title}</p>
            </div>
          )}

          {isTeacher && (
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Actions</h4>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  <FileText className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Linked Content */}
      {((event as any).linked_content && (event as any).linked_content.length > 0) || (event.links && event.links.length > 0) ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {((event.links || []).map((link) => ({
                url: '#',
                title: link.label,
                type: link.link_type,
              })) as any[]).concat((event as any).linked_content || []).map((link: any, idx: number) => (
                <Link prefetch={false}
                  key={idx}
                  href={link.url || '#'}
                  className="flex items-center gap-2 p-2 rounded-lg border hover:bg-muted/50 transition-colors"
                >
                  <FileText className="h-4 w-4 text-primary" />
                  <span className="text-sm truncate">{link.title}</span>
                  <Badge variant="outline" className="text-xs ml-auto">{link.type}</Badge>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

