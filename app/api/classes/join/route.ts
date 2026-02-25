import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse, NextRequest } from 'next/server'

import { joinClassSchema } from '@/lib/validation/schemas'
import { validateBody } from '@/lib/validation/validate'

import type { Database } from '@/lib/supabase/database.types'
import { logAuditEntry } from '@/lib/auth/class-permissions'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.json({ error: 'Join code is required' }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);

  // Check both student join_code and teacher join_code
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('id, name, description')
    .or(`join_code.eq.${code},teacher_join_code.eq.${code}`)
    .single();

  if (classError || !classData) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }

  return NextResponse.json(classData);
}

// POST to join a class
export async function POST(request: NextRequest) {
  const validation = await validateBody(request, joinClassSchema);
  if ('error' in validation) {
    return validation.error;
  }
  const { class_code } = validation.data;
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);
  
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if code matches student join_code or teacher join_code
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('id, name, description, join_code, teacher_join_code')
    .or(`join_code.eq.${class_code},teacher_join_code.eq.${class_code}`)
    .single();
  
  if (classError || !classData) {
    return NextResponse.json({ error: 'Class not found. Please check the code and try again.' }, { status: 404 });
  }

  // Get user's subscription_type to determine role (global role)
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_type')
    .eq('id', user.id)
    .single();

  // Use subscription_type as the role
  const subscriptionType = profile?.subscription_type || 'student';
  
  console.log('[JOIN] User subscription_type:', subscriptionType);

  // Check if user is already a member (use maybeSingle to handle null case)
  const { data: existingMember, error: checkError } = await supabase
    .from('class_members')
    .select('id')
    .eq('class_id', classData.id)
    .eq('user_id', user.id)
    .maybeSingle();
    
  if (checkError) {
    console.error('Error checking membership:', checkError);
  }
    
  if (existingMember) {
    return NextResponse.json({ 
      message: 'You are already a member of this class.',
      alreadyJoined: true,
      role: subscriptionType,
      class: { id: classData.id, name: classData.name, description: classData.description }
    }, { status: 200 });
  }

  // Insert into class_members (no role column - role is global via subscription_type)
  const { error: insertError } = await supabase
    .from('class_members')
    .insert([{ class_id: classData.id, user_id: user.id }]);

  if (insertError) {
    // Handle duplicate key error (already a member)
    if (insertError.code === '23505' || insertError.message.includes('duplicate key')) {
      return NextResponse.json({ 
        message: 'You are already a member of this class.',
        alreadyJoined: true,
        class: { id: classData.id, name: classData.name, description: classData.description }
      }, { status: 200 });
    }
    console.error('Error joining class:', insertError);
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // Log audit
  await logAuditEntry(supabase, {
    userId: user.id,
    classId: classData.id,
    action: 'join',
    entityType: 'member',
    metadata: { role: subscriptionType }
  });

  return NextResponse.json({ 
    message: `Successfully joined class as ${subscriptionType}`, 
    class: { id: classData.id, name: classData.name, description: classData.description },
    role: subscriptionType
  });
}
