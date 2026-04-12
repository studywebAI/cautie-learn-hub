import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { normalizeAssignmentSettings } from '@/lib/assignments/settings'
import { getOrCreateAttempt } from '@/lib/assignments/attempts'

export const dynamic = 'force-dynamic'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ assignmentId: string; subjectId: string; chapterId: string; paragraphId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const eventType = String(body?.event_type || '').trim()
    const payload = body?.event_payload || {}

    if (!eventType) {
      return NextResponse.json({ error: 'event_type is required' }, { status: 400 })
    }

    const { data: assignment } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', resolvedParams.assignmentId)
      .maybeSingle()

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    const settings = normalizeAssignmentSettings((assignment as any).settings || {})
    const clientMeta = {
      ipAddress: request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || null,
      userAgent: request.headers.get('user-agent') || null,
    }
    const attempt = await getOrCreateAttempt(supabase, resolvedParams.assignmentId, user.id, settings, clientMeta)
    if ((attempt as any)?.blocked) {
      return NextResponse.json({ error: (attempt as any).reason }, { status: 429 })
    }

    await supabase
      .from('assignment_events')
      .insert({
        assignment_id: resolvedParams.assignmentId,
        attempt_id: (attempt as any).id,
        student_id: user.id,
        event_type: eventType,
        event_payload: payload,
      })

    if (eventType === 'tab_switch') {
      await supabase
        .from('assignment_attempts')
        .update({ tab_switch_count: ((attempt as any).tab_switch_count || 0) + 1 })
        .eq('id', (attempt as any).id)
    }

    if (eventType === 'fullscreen_exit') {
      await supabase
        .from('assignment_attempts')
        .update({ fullscreen_exit_count: ((attempt as any).fullscreen_exit_count || 0) + 1 })
        .eq('id', (attempt as any).id)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('assignment event post failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
