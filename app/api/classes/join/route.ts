import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse, NextRequest } from 'next/server'

import { joinClassSchema } from '@/lib/validation/schemas'
import { validateBody } from '@/lib/validation/validate'

import type { Database } from '@/lib/supabase/database.types'
import { logAuditEntry } from '@/lib/auth/class-permissions'

export const dynamic = 'force-dynamic'

function logJoin(...args: any[]) {
  console.log('[CLASSES_JOIN]', ...args)
}

function sanitizeCode(input: string | null | undefined): string {
  return (input || '').trim()
}

function maskCode(code: string): string {
  if (!code) return '<empty>'
  if (code.length <= 4) return '*'.repeat(code.length)
  return `${code.slice(0, 2)}***${code.slice(-2)}`
}

type ClassLookupResult = {
  classData: Pick<Database['public']['Tables']['classes']['Row'], 'id' | 'name' | 'description' | 'join_code' | 'teacher_join_code'> | null
  matchedBy: 'join_code' | 'teacher_join_code' | null
  lookupErrors: Array<{ step: string; message: string; code?: string; details?: string | null; hint?: string | null }>
}

async function findClassByCode(
  supabase: any,
  classCode: string,
): Promise<ClassLookupResult> {
  const lookupErrors: ClassLookupResult['lookupErrors'] = []
  const normalizedCode = classCode.trim()

  // Preferred path: SECURITY DEFINER RPC that bypasses fragile RLS visibility for join-code lookup.
  const { data: rpcData, error: rpcError } = await supabase.rpc('get_class_by_join_code', {
    p_code: normalizedCode
  })

  if (rpcError) {
    lookupErrors.push({
      step: 'rpc_get_class_by_join_code',
      message: rpcError.message,
      code: rpcError.code,
      details: rpcError.details,
      hint: rpcError.hint
    })
  } else if (rpcData) {
    const row = Array.isArray(rpcData) ? rpcData[0] : rpcData
    if (row) {
      const matchedBy =
        row.join_code && String(row.join_code).toUpperCase() === normalizedCode.toUpperCase()
          ? 'join_code'
          : 'teacher_join_code'
      return { classData: row, matchedBy, lookupErrors }
    }
  }

  const { data: byStudentCode, error: byStudentCodeError } = await supabase
    .from('classes')
    .select('id, name, description, join_code, teacher_join_code')
    .eq('join_code', normalizedCode)
    .maybeSingle()

  if (byStudentCodeError) {
    lookupErrors.push({
      step: 'lookup_join_code',
      message: byStudentCodeError.message,
      code: byStudentCodeError.code,
      details: byStudentCodeError.details,
      hint: byStudentCodeError.hint
    })
  }

  if (byStudentCode) {
    return { classData: byStudentCode, matchedBy: 'join_code', lookupErrors }
  }

  const { data: byTeacherCode, error: byTeacherCodeError } = await supabase
    .from('classes')
    .select('id, name, description, join_code, teacher_join_code')
    .eq('teacher_join_code', normalizedCode)
    .maybeSingle()

  if (byTeacherCodeError) {
    lookupErrors.push({
      step: 'lookup_teacher_join_code',
      message: byTeacherCodeError.message,
      code: byTeacherCodeError.code,
      details: byTeacherCodeError.details,
      hint: byTeacherCodeError.hint
    })
  }

  if (byTeacherCode) {
    return { classData: byTeacherCode, matchedBy: 'teacher_join_code', lookupErrors }
  }

  return { classData: null, matchedBy: null, lookupErrors }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = sanitizeCode(searchParams.get('code'));

  if (!code) {
    return NextResponse.json({ error: 'Join code is required' }, { status: 400 });
  }

  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);

  const { classData, matchedBy, lookupErrors } = await findClassByCode(supabase, code)
  logJoin('GET - Lookup result', {
    codeMask: maskCode(code),
    codeLength: code.length,
    found: Boolean(classData),
    matchedBy,
    lookupErrors
  })

  if (!classData) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 });
  }

  return NextResponse.json({
    id: classData.id,
    name: classData.name,
    description: classData.description
  });
}

// POST to join a class
export async function POST(request: NextRequest) {
  logJoin('POST - Starting join process')
  const validation = await validateBody(request, joinClassSchema);
  if ('error' in validation) {
    logJoin('POST - Validation failed', validation.error)
    return validation.error;
  }
  const classCode = sanitizeCode(validation.data.class_code);
  const cookieStore = cookies();
  const supabase = await createClient(cookieStore);

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  logJoin('POST - Authenticated user details:', {
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata,
    created_at: user.created_at
  });

  if (!classCode) {
    return NextResponse.json({ error: 'Join code is required' }, { status: 400 });
  }

  const { classData, matchedBy, lookupErrors } = await findClassByCode(supabase, classCode)
  logJoin('POST - Class lookup result', {
    userId: user.id,
    codeMask: maskCode(classCode),
    codeLength: classCode.length,
    found: Boolean(classData),
    matchedBy,
    lookupErrors
  })

  if (!classData) {
    return NextResponse.json(
      {
        error: 'Class not found. Please check the code and try again.',
        reason: lookupErrors.length > 0 ? 'lookup_failed' : 'no_match'
      },
      { status: 404 }
    );
  }

  // Get user's subscription_type to determine role (global role)
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_type')
    .eq('id', user.id)
    .single();

  // Use subscription_type as the role
  const subscriptionType = profile?.subscription_type || 'student';
  
  logJoin('POST - User subscription_type:', subscriptionType);

  // Check if user is already a member (use maybeSingle to handle null case)
  const { data: existingMember, error: checkError } = await supabase
    .from('class_members')
    .select('id')
    .eq('class_id', classData.id)
    .eq('user_id', user.id)
    .maybeSingle();
    
  if (checkError) {
    logJoin('POST - Membership check error:', checkError);
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

  logJoin('POST - Inserted class_members', {
    class_id: classData.id,
    user_id: user.id,
    error: insertError ? {
      message: insertError.message,
      code: insertError.code,
      details: insertError.details,
      hint: insertError.hint
    } : null
  })

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

  logJoin('POST - Join completed', { classId: classData.id, userId: user.id, role: subscriptionType });

  return NextResponse.json({ 
    message: `Successfully joined class as ${subscriptionType}`, 
    class: { id: classData.id, name: classData.name, description: classData.description },
    role: subscriptionType
  });
}
