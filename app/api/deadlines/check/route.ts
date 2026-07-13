import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// Fires a "due tomorrow" reminder once per item, and a separate "overdue"
// notice once per item, for the current user's personal tasks and class
// assignments. Self-scoped, polled periodically from the client while the
// app is open — same pattern as /api/scheduled-items/check.
export async function GET() {
  const cookieStore = await cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ fired: 0 })
  }

  const now = new Date()
  const todayStr = now.toISOString().slice(0, 10)
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().slice(0, 10)

  // Candidates: the user's own personal tasks, due tomorrow or already overdue.
  const { data: personalTasks } = await (supabase as any)
    .from('personal_tasks')
    .select('id, title, due_date, status')
    .eq('user_id', user.id)
    .not('status', 'in', '(completed,cancelled)')
    .lte('due_date', tomorrowStr)

  // Candidates: assignments in classes the user is a student member of.
  const { data: memberships } = await (supabase as any)
    .from('class_members')
    .select('class_id, role')
    .eq('user_id', user.id)
  const classIds = (memberships || [])
    .filter((m: any) => String(m.role || '').toLowerCase() === 'student')
    .map((m: any) => m.class_id)

  let assignments: any[] = []
  if (classIds.length > 0) {
    const { data } = await (supabase as any)
      .from('assignments')
      .select('id, title, due_date, class_id')
      .in('class_id', classIds)
      .lte('due_date', tomorrowStr)
    assignments = data || []
  }

  type Candidate = { id: string; title: string; due_date: string };
  const dueTomorrow: Candidate[] = [];
  const overdue: Candidate[] = [];

  for (const item of [...(personalTasks || []), ...assignments]) {
    if (!item.due_date) continue;
    const dueDateStr = String(item.due_date).slice(0, 10);
    if (dueDateStr === tomorrowStr) dueTomorrow.push(item);
    else if (dueDateStr < todayStr) overdue.push(item);
  }

  if (dueTomorrow.length === 0 && overdue.length === 0) {
    return NextResponse.json({ fired: 0 })
  }

  // Dedupe: only fire once per item per notification type.
  const { data: existing } = await (supabase as any)
    .from('notifications')
    .select('type, data')
    .eq('user_id', user.id)
    .in('type', ['deadline_reminder', 'deadline_overdue'])
    .limit(500)

  const alreadyNotified = new Set(
    (existing || []).map((n: any) => `${n.type}:${n.data?.item_id}`)
  )

  const rows: any[] = []
  for (const item of dueTomorrow) {
    const key = `deadline_reminder:${item.id}`
    if (alreadyNotified.has(key)) continue
    rows.push({
      user_id: user.id,
      type: 'deadline_reminder',
      title: `Due tomorrow: ${item.title}`,
      message: 'This is due tomorrow — make sure it\'s ready.',
      data: { item_id: item.id },
    })
  }
  for (const item of overdue) {
    const key = `deadline_overdue:${item.id}`
    if (alreadyNotified.has(key)) continue
    rows.push({
      user_id: user.id,
      type: 'deadline_overdue',
      title: `Overdue: ${item.title}`,
      message: 'This was due and hasn\'t been marked done yet.',
      data: { item_id: item.id },
    })
  }

  if (rows.length === 0) {
    return NextResponse.json({ fired: 0 })
  }

  await (supabase as any).from('notifications').insert(rows)

  return NextResponse.json({ fired: rows.length })
}
