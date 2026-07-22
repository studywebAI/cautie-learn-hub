/**
 * Shared subject permission helper.
 *
 * Consolidates the previously-duplicated canAccessSubject / userHasSubjectAccess /
 * studentHasSubjectAccess implementations (8 call sites, 3 near-identical copies)
 * into one place. Access is granted, in order:
 *   1. subjects.user_id === userId (ownership)
 *   2. subject_teachers row for this user
 *   3. subject_students row for this user
 *   4. class_members -> subjects.class_id OR class_subjects (the original,
 *      still-supported class-based path)
 *
 * Steps 2/3 are additive OR-branches on top of the original ownership +
 * class-based logic (step 1 and 4) -- nothing that granted access before
 * this helper existed stops granting access now.
 */

import { SupabaseClient } from '@supabase/supabase-js'

export interface SubjectRecord {
  id: string
  title?: string
  description?: string
  user_id: string
  class_id: string | null
}

export interface SubjectPermission {
  hasAccess: boolean
  isOwner: boolean
  subject: SubjectRecord | null
  error?: string
}

export async function getSubjectPermission(
  supabase: SupabaseClient,
  subjectId: string,
  userId: string
): Promise<SubjectPermission> {
  const { data: subject, error } = await (supabase as any)
    .from('subjects')
    .select('id, title, description, user_id, class_id')
    .eq('id', subjectId)
    .maybeSingle()

  if (error) return { hasAccess: false, isOwner: false, subject: null, error: error.message }
  if (!subject) return { hasAccess: false, isOwner: false, subject: null }

  if (subject.user_id === userId) {
    return { hasAccess: true, isOwner: true, subject }
  }

  const { data: teacherRow } = await (supabase as any)
    .from('subject_teachers')
    .select('teacher_id')
    .eq('subject_id', subjectId)
    .eq('teacher_id', userId)
    .maybeSingle()
  if (teacherRow) {
    return { hasAccess: true, isOwner: false, subject }
  }

  const { data: studentRow } = await (supabase as any)
    .from('subject_students')
    .select('student_id')
    .eq('subject_id', subjectId)
    .eq('student_id', userId)
    .maybeSingle()
  if (studentRow) {
    return { hasAccess: true, isOwner: false, subject }
  }

  const { data: memberships } = await supabase
    .from('class_members')
    .select('class_id')
    .eq('user_id', userId)
  const classIds = (memberships || []).map((m: any) => m.class_id).filter(Boolean)

  if (classIds.length > 0) {
    if (subject.class_id && classIds.includes(subject.class_id)) {
      return { hasAccess: true, isOwner: false, subject }
    }

    const { data: links } = await (supabase as any)
      .from('class_subjects')
      .select('class_id')
      .eq('subject_id', subjectId)
      .in('class_id', classIds)
      .limit(1)
    if (links && links.length > 0) {
      return { hasAccess: true, isOwner: false, subject }
    }
  }

  return { hasAccess: false, isOwner: false, subject: null }
}

/** Boolean shorthand, drop-in for the old userHasSubjectAccess/studentHasSubjectAccess helpers. */
export async function userHasSubjectAccess(
  supabase: SupabaseClient,
  userId: string,
  subjectId: string
): Promise<boolean> {
  const perm = await getSubjectPermission(supabase, subjectId, userId)
  return perm.hasAccess
}

/** { allowed, subject } shorthand, drop-in for the old canAccessSubject helper. */
export async function canAccessSubject(
  supabase: SupabaseClient,
  userId: string,
  subjectId: string
): Promise<{ allowed: boolean; subject: SubjectRecord | null; error?: string }> {
  const perm = await getSubjectPermission(supabase, subjectId, userId)
  if (perm.error) return { allowed: false, subject: null, error: perm.error }
  return { allowed: perm.hasAccess, subject: perm.hasAccess ? perm.subject : null }
}

/**
 * All subject IDs a teacher owns or co-teaches (ownership OR subject_teachers
 * row) -- used by dashboard aggregation routes to query by subject alongside
 * the original class_id-based path, so class-linked AND standalone subjects
 * both contribute. Does not include subjects reached only via class
 * membership, since those are already covered by the existing class_id path.
 */
export async function getTeacherSubjectIds(
  supabase: SupabaseClient,
  userId: string
): Promise<string[]> {
  const [ownedResult, taughtResult] = await Promise.all([
    (supabase as any).from('subjects').select('id').eq('user_id', userId),
    (supabase as any).from('subject_teachers').select('subject_id').eq('teacher_id', userId),
  ])

  const ownedIds = (ownedResult.data || []).map((row: any) => row.id).filter(Boolean)
  const taughtIds = (taughtResult.data || []).map((row: any) => row.subject_id).filter(Boolean)

  return Array.from(new Set([...ownedIds, ...taughtIds]))
}
