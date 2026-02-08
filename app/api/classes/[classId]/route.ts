import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

// GET a specific class's public info
export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  const resolvedParams = await params;
  const classId = resolvedParams.classId;
  const cookieStore = await cookies()
  // No need for admin client here, public info is fine
  const supabase = createServerClient(
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
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  let selectFields = 'id, name, description';

  // If user is authenticated, check if they're the owner or member and include join_code
  if (user) {
    const { data: ownershipData } = await supabase
      .from('classes')
      .select('owner_id')
      .eq('id', classId)
      .single();

    const isOwner = ownershipData?.owner_id === user.id;

    if (!isOwner) {
      // Check if user is a member
      const { data: memberData } = await supabase
        .from('class_members')
        .select()
        .eq('class_id', classId)
        .eq('user_id', user.id)
        .single();

      if (memberData) {
        // User is a member, include join_code
        selectFields += ', join_code';
      }
    } else {
      // User is owner, include join_code
      selectFields += ', join_code';
    }
  }

  const { data: classData, error } = await supabase
    .from('classes')
    .select(selectFields)
    .eq('id', classId)
    .single();

  if (error) {
    console.error(`Error fetching class ${classId}:`, error);
    return NextResponse.json({ error: 'Class not found.' }, { status: 404 });
  }

  return NextResponse.json({ class: classData });
}

// DELETE - Archive a class (set status to 'archived')
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
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is the owner of the class
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('owner_id')
    .eq('id', classId)
    .single();

  if (classError || !classData) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }

  if (classData.owner_id !== user.id) {
    return NextResponse.json({ error: 'Only the class owner can archive this class' }, { status: 403 });
  }

  // Archive the class by setting status to 'archived'
  const { error: updateError } = await supabase
    .from('classes')
    .update({ status: 'archived' })
    .eq('id', classId);

  if (updateError) {
    console.error('Error archiving class:', updateError);
    return NextResponse.json({ error: 'Failed to archive class' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Class archived successfully' });
}
