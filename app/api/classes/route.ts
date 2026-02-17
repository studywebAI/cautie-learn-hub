import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { createClassSchema } from '@/lib/validation/schemas'
import { validateBody } from '@/lib/validation/validate'

import type { Database } from '@/lib/supabase/database.types'
import { logAuditEntry } from '@/lib/auth/class-permissions'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      if (authError.message.includes('User from sub claim in JWT does not exist')) {
        return NextResponse.json({ error: 'Session expired or invalid', code: 'SESSION_INVALID' }, { status: 401 });
      }
      return NextResponse.json({ error: 'Authentication failed', details: authError.message }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get('guestId');
    const includeArchived = searchParams.get('includeArchived') === 'true';

    if (!user && !guestId) {
      return NextResponse.json([]);
    }

    let allClasses: any[] = [];

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      if (!profile) {
        await supabase.from('profiles').insert({
          id: user.id,
          role: 'student',
          full_name: user.user_metadata?.full_name || '',
          avatar_url: user.user_metadata?.avatar_url || null
        });
      }

      const userRole = profile?.role || 'student';
      const isTeacher = userRole === 'teacher';

      if (isTeacher) {
        // TEACHERS: See ALL classes they are a member of (as teacher role)
        // No more owner_id check - teachers are equal members
        const { data: memberClasses, error: memberError } = await supabase
          .from('class_members')
          .select('classes(*)')
          .eq('user_id', user.id)
          .eq('role', 'teacher');

        if (memberError) {
          return NextResponse.json({ error: memberError.message }, { status: 500 });
        }

        let teacherClasses = memberClasses?.map((m: any) => m.classes).filter(Boolean) || [];

        // Also include legacy owned classes (backward compatibility)
        const { data: ownedClasses } = await supabase
          .from('classes')
          .select('*')
          .eq('owner_id', user.id);

        // Merge and deduplicate
        const allTeacherClasses = [...teacherClasses, ...(ownedClasses || [])];
        const uniqueMap = new Map(allTeacherClasses.map(c => [c.id, c]));
        allClasses = Array.from(uniqueMap.values());

        if (!includeArchived) {
          allClasses = allClasses.filter(c => !c.status || c.status !== 'archived');
        }
      } else {
        // STUDENTS: Only see classes they're members of
        const { data: memberClassesData, error: memberError } = await supabase
          .from('class_members')
          .select('classes(*)')
          .eq('user_id', user.id);

        if (memberError) {
          return NextResponse.json({ error: memberError.message }, { status: 500 });
        }

        allClasses = memberClassesData?.map((member: any) => member.classes).filter(Boolean) || [];
      }

      return NextResponse.json(allClasses);
    } else if (guestId) {
      return NextResponse.json([]);
    } else {
      return NextResponse.json([]);
    }
  } catch (err) {
    console.error('GET /api/classes error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const validation = await validateBody(request, createClassSchema);
    if ('error' in validation) {
      return validation.error;
    }
    const { name, description } = validation.data;

    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is a teacher
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile || profile.role !== 'teacher') {
      return NextResponse.json({ error: 'Only teachers can create classes' }, { status: 403 });
    }

    // Generate join codes
    const { data: joinCode } = await supabase.rpc('generate_join_code');
    const { data: teacherJoinCode } = await supabase.rpc('generate_teacher_join_code');

    if (!joinCode) {
      return NextResponse.json({ error: 'Failed to generate join code' }, { status: 500 });
    }

    // Create class - owner_id is kept for legacy compatibility but doesn't grant special powers
    const insertData = {
      name,
      description,
      join_code: joinCode,
      teacher_join_code: teacherJoinCode || null,
      owner_id: user.id  // legacy: just records who created it
    };

    const { data, error } = await supabase
      .from('classes')
      .insert([insertData])
      .select('id, name, description, join_code, teacher_join_code')
      .single();

    if (error) {
      console.error('Class creation failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Auto-add the creator as a teacher member
    await supabase
      .from('class_members')
      .insert({ class_id: data.id, user_id: user.id, role: 'teacher' });

    // Log audit entry
    await logAuditEntry(supabase, {
      userId: user.id,
      classId: data.id,
      action: 'create',
      entityType: 'class',
      entityId: data.id,
      changes: { name, description }
    });

    return NextResponse.json(data);
  } catch (err) {
    console.error('POST /api/classes error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
