import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

// NOTE: This endpoint now returns subscription_type as the source of truth
// The old 'role' column has been consolidated into 'subscription_type'

export async function GET() {
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use subscription_type as the single source of truth
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("subscription_type, subscription_tier")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching user subscription:", error);
    return NextResponse.json({ error: "Failed to fetch user subscription" }, { status: 500 });
  }

  // Create profile if it doesn't exist (defaults to free student)
  if (!profile) {
    console.log('Profile not found, creating new profile');
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        subscription_type: 'student',
        subscription_tier: 'free',
        full_name: user.user_metadata?.full_name || '',
        avatar_url: user.user_metadata?.avatar_url || null
      });

    if (insertError) {
      console.error('Profile creation failed:', insertError);
      return NextResponse.json({ error: "Failed to create user profile" }, { status: 500 });
    }

    // Fetch the newly created profile
    const { data: newProfile } = await supabase
      .from('profiles')
      .select('subscription_type, subscription_tier')
      .eq('id', user.id)
      .maybeSingle();

    return NextResponse.json({ 
      role: newProfile?.subscription_type || 'student',
      subscription_type: newProfile?.subscription_type || 'student',
      subscription_tier: newProfile?.subscription_tier || 'free'
    });
  }

  // Return both for backward compatibility, but subscription_type is the source of truth
  return NextResponse.json({ 
    role: profile.subscription_type,
    subscription_type: profile.subscription_type,
    subscription_tier: profile.subscription_tier
  });
}

// PUT is DISABLED - role changes now only through subscription codes
// Use /api/subscription/upgrade instead
export async function PUT(req: NextRequest) {
  return NextResponse.json({ 
    error: "Role switching is disabled. Please use the subscription upgrade page at /upgrade." 
  }, { status: 403 });
}
