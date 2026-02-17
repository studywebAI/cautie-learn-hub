import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import type { Database } from '@/lib/supabase/database.types'
import { getClassPermission, logAuditEntry } from '@/lib/auth/class-permissions'

export const dynamic = 'force-dynamic'

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

  return NextResponse.json({ class: classData });
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
