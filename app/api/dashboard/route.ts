import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch all dashboard data directly from database
    const [
      classesResult,
      personalTasksResult,
      profileResult
    ] = await Promise.all([
      supabase.from('classes').select('*').eq('owner_id', user.id).order('created_at', { ascending: false }),
      supabase.from('personal_tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('profiles').select('role').eq('id', user.id).single()
    ])

    // For now, return empty assignments array - assignments are complex with hierarchy
    const assignmentsResult = { data: [], error: null }

    if (classesResult.error) {
      console.error('Classes fetch error:', classesResult.error)
    }
    if (assignmentsResult.error) {
      console.error('Assignments fetch error:', assignmentsResult.error)
    }
    if (personalTasksResult.error) {
      console.error('Personal tasks fetch error:', personalTasksResult.error)
    }
    if (profileResult.error) {
      console.error('Profile fetch error:', profileResult.error)
    }

    const classes = classesResult.data || []
    const assignments = assignmentsResult.data || []
    const personalTasks = personalTasksResult.data || []
    const role = profileResult.data?.role || 'student'

    // Get students for teachers
    let students: any[] = []
    if (role === 'teacher' && classes.length > 0) {
      const ownedClassIds = classes.filter((c: any) => c.owner_id === user.id).map((c: any) => c.id)
      if (ownedClassIds.length > 0 && ownedClassIds.length <= 10) {
        const { data: studentsData, error: studentsError } = await supabase
          .from('class_members')
          .select('user_id, profiles(*)')
          .in('class_id', ownedClassIds)

        if (!studentsError && studentsData) {
          students = Array.from(new Set(studentsData.map((s: any) => s.user_id)))
            .map(id => studentsData.find((s: any) => s.user_id === id))
            .filter(Boolean)
        }
      }
    }

    return NextResponse.json({
      classes: classes || [],
      assignments: assignments || [],
      personalTasks: personalTasks || [],
      students: students || [],
      role
    })

  } catch (err) {
    console.error('Dashboard API error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}