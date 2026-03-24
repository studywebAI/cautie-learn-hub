import type { SupabaseClient } from '@supabase/supabase-js'
import { getClassPermission } from '@/lib/auth/class-permissions'

export type AgendaVisibilityState = 'visible' | 'hidden' | 'scheduled'
export type AgendaItemType = 'assignment' | 'quiz' | 'studyset' | 'event' | 'other'

export type AgendaItemPayload = {
  class_id: string
  subject_id?: string | null
  title: string
  description?: string | null
  item_type?: AgendaItemType
  starts_at?: string | null
  due_at?: string | null
  visibility_state?: AgendaVisibilityState
  publish_at?: string | null
  links?: Array<{
    link_type: string
    link_ref_id?: string | null
    label: string
    metadata_json?: Record<string, any>
    position?: number
  }>
}

export function normalizeAgendaVisibility(
  enabled: boolean,
  publishAt?: string | null
): { visibility_state: AgendaVisibilityState; publish_at: string | null } {
  if (enabled) return { visibility_state: 'visible', publish_at: null }
  if (publishAt) return { visibility_state: 'scheduled', publish_at: publishAt }
  return { visibility_state: 'hidden', publish_at: null }
}

export function isAgendaVisibleToStudents(
  visibilityState: AgendaVisibilityState,
  publishAt: string | null | undefined
) {
  if (visibilityState === 'visible') return true
  if (visibilityState === 'scheduled' && publishAt) return new Date(publishAt).getTime() <= Date.now()
  return false
}

export async function ensureTeacherClassAccess(
  supabase: SupabaseClient,
  classId: string,
  userId: string
) {
  const perm = await getClassPermission(supabase, classId, userId)
  if (!perm.isMember || !perm.isTeacher) {
    return { ok: false as const, status: 403, error: 'Only teacher class members can modify agenda items' }
  }

  const { data: classRow } = await supabase
    .from('classes')
    .select('id, status')
    .eq('id', classId)
    .maybeSingle()

  if (!classRow) return { ok: false as const, status: 404, error: 'Class not found' }
  if ((classRow as any).status === 'archived') {
    return { ok: false as const, status: 403, error: 'Archived classes are read-only' }
  }

  return { ok: true as const }
}

export async function ensureSubjectAssignable(
  supabase: SupabaseClient,
  classId: string,
  subjectId: string | null | undefined,
  userId: string
) {
  if (!subjectId) return { ok: true as const }

  const [subjectResult, linkedResult] = await Promise.all([
    supabase
      .from('subjects')
      .select('id, class_id, user_id')
      .eq('id', subjectId)
      .maybeSingle(),
    (supabase as any)
      .from('class_subjects')
      .select('class_id, subject_id')
      .eq('subject_id', subjectId)
      .eq('class_id', classId)
      .maybeSingle(),
  ])

  const subject = subjectResult.data as any
  const directLinked = subject?.class_id === classId
  const joinLinked = Boolean(linkedResult.data)
  if (!subject || (!directLinked && !joinLinked)) {
    return { ok: false as const, status: 400, error: 'Subject is not linked to this class' }
  }

  const ownerId = subject?.user_id || null
  if (ownerId === userId) return { ok: true as const }

  // Optional collaboration table support.
  try {
    const { data: sharedRows } = await (supabase as any)
      .from('subject_teachers')
      .select('teacher_id')
      .eq('subject_id', subjectId)

    const sharedIds = (sharedRows || []).map((row: any) => row.teacher_id)
    if (sharedIds.includes(userId)) return { ok: true as const }
  } catch {
    // If table not present in this environment, fall back to owner-only.
  }

  return { ok: false as const, status: 403, error: 'You are not allowed to assign this subject' }
}

export function normalizeAgendaLinks(raw: any): NonNullable<AgendaItemPayload['links']> {
  if (!Array.isArray(raw)) return []
  return raw
    .map((link: any, index: number) => ({
      link_type: String(link?.link_type || link?.type || 'external'),
      link_ref_id: link?.link_ref_id ? String(link.link_ref_id) : link?.id ? String(link.id) : null,
      label: String(link?.label || link?.title || 'Link'),
      metadata_json: (typeof link?.metadata_json === 'object' && link?.metadata_json) || {},
      position: Number.isFinite(Number(link?.position)) ? Number(link.position) : index,
    }))
    .filter((link) => link.label.trim().length > 0)
}
