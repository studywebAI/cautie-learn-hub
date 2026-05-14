import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SECRET_KEY || ''
);

interface RecentItem {
  id: string;
  tool_type: 'quiz' | 'flashcard' | 'mindmap' | 'timeline' | 'note';
  title: string;
  created_at: string;
  icon: string;
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ recents: [] }, { status: 200 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ recents: [] }, { status: 200 });
    }

    // Query recent tool artifacts (quizzes, flashcards, mindmaps, timelines, notes)
    // Assuming tables: artifacts (type, title, created_at, created_by)
    const { data: artifacts, error } = await supabase
      .from('artifacts')
      .select('id, artifact_type:type, title, created_at')
      .eq('created_by', user.id)
      .in('type', ['quiz', 'flashcard', 'mindmap', 'timeline', 'note'])
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ recents: [] }, { status: 200 });
    }

    // Map to RecentItem format
    const recents: RecentItem[] = (artifacts || []).map(a => ({
      id: a.id,
      tool_type: (a.artifact_type as any) || 'note',
      title: a.title || 'Untitled',
      created_at: a.created_at,
      icon: getIconForType(a.artifact_type),
    }));

    return NextResponse.json({ recents });
  } catch (error) {
    return NextResponse.json({ recents: [] }, { status: 200 });
  }
}

// POST endpoint: When a quiz/flashcard/tool is created, save it with a title
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

    const { tool_type, title, content } = await req.json();

    if (!tool_type || !title) {
      return NextResponse.json(
        { error: 'tool_type and title are required' },
        { status: 400 }
      );
    }

    // Insert into artifacts table
    const { data, error } = await supabase
      .from('artifacts')
      .insert({
        type: tool_type,
        title: title,
        content: content || null,
        created_by: user.id,
        created_at: new Date().toISOString(),
      })
      .select('id, type, title, created_at')
      .single();

    if (error) {
      return NextResponse.json({ error: 'Failed to save artifact' }, { status: 500 });
    }

    return NextResponse.json({
      id: data.id,
      tool_type: data.type,
      title: data.title,
      created_at: data.created_at,
      icon: getIconForType(data.type),
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getIconForType(type: string): string {
  const icons: Record<string, string> = {
    quiz: '📝',
    flashcard: '📇',
    mindmap: '🧠',
    timeline: '⏱️',
    note: '📋',
  };
  return icons[type] || '📄';
}
