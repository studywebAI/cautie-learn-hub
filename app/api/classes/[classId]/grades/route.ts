import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

// GET /api/classes/[classId]/grades - Get all grade sets for a class
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    console.log(`\n🌐 [GRADES_GET] Fetching grades for class: ${classId}`)
    
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('[GRADES_GET] User:', user?.id, 'Auth error:', userError?.message)
    
    if (userError || !user) {
      console.log('[GRADES_GET] ❌ Unauthorized - no user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a class member
    const { data: memberData } = await supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .single()
    
    if (!memberData) {
      console.log('[GRADES_GET] ❌ Access denied - not a member')
      return NextResponse.json({ error: 'Only class members can view grades' }, { status: 403 })
    }
    
    // Get user's subscription_type to check if they're a teacher
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .single()
    
    const isTeacher = userProfile?.subscription_type === 'teacher'
    
    if (!isTeacher) {
      console.log('[GRADES_GET] ❌ Access denied - not a teacher')
      return NextResponse.json({ error: 'Only teachers can view grades' }, { status: 403 })
    }

    console.log('[GRADES_GET] Querying grade_sets table...')
    // Get grade sets for this class
    const { data: gradeSets, error } = await (supabase as any)
      .from('grade_sets')
      .select(`
        *,
        subject:subjects(id, title),
        student_grades(id, student_id, grade_value, status, tag)
      `)
      .eq('class_id', classId)
      .order('created_at', { ascending: false })

    console.log('[GRADES_GET] Query result:', { count: gradeSets?.length, error: error?.message })
    
    if (error) {
      console.error('[GRADES_GET] ❌ Query error:', error)
      return NextResponse.json({ error: error.message, details: 'Failed to query grade_sets table' }, { status: 500 })
    }

    // Calculate stats for each grade set
    const enrichedGradeSets = (gradeSets || []).map((gs: any) => {
      const grades = gs.student_grades || []
      const gradedCount = grades.filter((g: any) => g.grade_value !== null && g.grade_value !== '').length
      
      // Calculate average if numeric
      let average: number | null = null
      const numericGrades = grades
        .filter((g: any) => g.grade_value && !isNaN(parseFloat(g.grade_value)))
        .map((g: any) => parseFloat(g.grade_value))
      
      if (numericGrades.length > 0) {
        average = numericGrades.reduce((a: number, b: number) => a + b, 0) / numericGrades.length
      }

      return {
        ...gs,
        total_students: grades.length,
        graded_count: gradedCount,
        average: average ? Math.round(average * 10) / 10 : null
      }
    })

    return NextResponse.json({ grade_sets: enrichedGradeSets })
  } catch (error) {
    console.error('Error fetching grade sets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/classes/[classId]/grades - Create a new grade set
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    console.log('[GRADES] POST - classId:', classId)
    
    const body = await req.json()
    console.log('[GRADES] POST - body:', body)
    
    const { title, description, category, weight, subject_id } = body

    if (!title || title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    console.log('[GRADES] POST - user:', user?.id, 'error:', userError)
    
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is a member and is a teacher
    const { data: memberData } = await supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .single()
    
    if (!memberData) {
      return NextResponse.json({ error: 'Class not found or unauthorized' }, { status: 403 })
    }
    
    // Check subscription_type
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .single()
    
    if (userProfile?.subscription_type !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can create grade sets' }, { status: 403 })
    }

    // Create the grade set
    const { data: gradeSet, error } = await supabase
      .from('grade_sets')
      .insert([{
        class_id: classId,
        subject_id: subject_id || null,
        title: title.trim(),
        description: description || null,
        category: category || 'test',
        weight: weight || 1,
        status: 'draft',
        created_by: user.id
      }])
      .select()
      .single()

    console.log('[GRADES] POST - gradeSet created:', { gradeSet, error })
    
    if (error) {
      console.error('[GRADES] POST - error creating grade set:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get all class members first
    const { data: classMembers, error: membersError } = await supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', classId)

    const memberUserIds = (classMembers || []).map(m => m.user_id)
    
    // Then filter by subscription_type = 'student'
    let studentIds: string[] = []
    if (memberUserIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id')
        .in('id', memberUserIds)
        .eq('subscription_type', 'student')
      
      studentIds = (profiles || []).map(p => p.id)
    }

    // Get student profiles
    let students: any[] = []
    if (studentIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .in('id', studentIds)
      
      if (profilesError) {
        console.error('[GRADES] POST - Error fetching students:', profilesError)
      }
      students = profilesData || []
    }

    console.log('[GRADES] POST - students:', { count: students.length })

    // Create empty grade entries for each student
    if (students && students.length > 0) {
      const gradeEntries = students.map((s: any) => ({
        grade_set_id: gradeSet.id,
        student_id: s.user_id,
        grade_value: null,
        status: 'draft'
      }))

      const { error: gradesError } = await supabase
        .from('student_grades')
        .insert(gradeEntries)

      if (gradesError) {
        console.error('[GRADES] POST - Error creating student grades:', gradesError)
      }
    }

    return NextResponse.json({ 
      grade_set: gradeSet,
      students_count: students?.length || 0
    })
  } catch (error) {
    console.error('[GRADES] POST - Error creating grade set:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
