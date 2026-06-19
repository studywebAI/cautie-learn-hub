import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verifyStudysetShareToken } from '@/lib/studysets/share-token'

export const dynamic = 'force-dynamic'

// GET /api/share/studyset?token=xxx — public, no auth required
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 })

    const payload = verifyStudysetShareToken(token)
    if (!payload) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })

    const supabase = createAdminClient()

    const { data: studyset, error } = await (supabase as any)
      .from('studysets')
      .select('id, name, subject, description, exam_date, status, created_at')
      .eq('id', payload.studysetId)
      .eq('user_id', payload.ownerUserId)
      .maybeSingle()

    if (error || !studyset) return NextResponse.json({ error: 'Studyset not found' }, { status: 404 })

    // Get plan overview
    const { data: dayRows } = await (supabase as any)
      .from('studyset_plan_days')
      .select(`
        id, day_number, plan_date, summary, estimated_minutes,
        studyset_plan_tasks ( id, title, task_type, position )
      `)
      .eq('studyset_id', payload.studysetId)
      .order('day_number', { ascending: true })

    const days = Array.isArray(dayRows) ? dayRows : []
    const taskCount = days.reduce((sum: number, d: any) =>
      sum + (Array.isArray(d.studyset_plan_tasks) ? d.studyset_plan_tasks.length : 0), 0)

    return NextResponse.json({
      studyset: {
        id: studyset.id,
        name: studyset.name,
        subject: studyset.subject || null,
        description: studyset.description || null,
        exam_date: studyset.exam_date || null,
        day_count: days.length,
        task_count: taskCount,
        created_at: studyset.created_at,
      },
      days: days.map((d: any) => ({
        day_number: d.day_number,
        plan_date: d.plan_date,
        summary: d.summary,
        estimated_minutes: d.estimated_minutes,
        tasks: (Array.isArray(d.studyset_plan_tasks) ? d.studyset_plan_tasks : [])
          .sort((a: any, b: any) => Number(a.position || 0) - Number(b.position || 0))
          .map((t: any) => ({ title: t.title, task_type: t.task_type })),
      })),
    })
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
