import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ classId: string }> }
) {
  try {
    const { classId } = await params;
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);

    // Get class members
    const { data: members, error: membersError } = await supabase
      .from('class_members')
      .select('user_id, role')
      .eq('class_id', classId);

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    // Filter for students (not teachers)
    const studentUserIds = (members || [])
      .filter((m: any) => {
        const role = String(m?.role || '').toLowerCase();
        return role === 'student' || role === '' || role === null;
      })
      .map((m: any) => m.user_id);

    if (studentUserIds.length === 0) {
      return NextResponse.json({ students: [] });
    }

    // Get student profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, avatar_url')
      .in('id', studentUserIds)
      .order('full_name');

    if (profilesError) {
      return NextResponse.json({ error: profilesError.message }, { status: 500 });
    }

    return NextResponse.json({ students: profiles || [] });
  } catch (error: any) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
