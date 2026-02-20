import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code, tier, type } = await request.json();

    if (!code || !tier || !type) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate code - accept the secret code
    const validCodes: Record<string, boolean> = {
      'm8sk0l': true,  // Secret code - grants whatever the user selects
    };

    // Also accept any premium/pro codes
    const codeLower = code.toLowerCase().trim();
    if (!validCodes[codeLower]) {
      return NextResponse.json({ error: 'Invalid code' }, { status: 400 });
    }

    // Use the tier/type that the user selected (from the upgrade page)
    const finalTier = tier;
    const finalType = type;

    // Update the user's profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        subscription_tier: finalTier,
        subscription_type: finalType,
        subscription_code_used: code
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Subscription update error:', updateError);
      return NextResponse.json({ error: 'Failed to update subscription' }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      tier: finalTier,
      type: finalType,
      message: `Successfully upgraded to ${finalType} ${finalTier}!`
    });

  } catch (error) {
    console.error('Subscription upgrade error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET to check current subscription status
export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_tier, subscription_type, quiz_usage_today, quiz_usage_date, classes_created, subscription_code_used')
      .eq('id', user.id)
      .single();

    if (profileError) {
      return NextResponse.json({ error: 'Failed to get subscription status' }, { status: 500 });
    }

    // Calculate limits based on tier
    const limits = getLimits(profile.subscription_type, profile.subscription_tier);

    return NextResponse.json({
      tier: profile.subscription_tier,
      type: profile.subscription_type,
      quizUsage: profile.quiz_usage_today,
      quizLimit: limits.maxQuizzes,
      classesCreated: profile.classes_created,
      classLimit: limits.maxClasses,
      codeUsed: profile.subscription_code_used
    });

  } catch (error) {
    console.error('Get subscription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function getLimits(type: string, tier: string) {
  if (type === 'student') {
    switch (tier) {
      case 'free': return { maxQuizzes: 5, maxClasses: 0 };
      case 'premium': return { maxQuizzes: 30, maxClasses: 0 };
      case 'pro': return { maxQuizzes: 999999, maxClasses: 0 };
      default: return { maxQuizzes: 5, maxClasses: 0 };
    }
  } else {
    switch (tier) {
      case 'free': return { maxQuizzes: 999999, maxClasses: 0 };
      case 'premium': return { maxQuizzes: 999999, maxClasses: 5 };
      case 'pro': return { maxQuizzes: 999999, maxClasses: 20 };
      default: return { maxQuizzes: 999999, maxClasses: 0 };
    }
  }
}
