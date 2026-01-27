import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET chapters for a subject
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  console.log(`GET /api/subjects/${params}/chapters - Called`);

  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const resolvedParams = await params;

    // Simple fetch - no auth checks since RLS is disabled
    const { data: chapters, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('subject_id', resolvedParams.subjectId)
      .order('chapter_number', { ascending: true })

    if (error) {
      console.log(`Chapters fetch error:`, error);
      return NextResponse.json({ error: 'Failed to fetch chapters' }, { status: 500 })
    }

    console.log(`Chapters found:`, chapters?.length || 0);
    return NextResponse.json(chapters || [])

  } catch (err) {
    console.error(`Unexpected error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create new chapter
export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  console.log(`POST /api/subjects/${params}/chapters - Called`);

  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const resolvedParams = await params;
    const { title } = await request.json()

    console.log(`Creating chapter for subject:`, resolvedParams.subjectId, `title:`, title);

    // Get max chapter number for this subject
    const { data: existingChapters, error: countError } = await supabase
      .from('chapters')
      .select('chapter_number')
      .eq('subject_id', resolvedParams.subjectId)
      .order('chapter_number', { ascending: false })
      .limit(1)

    const nextNumber = (existingChapters?.[0]?.chapter_number || 0) + 1

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
      .single()

    if (insertError) {
      console.log(`Chapter creation error:`, insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    console.log(`Chapter created:`, chapter);
    return NextResponse.json(chapter)

  } catch (err) {
    console.error(`Unexpected error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}