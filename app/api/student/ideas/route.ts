import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

interface IdeaSubmission {
  id: string;
  title: string;
  content: string;
  created_at: string;
  status: 'submitted' | 'reviewing' | 'approved' | 'rejected';
}

// GET all ideas submitted by student
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ ideas: [] }, { status: 200 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ ideas: [] }, { status: 200 });
    }

    const { data: ideas, error } = await supabase
      .from('student_ideas')
      .select('id, title, content, created_at, status')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Ideas fetch error:', error);
      return NextResponse.json({ ideas: [] }, { status: 200 });
    }

    return NextResponse.json({ ideas: ideas || [] });
  } catch (error) {
    console.error('Ideas GET error:', error);
    return NextResponse.json({ ideas: [] }, { status: 200 });
  }
}

// POST: Submit a new idea
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { title, content } = await req.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: 'title and content are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('student_ideas')
      .insert({
        user_id: user.id,
        title: title.trim(),
        content: content.trim(),
        status: 'submitted',
        created_at: new Date().toISOString(),
      })
      .select('id, title, content, created_at, status')
      .single();

    if (error) {
      console.error('Idea submission error:', error);
      return NextResponse.json({ error: 'Failed to submit idea' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      idea: data,
    });
  } catch (error) {
    console.error('Ideas POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
