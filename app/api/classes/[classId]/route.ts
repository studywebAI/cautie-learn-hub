import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import type { Database } from '@/lib/supabase/database.types'
import { getClassPermission, logAuditEntry } from '@/lib/auth/class-permissions'

export const dynamic = 'force-dynamic'

const DEFAULT_CLASS_PREFERENCES = {
  default_subject_view: 'mine',
  grades_default_scale: 'both',
  grades_show_class_average: true,
  attendance_require_confirmation: true,
  invite_allow_teacher_invites: true,
}

const normalizePreferences = (raw: any) => ({
  default_subject_view: raw?.default_subject_view === 'all' ? 'all' : 'mine',
  grades_default_scale:
    raw?.grades_default_scale === 'a_f' || raw?.grades_default_scale === 'one_to_ten'
      ? raw.grades_default_scale
      : 'both',
  grades_show_class_average: raw?.grades_show_class_average !== false,
  attendance_require_confirmation: raw?.attendance_require_confirmation !== false,
  invite_allow_teacher_invites: raw?.invite_allow_teacher_invites !== false,
})

// GET a specific class's public info
export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const resolvedParams = await params;
  const classId = resolvedParams.classId;
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: any) { cookieStore.set(name, value, options) },
        remove(name: string, options: any) { cookieStore.set(name, '', { ...options, maxAge: 0 }) }
      }
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  let selectFields = 'id, name, description';

  if (user) {
    const perm = await getClassPermission(supabase, classId, user.id);
    if (perm.isMember) {
      selectFields += ', join_code';
      // Teachers can also see the teacher_join_code
      if (perm.isTeacher) {
        selectFields += ', teacher_join_code';
      }
    }
  }

  const { data: classData, error } = await supabase
    .from('classes')
    .select(selectFields)
    .eq('id', classId)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Class not found.' }, { status: 404 });
  }

  let preferences = DEFAULT_CLASS_PREFERENCES
  if (user) {
    const { data: prefRow } = await (supabase as any)
      .from('class_preferences')
      .select('default_subject_view, grades_default_scale, grades_show_class_average, attendance_require_confirmation, invite_allow_teacher_invites')
      .eq('class_id', classId)
      .maybeSingle()

    preferences = {
      ...DEFAULT_CLASS_PREFERENCES,
      ...normalizePreferences(prefRow || {}),
    }
  }

  return NextResponse.json({ class: classData, preferences });
}

// PATCH - Update class profile/settings (teachers only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const resolvedParams = await params;
  const classId = resolvedParams.classId;
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: any) { cookieStore.set(name, value, options) },
        remove(name: string, options: any) { cookieStore.set(name, '', { ...options, maxAge: 0 }) }
      }
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const perm = await getClassPermission(supabase, classId, user.id);
  if (!perm.isTeacher) {
    return NextResponse.json({ error: 'Only teachers can update class settings' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const action = String(body?.action || '');

  if (!action) {
    return NextResponse.json({ error: 'action is required' }, { status: 400 });
  }

  if (action === 'update_profile') {
    const nextName = String(body?.name || '').trim();
    const rawDescription = body?.description;
    const nextDescription = typeof rawDescription === 'string' ? rawDescription.trim() : '';

    if (!nextName || nextName.length < 2 || nextName.length > 120) {
      return NextResponse.json({ error: 'name must be between 2 and 120 characters' }, { status: 400 });
    }

    const { error: updateError } = await supabase
      .from('classes')
      .update({
        name: nextName,
        description: nextDescription || null,
      })
      .eq('id', classId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message || 'Failed to update class profile' }, { status: 500 });
    }

    await logAuditEntry(supabase, {
      userId: user.id,
      classId,
      action: 'update_profile',
      entityType: 'class',
      entityId: classId,
      changes: { name: nextName, description: nextDescription || null },
    });

    return NextResponse.json({ success: true });
  }

  if (action === 'regenerate_codes') {
    const { data: joinCode } = await (supabase as any).rpc('generate_join_code');
    const { data: teacherJoinCode } = await (supabase as any).rpc('generate_teacher_join_code');

    if (!joinCode || !teacherJoinCode) {
      return NextResponse.json({ error: 'Failed to generate new join codes' }, { status: 500 });
    }

    const { error: updateError } = await supabase
      .from('classes')
      .update({
        join_code: joinCode,
        teacher_join_code: teacherJoinCode,
      })
      .eq('id', classId);

    if (updateError) {
      return NextResponse.json({ error: updateError.message || 'Failed to update join codes' }, { status: 500 });
    }

    await logAuditEntry(supabase, {
      userId: user.id,
      classId,
      action: 'regenerate_invite_codes',
      entityType: 'class',
      entityId: classId,
    });

    return NextResponse.json({
      success: true,
      join_code: joinCode,
      teacher_join_code: teacherJoinCode,
    });
  }

  if (action === 'update_preferences') {
    const preferences = normalizePreferences(body?.preferences || {});

    const { error: upsertError } = await (supabase as any)
      .from('class_preferences')
      .upsert({
        class_id: classId,
        ...preferences,
        updated_by: user.id,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'class_id' });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message || 'Failed to update class preferences' }, { status: 500 });
    }

    await logAuditEntry(supabase, {
      userId: user.id,
      classId,
      action: 'update_preferences',
      entityType: 'class_settings',
      entityId: classId,
      changes: preferences,
    });

    return NextResponse.json({ success: true, preferences });
  }

  return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
}

// DELETE - Archive a class (any teacher can do this)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const resolvedParams = await params;
  const classId = resolvedParams.classId;
  const cookieStore = await cookies()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: any) { cookieStore.set(name, value, options) },
        remove(name: string, options: any) { cookieStore.set(name, '', { ...options, maxAge: 0 }) }
      }
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Any teacher in the class can archive it
  const perm = await getClassPermission(supabase, classId, user.id);
  if (!perm.isTeacher) {
    return NextResponse.json({ error: 'Only teachers can archive this class' }, { status: 403 });
  }

  const { error: updateError } = await supabase
    .from('classes')
    .update({ status: 'archived' })
    .eq('id', classId);

  if (updateError) {
    return NextResponse.json({ error: 'Failed to archive class' }, { status: 500 });
  }

  await logAuditEntry(supabase, {
    userId: user.id,
    classId,
    action: 'archive',
    entityType: 'class',
    entityId: classId
  });

  return NextResponse.json({ message: 'Class archived successfully' });
}
