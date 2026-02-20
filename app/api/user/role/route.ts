import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Error fetching user role:", error);
    return NextResponse.json({ error: "Failed to fetch user role" }, { status: 500 });
  }

  // Create profile if it doesn't exist
  if (!profile) {
    console.log('Profile not found, creating new profile');
    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        role: 'student',
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
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    return NextResponse.json({ role: newProfile?.role || 'student' });
  }

  return NextResponse.json({ role: profile.role });
}

// PUT is DISABLED - role changes now only through subscription codes
// Use /api/subscription/upgrade instead
export async function PUT(req: NextRequest) {
  return NextResponse.json({ 
    error: "Role switching is disabled. Please use the subscription upgrade page." 
  }, { status: 403 });
}
