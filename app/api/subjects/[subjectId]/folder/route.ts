import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST — assign (or clear) a subject's folder. Body: { folderId: string | null }
export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: subject } = await supabase
      .from('subjects')
      .select('id, user_id')
      .eq('id', resolvedParams.subjectId)
      .maybeSingle()
    if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 })
    if ((subject as any).user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const folderId = typeof body?.folderId === 'string' && body.folderId ? body.folderId : null

    if (folderId) {
      const { data: folder } = await supabase
        .from('subject_folders')
        .select('id')
        .eq('id', folderId)
        .eq('created_by', user.id)
        .maybeSingle()
      if (!folder) return NextResponse.json({ error: 'Invalid folder' }, { status: 400 })
    }

    const { data: updated, error } = await supabase
      .from('subjects')
      .update({ folder_id: folderId })
      .eq('id', resolvedParams.subjectId)
      .select('id, folder_id')
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ subject: updated })
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
