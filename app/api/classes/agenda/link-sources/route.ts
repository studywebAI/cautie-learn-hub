import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function parseClassIds(raw: string | null): string[] {
  if (!raw) return []
  return Array.from(new Set(raw.split(',').map((value) => value.trim()).filter(Boolean)))
}

export async function GET(req: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.subscription_type !== 'teacher') {
      return NextResponse.json({ error: 'Teacher access required' }, { status: 403 })
    }

    const classIds = parseClassIds(req.nextUrl.searchParams.get('classIds'))
    const queryText = (req.nextUrl.searchParams.get('q') || '').trim().toLowerCase()

    const { data: memberships } = await supabase
      .from('class_members')
      .select('class_id')
      .eq('user_id', user.id)
    const memberClassIds = new Set((memberships || []).map((row: any) => row.class_id))
    const allowedClassIds = classIds.length > 0
      ? classIds.filter((classId) => memberClassIds.has(classId))
      : Array.from(memberClassIds)

    const [toolRunsResult, materialsResult, assignmentsResult, studysetsResult] = await Promise.all([
      (supabase as any)
        .from('tool_runs')
        .select('id, tool_id, mode, finished_at, created_at')
        .eq('user_id', user.id)
        .eq('status', 'succeeded')
        .order('finished_at', { ascending: false })
        .limit(60),
      (supabase as any)
        .from('materials')
        .select('id, title, type, class_id, updated_at')
        .in('class_id', allowedClassIds.length > 0 ? allowedClassIds : ['00000000-0000-0000-0000-000000000000'])
        .order('updated_at', { ascending: false })
        .limit(60),
      (supabase as any)
        .from('assignments')
        .select('id, title, class_id, paragraph_id, scheduled_start_at, due_date, created_at')
        .in('class_id', allowedClassIds.length > 0 ? allowedClassIds : ['00000000-0000-0000-0000-000000000000'])
        .order('created_at', { ascending: false })
        .limit(80),
      (supabase as any)
        .from('studysets')
        .select('id, name, updated_at, status')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(40),
    ])

    const assignmentsData = (assignmentsResult.data || []) as any[];
    const paragraphIds = Array.from(new Set(assignmentsData.map((a: any) => a.paragraph_id).filter(Boolean)));
    const { data: paragraphs } = paragraphIds.length > 0
      ? await (supabase as any)
          .from('paragraphs')
          .select('id, chapter_id')
          .in('id', paragraphIds)
      : { data: [] as any[] };
    const chapterIds = Array.from(new Set((paragraphs || []).map((p: any) => p.chapter_id).filter(Boolean)));
    const { data: chapters } = chapterIds.length > 0
      ? await (supabase as any)
          .from('chapters')
          .select('id, subject_id')
          .in('id', chapterIds)
      : { data: [] as any[] };
    const paragraphById = new Map((paragraphs || []).map((p: any) => [p.id, p]));
    const chapterById = new Map((chapters || []).map((c: any) => [c.id, c]));

    const items = [
      ...((toolRunsResult.data || []) as any[]).map((run: any) => ({
        id: `tool:${run.id}`,
        link_type: 'tool_run',
        link_ref_id: run.id,
        label: run.mode ? `${run.tool_id} | ${run.mode}` : run.tool_id,
        subtitle: run.finished_at || run.created_at
          ? `Created ${new Date(run.finished_at || run.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
          : 'Tool run',
        sort_at: run.finished_at || run.created_at,
        metadata_json: { tool_id: run.tool_id, mode: run.mode || null },
      })),
      ...((materialsResult.data || []) as any[]).map((material: any) => ({
        id: `material:${material.id}`,
        link_type: 'material',
        link_ref_id: material.id,
        label: material.title || material.type || 'Material',
        subtitle: 'Material',
        sort_at: material.updated_at,
        metadata_json: { class_id: material.class_id, type: material.type || null },
      })),
      ...assignmentsData.map((assignment: any) => {
        const paragraph = paragraphById.get(assignment.paragraph_id);
        const chapter = paragraph ? chapterById.get(paragraph.chapter_id) : null;
        const href = paragraph && chapter
          ? `/subjects/${chapter.subject_id}/chapters/${paragraph.chapter_id}/paragraphs/${paragraph.id}/assignments/${assignment.id}`
          : null;
        return {
          id: `assignment:${assignment.id}`,
          link_type: 'assignment',
          link_ref_id: assignment.id,
          label: assignment.title || 'Assignment',
          subtitle: 'Assignment',
          sort_at: assignment.scheduled_start_at || assignment.due_date || assignment.created_at,
          metadata_json: {
            class_id: assignment.class_id,
            paragraph_id: assignment.paragraph_id || null,
            scheduled_start_at: assignment.scheduled_start_at || null,
            due_date: assignment.due_date || null,
            href,
          },
        };
      }),
      ...((studysetsResult.data || []) as any[]).map((studyset: any) => ({
        id: `studyset:${studyset.id}`,
        link_type: 'studyset',
        link_ref_id: studyset.id,
        label: studyset.name || 'Studyset',
        subtitle: 'Studyset',
        sort_at: studyset.updated_at,
        metadata_json: { status: studyset.status || null },
      })),
    ]
      .filter((item) => {
        if (!queryText) return true
        const haystack = `${item.label} ${item.subtitle}`.toLowerCase()
        return haystack.includes(queryText)
      })
      .sort((a, b) => new Date(b.sort_at || 0).getTime() - new Date(a.sort_at || 0).getTime())
      .slice(0, 120)

    return NextResponse.json({ items })
  } catch (error) {
    console.error('agenda link-sources GET failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
