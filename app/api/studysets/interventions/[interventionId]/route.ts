import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ interventionId: string }> }
) {
  try {
    const { interventionId } = await params
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const nextStatus = String(body?.status || '').toLowerCase()
    if (!['pending', 'done', 'dismissed'].includes(nextStatus)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const { data: row, error: rowError } = await (supabase as any)
      .from('studyset_intervention_queue')
      .select('id, user_id, studyset_id, status')
      .eq('id', interventionId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (rowError) return NextResponse.json({ error: rowError.message }, { status: 500 })
    if (!row) return NextResponse.json({ error: 'Intervention not found' }, { status: 404 })

    const { error: updateError } = await (supabase as any)
      .from('studyset_intervention_queue')
      .update({
        status: nextStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', interventionId)
      .eq('user_id', user.id)

    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      intervention_id: interventionId,
      status: nextStatus,
    })
  } catch (error) {
    console.error('studyset intervention PATCH failed', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
