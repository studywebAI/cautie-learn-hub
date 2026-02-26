import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// GET /api/classes/[classId]/grades/[gradeSetId] - Get a single grade set with student grades
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string; gradeSetId: string }> }
) {
  try {
    const { classId, gradeSetId } = await params
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get grade set with student grades
    const { data: gradeSet, error } = await (supabase as any)
      .from('grade_sets')
      .select(`
        *,
        subject:subjects(id, title),
        student_grades(
          id,
          student_id,
          grade_value,
          feedback_text,
          status,
          tag,
          updated_at,
          student:student_id(id, full_name, email)
        )
      `)
      .eq('id', gradeSetId)
      .eq('class_id', classId)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!gradeSet) {
      return NextResponse.json({ error: 'Grade set not found' }, { status: 404 })
    }

    // Sort student grades by name
    const sortedGrades = (gradeSet.student_grades || []).sort((a: any, b: any) => {
      const nameA = a.student?.full_name || ''
      const nameB = b.student?.full_name || ''
      return nameA.localeCompare(nameB)
    })

    // Calculate stats
    const grades = sortedGrades
    const gradedCount = grades.filter((g: any) => g.grade_value !== null && g.grade_value !== '').length
    
    let average: number | null = null
    const numericGrades = grades
      .filter((g: any) => g.grade_value && !isNaN(parseFloat(g.grade_value)))
      .map((g: any) => parseFloat(g.grade_value))
    
    if (numericGrades.length > 0) {
      average = numericGrades.reduce((a: number, b: number) => a + b, 0) / numericGrades.length
    }

    return NextResponse.json({ 
      grade_set: {
        ...gradeSet,
        student_grades: sortedGrades,
        total_students: grades.length,
        graded_count: gradedCount,
        average: average ? Math.round(average * 10) / 10 : null
      }
    })
  } catch (error) {
    console.error('Error fetching grade set:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PUT /api/classes/[classId]/grades/[gradeSetId] - Update grade set or student grades
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string; gradeSetId: string }> }
) {
  try {
    const { classId, gradeSetId } = await params
    const body = await req.json()
    const { action, title, description, category, weight, status, release_date, student_grades } = body

    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Teachers who are members of the class can access grades
    if (!isTeacher || !classMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Handle different actions
    if (action === 'update_grade_set') {
      // Update grade set metadata
      const updateData: any = {
        updated_at: new Date().toISOString()
      }
      
      if (title !== undefined) updateData.title = title
      if (description !== undefined) updateData.description = description
      if (category !== undefined) updateData.category = category
      if (weight !== undefined) updateData.weight = weight
      if (status !== undefined) updateData.status = status
      if (release_date !== undefined) updateData.release_date = release_date

      const { data: updatedGradeSet, error } = await supabase
        .from('grade_sets')
        .update(updateData)
        .eq('id', gradeSetId)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ grade_set: updatedGradeSet })
    }

    if (action === 'update_student_grades' && student_grades) {
      // Bulk update student grades
      const updates = student_grades.map((sg: any) => ({
        id: sg.id,
        grade_value: sg.grade_value,
        feedback_text: sg.feedback_text,
        status: sg.status || 'draft',
        tag: sg.tag,
        updated_at: new Date().toISOString()
      }))

      // Use upsert to handle updates
      const { data: updatedGrades, error } = await supabase
        .from('student_grades')
        .upsert(updates, { onConflict: 'id' })
        .select()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ student_grades: updatedGrades })
    }

    if (action === 'publish') {
      // Publish grades - update status to published
      const { data: updatedGradeSet, error } = await supabase
        .from('grade_sets')
        .update({ 
          status: 'published',
          release_date: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', gradeSetId)
        .select()
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      // Also mark all student grades as final
      await supabase
        .from('student_grades')
        .update({ status: 'final' })
        .eq('grade_set_id', gradeSetId)

      return NextResponse.json({ grade_set: updatedGradeSet })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    console.error('Error updating grade set:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/classes/[classId]/grades/[gradeSetId] - Delete a grade set
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string; gradeSetId: string }> }
) {
  try {
    const { classId, gradeSetId } = await params

    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    // Teachers who are members of the class can delete grades
    if (!isTeacher || !classMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Delete grade set (cascades to student_grades and grade_history)
    const { error } = await supabase
      .from('grade_sets')
      .delete()
      .eq('id', gradeSetId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Grade set deleted successfully' })
  } catch (error) {
    console.error('Error deleting grade set:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
