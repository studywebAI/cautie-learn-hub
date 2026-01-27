import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET assignment details
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string; assignmentId: string }> }
) {
  console.log(`GET /api/subjects/[subjectId]/chapters/[chapterId]/paragraphs/[paragraphId]/assignments/${params}/ - Called`);

  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const resolvedParams = await params;

    // Simple fetch - just get assignment
    const { data: assignment, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('id', resolvedParams.assignmentId)
      .single()

    if (error || !assignment) {
      console.log(`Assignment not found:`, error);
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
    }

    console.log(`Assignment found:`, assignment);
    return NextResponse.json(assignment)

  } catch (err) {
    console.error(`Unexpected error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}