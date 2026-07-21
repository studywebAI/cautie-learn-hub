import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

async function requireTeacherOfAssignment(supabase: any, userId: string, assignmentId: string) {
  const { data: assignment } = await supabase
    .from('assignments')
    .select('id, class_id, paragraphs!inner(chapters!inner(subjects!inner(user_id)))')
    .eq('id', assignmentId)
    .maybeSingle()
  if (!assignment) return { error: NextResponse.json({ error: 'Assignment not found' }, { status: 404 }) }

  // Subject ownership always applies -- personal, non-class assignments
  // (class_id null) have no class_members row to check at all, so without
  // this an owner check is skipped entirely and anyone authenticated could
  // read/restore their version history. Class membership (teacher role) is
  // an additional way in when the assignment is class-scoped, not the only
  // gate.
  const isOwner = assignment.paragraphs?.chapters?.subjects?.user_id === userId
  if (!isOwner) {
    if (!assignment.class_id) {
      return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
    }
    const { data: membership } = await supabase
      .from('class_members')
      .select('role')
      .eq('class_id', assignment.class_id)
      .eq('user_id', userId)
      .maybeSingle()
    const role = String(membership?.role || '').toLowerCase()
    const isTeacher = role === 'teacher' || role === 'owner' || role === 'admin' || role === 'creator'
    if (!isTeacher) return { error: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }
  return { assignment }
}

// GET — list versions for an assignment, newest first
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string; assignmentId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const auth = await requireTeacherOfAssignment(supabase, user.id, resolvedParams.assignmentId)
    if (auth.error) return auth.error

    const { data: versions, error } = await (supabase as any)
      .from('assignment_versions')
      .select('id, created_at, created_by, title_snapshot')
      .eq('assignment_id', resolvedParams.assignmentId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('[assignment-versions] list_error', { message: error.message, assignmentId: resolvedParams.assignmentId })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const createdByIds = Array.from(new Set((versions || []).map((v: any) => v.created_by).filter(Boolean)))
    let namesById = new Map<string, string>()
    if (createdByIds.length > 0) {
      const { data: profiles } = await (supabase as any).from('profiles').select('id, full_name').in('id', createdByIds)
      namesById = new Map((profiles || []).map((p: any) => [p.id, p.full_name || 'Teacher']))
    }

    return NextResponse.json((versions || []).map((v: any) => ({
      id: v.id,
      created_at: v.created_at,
      created_by_name: namesById.get(v.created_by) || null,
      title_snapshot: v.title_snapshot,
    })))
  } catch (err: any) {
    console.error('[assignment-versions] GET unhandled_error', { message: err?.message, stack: err?.stack })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST — create a snapshot of the assignment's current blocks/settings.
// Called from the editor's autosave path, throttled client-side (only
// snapshots if >5 min since the last one) so this doesn't bloat on every
// 3s autosave tick.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string; assignmentId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const auth = await requireTeacherOfAssignment(supabase, user.id, resolvedParams.assignmentId)
    if (auth.error) return auth.error

    const body = await request.json().catch(() => ({}))
    const { blocks_snapshot, settings_snapshot, title_snapshot, description_snapshot } = body
    if (!Array.isArray(blocks_snapshot)) {
      return NextResponse.json({ error: 'blocks_snapshot is required' }, { status: 400 })
    }

    const { data: version, error } = await (supabase as any)
      .from('assignment_versions')
      .insert({
        assignment_id: resolvedParams.assignmentId,
        blocks_snapshot,
        settings_snapshot: settings_snapshot || null,
        title_snapshot: title_snapshot || null,
        description_snapshot: description_snapshot || null,
        created_by: user.id,
      })
      .select('id, created_at')
      .single()

    if (error) {
      console.error('[assignment-versions] insert_error', { message: error.message, assignmentId: resolvedParams.assignmentId })
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(version, { status: 201 })
  } catch (err: any) {
    console.error('[assignment-versions] POST unhandled_error', { message: err?.message, stack: err?.stack })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
