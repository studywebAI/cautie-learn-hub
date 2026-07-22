import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

// Mirrors app/api/classes/[classId]/students/route.ts, keyed on
// subject_students instead of class_members.
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const { subjectId } = await params;
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);

    const { data: members, error: membersError } = await supabase
      .from('subject_students' as any)
      .select('student_id')
      .eq('subject_id', subjectId);

    if (membersError) {
      return NextResponse.json({ error: membersError.message }, { status: 500 });
    }

    const studentUserIds = (members || []).map((m: any) => m.student_id).filter(Boolean);
    if (studentUserIds.length === 0) {
      return NextResponse.json({ students: [] });
    }

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
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 });
  }
}
