import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST /api/extension/capture - Handle browser extension captures
export async function POST(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const data = await request.json()
    const { type, title, content, url, description, dueDate, source } = data

    if (!type || !title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let result

    switch (type) {
      case 'page_capture':
      case 'text_selection':
        // Save as imported content
        const { data: importedContent, error: importError } = await (supabase as any)
          .from('imported_content')
          .insert({
            user_id: user.id,
            title,
            content: { text: content, url, metadata: data.metadata },
            type: type === 'page_capture' ? 'document' : 'notes',
            source: url,
            imported_at: new Date().toISOString()
          })
          .select()
          .single()

        if (importError) throw importError
        result = { type: 'imported_content', data: importedContent }
        break

      case 'agenda_item':
        // Save as personal task
        const { data: personalTask, error: taskError } = await supabase
          .from('personal_tasks')
          .insert({
            user_id: user.id,
            title,
            description: description || `Captured from: ${url}`,
            date: dueDate || new Date().toISOString().split('T')[0]
          })
          .select()
          .single()

        if (taskError) throw taskError
        result = { type: 'personal_task', data: personalTask }
        break

      default:
        return NextResponse.json({ error: 'Unsupported capture type' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: 'Content captured successfully',
      data: result
    })

  } catch (error) {
    console.error('Extension capture error:', error)
    return NextResponse.json({
      error: 'Failed to save captured content',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}