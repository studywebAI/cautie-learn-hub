import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase/database.types'
import { getClassPermission, logAuditEntry } from '@/lib/auth/class-permissions'

export const dynamic = 'force-dynamic'

// GET a specific material with its content
export async function GET(
  request: Request,
  { params }: { params: Promise<{ materialId: string }> }
) {
  const resolvedParams = await params;
  const materialId = resolvedParams.materialId;
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
  )

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: material, error } = await supabase
    .from('materials')
    .select('*')
    .eq('id', materialId)
    .single();

  if (error || !material) return NextResponse.json({ error: 'Material not found' }, { status: 404 });

  // Security Check
  if (!material.class_id) {
    if ((material as any).user_id !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else {
    const perm = await getClassPermission(supabase, material.class_id as string, session.user.id);
    if (!perm.isMember) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let content = material.content;
  if (material.type === 'NOTE' && material.content_id) {
    const { data: noteContent } = await (supabase as any)
      .from('notes').select('content').eq('id', material.content_id).single();
    if (noteContent) content = noteContent.content;
  }
  
  return NextResponse.json({ ...material, content });
}

// DELETE a material (any teacher in the class can delete)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ materialId: string }> }
) {
  const resolvedParams = await params;
  const materialId = resolvedParams.materialId;
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
  )

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: material, error: fetchError } = await supabase
    .from('materials')
    .select('class_id, user_id, content_id, type')
    .eq('id', materialId)
    .single();

  if (fetchError || !material) return NextResponse.json({ error: 'Material not found' }, { status: 404 });

  // Security: personal material = owner only, class material = any teacher
  if (!material.class_id) {
    if ((material as any).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else {
    const perm = await getClassPermission(supabase, material.class_id as string, user.id);
    if (!perm.isTeacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (material.type === 'NOTE' && material.content_id) {
    await (supabase as any).from('notes').delete().eq('id', material.content_id);
  }

  const { error: deleteMaterialError } = await supabase
    .from('materials').delete().eq('id', materialId);

  if (deleteMaterialError) return NextResponse.json({ error: deleteMaterialError.message }, { status: 500 });

  if (material.class_id) {
    await logAuditEntry(supabase, {
      userId: user.id,
      classId: material.class_id as string,
      action: 'delete',
      entityType: 'material',
      entityId: materialId
    });
  }

  return NextResponse.json({ message: 'Material deleted successfully' });
}
