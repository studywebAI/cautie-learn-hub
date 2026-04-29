import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getIdeasRole } from '../../_shared'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ ideaId: string }> }
) {
  try {
    const supabase = await createClient(cookies())
    const { userId, canManagePolls } = await getIdeasRole()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canManagePolls) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { ideaId } = await params
    const { data, error } = await supabase
      .from('ideas_board_items')
      .update({
        lifecycle_stage: 'candidate',
        promoted_to_candidate_by: userId,
        promoted_to_candidate_at: new Date().toISOString(),
      })
      .eq('id', ideaId)
      .select('id, lifecycle_stage')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ idea: data })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}
