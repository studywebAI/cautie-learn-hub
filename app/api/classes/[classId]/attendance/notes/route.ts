import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { getClassPermission } from '@/lib/auth/class-permissions'

// POST /api/classes/[classId]/attendance/notes
// Save a general note for a student in this class (stored as an audit_log event)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const perm = await getClassPermission(supabase as any, classId, user.id)
    if (!perm.isMember || !perm.isTeacher) {
      return NextResponse.json({ error: 'Only teachers can add notes' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const studentId = String(body?.studentId || '').trim()
    const note = String(body?.note || '').trim()

    if (!studentId) {
      return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
    }
    if (!note) {
      return NextResponse.json({ error: 'note is required' }, { status: 400 })
    }

    let writeClient: any = supabase
    try { writeClient = createAdminClient() } catch { /* use user client */ }

    // Verify student is in this class
    const { data: member } = await writeClient
      .from('class_members')
      .select('user_id')
      .eq('class_id', classId)
      .eq('user_id', studentId)
      .maybeSingle()

    if (!member) {
      return NextResponse.json({ error: 'Student not found in this class' }, { status: 404 })
    }

    // Store note as audit_log entry with action 'attendance_event_custom'
    const { data: logEntry, error: logError } = await writeClient
      .from('audit_logs')
      .insert({
        class_id: classId,
        user_id: user.id,
        action: 'attendance_event_custom',
        entity_type: 'student_attendance',
        entity_id: studentId,
        metadata: {
          student_id: studentId,
          note,
          teacher_id: user.id,
          log_category: 'custom_events',
          source: 'teacher_note',
        },
      })
      .select('id, created_at')
      .single()

    if (logError) {
      return NextResponse.json({ error: logError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: logEntry.id, createdAt: logEntry.created_at })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET /api/classes/[classId]/attendance/notes?studentId=...
// Fetch notes for a student (reads audit_log entries of type attendance_event_custom with source=teacher_note)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const perm = await getClassPermission(supabase as any, classId, user.id)
    if (!perm.isMember || !perm.isTeacher) {
      return NextResponse.json({ error: 'Only teachers can view notes' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const studentId = searchParams.get('studentId')

    let dataClient: any = supabase
    try { dataClient = createAdminClient() } catch { /* use user client */ }

    let query = dataClient
      .from('audit_logs')
      .select('id, user_id, metadata, created_at')
      .eq('class_id', classId)
      .eq('action', 'attendance_event_custom')
      .order('created_at', { ascending: false })
      .limit(100)

    if (studentId) {
      query = query.eq('entity_id', studentId)
    }

    const { data: logs, error: logsError } = await query

    if (logsError) {
      return NextResponse.json({ error: logsError.message }, { status: 500 })
    }

    const notes = (logs || [])
      .filter((log: any) => {
        const source = String(log?.metadata?.source || '')
        return source === 'teacher_note'
      })
      .map((log: any) => ({
        id: log.id,
        studentId: String(log?.metadata?.student_id || log?.entity_id || ''),
        note: String(log?.metadata?.note || ''),
        teacherId: String(log?.metadata?.teacher_id || log?.user_id || ''),
        createdAt: log.created_at,
      }))

    return NextResponse.json({ notes })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
