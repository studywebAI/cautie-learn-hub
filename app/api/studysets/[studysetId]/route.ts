import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ studysetId: string }> }
) {
  try {
    const { studysetId } = await params
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: studyset, error: studysetError } = await (supabase as any)
      .from('studysets')
      .select('id, name, confidence_level, target_days, minutes_per_day, status, created_at, updated_at')
      .eq('id', studysetId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (studysetError) return NextResponse.json({ error: studysetError.message }, { status: 500 })
    if (!studyset) return NextResponse.json({ error: 'Studyset not found' }, { status: 404 })

    const { data: dayRows, error: daysError } = await (supabase as any)
      .from('studyset_plan_days')
      .select(`
        id,
        day_number,
        plan_date,
        summary,
        estimated_minutes,
        completed,
        studyset_plan_tasks (
          id,
          task_type,
          title,
          description,
          estimated_minutes,
          position,
          completed
        )
      `)
      .eq('studyset_id', studyset.id)
      .order('day_number', { ascending: true })

    if (daysError) return NextResponse.json({ error: daysError.message }, { status: 500 })

    const days = (dayRows || []).map((day: any) => ({
      ...day,
      studyset_plan_tasks: (day.studyset_plan_tasks || []).sort(
        (a: any, b: any) => Number(a.position || 0) - Number(b.position || 0)
      ),
    }))

    const totalTasks = days.reduce((sum: number, day: any) => sum + (day.studyset_plan_tasks?.length || 0), 0)
    const completedTasks = days.reduce(
      (sum: number, day: any) => sum + (day.studyset_plan_tasks || []).filter((task: any) => task.completed).length,
      0
    )

    return NextResponse.json({
      studyset,
      days,
      progress: {
        total_tasks: totalTasks,
        completed_tasks: completedTasks,
        percent: totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100),
      },
    })
  } catch (error) {
    console.error('studyset detail GET failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
