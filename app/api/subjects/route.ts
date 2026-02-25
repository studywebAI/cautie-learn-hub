import { NextResponse, NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

import { createSubjectSchema, updateSubjectSchema, deleteSubjectSchema } from '@/lib/validation/schemas'
import { validateBody } from '@/lib/validation/validate'

function logSubjects(...args: any[]) {
  console.log('[SUBJECTS]', ...args)
}

type SubjectCreateRequest = {
  title: string
  description?: string
  classIds?: string[] | null
}

type SubjectUpdateRequest = {
  id: string
  title?: string
  description?: string
  classIds?: string[] | null
}

type SubjectDeleteRequest = {
  id: string
}

// Helper to get nearby paragraphs around last activity
async function getSubjectParagraphContext(supabase: any, subjectIds: string[], userId: string) {
  if (subjectIds.length === 0) return {}

  // Get latest activity per subject
  const { data: activities } = await supabase
    .from('session_logs')
    .select('subject_id, chapter_id, paragraph_id, started_at')
    .eq('user_id', userId)
    .in('subject_id', subjectIds)
    .order('started_at', { ascending: false })

  // Get the latest activity per subject
  const latestPerSubject: Record<string, { chapter_id: string; paragraph_id: string }> = {}
  for (const act of (activities || [])) {
    if (!latestPerSubject[act.subject_id] && act.paragraph_id) {
      latestPerSubject[act.subject_id] = {
        chapter_id: act.chapter_id,
        paragraph_id: act.paragraph_id
      }
    }
  }

  // Get all chapters and paragraphs for these subjects
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, subject_id, chapter_number, title')
    .in('subject_id', subjectIds)
    .order('chapter_number', { ascending: true })

  if (!chapters || chapters.length === 0) return {}

  const chapterIds = chapters.map((c: any) => c.id)
  const { data: paragraphs } = await supabase
    .from('paragraphs')
    .select('id, title, paragraph_number, chapter_id')
    .in('chapter_id', chapterIds)
    .order('paragraph_number', { ascending: true })

  // Build a flattened list of paragraphs per subject with chapter context
  const chapterMap: Record<string, any> = {}
  for (const ch of chapters) {
    chapterMap[ch.id] = ch
  }

  const subjectParagraphs: Record<string, any[]> = {}
  for (const p of (paragraphs || [])) {
    const ch = chapterMap[p.chapter_id]
    if (!ch) continue
    const subjectId = ch.subject_id
    if (!subjectParagraphs[subjectId]) subjectParagraphs[subjectId] = []
    subjectParagraphs[subjectId].push({
      id: p.id,
      title: p.title,
      paragraph_number: p.paragraph_number,
      chapter_id: p.chapter_id,
      chapter_number: ch.chapter_number,
      chapter_title: ch.title,
    })
  }

  // For each subject, find the 3 paragraphs around the last activity
  const result: Record<string, any> = {}

  for (const subjectId of subjectIds) {
    const allParagraphs = subjectParagraphs[subjectId] || []
    if (allParagraphs.length === 0) {
      result[subjectId] = { paragraphs: [], lastParagraphId: null }
      continue
    }

    // Sort: by chapter_number, then paragraph_number
    allParagraphs.sort((a: any, b: any) => {
      if (a.chapter_number !== b.chapter_number) return a.chapter_number - b.chapter_number
      return a.paragraph_number - b.paragraph_number
    })

    const lastActivity = latestPerSubject[subjectId]
    let centerIndex = 0

    if (lastActivity) {
      const idx = allParagraphs.findIndex((p: any) => p.id === lastActivity.paragraph_id)
      if (idx !== -1) centerIndex = idx
    }

    // Get 3 paragraphs: center and surrounding
    let startIdx: number
    if (allParagraphs.length <= 3) {
      startIdx = 0
    } else if (centerIndex === 0) {
      startIdx = 0
    } else if (centerIndex >= allParagraphs.length - 1) {
      startIdx = allParagraphs.length - 3
    } else {
      startIdx = centerIndex - 1
    }

    const selectedParagraphs = allParagraphs.slice(startIdx, startIdx + 3)

    result[subjectId] = {
      paragraphs: selectedParagraphs,
      lastParagraphId: lastActivity?.paragraph_id || null
    }
  }

  return result
}

export async function GET(req: Request) {
  try {
    logSubjects('GET - Handling request', { url: req.url });
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      logSubjects('GET - Unauthorized attempt', userError?.message)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Use subscription_type as the single source of truth (role column removed)
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .maybeSingle()

    const isTeacher = profile?.subscription_type === 'teacher'
    logSubjects('GET - User subscription_type', profile?.subscription_type)

    let subjects: any[] = []

    if (isTeacher) {
      logSubjects('GET - Teacher branch', { userId: user.id })
      const { data, error } = await (supabase as any).from('subjects')
        .select(`
          *,
          class_subjects(
            classes:class_id(id, name)
          )
        `)
        .eq('user_id', user.id)

      if (error) {
        logSubjects('GET - Supabase error fetching teacher subjects', error.message)
        return NextResponse.json({
          error: `Supabase error fetching subjects: ${error.message}`
        }, { status: 500 })
      }

      subjects = (data as any[]).map(subject => ({
        ...subject,
        classes: subject.class_subjects ? subject.class_subjects.map((cs: any) => cs.classes).filter(Boolean) : []
      }))
      logSubjects('GET - Teacher subjects loaded', { count: subjects.length })
    } else {
      logSubjects('GET - Student branch', { userId: user.id })
      const { data: memberships, error: memberError } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id)

      if (memberError) {
        logSubjects('GET - Failed to load memberships', memberError.message)
        return NextResponse.json({ error: memberError.message }, { status: 500 })
      }

      const classIds = (memberships || []).map((m: any) => m.class_id)

      if (classIds.length === 0) {
        logSubjects('GET - No class memberships', classIds)
        return NextResponse.json([])
      }

      const { data: classSubjectLinks, error: csError } = await (supabase as any)
        .from('class_subjects')
        .select('subject_id')
        .in('class_id', classIds)

      if (csError) {
        logSubjects('GET - Failed to load class_subject links', csError.message)
        return NextResponse.json({ error: csError.message }, { status: 500 })
      }

      const subjectIds = [...new Set((classSubjectLinks || []).map((cs: any) => cs.subject_id))]

      if (subjectIds.length === 0) {
        logSubjects('GET - No subjects for joined classes', { classIds })
        return NextResponse.json([])
      }

      const { data, error } = await (supabase as any).from('subjects')
        .select(`
          *,
          class_subjects(
            classes:class_id(id, name)
          )
        `)
        .in('id', subjectIds)

      if (error) {
        logSubjects('GET - Error fetching student subjects', error.message)
        return NextResponse.json({
          error: `Supabase error fetching subjects: ${error.message}`
        }, { status: 500 })
      }

      subjects = (data as any[]).map(subject => ({
        ...subject,
        classes: subject.class_subjects ? subject.class_subjects.map((cs: any) => cs.classes).filter(Boolean) : []
      }))
      logSubjects('GET - Student subjects loaded', { count: subjects.length })
    }

    // Enrich subjects with paragraph context
    const subjectIds = subjects.map((s: any) => s.id)
    const paragraphContext = await getSubjectParagraphContext(supabase, subjectIds, user.id)

    const enrichedSubjects = subjects.map((subject: any) => ({
      ...subject,
      paragraphContext: paragraphContext[subject.id] || { paragraphs: [], lastParagraphId: null }
    }))
    logSubjects('GET - Returning enriched subjects', { count: enrichedSubjects.length })
    return NextResponse.json(enrichedSubjects)
  } catch (error) {
    logSubjects('GET - Unexpected error', error)
    return NextResponse.json({
      error: 'Internal server error while fetching subjects'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    logSubjects('POST - Creating subject', { url: request.url })
    // Validate request body
    const validation = await validateBody(request, createSubjectSchema);
    if ('error' in validation) {
      logSubjects('POST - Validation error', validation.error)
      return validation.error;
    }
    const { title, description, class_ids: classIds } = validation.data;

    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      logSubjects('POST - Auth failed', userError?.message)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    logSubjects('POST - Authenticated user', user.id)

    // Create the subject in Supabase
    const { data: subjectData, error: subjectError } = await supabase.from('subjects')
      .insert([{
        title: title,
        user_id: user.id,
        description: description
      }])
      .select()

    if (subjectError) {
      logSubjects('POST - Subject insert error', subjectError.message)
      return NextResponse.json({
        error: `Supabase error creating subject: ${subjectError.message}`
      }, { status: 500 })
    }

    if (!subjectData || subjectData.length === 0) {
      return NextResponse.json({
        error: 'Failed to create subject: No data returned'
      }, { status: 500 })
    }

    const newSubject = subjectData[0]

    // Link subject to classes if classIds are provided
    if (classIds && classIds.length > 0) {
      const classSubjects = classIds.map((classId: string) => ({
        class_id: classId,
        subject_id: newSubject.id
      }))

      const { error: linkError } = await (supabase as any).from('class_subjects')
        .insert(classSubjects)

    if (linkError) {
      logSubjects('POST - Failed to link classes', linkError.message)
      return NextResponse.json({
        error: `Supabase error linking subject to classes: ${linkError.message}`
      }, { status: 500 })
    }
    logSubjects('POST - Linked subject to classes', { subjectId: newSubject.id, classIds })
    }

    // Fetch the subject with its classes
    const { data: subjectWithClasses, error: fetchError } = await (supabase as any)
      .from('subjects')
      .select(`
        *,
        class_subjects(
          classes:class_id(id, name)
        )
      `)
      .eq('id', newSubject.id)
      .single()

    if (fetchError) {
      logSubjects('POST - Failed to fetch subject with classes', fetchError.message)
      return NextResponse.json({
        error: `Supabase error fetching subject with classes: ${fetchError.message}`
      }, { status: 500 })
    }

    // Transform the data, handling cases where class_subjects might be null or undefined
    const transformedSubject = {
      ...subjectWithClasses,
      classes: (subjectWithClasses as any).class_subjects ? (subjectWithClasses as any).class_subjects.map((cs: any) => cs.classes) : []
    }

    logSubjects('POST - Returning new subject', { subjectId: transformedSubject.id })
    return NextResponse.json({
      subject: transformedSubject
    })
  } catch (error) {
    console.error('Error creating subject:', error)
    return NextResponse.json({
      error: 'Internal server error while creating subject'
    }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    logSubjects('PUT - Updating subject', { url: request.url })
    // Validate request body
    const validation = await validateBody(request, updateSubjectSchema);
    if ('error' in validation) {
      logSubjects('PUT - Validation error', validation.error)
      return validation.error;
    }
    const { id, title, description, class_ids: classIds } = validation.data;

    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    // Update the subject in Supabase
    const { data: subjectData, error: subjectError } = await supabase.from('subjects')
      .update({
        title: title,
        description: description
      })
      .eq('id', id)
      .select()

    if (subjectError) {
      logSubjects('PUT - Subject update error', subjectError.message)
      return NextResponse.json({
        error: `Supabase error updating subject: ${subjectError.message}`
      }, { status: 500 })
    }

    if (!subjectData || subjectData.length === 0) {
      return NextResponse.json({
        error: 'Failed to update subject: No data returned'
      }, { status: 500 })
    }

    // Update class-subject links
    if (classIds !== undefined) {
      // Delete existing links
      const { error: deleteError } = await (supabase as any).from('class_subjects')
        .delete()
        .eq('subject_id', id)

      if (deleteError) {
        logSubjects('PUT - Failed to delete class links', deleteError.message)
        return NextResponse.json({
          error: `Supabase error deleting class-subject links: ${deleteError.message}`
        }, { status: 500 })
      }

      // Add new links
      if (classIds && classIds.length > 0) {
        const classSubjects = classIds.map((classId: string) => ({
          class_id: classId,
          subject_id: id
        }))

        const { error: linkError } = await (supabase as any).from('class_subjects')
          .insert(classSubjects)

        if (linkError) {
          logSubjects('PUT - Failed to link subject to classes', linkError.message)
          return NextResponse.json({
            error: `Supabase error linking subject to classes: ${linkError.message}`
          }, { status: 500 })
        }
        logSubjects('PUT - Linked subject to classes', { subjectId: id, classIds })
      }
    }

    // Fetch the updated subject with its classes
    const { data: subjectWithClasses, error: fetchError } = await (supabase as any)
      .from('subjects')
      .select(`
        *,
        class_subjects(
          classes:class_id(id, name)
        )
      `)
      .eq('id', id)
      .single()

    if (fetchError) {
      logSubjects('PUT - Failed to fetch updated subject', fetchError.message)
      return NextResponse.json({
        error: `Supabase error fetching subject with classes: ${fetchError.message}`
      }, { status: 500 })
    }

    // Transform the data, handling cases where class_subjects might be null or undefined
    const transformedSubject = {
      ...subjectWithClasses,
      classes: (subjectWithClasses as any).class_subjects ? (subjectWithClasses as any).class_subjects.map((cs: any) => cs.classes) : []
    }

    logSubjects('PUT - Returning updated subject', { subjectId: id })
    return NextResponse.json({
      subject: transformedSubject
    })
  } catch (error) {
    console.error('Error updating subject:', error)
    return NextResponse.json({
      error: 'Internal server error while updating subject'
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    logSubjects('DELETE - Removing subject', { url: request.url })
    // Validate request body
    const validation = await validateBody(request, deleteSubjectSchema);
    if ('error' in validation) {
      logSubjects('DELETE - Validation error', validation.error)
      return validation.error;
    }
    const { id } = validation.data;

    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    // Delete class-subject links first
    const { error: linkError } = await (supabase as any).from('class_subjects')
      .delete()
      .eq('subject_id', id)

    if (linkError) {
      logSubjects('DELETE - Failed to delete class links', linkError.message)
      return NextResponse.json({
        error: `Supabase error deleting class-subject links: ${linkError.message}`
      }, { status: 500 })
    }

    // Delete the subject from Supabase
    const { error } = await supabase.from('subjects')
      .delete()
      .eq('id', id)
    
    if (error) {
      logSubjects('DELETE - Failed to delete subject', error.message)
      return NextResponse.json({
        error: `Supabase error deleting subject: ${error.message}`
      }, { status: 500 })
    }
   
    logSubjects('DELETE - Subject deleted', { subjectId: id })
    return NextResponse.json({
      message: 'Subject deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting subject:', error)
    return NextResponse.json({
      error: 'Internal server error while deleting subject'
    }, { status: 500 })
  }
}
