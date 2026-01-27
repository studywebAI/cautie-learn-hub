import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET single paragraph
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const resolvedParams = await params;

    const { data: paragraph, error } = await supabase
      .from('paragraphs')
      .select('*')
      .eq('id', resolvedParams.paragraphId)
      .eq('chapter_id', resolvedParams.chapterId)
      .single()

    if (error) {
      console.log(`Paragraph fetch error:`, error);
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(paragraph)

  } catch (err) {
    console.error(`Unexpected error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}