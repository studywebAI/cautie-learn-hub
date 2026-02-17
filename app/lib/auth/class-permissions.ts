/**
 * Shared class permission helpers.
 * 
 * PHILOSOPHY: All teachers in a class are EQUAL. There is no "owner" hierarchy.
 * The `owner_id` on classes is kept as `created_by` for reference only.
 * Management role exists for oversight but has the same editing powers.
 * 
 * Role hierarchy (all equal editing power):
 *   - management: can do everything teachers can + view audit logs
 *   - teacher: full edit access to all subjects, grades, content in the class
 *   - student: read-only access to content, submit answers
 */

import { SupabaseClient } from '@supabase/supabase-js'

export type ClassRole = 'teacher' | 'student' | 'management'

export interface ClassPermission {
  isMember: boolean
  isTeacher: boolean   // true for teacher OR management
  isManagement: boolean
  isStudent: boolean
  role: ClassRole | null
}

/**
 * Check if a user is a teacher (or management) in a class.
 * This replaces all `owner_id === user.id` checks.
 * Teachers are identified by their role in class_members.
 */
export async function getClassPermission(
  supabase: SupabaseClient,
  classId: string,
  userId: string
): Promise<ClassPermission> {
  // Check class_members for the user's role
  const { data: member, error } = await supabase
    .from('class_members')
    .select('role')
    .eq('class_id', classId)
    .eq('user_id', userId)
    .single()

  if (error || !member) {
    // Fallback: check if user is the legacy owner_id (treat as teacher)
    const { data: classData } = await supabase
      .from('classes')
      .select('owner_id')
      .eq('id', classId)
      .single()

    if (classData?.owner_id === userId) {
      return {
        isMember: true,
        isTeacher: true,
        isManagement: false,
        isStudent: false,
        role: 'teacher'
      }
    }

    return {
      isMember: false,
      isTeacher: false,
      isManagement: false,
      isStudent: false,
      role: null
    }
  }

  const role = member.role as ClassRole
  const isTeacher = role === 'teacher' || role === 'management'
  const isManagement = role === 'management'

  return {
    isMember: true,
    isTeacher,
    isManagement,
    isStudent: role === 'student',
    role
  }
}

/**
 * Quick check: is this user a teacher in the class?
 * Shorthand for getClassPermission that just returns a boolean.
 */
export async function isTeacherInClass(
  supabase: SupabaseClient,
  classId: string,
  userId: string
): Promise<boolean> {
  const perm = await getClassPermission(supabase, classId, userId)
  return perm.isTeacher
}

/**
 * Quick check: is this user a member (any role) of the class?
 */
export async function isMemberOfClass(
  supabase: SupabaseClient,
  classId: string,
  userId: string
): Promise<boolean> {
  const perm = await getClassPermission(supabase, classId, userId)
  return perm.isMember
}

/**
 * Log an audit entry for teacher actions.
 * Every edit by any teacher is tracked so it's clear who did what.
 */
export async function logAuditEntry(
  supabase: SupabaseClient,
  params: {
    userId: string
    classId?: string
    action: string       // e.g. 'create', 'update', 'delete', 'grade'
    entityType: string   // e.g. 'subject', 'chapter', 'assignment', 'grade', 'block'
    entityId?: string
    changes?: Record<string, any>
    metadata?: Record<string, any>
  }
): Promise<void> {
  try {
    await (supabase as any)
      .from('audit_logs')
      .insert({
        user_id: params.userId,
        class_id: params.classId || null,
        action: params.action,
        entity_type: params.entityType,
        entity_id: params.entityId || null,
        changes: params.changes || null,
        metadata: params.metadata || null
      })
  } catch (err) {
    // Audit logging should never block the main operation
    console.error('Audit log failed (non-blocking):', err)
  }
}
