/**
 * Shared class permission helpers.
 * 
 * PHILOSOPHY: All teachers in a class are EQUAL. There is no "owner" hierarchy.
 * Role is GLOBAL - determined by profiles.subscription_type across the entire website.
 * A teacher is a teacher everywhere, a student is a student everywhere.
 * 
 * Teachers have their own dedicated subjects within a class
 * Students can see all subjects but only submit to their own.
 */

import { SupabaseClient } from '@supabase/supabase-js'

export interface ClassPermission {
  isMember: boolean
  isTeacher: boolean   // true if subscription_type = 'teacher'
  isStudent: boolean  // true if subscription_type = 'student'
  classRole: string | null
}

/**
 * Check if a user is a member of a class and what their global role is.
 * Role is determined by profiles.subscription_type (global, not per-class).
 */
export async function getClassPermission(
  supabase: SupabaseClient,
  classId: string,
  userId: string
): Promise<ClassPermission> {
  // Check if user is a member of this class
  const { data: member, error } = await supabase
    .from('class_members')
    .select('user_id, role')
    .eq('class_id', classId)
    .eq('user_id', userId)
    .single()

  if (error || !member) {
    return {
      isMember: false,
      isTeacher: false,
      isStudent: false,
      classRole: null,
    }
  }

  const classRole = String((member as any)?.role || '').toLowerCase() || null
  const classTeacherRoles = new Set(['teacher', 'owner', 'admin', 'creator', 'ta'])
  if (classRole && classTeacherRoles.has(classRole)) {
    return {
      isMember: true,
      isTeacher: true,
      isStudent: false,
      classRole,
    }
  }

  // Fallback to global role from profiles when class role is missing/legacy
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_type')
    .eq('id', userId)
    .single()

  const subscriptionType = profile?.subscription_type

  return {
    isMember: true,
    isTeacher: subscriptionType === 'teacher',
    isStudent: subscriptionType === 'student',
    classRole,
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
