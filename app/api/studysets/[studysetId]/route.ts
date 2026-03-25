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
      .select('id, name, confidence_level, target_days, minutes_per_day, status, source_bundle, created_at, updated_at')
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

    let adaptive: any = null
    try {
      const { data: recentAttempts } = await (supabase as any)
        .from('studyset_task_attempts')
        .select('score, created_at')
        .eq('user_id', user.id)
        .eq('studyset_id', studyset.id)
        .order('created_at', { ascending: false })
        .limit(8)

      const { data: weakTopicRows } = await (supabase as any)
        .from('studyset_mastery_topics')
        .select('topic_label, weakness_score, mastery_score')
        .eq('user_id', user.id)
        .eq('studyset_id', studyset.id)
        .order('weakness_score', { ascending: false })
        .limit(5)

      if (Array.isArray(recentAttempts) && recentAttempts.length > 0) {
        const avgScore = Math.round(
          recentAttempts.reduce((sum: number, row: any) => sum + Number(row.score || 0), 0) / recentAttempts.length
        )
        const weakTopics = Array.isArray(weakTopicRows)
          ? weakTopicRows
              .filter((row: any) => Number(row.weakness_score || 0) > Number(row.mastery_score || 0))
              .map((row: any) => String(row.topic_label || '').trim())
              .filter(Boolean)
              .slice(0, 4)
          : []
        adaptive = {
          avg_score: avgScore,
          mastery_band: avgScore >= 85 ? 'strong' : avgScore < 60 ? 'weak' : 'developing',
          last_issues: weakTopics.length > 0 ? [`Weak areas: ${weakTopics.join(', ')}`] : [],
          updated_at: recentAttempts[0]?.created_at || null,
        }
      }
    } catch {
      // Normalized adaptive tables may not exist yet.
    }

    if (!adaptive) {
    try {
      const parsed = studyset?.source_bundle ? JSON.parse(studyset.source_bundle) : null
      const runtimeAdaptive = parsed?.runtime?.adaptive
      if (runtimeAdaptive && typeof runtimeAdaptive === 'object') {
        adaptive = {
          avg_score: Number(runtimeAdaptive.avg_score || 0),
          mastery_band: String(runtimeAdaptive.mastery_band || ''),
          last_issues: Array.isArray(runtimeAdaptive.last_issues) ? runtimeAdaptive.last_issues : [],
          updated_at: runtimeAdaptive.updated_at || null,
        }
      }
    } catch {}
    }

    return NextResponse.json({
      studyset,
      days,
      adaptive,
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
