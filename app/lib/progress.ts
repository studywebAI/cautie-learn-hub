import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function updateProgressSnapshot(paragraphId: string, studentId: string) {
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  // Get all assignments in paragraph
  const { data: assignments } = await supabase
    .from('assignments')
    .select('id')
    .eq('paragraph_id', paragraphId)

  if (!assignments) return 0

  const assignmentIds = assignments.map(a => a.id)

  // Get total blocks
  const { count: totalBlocks } = await supabase
    .from('blocks')
    .select('*', { count: 'exact', head: true })
    .in('assignment_id', assignmentIds)

  // Get student answers with score > 0
  const { count: completedBlocks } = await supabase
    .from('student_answers')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', studentId)
    .in('blocks.assignment_id', assignmentIds)
    .gt('score', 0)

  const completionPercent = totalBlocks && totalBlocks > 0 ? Math.round(((completedBlocks || 0) / totalBlocks) * 100) : 0

  // Upsert progress snapshot
  await supabase
    .from('progress_snapshots')
    .upsert({
      student_id: studentId,
      paragraph_id: paragraphId,
      completion_percent: completionPercent,
      updated_at: new Date().toISOString()
    })

  return completionPercent
}