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

    // Get user role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    const isTeacher = profile?.role === 'teacher'

    if (isTeacher) {
      // Teachers: see subjects they own
      const { data, error } = await (supabase as any).from('subjects')
        .select(`
          *,
          class_subjects(
            classes:class_id(id, name)
          )
        `)
        .eq('user_id', user.id)

      if (error) {
        return NextResponse.json({
          error: `Supabase error fetching subjects: ${error.message}`
        }, { status: 500 })
      }

      const transformedData = (data as any[]).map(subject => ({
        ...subject,
        classes: subject.class_subjects ? subject.class_subjects.map((cs: any) => cs.classes).filter(Boolean) : []
      }))

      return NextResponse.json(transformedData || [])
    } else {
      // Students: see subjects linked to classes they are a member of
      // Step 1: Get class IDs the student is a member of
      const { data: memberships, error: memberError } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id)

      if (memberError) {
        console.error('Error fetching memberships:', memberError)
        return NextResponse.json({ error: memberError.message }, { status: 500 })
      }

      const classIds = (memberships || []).map((m: any) => m.class_id)

      if (classIds.length === 0) {
        return NextResponse.json([])
      }

      // Step 2: Get subject IDs linked to those classes via class_subjects
      const { data: classSubjectLinks, error: csError } = await (supabase as any)
        .from('class_subjects')
        .select('subject_id')
        .in('class_id', classIds)

      if (csError) {
        console.error('Error fetching class_subjects:', csError)
        return NextResponse.json({ error: csError.message }, { status: 500 })
      }

      const subjectIds = [...new Set((classSubjectLinks || []).map((cs: any) => cs.subject_id))]

      if (subjectIds.length === 0) {
        return NextResponse.json([])
      }

      // Step 3: Fetch those subjects with their linked classes
      const { data, error } = await (supabase as any).from('subjects')
        .select(`
          *,
          class_subjects(
            classes:class_id(id, name)
          )
        `)
        .in('id', subjectIds)

      if (error) {
        return NextResponse.json({
          error: `Supabase error fetching subjects: ${error.message}`
        }, { status: 500 })
      }

      const transformedData = (data as any[]).map(subject => ({
        ...subject,
        classes: subject.class_subjects ? subject.class_subjects.map((cs: any) => cs.classes).filter(Boolean) : []
      }))

      return NextResponse.json(transformedData || [])
    }
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
      .select()

    if (subjectError) {
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
    if (json.classIds && json.classIds.length > 0) {
      const classSubjects = json.classIds.map((classId: string) => ({
        class_id: classId,
        subject_id: newSubject.id
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
        class_subjects(
          classes:class_id(id, name)
        )
      `)
      .eq('id', newSubject.id)
      .single()

    if (fetchError) {
      return NextResponse.json({
        error: `Supabase error fetching subject with classes: ${fetchError.message}`
      }, { status: 500 })
    }

    // Transform the data, handling cases where class_subjects might be null or undefined
    const transformedSubject = {
      ...subjectWithClasses,
      classes: (subjectWithClasses as any).class_subjects ? (subjectWithClasses as any).class_subjects.map((cs: any) => cs.classes) : []
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
      .select()

    if (subjectError) {
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
        class_subjects(
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

    // Transform the data, handling cases where class_subjects might be null or undefined
    const transformedSubject = {
      ...subjectWithClasses,
      classes: (subjectWithClasses as any).class_subjects ? (subjectWithClasses as any).class_subjects.map((cs: any) => cs.classes) : []
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
