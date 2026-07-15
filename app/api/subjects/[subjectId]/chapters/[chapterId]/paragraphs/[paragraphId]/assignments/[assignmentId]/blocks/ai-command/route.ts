import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { insertBlockCommand } from '@/ai/flows/insert-block-command'

export const dynamic = 'force-dynamic'

// POST — chatbox insert-command for the assignment editor: teacher types
// "maak een multiple choice blok over X" and gets back a single block
// {blockType, ...fields} to insert client-side. Does not persist anything
// itself — the editor's existing autosave handles that once inserted into
// local state, same as any manually-added block.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string; assignmentId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .maybeSingle()
    if (profile?.subscription_type !== 'teacher') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: assignment } = await supabase
      .from('assignments')
      .select('id')
      .eq('id', resolvedParams.assignmentId)
      .maybeSingle()
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })

    const body = await request.json().catch(() => ({}))
    const command = String(body?.command || '').trim()
    const contextSummary = String(body?.contextSummary || '').slice(0, 4000)
    if (!command) return NextResponse.json({ error: 'command is required' }, { status: 400 })
    if (command.length > 500) return NextResponse.json({ error: 'command too long' }, { status: 400 })

    const result = await insertBlockCommand(command, contextSummary, 'Dutch')
    return NextResponse.json({ block: result })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
