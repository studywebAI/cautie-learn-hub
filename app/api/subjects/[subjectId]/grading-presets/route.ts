import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { userHasSubjectAccess } from '@/lib/auth/subject-permissions'

// Mirrors app/api/classes/[classId]/grading-presets/route.ts, keyed on
// subject_id instead of class_id.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params
    const supabase = await createClient(cookies())
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasAccess = await userHasSubjectAccess(supabase as any, user.id, subjectId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('class_grading_presets')
      .select('*')
      .eq('subject_id', subjectId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ presets: data || [] })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params
    const supabase = await createClient(cookies())
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasAccess = await userHasSubjectAccess(supabase as any, user.id, subjectId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { name, kind, config, is_default } = body
    const allowedKinds = new Set(['freeform', 'numeric_range', 'letter_scale'])

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ error: 'Preset name is required' }, { status: 400 })
    }
    if (!allowedKinds.has(kind)) {
      return NextResponse.json({ error: 'Invalid preset kind' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('class_grading_presets')
      .insert({
        subject_id: subjectId,
        name: name.trim(),
        kind,
        config: config || {},
        is_default: !!is_default,
        created_by: user.id
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ preset: data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params
    const supabase = await createClient(cookies())
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const hasAccess = await userHasSubjectAccess(supabase as any, user.id, subjectId)
    if (!hasAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { preset_id, name, kind, config, is_default } = body
    const allowedKinds = new Set(['freeform', 'numeric_range', 'letter_scale'])

    if (!preset_id || typeof preset_id !== 'string') {
      return NextResponse.json({ error: 'preset_id is required' }, { status: 400 })
    }
    if (kind !== undefined && !allowedKinds.has(kind)) {
      return NextResponse.json({ error: 'Invalid preset kind' }, { status: 400 })
    }

    const updatePayload: any = {}
    if (name !== undefined) updatePayload.name = String(name).trim()
    if (kind !== undefined) updatePayload.kind = kind
    if (config !== undefined) updatePayload.config = config
    if (is_default !== undefined) updatePayload.is_default = !!is_default

    const { data, error } = await supabase
      .from('class_grading_presets')
      .update(updatePayload)
      .eq('id', preset_id)
      .eq('subject_id', subjectId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ preset: data })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
