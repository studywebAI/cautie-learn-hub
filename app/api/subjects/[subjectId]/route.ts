import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function logSubjectDetail(...args: any[]) {
  console.log('[SUBJECT_DETAIL]', ...args)
}

async function getMemberClassIds(supabase: any, userId: string): Promise<string[]> {
  const { data: memberships, error } = await supabase
    .from('class_members')
    .select('class_id')
    .eq('user_id', userId);

  if (error) return [];
  return (memberships || []).map((m: any) => m.class_id).filter(Boolean);
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const resolvedParams = await params
  const subjectId = resolvedParams.subjectId

  logSubjectDetail('GET - Subject detail requested', { subjectId, url: request.url })

  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      logSubjectDetail('GET - Auth failed', authError?.message)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logSubjectDetail('GET - Authenticated user', user.id)

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .maybeSingle()

    const isTeacher = profile?.subscription_type === 'teacher'
    logSubjectDetail('GET - Subscription type', profile?.subscription_type)

    if (isTeacher) {
      logSubjectDetail('GET - Teacher access path', { subjectId })
      const { data: subject, error: fetchError } = await (supabase as any)
        .from('subjects')
        .select('*')
        .eq('id', subjectId)
        .maybeSingle()

      if (fetchError) {
        logSubjectDetail('GET - Teacher subject fetch failed', fetchError.message)
        return NextResponse.json({ error: 'Failed to fetch subject' }, { status: 500 })
      }

      if (!subject) {
        logSubjectDetail('GET - Teacher has no access to subject', subjectId)
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
      }

      const memberClassIds = await getMemberClassIds(supabase, user.id);
      const directClassMatch = subject.class_id && memberClassIds.includes(subject.class_id);

      let linkedClassMatch = false;
      if (!directClassMatch && memberClassIds.length > 0) {
        const { data: links } = await (supabase as any)
          .from('class_subjects')
          .select('class_id')
          .eq('subject_id', subjectId)
          .in('class_id', memberClassIds)
          .limit(1);
        linkedClassMatch = !!(links && links.length > 0);
      }

      if (subject.user_id !== user.id && !directClassMatch && !linkedClassMatch) {
        return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
      }

      logSubjectDetail('GET - Returning teacher subject', subject.id)
      return NextResponse.json(subject)
    }

    logSubjectDetail('GET - Student access path', { userId: user.id, subjectId })

    const { data: memberships, error: memberError } = await supabase
      .from('class_members')
      .select('class_id')
      .eq('user_id', user.id)

    if (memberError) {
      logSubjectDetail('GET - Failed to load memberships', memberError.message)
      return NextResponse.json({ error: 'Failed to verify access' }, { status: 500 })
    }

    const classIds = (memberships || []).map((m: any) => m.class_id)
    logSubjectDetail('GET - Student class IDs', classIds)

    if (classIds.length === 0) {
      logSubjectDetail('GET - Student has zero memberships', user.id)
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    const { data: classSubjectLinks, error: csError } = await (supabase as any)
      .from('class_subjects')
      .select('subject_id')
      .in('class_id', classIds)

    if (csError) {
      logSubjectDetail('GET - Failed to load class subjects links', csError.message)
      return NextResponse.json({ error: 'Failed to verify access' }, { status: 500 })
    }

    const allowedSubjectIds = [...new Set((classSubjectLinks || []).map((cs: any) => cs.subject_id))]

    const { data: directSubjectRows } = await (supabase as any)
      .from('subjects')
      .select('id')
      .eq('id', subjectId)
      .in('class_id', classIds);
    if (directSubjectRows?.[0]?.id) {
      allowedSubjectIds.push(directSubjectRows[0].id);
    }
    logSubjectDetail('GET - Allowed subject IDs', allowedSubjectIds)

    if (!allowedSubjectIds.includes(subjectId)) {
      logSubjectDetail('GET - Subject access denied', { subjectId, allowedSubjectIds })
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    const { data: subjectsData, error: subjectError } = await (supabase as any)
      .from('subjects')
      .select('*')
      .in('id', [subjectId])

    if (subjectError) {
      logSubjectDetail('GET - Student subject fetch error', subjectError.message)
      return NextResponse.json({ error: 'Failed to fetch subject' }, { status: 500 })
    }

    if (!subjectsData || subjectsData.length === 0) {
      logSubjectDetail('GET - Subject missing from DB', subjectId)
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    logSubjectDetail('GET - Returning student subject', subjectId)
    return NextResponse.json(subjectsData[0])
  } catch (err) {
    logSubjectDetail('GET - Unexpected error', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
