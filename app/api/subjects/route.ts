import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

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

export async function GET(req: Request) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch subjects for the current user with their linked classes
    const { data, error } = await (supabase as any).from('subjects')
      .select(`
        *,
        class_subjects!subjects_class_subjects_subject_id_fkey(
          classes:class_id(id, name)
        )
      `)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({
        error: `Supabase error fetching subjects: ${error.message}`
      }, { status: 500 })
    }

    // Transform data to include classes array instead of nested structure
    const transformedData = (data as any[]).map(subject => ({
      ...subject,
      classes: subject.class_subjects.map((cs: any) => cs.classes)
    }))

    return NextResponse.json(transformedData || [])
  } catch (error) {
    console.error('Error fetching subjects:', error)
    return NextResponse.json({
      error: 'Internal server error while fetching subjects'
    }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const json = await req.json()

    // Validate create request
    if (!json.title) {
      return NextResponse.json({
        error: 'Missing required field: title'
      }, { status: 400 })
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create the subject in Supabase
    const { data: subjectData, error: subjectError } = await supabase.from('subjects')
      .insert([{
        title: json.title,
        user_id: user.id,
        description: json.description
      }])
      .single()

    if (subjectError) {
      return NextResponse.json({
        error: `Supabase error creating subject: ${subjectError.message}`
      }, { status: 500 })
    }

    // Link subject to classes if classIds are provided
    if (json.classIds && json.classIds.length > 0) {
      const classSubjects = json.classIds.map((classId: string) => ({
        class_id: classId,
        subject_id: (subjectData as any).id
      }))

      const { error: linkError } = await (supabase as any).from('class_subjects')
        .insert(classSubjects)

      if (linkError) {
        return NextResponse.json({
          error: `Supabase error linking subject to classes: ${linkError.message}`
        }, { status: 500 })
      }
    }

    // Fetch the subject with its classes
    const { data: subjectWithClasses, error: fetchError } = await (supabase as any)
      .from('subjects')
      .select(`
        *,
        class_subjects!subjects_class_subjects_subject_id_fkey(
          classes:class_id(id, name)
        )
      `)
      .eq('id', (subjectData as any).id)
      .single()

    if (fetchError) {
      return NextResponse.json({
        error: `Supabase error fetching subject with classes: ${fetchError.message}`
      }, { status: 500 })
    }

    // Transform the data
    const transformedSubject = {
      ...subjectWithClasses,
      classes: (subjectWithClasses as any).class_subjects.map((cs: any) => cs.classes)
    }

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

export async function PUT(req: Request) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const json = await req.json()

    // Validate update request
    if (!json.id) {
      return NextResponse.json({
        error: 'Missing required field: id'
      }, { status: 400 })
    }

    // Update the subject in Supabase
    const { data: subjectData, error: subjectError } = await supabase.from('subjects')
      .update({
        title: json.title,
        description: json.description
      })
      .eq('id', json.id)
      .single()

    if (subjectError) {
      return NextResponse.json({
        error: `Supabase error updating subject: ${subjectError.message}`
      }, { status: 500 })
    }

    // Update class-subject links
    if (json.classIds !== undefined) {
      // Delete existing links
      const { error: deleteError } = await (supabase as any).from('class_subjects')
        .delete()
        .eq('subject_id', json.id)

      if (deleteError) {
        return NextResponse.json({
          error: `Supabase error deleting class-subject links: ${deleteError.message}`
        }, { status: 500 })
      }

      // Add new links
      if (json.classIds && json.classIds.length > 0) {
        const classSubjects = json.classIds.map((classId: string) => ({
          class_id: classId,
          subject_id: json.id
        }))

        const { error: linkError } = await (supabase as any).from('class_subjects')
          .insert(classSubjects)

        if (linkError) {
          return NextResponse.json({
            error: `Supabase error linking subject to classes: ${linkError.message}`
          }, { status: 500 })
        }
      }
    }

    // Fetch the updated subject with its classes
    const { data: subjectWithClasses, error: fetchError } = await (supabase as any)
      .from('subjects')
      .select(`
        *,
        class_subjects!subjects_class_subjects_subject_id_fkey(
          classes:class_id(id, name)
        )
      `)
      .eq('id', json.id)
      .single()

    if (fetchError) {
      return NextResponse.json({
        error: `Supabase error fetching subject with classes: ${fetchError.message}`
      }, { status: 500 })
    }

    // Transform the data
    const transformedSubject = {
      ...subjectWithClasses,
      classes: (subjectWithClasses as any).class_subjects.map((cs: any) => cs.classes)
    }

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

export async function DELETE(req: Request) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const json = await req.json()

    // Validate deletion request
    if (!json.id) {
      return NextResponse.json({
        error: 'Missing required field: id'
      }, { status: 400 })
    }

    // Delete class-subject links first
    const { error: linkError } = await (supabase as any).from('class_subjects')
      .delete()
      .eq('subject_id', json.id)

    if (linkError) {
      return NextResponse.json({
        error: `Supabase error deleting class-subject links: ${linkError.message}`
      }, { status: 500 })
    }

    // Delete the subject from Supabase
    const { error } = await supabase.from('subjects')
      .delete()
      .eq('id', json.id)
    
    if (error) {
      return NextResponse.json({
        error: `Supabase error deleting subject: ${error.message}`
      }, { status: 500 })
    }
    
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
