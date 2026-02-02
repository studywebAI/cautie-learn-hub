import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

type SubjectCreateRequest = {
  title: string
  class_label?: string
  cover_type?: string
  cover_image_url?: string
  ai_icon_seed?: string
}

export async function GET(req: Request, { params }: { params: Promise<{ classId: string }> }) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params
    const { classId } = resolvedParams

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch subjects for the class
    const { data, error } = await supabase.from('subjects')
      .select('*')
      .eq('class_id', classId)

    if (error) {
      return NextResponse.json({
        error: `Supabase error fetching subjects: ${error.message}`
      }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching subjects:', error)
    return NextResponse.json({
      error: 'Internal server error while fetching subjects'
    }, { status: 500 })
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ classId: string }> }) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const json = await req.json()
    const resolvedParams = await params
    const { classId } = resolvedParams

    // Validate create request
    if (!json.title) {
      return NextResponse.json({
        error: 'Missing required field: title'
      }, { status: 400 })
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create the subject in Supabase
    const { data, error } = await supabase.from('subjects')
      .insert([{
        title: json.title,
        class_id: classId,
        class_label: json.class_label || json.title,
        cover_type: json.cover_type || 'ai_icons',
        cover_image_url: json.cover_image_url || null,
        ai_icon_seed: json.ai_icon_seed || null,
        user_id: user.id
      }])
      .single()

    if (error) {
      return NextResponse.json({
        error: `Supabase error creating subject: ${error.message}`
      }, { status: 500 })
    }

    return NextResponse.json({
      subject: data
    })
  } catch (error) {
    console.error('Error creating subject:', error)
    return NextResponse.json({
      error: 'Internal server error while creating subject'
    }, { status: 500 })
  }
}