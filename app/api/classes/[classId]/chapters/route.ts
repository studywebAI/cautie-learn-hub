import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse, NextRequest } from 'next/server'

import { createChapterSchema } from '@/lib/validation/schemas'
import { validateBody } from '@/lib/validation/validate'

import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

// GET /api/classes/[classId]/chapters - List chapters for a class
export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const resolvedParams = await params
    const classId = resolvedParams.classId
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has access to this class (owner or member)
    const { data: accessCheck, error: accessError } = await supabase
      .from('classes')
      .select('user_id')
      .eq('id', classId)
      .single()

    if (accessError || !accessCheck) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    const isOwner = accessCheck.user_id === user.id

    if (!isOwner) {
      // Check if user is a member
      const { data: memberCheck, error: memberError } = await supabase
        .from('class_members')
        .select()
        .eq('class_id', classId)
        .eq('user_id', user.id)
        .single()

      if (memberError || !memberCheck) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 })
      }
    }

    // Get chapters that belong to subjects in this class (hierarchical schema)
    // Include paragraphs in the same query to avoid N+1 problem
    const { data: chapters, error } = await supabase
      .from('chapters')
      .select(`
        *,
        subjects!inner(
          class_id
        ),
        paragraphs(
          id,
          title,
          paragraph_number,
          content
        )
      `)
      .eq('subjects.class_id', classId)
      .order('chapter_number', { ascending: true })

    if (error) {
      console.error('Error fetching chapters:', error)
      return NextResponse.json({ error: 'Failed to fetch chapters' }, { status: 500 })
    }

    // Transform data to include paragraphs array directly on each chapter
    const chaptersWithParagraphs = (chapters || []).map((chapter: any) => ({
      ...chapter,
      paragraphs: chapter.paragraphs || []
    }))

    return NextResponse.json({ chapters: chaptersWithParagraphs })
  } catch (err) {
    console.error('Unexpected error in chapters GET:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/classes/[classId]/chapters - Create a new chapter under a subject
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const resolvedParams = await params
    const classId = resolvedParams.classId

    // Validate request body
    const validation = await validateBody(request, createChapterSchema);
    if ('error' in validation) {
      return validation.error;
    }
    const { title, subject_id } = validation.data;

    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is the owner of this class
    const { data: classCheck, error: classError } = await supabase
      .from('classes')
      .select('user_id')
      .eq('id', classId)
      .single()

    if (classError || !classCheck) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    // Check if user is a teacher member of the class
    // (owner_id column was removed - all teachers are equal via class_members)
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .single()

    const isTeacher = userProfile?.subscription_type === 'teacher'

    // Also check if user is a member of this class
    const { data: classMember } = await supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .maybeSingle()

    // Teachers who are members of the class can create chapters
    if (!isTeacher || !classMember) {
      return NextResponse.json({ error: 'Only class teachers can create chapters' }, { status: 403 })
    }

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Chapter title is required' }, { status: 400 })
    }

    if (!subject_id) {
      return NextResponse.json({ error: 'subject_id is required' }, { status: 400 })
    }

    // Verify subject belongs to this class
    const { data: subjectCheck, error: subjectError } = await supabase
      .from('subjects')
      .select('id')
      .eq('id', subject_id)
      .eq('class_id', classId)
      .single()

    if (subjectError || !subjectCheck) {
      return NextResponse.json({ error: 'Subject not found in this class' }, { status: 404 })
    }

    // Use database function to get next chapter number
    const { data: nextChapterNumber, error: funcError } = await (supabase as any)
      .rpc('get_next_chapter_number', { subject_id: subject_id })

    if (funcError) {
      console.error('Error getting next chapter number:', funcError)
      // Fallback to 1 if function doesn't exist
      const fallbackNumber = 1
    }

    const { data: chapter, error } = await (supabase as any)
      .from('chapters')
      .insert({
        subject_id,
        chapter_number: nextChapterNumber || 1,
        title: title.trim()
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating chapter:', error)
      return NextResponse.json({ error: 'Failed to create chapter' }, { status: 500 })
    }

    return NextResponse.json({ chapter })
  } catch (err) {
    console.error('Unexpected error in chapters POST:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
