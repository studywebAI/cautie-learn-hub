import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET paragraphs for a chapter
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string }> }
) {
  console.log(`GET /api/subjects/[subjectId]/chapters/${params}/paragraphs - Called`);

  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const resolvedParams = await params;

    // Simple fetch - no auth checks since RLS is disabled
    const { data: paragraphs, error } = await supabase
      .from('paragraphs')
      .select('*')
      .eq('chapter_id', resolvedParams.chapterId)
      .order('paragraph_number', { ascending: true })

    if (error) {
      console.log(`Paragraphs fetch error:`, error);
      return NextResponse.json({ error: 'Failed to fetch paragraphs' }, { status: 500 })
    }

    console.log(`Paragraphs found:`, paragraphs?.length || 0);
    return NextResponse.json(paragraphs || [])

  } catch (err) {
    console.error(`Unexpected error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create new paragraph
export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string }> }
) {
  console.log(`POST /api/subjects/[subjectId]/chapters/${params}/paragraphs - Called`);

  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const resolvedParams = await params;
    const { title } = await request.json()

    console.log(`Creating paragraph for chapter:`, resolvedParams.chapterId, `title:`, title);

    // Get max paragraph number for this chapter
    const { data: existingParagraphs, error: countError } = await supabase
      .from('paragraphs')
      .select('paragraph_number')
      .eq('chapter_id', resolvedParams.chapterId)
      .order('paragraph_number', { ascending: false })
      .limit(1)

    const nextNumber = (existingParagraphs?.[0]?.paragraph_number || 0) + 1

    // Create paragraph
    const { data: paragraph, error: insertError } = await supabase
      .from('paragraphs')
      .insert({
        chapter_id: resolvedParams.chapterId,
        paragraph_number: nextNumber,
        title: title?.trim()
      })
      .select()
      .single()

    if (insertError) {
      console.log(`Paragraph creation error:`, insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    console.log(`Paragraph created:`, paragraph);
    return NextResponse.json(paragraph)

  } catch (err) {
    console.error(`Unexpected error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}