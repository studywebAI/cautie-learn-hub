import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET chapters for a subject
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Try direct fetch first
    let { data: chapters, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('subject_id', resolvedParams.subjectId)
      .order('chapter_number', { ascending: true });

    if (error) {
      console.log('Chapters direct fetch error (possible RLS):', error);
      // Return empty array instead of error - chapters may just not exist yet
      return NextResponse.json([]);
    }

    return NextResponse.json(chapters || []);

  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create new chapter
export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params;
    const { title } = await request.json();

    // Get max chapter number for this subject
    const { data: existingChapters } = await supabase
      .from('chapters')
      .select('chapter_number')
      .eq('subject_id', resolvedParams.subjectId)
      .order('chapter_number', { ascending: false })
      .limit(1);

    const nextNumber = (existingChapters?.[0]?.chapter_number || 0) + 1;

    // Create chapter
    const { data: chapter, error: insertError } = await supabase
      .from('chapters')
      .insert({
        subject_id: resolvedParams.subjectId,
        chapter_number: nextNumber,
        title,
        ai_summary: null,
        summary_overridden: false
      })
      .select()
      .single();

    if (insertError) {
      console.log('Chapter creation error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(chapter);

  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
