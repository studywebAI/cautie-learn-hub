import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

// GET a specific material with its content
export async function GET(
  request: Request,
  { params }: { params: Promise<{ materialId: string }> }
) {
  const resolvedParams = await params;
  const materialId = resolvedParams.materialId;
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options)
        },
        remove(name: string, options: any) {
          cookieStore.set(name, '', { ...options, maxAge: 0 })
        }
      }
    }
  )

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: material, error } = await supabase
    .from('materials')
    .select('*')
    .eq('id', materialId)
    .single();

  if (error || !material) {
    return NextResponse.json({ error: 'Material not found' }, { status: 404 });
  }

  // Security Check:
  // - Class material: user must be class owner or member
  // - Personal material (no class_id): user must be the owner
  if (!material.class_id) {
    const ownerId = (material as any).user_id as string | null | undefined;
    if (!ownerId || ownerId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  } else {
    const classId = material.class_id as string;

    const { data: classData, error: classError } = await supabase
      .from('classes')
      .select('owner_id')
      .eq('id', classId)
      .single();

    if (classError || !classData) {
      return NextResponse.json({ error: 'Class not found for material' }, { status: 404 });
    }

    let isMemberOrOwner = classData.owner_id === session.user.id;

    if (!isMemberOrOwner) {
      const { count } = await supabase
        .from('class_members')
        .select('*', { count: 'exact', head: true })
        .eq('class_id', classId)
        .eq('user_id', session.user.id);

      if (count && count > 0) {
        isMemberOrOwner = true;
      }
    }

    if (!isMemberOrOwner) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  let content = material.content;

  if (material.type === 'NOTE' && material.content_id) {
    const { data: noteContent, error: contentError } = await (supabase as any)
      .from('notes')
      .select('content')
      .eq('id', material.content_id)
      .single();
    if (!contentError && noteContent) {
      content = noteContent.content;
    }
  }
  
  return NextResponse.json({ ...material, content });
}

// DELETE a material
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ materialId: string }> }
) {
  const resolvedParams = await params;
  const materialId = resolvedParams.materialId;
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          cookieStore.set(name, value, options)
        },
        remove(name: string, options: any) {
          cookieStore.set(name, '', { ...options, maxAge: 0 })
        }
      }
    }
  )

   const { data: { user } } = await supabase.auth.getUser();
   if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
   }

   const { data: material, error: fetchError } = await supabase
    .from('materials')
     .select('class_id, user_id, content_id, type')
    .eq('id', materialId)
    .single();

   if (fetchError || !material) {
     return NextResponse.json({ error: 'Material not found' }, { status: 404 });
   }

    // Security check:
    // - Class material: user must be class owner
    // - Personal material (no class_id): user must be the owner
    if (!material.class_id) {
      const ownerId = (material as any).user_id as string | null | undefined;
      if (!ownerId || ownerId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else {
      const classId = material.class_id as string;
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('owner_id')
        .eq('id', classId)
        .single();

      if (classError || !classData || classData.owner_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

   // Also delete the associated content (e.g., the note) before deleting the material
   if (material.type === 'NOTE' && material.content_id) {
    await (supabase as any).from('notes').delete().eq('id', material.content_id);
   }

   // Delete the material entry
   const { error: deleteMaterialError } = await supabase
    .from('materials')
    .delete()
    .eq('id', materialId);
    
   if (deleteMaterialError) {
    return NextResponse.json({ error: deleteMaterialError.message }, { status: 500 });
   }

   return NextResponse.json({ message: 'Material deleted successfully' });
}
