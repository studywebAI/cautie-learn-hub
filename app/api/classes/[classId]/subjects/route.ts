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

    // Fetch subjects for the class through class_subjects join table
    const { data, error } = await (supabase as any).from('class_subjects')
      .select('subjects:subject_id(*)')
      .eq('class_id', classId)
      .order('created_at')

    if (error) {
      return NextResponse.json({
        error: `Supabase error fetching subjects: ${error.message}`
      }, { status: 500 })
    }

    // Extract subjects from the response
    const subjects = data.map((item: any) => item.subjects)
    return NextResponse.json(subjects || [])
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
    const { data: subject, error: subjectError } = await supabase.from('subjects')
      .insert([{
        title: json.title,
        class_label: json.class_label || json.title,
        cover_type: json.cover_type || 'ai_icons',
        cover_image_url: json.cover_image_url || null,
        ai_icon_seed: json.ai_icon_seed || null,
        user_id: user.id
      }])
      .select()
      .single()

    if (subjectError || !subject) {
      return NextResponse.json({
        error: `Supabase error creating subject: ${subjectError?.message || 'Unknown error'}`
      }, { status: 500 })
    }

    // Link the subject to the class
    const { error: linkError } = await (supabase as any).from('class_subjects')
      .insert([{
        class_id: classId,
        subject_id: subject.id,
        created_at: new Date()
      }])

    if (linkError) {
      return NextResponse.json({
        error: `Supabase error linking subject to class: ${linkError.message}`
      }, { status: 500 })
    }

    return NextResponse.json({
      subject: subject
    })
  } catch (error) {
    console.error('Error creating subject:', error)
    return NextResponse.json({
      error: 'Internal server error while creating subject'
    }, { status: 500 })
  }
}
