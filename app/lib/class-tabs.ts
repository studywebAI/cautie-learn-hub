export const TEACHER_CLASS_TAB_IDS = [
  'invite',
  'group',
  'share',
  'schedule',
  'attendance',
  'grades',
  'analytics',
  'logs',
  'settings',
] as const;

export const STUDENT_CLASS_TAB_IDS = ['invite', 'group', 'share'] as const;

export type TeacherClassTabId = (typeof TEACHER_CLASS_TAB_IDS)[number];
export type StudentClassTabId = (typeof STUDENT_CLASS_TAB_IDS)[number];
export type ClassTabId = TeacherClassTabId | StudentClassTabId;

export function isTeacherClassTab(tab: string): tab is TeacherClassTabId {
  return (TEACHER_CLASS_TAB_IDS as readonly string[]).includes(tab);
}

export function isStudentClassTab(tab: string): tab is StudentClassTabId {
  return (STUDENT_CLASS_TAB_IDS as readonly string[]).includes(tab);
}
