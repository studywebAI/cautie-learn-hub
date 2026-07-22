import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { userHasSubjectAccess } from '@/lib/auth/subject-permissions';

export const dynamic = 'force-dynamic';

// Mirrors app/api/classes/[classId]/grades/[gradeSetId]/disputes/route.ts,
// keyed on subject_id instead of class_id.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; gradeSetId: string }> }
) {
  try {
    const { subjectId, gradeSetId } = await params;
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasAccess = await userHasSubjectAccess(supabase as any, user.id, subjectId);
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data: gradeSet } = await supabase
      .from('grade_sets')
      .select('id, assignment_id')
      .eq('id', gradeSetId)
      .eq('subject_id', subjectId)
      .maybeSingle();
    if (!gradeSet || !(gradeSet as any).assignment_id) return NextResponse.json({ disputes: [] });

    const { data: events } = await supabase
      .from('assignment_events')
      .select('id, student_id, event_payload, created_at')
      .eq('assignment_id', (gradeSet as any).assignment_id)
      .eq('event_type', 'grading_dispute')
      .order('created_at', { ascending: false });

    const openEvents = (events || []).filter((e: any) => (e.event_payload?.status || 'open') === 'open');
    const studentIds = [...new Set(openEvents.map((e: any) => e.student_id))];
    const blockIds = [...new Set(openEvents.map((e: any) => e.event_payload?.block_id).filter(Boolean))];

    const [{ data: profiles }, { data: blocks }] = await Promise.all([
      studentIds.length > 0 ? supabase.from('profiles').select('id, full_name, email').in('id', studentIds) : Promise.resolve({ data: [] as any[] }),
      blockIds.length > 0 ? supabase.from('blocks').select('id, data').in('id', blockIds) : Promise.resolve({ data: [] as any[] }),
    ]);
    const profileById = new Map((profiles || []).map((p: any) => [p.id, p]));
    const blockById = new Map((blocks || []).map((b: any) => [b.id, b]));

    const disputes = openEvents.map((e: any) => ({
      event_id: e.id,
      student_id: e.student_id,
      student_name: profileById.get(e.student_id)?.full_name || profileById.get(e.student_id)?.email || 'Student',
      block_id: e.event_payload?.block_id || null,
      question: blockById.get(e.event_payload?.block_id)?.data?.question || '',
      answer_id: e.event_payload?.answer_id || null,
      note: e.event_payload?.note || '',
      created_at: e.created_at,
    }));

    return NextResponse.json({ disputes });
  } catch (err) {
    return NextResponse.json({ disputes: [] });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; gradeSetId: string }> }
) {
  try {
    const { subjectId, gradeSetId } = await params;
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const hasAccess = await userHasSubjectAccess(supabase as any, user.id, subjectId);
    if (!hasAccess) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json().catch(() => ({}));
    const eventId = String(body?.event_id || '').trim();
    const action = body?.action === 'reopen' ? 'reopen' : body?.action === 'dismiss' ? 'dismiss' : null;
    if (!eventId || !action) return NextResponse.json({ error: 'event_id and action are required' }, { status: 400 });

    const { data: event } = await supabase
      .from('assignment_events')
      .select('id, event_payload, assignment_id')
      .eq('id', eventId)
      .eq('assignment_id', (await supabase.from('grade_sets').select('assignment_id').eq('id', gradeSetId).eq('subject_id', subjectId).maybeSingle()).data?.assignment_id || '')
      .maybeSingle();
    if (!event) return NextResponse.json({ error: 'Dispute not found' }, { status: 404 });

    if (action === 'reopen') {
      const answerId = (event as any).event_payload?.answer_id;
      if (answerId) {
        await supabase
          .from('student_answers')
          .update({ score: null, is_correct: null, graded_at: null, graded_by_ai: false })
          .eq('id', answerId);
      }
    }

    await supabase
      .from('assignment_events')
      .update({ event_payload: { ...(event as any).event_payload, status: action === 'reopen' ? 'reopened' : 'dismissed' } })
      .eq('id', eventId);

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
