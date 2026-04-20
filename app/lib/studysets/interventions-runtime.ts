export async function resolvePendingInterventionsForTask(input: {
  supabase: any
  userId: string
  studysetId: string
  taskId: string
}) {
  const { supabase, userId, studysetId, taskId } = input
  const taskKey = String(taskId || '').trim()
  if (!taskKey) return { updated: 0 }

  const { data, error } = await (supabase as any)
    .from('studyset_intervention_queue')
    .update({
      status: 'done',
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('studyset_id', studysetId)
    .eq('studyset_task_id', taskKey)
    .eq('status', 'pending')
    .select('id')

  if (error) throw error
  return {
    updated: Array.isArray(data) ? data.length : 0,
  }
}

