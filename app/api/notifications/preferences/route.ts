import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET user notification preferences
export async function GET(request: Request) {
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: preferences, error } = await (supabase as any)
    .from('notification_preferences')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Return default preferences if none exist
  if (!preferences) {
    return NextResponse.json({
      announcement: true,
      submission_graded: true,
      assignment_due: true,
      assignment_created: true,
      class_invitation: true,
      ai_content_generated: true,
      ai_grading_completed: true,
      comment_added: true,
      deadline_reminder: true,
      email_enabled: true,
      push_enabled: true
    })
  }

  return NextResponse.json(preferences)
}

// POST/PUT update user notification preferences
export async function POST(request: Request) {
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const preferences = await request.json()

  // Try to update existing preferences
  const { data: existing, error: selectError } = await (supabase as any)
    .from('notification_preferences')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  let result
  if (existing) {
    // Update existing
    const { data, error } = await (supabase as any)
      .from('notification_preferences')
      .update({
        ...preferences,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      console.error('Error updating notification preferences:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    result = data
  } else {
    // Insert new
    const { data, error } = await (supabase as any)
      .from('notification_preferences')
      .insert({
        user_id: user.id,
        ...preferences
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating notification preferences:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    result = data
  }

  return NextResponse.json(result)
}