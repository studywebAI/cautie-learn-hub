export type ClassPreferences = {
  default_subject_view: 'mine' | 'all';
  grades_default_scale: 'a_f' | 'one_to_ten' | 'both';
  grades_show_class_average: boolean;
  attendance_require_confirmation: boolean;
  invite_allow_teacher_invites: boolean;
  school_schedule_enabled: boolean;
  school_schedule_visible_to_students: boolean;
  agenda_default_visibility: 'visible' | 'hidden' | 'scheduled';
  agenda_default_item_type: 'assignment' | 'quiz' | 'studyset' | 'event' | 'other';
  agenda_show_schedule_overlay: boolean;
};

export const DEFAULT_CLASS_PREFERENCES: ClassPreferences = {
  default_subject_view: 'mine',
  grades_default_scale: 'both',
  grades_show_class_average: true,
  attendance_require_confirmation: true,
  invite_allow_teacher_invites: true,
  school_schedule_enabled: false,
  school_schedule_visible_to_students: true,
  agenda_default_visibility: 'visible',
  agenda_default_item_type: 'assignment',
  agenda_show_schedule_overlay: true,
};

export function normalizeClassPreferences(input: any): ClassPreferences {
  const defaultSubjectView = input?.default_subject_view === 'all' ? 'all' : 'mine';
  const defaultScale =
    input?.grades_default_scale === 'a_f' || input?.grades_default_scale === 'one_to_ten'
      ? input.grades_default_scale
      : 'both';

  return {
    default_subject_view: defaultSubjectView,
    grades_default_scale: defaultScale,
    grades_show_class_average: input?.grades_show_class_average !== false,
    attendance_require_confirmation: input?.attendance_require_confirmation !== false,
    invite_allow_teacher_invites: input?.invite_allow_teacher_invites !== false,
    school_schedule_enabled: input?.school_schedule_enabled === true,
    school_schedule_visible_to_students: input?.school_schedule_visible_to_students !== false,
    agenda_default_visibility:
      input?.agenda_default_visibility === 'hidden' || input?.agenda_default_visibility === 'scheduled'
        ? input.agenda_default_visibility
        : 'visible',
    agenda_default_item_type:
      input?.agenda_default_item_type === 'quiz' ||
      input?.agenda_default_item_type === 'studyset' ||
      input?.agenda_default_item_type === 'event' ||
      input?.agenda_default_item_type === 'other'
        ? input.agenda_default_item_type
        : 'assignment',
    agenda_show_schedule_overlay: input?.agenda_show_schedule_overlay !== false,
  };
}
