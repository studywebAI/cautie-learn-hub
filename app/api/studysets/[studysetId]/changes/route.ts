import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Combines two real, already-existing data sources into one chronological
// change history for a studyset:
//  - `audit_logs` — manual edits the user made (rename, re-color, archive, …),
//    written by the PATCH/DELETE handlers on /api/studysets/[studysetId]
//  - `studyset_intervention_queue` — AI-driven auto-optimizations the adaptive
//    engine proposed, with a `reason` explaining *why* (and apply/dismiss state)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ studysetId: string }> }
) {
  try {
    const { studysetId } = await params
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: existing, error: fetchError } = await (supabase as any)
      .from('studysets')
      .select('id, name')
      .eq('id', studysetId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 })
    if (!existing) return NextResponse.json({ error: 'Studyset not found' }, { status: 404 })

    const [auditRes, interventionRes] = await Promise.all([
      (supabase as any)
        .from('audit_logs')
        .select('id, action, changes, metadata, created_at')
        .eq('entity_type', 'studyset')
        .eq('entity_id', studysetId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(80),
      (supabase as any)
        .from('studyset_intervention_queue')
        .select('id, kind, tool_key, title, reason, priority, status, due_date, origin, created_at, updated_at')
        .eq('studyset_id', studysetId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(80),
    ])

    if (auditRes?.error) return NextResponse.json({ error: auditRes.error.message }, { status: 500 })
    if (interventionRes?.error) return NextResponse.json({ error: interventionRes.error.message }, { status: 500 })

    const manual = Array.isArray(auditRes?.data)
      ? auditRes.data.map((row: any) => ({
          id: String(row.id),
          type: 'manual' as const,
          action: String(row.action || ''),
          changes: row.changes || null,
          metadata: row.metadata || null,
          created_at: row.created_at,
        }))
      : []

    const ai = Array.isArray(interventionRes?.data)
      ? interventionRes.data.map((row: any) => ({
          id: String(row.id),
          type: 'ai' as const,
          kind: String(row.kind || ''),
          tool_key: row.tool_key || null,
          title: String(row.title || ''),
          reason: String(row.reason || ''),
          priority: Number(row.priority || 0),
          status: String(row.status || 'pending'),
          due_date: row.due_date || null,
          origin: row.origin || 'adaptive_engine',
          created_at: row.created_at,
          updated_at: row.updated_at,
        }))
      : []

    const timeline = [...manual, ...ai].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )

    return NextResponse.json({
      success: true,
      studyset: { id: existing.id, name: existing.name },
      timeline,
      manual_count: manual.length,
      ai_count: ai.length,
      ai_pending_count: ai.filter((item: { status: string }) => item.status === 'pending').length,
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
