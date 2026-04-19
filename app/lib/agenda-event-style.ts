import type { CalendarEvent } from '@/lib/types';

export type AgendaVisualType = 'homework' | 'test' | 'big_test' | 'other';

export type AgendaVisualStyle = {
  visualType: AgendaVisualType;
  accentColor: string;
  bgColor: string;
  label: 'H' | 't' | 'T' | 'O';
};

type EventWithLegacyType = CalendarEvent & {
  assignment_type?: string;
};

export function resolveAgendaVisualType(event: EventWithLegacyType): AgendaVisualType {
  if (event.type === 'agenda_item') {
    if (event.item_type === 'quiz') return 'test';
    if (event.item_type === 'event') return 'big_test';
    if (event.item_type === 'other' || event.item_type === 'studyset') return 'other';
    return 'homework';
  }

  const assignmentType = String(event.assignment_type || 'homework').toLowerCase();
  if (assignmentType === 'small_test' || assignmentType === 'quiz' || assignmentType === 'test') return 'test';
  if (assignmentType === 'big_test' || assignmentType === 'event') return 'big_test';
  if (assignmentType === 'other') return 'other';
  return 'homework';
}

export function getAgendaVisualStyle(event: EventWithLegacyType): AgendaVisualStyle {
  if (event.type === 'agenda_item' && event.visibility_state === 'hidden') {
    return {
      visualType: 'big_test',
      accentColor: '#c56f6f',
      bgColor: 'rgba(197, 111, 111, 0.12)',
      label: 'T',
    };
  }

  const visualType = resolveAgendaVisualType(event);
  switch (visualType) {
    case 'homework':
      return {
        visualType,
        accentColor: '#4f86c0',
        bgColor: 'rgba(79, 134, 192, 0.12)',
        label: 'H',
      };
    case 'test':
      return {
        visualType,
        accentColor: '#c38843',
        bgColor: 'rgba(195, 136, 67, 0.12)',
        label: 't',
      };
    case 'big_test':
      return {
        visualType,
        accentColor: '#c56f6f',
        bgColor: 'rgba(197, 111, 111, 0.12)',
        label: 'T',
      };
    default:
      return {
        visualType,
        accentColor: '#8f7bb0',
        bgColor: 'rgba(143, 123, 176, 0.12)',
        label: 'O',
      };
  }
}
