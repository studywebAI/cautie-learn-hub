import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getIdeasRole } from '../../_shared'

const ALLOWED_STAGES = new Set(['submitted', 'candidate', 'planned', 'rejected', 'shipped'])

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ideaId: string }> }
) {
  try {
    const supabase = await createClient(cookies())
    const { userId, canManagePolls } = await getIdeasRole()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canManagePolls) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { ideaId } = await params
    const body = await request.json().catch(() => ({}))
    const lifecycleStage = String(body?.lifecycleStage || '').trim()
    if (!ALLOWED_STAGES.has(lifecycleStage)) {
      return NextResponse.json({ error: 'Invalid lifecycle stage' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('ideas_board_items')
      .update({
        lifecycle_stage: lifecycleStage,
        status:
          lifecycleStage === 'shipped'
            ? 'shipped'
            : lifecycleStage === 'planned'
              ? 'planned'
              : 'open',
        updated_at: new Date().toISOString(),
      })
      .eq('id', ideaId)
      .select('id, lifecycle_stage, status')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ idea: data })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

