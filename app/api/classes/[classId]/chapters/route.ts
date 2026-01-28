import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

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
    const { data: chapters, error } = await supabase
      .from('chapters')
      .select(`
        *,
        subjects!inner(
          class_id
        )
      `)
      .eq('subjects.class_id', classId)
      .order('chapter_number', { ascending: true })

    if (error) {
      console.error('Error fetching chapters:', error)
      return NextResponse.json({ error: 'Failed to fetch chapters' }, { status: 500 })
    }

    return NextResponse.json({ chapters: chapters || [] })
  } catch (err) {
    console.error('Unexpected error in chapters GET:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/classes/[classId]/chapters - Create a new chapter under a subject
export async function POST(
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

    // Check if user is the owner of this class
    const { data: classCheck, error: classError } = await supabase
      .from('classes')
      .select('user_id')
      .eq('id', classId)
      .single()

    if (classError || !classCheck) {
      return NextResponse.json({ error: 'Class not found' }, { status: 404 })
    }

    if (classCheck.user_id !== user.id) {
      return NextResponse.json({ error: 'Only class owners can create chapters' }, { status: 403 })
    }

    const { title, subject_id } = await request.json()

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
    const { data: nextChapterNumber, error: funcError } = await supabase
      .rpc('get_next_chapter_number', { subject_id: subject_id })

    if (funcError) {
      console.error('Error getting next chapter number:', funcError)
      return NextResponse.json({ error: 'Failed to generate chapter number' }, { status: 500 })
    }

    const { data: chapter, error } = await supabase
      .from('chapters')
      .insert({
        subject_id,
        chapter_number: nextChapterNumber,
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
