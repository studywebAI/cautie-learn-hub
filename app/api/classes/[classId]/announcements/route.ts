import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

// GET all announcements for a specific class
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

  // Security check: Ensure the requesting user is a member of the class
  // (owner_id column was removed - all teachers are equal via class_members)
  
  // Get user's subscription_type to check if they're a teacher
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('subscription_type')
    .eq('id', session.user.id)
    .single();

  const isTeacher = userProfile?.subscription_type === 'teacher';

  // Also check if user is a member of this class
  const { data: memberData } = await supabase
    .from('class_members')
    .select('user_id')
    .eq('class_id', classId)
    .eq('user_id', session.user.id)
    .maybeSingle();

  const isMember = !!memberData;

  // Teachers who are members of the class can view announcements
  if (!isMember || !isTeacher) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Fetch announcements
  const { data: announcements, error: announcementsError } = await (supabase as any)
    .from('announcements')
    .select(`
      id,
      title,
      content,
      created_at,
      created_by,
      profiles!announcements_created_by_fkey (
        full_name,
        avatar_url
      )
    `)
    .eq('class_id', classId)
    .order('created_at', { ascending: false });

  if (announcementsError) {
    return NextResponse.json({ error: announcementsError.message }, { status: 500 });
  }

  return NextResponse.json(announcements);
}

// POST create a new announcement
export async function POST(
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
  )

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Security check: Ensure the requesting user is a teacher who is a member of the class
  // (owner_id column was removed - all teachers are equal via class_members)
  
  // Get user's subscription_type to check if they're a teacher
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('subscription_type')
    .eq('id', session.user.id)
    .single();

  const isTeacher = userProfile?.subscription_type === 'teacher';

  // Also check if user is a member of this class
  const { data: memberData } = await supabase
    .from('class_members')
    .select('user_id')
    .eq('class_id', classId)
    .eq('user_id', session.user.id)
    .maybeSingle();

  const isMember = !!memberData;

  // Teachers who are members of the class can create announcements
  if (!isMember || !isTeacher) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { title, content } = await request.json();

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  const { data: announcement, error: insertError } = await (supabase as any)
    .from('announcements')
    .insert({
      class_id: classId,
      title,
      content,
      created_by: session.user.id
    })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(announcement);
}
