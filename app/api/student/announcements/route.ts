import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SECRET_KEY || ''
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

    // Get current user from session/auth (assumes middleware sets user context)
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ announcements: [] }, { status: 200 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ announcements: [] }, { status: 200 });
    }

    // Query announcements from classes where student is enrolled
    // Join: announcements -> classes -> class_members (where user_id = current_user)
    const { data: announcements, error } = await supabase
      .from('announcements')
      .select(`
        id,
        title,
        content,
        created_at,
        created_by,
        class_id,
        classes!inner(id, name),
        profiles!created_by(full_name, avatar_url)
      `)
      .in('class_id',
        // First get all classes where user is enrolled
        (await supabase
          .from('class_members')
          .select('class_id')
          .eq('user_id', user.id))
          .data?.map(m => m.class_id) || []
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Announcements fetch error:', error);
      return NextResponse.json({ announcements: [] }, { status: 200 });
    }

    return NextResponse.json({
      announcements: announcements || []
    });
  } catch (error) {
    console.error('Announcements route error:', error);
    return NextResponse.json({ announcements: [] }, { status: 200 });
  }
}
