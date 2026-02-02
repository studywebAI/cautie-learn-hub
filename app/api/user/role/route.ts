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
    .single();

  if (error) {
    console.error("Error fetching user role:", error);
    return NextResponse.json({ error: "Failed to fetch user role" }, { status: 500 });
  }

  return NextResponse.json({ role: profile.role });
}

export async function PUT(req: NextRequest) {
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { newRole } = await req.json();

  if (!newRole) {
    return NextResponse.json({ error: "New role is required" }, { status: 400 });
  }

  // Validate role is either student or teacher
  if (!['student', 'teacher'].includes(newRole)) {
    return NextResponse.json({ error: "Invalid role" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({ role: newRole, updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (error) {
    console.error("Error updating user role:", error);
    return NextResponse.json({ error: "Failed to update user role" }, { status: 500 });
  }

  return NextResponse.json({ message: "User role updated successfully", role: newRole }, { status: 200 });
}
