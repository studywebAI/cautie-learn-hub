import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const classId = searchParams.get('classId');
    const limit = parseInt(searchParams.get('limit') || '50');

    let query = supabase
      .from('materials')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(limit);

    // If classId is provided, filter by class (for teachers viewing class materials)
    if (classId) {
      // First check if user is teacher or member of the class
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('user_id')
        .eq('id', classId)
        .single();

      if (classError || !classData) {
        return NextResponse.json({ error: 'Class not found' }, { status: 404 });
      }

      const isTeacher = classData.user_id === user.id;

      if (!isTeacher) {
        // Check if user is a member of the class
        const { data: memberData, error: memberError } = await supabase
          .from('class_members')
          .select()
          .eq('class_id', classId)
          .eq('user_id', user.id)
          .single();

        if (memberError || !memberData) {
          return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
      }

      // Filter materials by class_id
      query = query.eq('class_id', classId);
    } else {
      // Default: show user's own materials
      query = query.eq('user_id', user.id);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching materials:', error);
      return NextResponse.json({ error: 'Failed to fetch materials' }, { status: 500 });
    }

    return NextResponse.json({ materials: data });
  } catch (error) {
    console.error('Materials GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { type, title, description, content, source_text, metadata, tags, is_public } = body;

    const { data, error } = await supabase
      .from('materials')
      .insert({
        user_id: user.id,
        type,
        title,
        description,
        content,
        source_text,
        metadata,
        tags,
        is_public: is_public || false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving material:', error);
      return NextResponse.json({ error: 'Failed to save material' }, { status: 500 });
    }

    return NextResponse.json({ material: data });
  } catch (error) {
    console.error('Materials POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
