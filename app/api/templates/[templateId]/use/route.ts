import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: { templateId: string } }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { templateId } = params
    const { className, classDescription } = await request.json()

    // Get the template
    const { data: template, error: templateError } = await (supabase as any)
      .from('class_templates')
      .select('*')
      .eq('id', templateId)
      .single()

    if (templateError || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Check if user can access the template
    if (template.owner_id !== user.id && !template.is_public) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 })
    }

    // Generate join code
    let joinCode
    let existing
    do {
      joinCode = ''
      for (let i = 0; i < 6; i++) {
        joinCode += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
      }
      const result = await supabase
        .from('classes')
        .select('id')
        .eq('join_code', joinCode)
        .maybeSingle()
      existing = result.data
    } while (existing)

    // Create the class
    const { data: newClass, error: classError } = await supabase
      .from('classes')
      .insert({
        name: className,
        description: classDescription,
        owner_id: user.id,
        join_code: joinCode
      })
      .select()
      .single()

    if (classError) {
      return NextResponse.json({ error: classError.message }, { status: 500 })
    }

    // Apply template data (this would need to be expanded based on template structure)
    // For now, just return the created class
    // In a full implementation, this would create chapters, assignments, etc. from template_data

    return NextResponse.json(newClass)
  } catch (error) {
    console.error('Error using template:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}