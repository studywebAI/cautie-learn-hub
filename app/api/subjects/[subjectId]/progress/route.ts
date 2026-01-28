import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET /api/subjects/[subjectId]/progress - Get student progress for a subject
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const subjectId = resolvedParams.subjectId

    // Verify subject exists and user has access
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('id, class_id, title')
      .eq('id', subjectId)
      .single()

    if (subjectError || !subject) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    // Check access
    const { data: classAccess, error: classError } = await supabase
      .from('classes')
      .select('id, owner_id, user_id')
      .eq('id', subject.class_id)
      .single()

    if (classError || !classAccess) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    const isTeacher = classAccess.owner_id === user.id || classAccess.user_id === user.id
    const { data: isStudent } = await supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', subject.class_id)
      .eq('user_id', user.id)
      .single()

    if (!isTeacher && !isStudent) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Get progress by querying chapters and progress snapshots
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select(`
        id,
        title,
        chapter_number,
        paragraphs(
          id,
          progress_snapshots!inner(
            completion_percent
          )
        )
      `)
      .eq('subject_id', subjectId)
      .order('chapter_number', { ascending: true })

    if (chaptersError) {
      console.error('Error fetching chapters:', chaptersError)
      return NextResponse.json({ error: chaptersError.message }, { status: 500 })
    }

    // Calculate progress for each chapter
    const chapterProgress = (chapters || []).map((chapter: any) => {
      const paragraphs = chapter.paragraphs || []
      const totalParagraphs = paragraphs.length
      const completedParagraphs = paragraphs.filter((p: any) =>
        p.progress_snapshots && p.progress_snapshots.length > 0 &&
        p.progress_snapshots[0].completion_percent === 100
      ).length

      return {
        chapter_id: chapter.id,
        chapter_title: chapter.title,
        chapter_number: chapter.chapter_number,
        paragraph_count: totalParagraphs,
        completed_paragraphs: completedParagraphs,
        progress_percent: totalParagraphs > 0 ? Math.round((completedParagraphs / totalParagraphs) * 100) : 0
      }
    })

    // Calculate overall progress
    const overallProgress = chapterProgress.length > 0
      ? Math.round(chapterProgress.reduce((sum, chap) => sum + chap.progress_percent, 0) / chapterProgress.length)
      : 0

    return NextResponse.json({
      subject_id: subjectId,
      subject_title: subject.title,
      overall_progress: overallProgress,
      chapters: chapterProgress
    })
  } catch (error) {
    console.error('Unexpected error in progress GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/subjects/[subjectId]/progress - Update student progress for a paragraph
export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const resolvedParams = await params
    const subjectId = resolvedParams.subjectId
    const { paragraph_id, completion_percent } = await request.json()

    if (!paragraph_id || typeof completion_percent !== 'number') {
      return NextResponse.json({ error: 'paragraph_id and completion_percent are required' }, { status: 400 })
    }

    if (completion_percent < 0 || completion_percent > 100) {
      return NextResponse.json({ error: 'completion_percent must be between 0 and 100' }, { status: 400 })
    }

    // Verify paragraph belongs to subject
    const { data: paragraphCheck, error: paraError } = await supabase
      .from('paragraphs')
      .select('id, chapter_id')
      .eq('id', paragraph_id)
      .single()

    if (paraError || !paragraphCheck) {
      return NextResponse.json({ error: 'Paragraph not found' }, { status: 404 })
    }

    // Get chapter and verify it belongs to subject
    const { data: chapterInfo, error: chapterError } = await supabase
      .from('chapters')
      .select('subject_id')
      .eq('id', paragraphCheck.chapter_id)
      .single()

    if (chapterError || !chapterInfo) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 })
    }

    if (chapterInfo.subject_id !== subjectId) {
      return NextResponse.json({ error: 'Paragraph does not belong to this subject' }, { status: 400 })
    }

    // Verify subject exists and get class_id
    const { data: subjectCheck, error: subjectCheckError } = await supabase
      .from('subjects')
      .select('class_id')
      .eq('id', subjectId)
      .single()

    if (subjectCheckError || !subjectCheck) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    }

    // Check if user has access to the class
    const { data: classAccess, error: classError } = await supabase
      .from('classes')
      .select('id')
      .eq('id', subjectCheck.class_id)
      .single()

    if (classError || !classAccess) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Update or insert progress snapshot
    const { data: progress, error: upsertError } = await supabase
      .from('progress_snapshots')
      .upsert({
        student_id: user.id,
        paragraph_id: paragraph_id,
        completion_percent: completion_percent,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'student_id,paragraph_id'
      })
      .select()
      .single()

    if (upsertError) {
      console.error('Error updating progress:', upsertError)
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      progress: progress
    })
  } catch (error) {
    console.error('Unexpected error in progress POST:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
