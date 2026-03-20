import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

type TeacherRow = {
  id: string
  full_name: string | null
  email: string | null
}

async function requireTeacherMember(supabase: any, classId: string, userId: string) {
  const [{ data: member }, { data: profile }] = await Promise.all([
    supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', classId)
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', userId)
      .maybeSingle(),
  ])

  if (!member) {
    return { ok: false, status: 403, error: 'Not a member of this class' as const }
  }
  if (profile?.subscription_type !== 'teacher') {
    return { ok: false, status: 403, error: 'Only teachers can access subject management' as const }
  }

  return { ok: true as const }
}

async function getClassTeacherIds(supabase: any, classId: string): Promise<string[]> {
  const { data: memberRows } = await supabase
    .from('class_members')
    .select('user_id')
    .eq('class_id', classId)

  const candidateIds = (memberRows || []).map((row: any) => row.user_id).filter(Boolean)
  if (candidateIds.length === 0) return []

  const { data: teacherProfiles } = await supabase
    .from('profiles')
    .select('id')
    .in('id', candidateIds)
    .eq('subscription_type', 'teacher')

  return (teacherProfiles || []).map((row: any) => row.id)
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await requireTeacherMember(supabase, classId, user.id)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const teacherIds = await getClassTeacherIds(supabase, classId)

    const { data: teachersData } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', teacherIds)

    const teachers: TeacherRow[] = (teachersData || []).sort((a: TeacherRow, b: TeacherRow) =>
      (a.email || a.full_name || '').localeCompare(b.email || b.full_name || '')
    )

    const [directSubjectsResult, linkedSubjectsResult] = await Promise.all([
      supabase
        .from('subjects')
        .select('id, title, user_id, class_id')
        .eq('class_id', classId),
      (supabase as any)
        .from('class_subjects')
        .select('subjects(id, title, user_id, class_id)')
        .eq('class_id', classId),
    ])

    const subjectMap = new Map<string, any>()
    for (const row of (directSubjectsResult.data || []) as any[]) {
      subjectMap.set(row.id, row)
    }
    for (const row of (linkedSubjectsResult.data || []) as any[]) {
      const subject = row?.subjects
      if (subject?.id) subjectMap.set(subject.id, subject)
    }

    const subjects = Array.from(subjectMap.values())

    // Optional collaboration layer (table may not exist in all envs).
    let collaboratorsBySubject = new Map<string, string[]>()
    try {
      const { data: collaboratorRows } = await (supabase as any)
        .from('subject_teachers')
        .select('subject_id, teacher_id')
        .in('subject_id', subjects.map((s: any) => s.id))
      const map = new Map<string, string[]>()
      for (const row of collaboratorRows || []) {
        const list = map.get(row.subject_id) || []
        list.push(row.teacher_id)
        map.set(row.subject_id, list)
      }
      collaboratorsBySubject = map
    } catch {
      collaboratorsBySubject = new Map<string, string[]>()
    }

    const teacherById = new Map(teachers.map((t) => [t.id, t]))

    const normalizedSubjects = subjects
      .map((subject: any) => {
        const owner = subject.user_id ? teacherById.get(subject.user_id) : null
        const collaboratorIds = collaboratorsBySubject.get(subject.id) || []
        return {
          id: subject.id,
          title: subject.title,
          owner_teacher_id: subject.user_id || null,
          owner_teacher_email: owner?.email || null,
          shared_teacher_ids: collaboratorIds,
          class_id: subject.class_id || null,
        }
      })
      .sort((a: any, b: any) => a.title.localeCompare(b.title))

    const { data: ownSubjectsFromOtherClasses } = await supabase
      .from('subjects')
      .select('id, title, class_id')
      .eq('user_id', user.id)
      .neq('class_id', classId)
      .order('title', { ascending: true })

    return NextResponse.json({
      teachers,
      subjects: normalizedSubjects,
      import_candidates: ownSubjectsFromOtherClasses || [],
    })
  } catch (error) {
    console.error('subject settings GET failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const body = await req.json()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await requireTeacherMember(supabase, classId, user.id)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const action = String(body?.action || '')
    const subjectId = String(body?.subject_id || '')
    if (!action || !subjectId) {
      return NextResponse.json({ error: 'action and subject_id are required' }, { status: 400 })
    }

    const { data: subjectRow } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', subjectId)
      .eq('class_id', classId)
      .maybeSingle()

    if (!subjectRow) {
      return NextResponse.json({ error: 'Subject not found in this class' }, { status: 404 })
    }

    if (action === 'assign_owner') {
      const nextOwnerId = String(body?.owner_teacher_id || '')
      if (!nextOwnerId) {
        return NextResponse.json({ error: 'owner_teacher_id is required' }, { status: 400 })
      }

      const classTeacherIds = await getClassTeacherIds(supabase, classId)
      if (!classTeacherIds.includes(nextOwnerId)) {
        return NextResponse.json({ error: 'owner_teacher_id must be a teacher in this class' }, { status: 400 })
      }

      const { error: updateError } = await supabase
        .from('subjects')
        .update({ user_id: nextOwnerId })
        .eq('id', subjectId)
      if (updateError) {
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    if (action === 'set_shared') {
      const sharedTeacherIds = Array.isArray(body?.shared_teacher_ids)
        ? body.shared_teacher_ids.map((id: any) => String(id))
        : []

      const classTeacherIds = await getClassTeacherIds(supabase, classId)
      const invalidTeacher = sharedTeacherIds.find((id: string) => !classTeacherIds.includes(id))
      if (invalidTeacher) {
        return NextResponse.json({ error: 'All shared_teacher_ids must be teachers in this class' }, { status: 400 })
      }

      try {
        await (supabase as any).from('subject_teachers').delete().eq('subject_id', subjectId)
        if (sharedTeacherIds.length > 0) {
          const rows = sharedTeacherIds.map((teacherId: string) => ({
            subject_id: subjectId,
            teacher_id: teacherId,
          }))
          const { error: upsertError } = await (supabase as any)
            .from('subject_teachers')
            .upsert(rows, { onConflict: 'subject_id,teacher_id' })
          if (upsertError) {
            return NextResponse.json({ error: upsertError.message }, { status: 500 })
          }
        }
      } catch {
        return NextResponse.json({ error: 'subject_teachers table is unavailable in this environment' }, { status: 400 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (error) {
    console.error('subject settings PATCH failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const body = await req.json()

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const access = await requireTeacherMember(supabase, classId, user.id)
    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status })
    }

    const sourceSubjectId = String(body?.source_subject_id || '')
    const mode = String(body?.mode || 'copy')
    const titleOverride = String(body?.title || '').trim()

    if (!sourceSubjectId) {
      return NextResponse.json({ error: 'source_subject_id is required' }, { status: 400 })
    }

    const { data: sourceSubject } = await supabase
      .from('subjects')
      .select('id, title, description, user_id, class_id, class_label, cover_type, cover_image_url, ai_icon_seed')
      .eq('id', sourceSubjectId)
      .maybeSingle()

    if (!sourceSubject) {
      return NextResponse.json({ error: 'Source subject not found' }, { status: 404 })
    }

    if (mode === 'link') {
      const { error: linkError } = await (supabase as any)
        .from('class_subjects')
        .upsert([{ class_id: classId, subject_id: sourceSubjectId }], { onConflict: 'class_id,subject_id' })
      if (linkError) {
        return NextResponse.json({ error: linkError.message }, { status: 500 })
      }
      return NextResponse.json({ success: true, mode: 'link', subject_id: sourceSubjectId })
    }

    // Default mode: deep copy subject + chapters + paragraphs + assignments.
    const { data: newSubject, error: newSubjectError } = await supabase
      .from('subjects')
      .insert([{
        title: titleOverride || sourceSubject.title,
        description: sourceSubject.description,
        user_id: user.id,
        class_id: classId,
        class_label: sourceSubject.class_label || titleOverride || sourceSubject.title,
        cover_type: sourceSubject.cover_type,
        cover_image_url: sourceSubject.cover_image_url,
        ai_icon_seed: sourceSubject.ai_icon_seed,
      }])
      .select('id, title')
      .single()

    if (newSubjectError || !newSubject) {
      return NextResponse.json({ error: newSubjectError?.message || 'Failed to create copied subject' }, { status: 500 })
    }

    const { error: classSubjectLinkError } = await (supabase as any)
      .from('class_subjects')
      .upsert([{ class_id: classId, subject_id: newSubject.id }], { onConflict: 'class_id,subject_id' })

    if (classSubjectLinkError) {
      return NextResponse.json({ error: classSubjectLinkError.message }, { status: 500 })
    }

    const { data: sourceChapters } = await supabase
      .from('chapters')
      .select('id, title, chapter_number')
      .eq('subject_id', sourceSubjectId)
      .order('chapter_number', { ascending: true })

    const chapterIdMap = new Map<string, string>()
    for (const sourceChapter of sourceChapters || []) {
      const { data: insertedChapter, error: chapterError } = await supabase
        .from('chapters')
        .insert([{
          subject_id: newSubject.id,
          title: sourceChapter.title,
          chapter_number: sourceChapter.chapter_number,
        }])
        .select('id')
        .single()
      if (chapterError || !insertedChapter) {
        return NextResponse.json({ error: chapterError?.message || 'Failed to copy chapter' }, { status: 500 })
      }
      chapterIdMap.set(sourceChapter.id, insertedChapter.id)
    }

    const { data: sourceParagraphs } = await supabase
      .from('paragraphs')
      .select('id, chapter_id, title, paragraph_number')
      .in('chapter_id', Array.from(chapterIdMap.keys()))

    const paragraphIdMap = new Map<string, string>()
    for (const sourceParagraph of sourceParagraphs || []) {
      const targetChapterId = chapterIdMap.get(sourceParagraph.chapter_id)
      if (!targetChapterId) continue
      const { data: insertedParagraph, error: paragraphError } = await supabase
        .from('paragraphs')
        .insert([{
          chapter_id: targetChapterId,
          title: sourceParagraph.title,
          paragraph_number: sourceParagraph.paragraph_number,
        }])
        .select('id')
        .single()
      if (paragraphError || !insertedParagraph) {
        return NextResponse.json({ error: paragraphError?.message || 'Failed to copy paragraph' }, { status: 500 })
      }
      paragraphIdMap.set(sourceParagraph.id, insertedParagraph.id)
    }

    const { data: sourceAssignments } = await supabase
      .from('assignments')
      .select('id, paragraph_id, assignment_index, title, content, answers_enabled, is_visible, type, description')
      .in('paragraph_id', Array.from(paragraphIdMap.keys()))

    for (const sourceAssignment of sourceAssignments || []) {
      const targetParagraphId = sourceAssignment.paragraph_id ? paragraphIdMap.get(sourceAssignment.paragraph_id) : null
      if (!targetParagraphId) continue
      const { error: assignmentError } = await supabase
        .from('assignments')
        .insert([{
          class_id: classId,
          paragraph_id: targetParagraphId,
          assignment_index: sourceAssignment.assignment_index || 0,
          title: sourceAssignment.title,
          content: sourceAssignment.content,
          answers_enabled: sourceAssignment.answers_enabled ?? false,
          is_visible: sourceAssignment.is_visible ?? true,
          type: sourceAssignment.type || 'homework',
          description: sourceAssignment.description || null,
          user_id: user.id,
        }])
      if (assignmentError) {
        return NextResponse.json({ error: assignmentError.message }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      mode: 'copy',
      subject_id: newSubject.id,
      subject_title: newSubject.title,
    })
  } catch (error) {
    console.error('subject settings POST failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
