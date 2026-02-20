import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// Unified tool usage tracking for students
// Tracks: quizzes, flashcards, notes, and any AI-generated content
// Valid tool types: 'quiz', 'flashcard', 'note', 'block', 'material'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { tool_type } = await request.json().catch(() => ({}));

    // Get user's subscription info
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_type, subscription_tier, quiz_usage_today, quiz_usage_date')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Only students have tool limits
    if (profile.subscription_type !== 'student') {
      return NextResponse.json({ success: true, message: 'No limit for teachers' })
    }

    // Check tier limits (unified for all tools)
    const tier = profile.subscription_tier || 'free'
    const maxUsage = tier === 'pro' ? 999999 : tier === 'premium' ? 30 : 5

    // Check if it's a new day
    const today = new Date().toISOString().split('T')[0]
    const currentUsage = profile.quiz_usage_date === today ? profile.quiz_usage_today : 0

    if (currentUsage >= maxUsage) {
      return NextResponse.json({
        error: 'Daily limit reached',
        code: 'TOOL_LIMIT_REACHED',
        limit: maxUsage,
        current: currentUsage,
        upgradeUrl: '/upgrade',
        tier: tier,
        message: `You've used ${currentUsage}/${maxUsage} AI tools today. Upgrade to Premium for 30/day or Pro for unlimited.`
      }, { status: 403 })
    }

    // Increment tool usage
    const { error: updateError } = await supabase.rpc('increment_quiz_usage', {
      p_user_id: user.id
    })

    if (updateError) {
      console.error('Error incrementing tool usage:', updateError)
      // Try direct update if RPC fails
      await supabase
        .from('profiles')
        .update({
          quiz_usage_today: (profile.quiz_usage_today || 0) + 1,
          quiz_usage_date: today
        })
        .eq('id', user.id)
    }

    return NextResponse.json({
      success: true,
      usage: currentUsage + 1,
      limit: maxUsage,
      remaining: maxUsage - currentUsage - 1,
      tool_type: tool_type || 'general'
    })

  } catch (error) {
    console.error('Tool usage tracking error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// GET to check current usage
export async function GET() {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_type, subscription_tier, quiz_usage_today, quiz_usage_date')
      .eq('id', user.id)
      .maybeSingle()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const tier = profile.subscription_tier || 'free'
    const maxUsage = tier === 'pro' ? 999999 : tier === 'premium' ? 30 : 5

    // Check if it's a new day
    const today = new Date().toISOString().split('T')[0]
    const currentUsage = profile.quiz_usage_date === today ? profile.quiz_usage_today : 0

    return NextResponse.json({
      usage: currentUsage,
      limit: maxUsage,
      remaining: Math.max(maxUsage - currentUsage, 0),
      isNewDay: profile.quiz_usage_date !== today,
      tier: tier
    })

  } catch (error) {
    console.error('Tool usage check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
