import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET paragraphs for a chapter
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: paragraphs, error } = await supabase
      .from('paragraphs')
      .select('*')
      .eq('chapter_id', resolvedParams.chapterId)
      .order('paragraph_number', { ascending: true });

    if (error) {
      console.log('Paragraphs fetch error (possible RLS):', error);
      return NextResponse.json([]);
    }

    return NextResponse.json(paragraphs || []);

  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create new paragraph
export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params;
    const { title } = await request.json();

    // Get max paragraph number for this chapter
    const { data: existingParagraphs } = await supabase
      .from('paragraphs')
      .select('paragraph_number')
      .eq('chapter_id', resolvedParams.chapterId)
      .order('paragraph_number', { ascending: false })
      .limit(1);

    const nextNumber = (existingParagraphs?.[0]?.paragraph_number || 0) + 1;

    // Create paragraph
    const { data: paragraph, error: insertError } = await supabase
      .from('paragraphs')
      .insert({
        chapter_id: resolvedParams.chapterId,
        paragraph_number: nextNumber,
        title: title?.trim()
      })
      .select()
      .single();

    if (insertError) {
      console.log('Paragraph creation error:', insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(paragraph);

  } catch (err) {
    console.error('Unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
