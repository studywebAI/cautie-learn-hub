import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ templateId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { templateId } = resolvedParams
    const { className, classDescription } = await request.json()

    const { data: template, error: templateError } = await (supabase as any)
      .from('class_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (templateError || !template) return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    if (template.owner_id !== user.id && !template.is_public) return NextResponse.json({ error: 'Access denied' }, { status: 403 })

    let joinCode, existing
    do {
      joinCode = ''
      for (let i = 0; i < 6; i++) joinCode += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
      const result = await supabase.from('classes').select('id').eq('join_code', joinCode).maybeSingle()
      existing = result.data
    } while (existing)

    const { data: newClass, error: classError } = await supabase
      .from('classes')
      .insert({ name: className, description: classDescription, owner_id: user.id, join_code: joinCode })
      .select()
      .single()

    if (classError) return NextResponse.json({ error: classError.message }, { status: 500 })
    return NextResponse.json(newClass)
  } catch (error) {
    console.error('Error using template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
