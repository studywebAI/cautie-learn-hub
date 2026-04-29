import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { getIdeasRole } from '../../../_shared'

const ALLOWED_STATUS = new Set(['draft', 'open', 'closed', 'archived'])

export async function POST(
  request: Request,
  { params }: { params: Promise<{ pollId: string }> }
) {
  try {
    const supabase = await createClient(cookies())
    const { userId, canManagePolls } = await getIdeasRole()
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (!canManagePolls) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { pollId } = await params
    const body = await request.json().catch(() => ({}))
    const status = String(body?.status || '').trim()
    if (!ALLOWED_STATUS.has(status)) {
      return NextResponse.json({ error: 'Invalid poll status' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('ideas_board_polls')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', pollId)
      .select('id, status')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ poll: data })
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 })
  }
}

