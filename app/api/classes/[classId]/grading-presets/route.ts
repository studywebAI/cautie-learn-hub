import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

async function ensureTeacherMember(supabase: any, classId: string, userId: string) {
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('subscription_type')
    .eq('id', userId)
    .single()

  const isTeacher = userProfile?.subscription_type === 'teacher'

  const { data: classMember } = await supabase
    .from('class_members')
    .select('user_id')
    .eq('class_id', classId)
    .eq('user_id', userId)
    .maybeSingle()

  return !!isTeacher && !!classMember
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const supabase = await createClient(cookies())
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: classMember } = await supabase
      .from('class_members')
      .select('user_id')
      .eq('class_id', classId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (!classMember) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data, error } = await supabase
      .from('class_grading_presets')
      .select('*')
      .eq('class_id', classId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ presets: data || [] })
  } catch (error) {
    console.error('Error loading grading presets:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const supabase = await createClient(cookies())
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowed = await ensureTeacherMember(supabase, classId, user.id)
    if (!allowed) {
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
        class_id: classId,
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
    console.error('Error creating grading preset:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params
    const supabase = await createClient(cookies())
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const allowed = await ensureTeacherMember(supabase, classId, user.id)
    if (!allowed) {
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
      .eq('class_id', classId)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ preset: data })
  } catch (error) {
    console.error('Error updating grading preset:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

