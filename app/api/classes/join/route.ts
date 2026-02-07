import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Join code is required' }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);

  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('id, name, description, user_id')
    .eq('join_code', code)
    .single();

  if (classError || !classData) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }

  return NextResponse.json(classData);
}

// POST to join a class
export async function POST(request: Request) {
  const { class_code } = await request.json();
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Verify class exists with the join code
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('id, user_id, owner_id, name, description')
    .eq('join_code', class_code)
    .single();
  
  if (classError || !classData) {
    return NextResponse.json({ error: 'Class not found. Please check the code and try again.' }, { status: 404 });
  }

  // 2. Check if user is the owner (can't join their own class as a student)
  // Check both owner_id and user_id since either could identify the owner
  const isOwner = classData.user_id === user.id || (classData as any).owner_id === user.id;
  if (isOwner) {
    return NextResponse.json({ error: 'You are the owner of this class and cannot join it as a student.' }, { status: 400 });
  }

  // 3. Check if user is already a member
  const { data: memberData, error: memberError } = await supabase
    .from('class_members')
    .select()
    .eq('class_id', classData.id)
    .eq('user_id', user.id)
    .single();
    
  if (memberData) {
    return NextResponse.json({ error: 'You are already a member of this class.' }, { status: 400 });
  }

  // 4. Insert into class_members table
  const { error: insertError } = await supabase
    .from('class_members')
    .insert([
      { class_id: classData.id, user_id: user.id, role: 'student' },
    ]);

  if (insertError) {
    console.error('Error joining class:', insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json({ message: 'Successfully joined class', class: classData });
}
