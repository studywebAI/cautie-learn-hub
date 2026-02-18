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

  const getTypeStyle = () => {
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
    } else {
      router.push(`/class/${event.href.replace('/class/', '')}/assignments/${event.id}/edit`);
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 overflow-y-auto">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        {breadcrumbs.map((crumb, index) => (
          <div key={index} className="flex items-center gap-2">
            {index > 0 && <ChevronRight className="h-4 w-4" />}
            {crumb.icon && <crumb.icon className="h-4 w-4" />}
            <Link href={crumb.href} className="hover:underline">
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
                <span className="text-xs">
                  {format(event.date, 'PPP')}
                </span>
              </CardDescription>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {event.description && (
            <div>
              <h4 className="text-sm font-medium mb-2">Description</h4>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">{event.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-1">Class</h4>
              <p className="text-muted-foreground">{event.subject}</p>
            </div>
            <div>
              <h4 className="font-medium mb-1">Date</h4>
              <p className="text-muted-foreground">{format(event.date, 'MMM d, yyyy')}</p>
            </div>
          </div>

          {event.chapter_title && (
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
      {(event as any).linked_content && (event as any).linked_content.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Resources</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {(event as any).linked_content.map((link: any, idx: number) => (
                <Link
                  key={idx}
                  href={link.url}
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
      )}
    </div>
  );
}
