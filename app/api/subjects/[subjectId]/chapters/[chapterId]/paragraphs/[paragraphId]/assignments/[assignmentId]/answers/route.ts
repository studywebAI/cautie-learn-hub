import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET student answers for an assignment
export async function GET(
  request: Request,
  { params }: { params: { subjectId: string; chapterId: string; paragraphId: string; assignmentId: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get student's answers for this assignment
    const { data: answers, error: answersError } = await supabase
      .from('student_answers')
      .select('*')
      .eq('student_id', user.id)
      .eq('assignment_id', params.assignmentId)
      .order('submitted_at', { ascending: false })

    if (answersError) {
      console.error('Error fetching answers:', answersError)
      return NextResponse.json({ error: answersError.message }, { status: 500 })
    }

    return NextResponse.json(answers || [])
  } catch (error) {
    console.error('Unexpected error in answers GET:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}