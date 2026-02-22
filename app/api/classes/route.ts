import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { createClassSchema } from '@/lib/validation/schemas'
import { validateBody } from '@/lib/validation/validate'

import { logAuditEntry } from '@/lib/auth/class-permissions'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  console.log('[CLASSES_GET] Starting request...')
  
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error('[CLASSES_GET] Auth error:', authError.message);
      if (authError.message.includes('User from sub claim in JWT does not exist')) {
        return NextResponse.json({ error: 'Session expired or invalid', code: 'SESSION_INVALID' }, { status: 401 });
      }
      return NextResponse.json({ error: 'Authentication failed', details: authError.message }, { status: 401 });
    }

    if (!user) {
      console.log('[CLASSES_GET] No user found, returning empty array');
      return NextResponse.json([]);
    }

    // Use subscription_type as the single source of truth (role column removed)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('[CLASSES_GET] Profile fetch error:', profileError);
    }

    // Create profile if doesn't exist
    if (!profile) {
      console.log('[CLASSES_GET] Creating missing profile...')
      await supabase.from('profiles').insert({
        id: user.id,
        subscription_type: 'student',
        subscription_tier: 'free',
        full_name: user.user_metadata?.full_name || '',
        avatar_url: user.user_metadata?.avatar_url || null
      });
    }

    // subscription_type is the source of truth (not role)
    const userRole = profile?.subscription_type || 'student';
    const isTeacher = userRole === 'teacher';
    
    console.log('[CLASSES_GET] User role:', userRole, 'Is teacher:', isTeacher);

    let allClasses: any[] = [];

    if (isTeacher) {
      // TEACHERS: See ALL classes they're members of (teacher OR management role)
      console.log('[CLASSES_GET] Fetching teacher classes from class_members...')
      
      const { data: memberClasses, error: memberError } = await supabase
        .from('class_members')
        .select('classes(*)')
        .eq('user_id', user.id)
        .in('role', ['teacher', 'management']);

      console.log('[CLASSES_GET] Member classes query result:', { 
        count: memberClasses?.length, 
        error: memberError 
      });

      if (memberError) {
        console.error('[CLASSES_GET] Member classes error:', memberError);
        return NextResponse.json({ error: memberError.message }, { status: 500 });
      }

      let teacherClasses = memberClasses?.map((m: any) => m.classes).filter(Boolean) || [];
      console.log('[CLASSES_GET] Teacher classes from members:', teacherClasses.length);

      // Also include legacy owned classes (backward compatibility)
      console.log('[CLASSES_GET] Fetching legacy owned classes...')
      const { data: ownedClasses, error: ownedError } = await supabase
        .from('classes')
        .select('*')
        .eq('owner_id', user.id);

      console.log('[CLASSES_GET] Owned classes:', { count: ownedClasses?.length, error: ownedError });

      // Merge and deduplicate
      const allTeacherClasses = [...teacherClasses, ...(ownedClasses || [])];
      const uniqueMap = new Map(allTeacherClasses.map(c => [c.id, c]));
      allClasses = Array.from(uniqueMap.values());

      console.log('[CLASSES_GET] Total teacher classes after merge:', allClasses.length);

      const includeArchived = request.nextUrl.searchParams.get('includeArchived') === 'true';
      if (!includeArchived) {
        allClasses = allClasses.filter(c => !c.status || c.status !== 'archived');
      }
    } else {
      // STUDENTS: Only see classes they're members of
      console.log('[CLASSES_GET] Fetching student classes...')
      
      const { data: memberClassesData, error: memberError } = await supabase
        .from('class_members')
        .select('classes(*)')
        .eq('user_id', user.id);

      console.log('[CLASSES_GET] Student member classes:', { 
        count: memberClassesData?.length, 
        error: memberError 
      });

      if (memberError) {
        console.error('[CLASSES_GET] Student classes error:', memberError);
        return NextResponse.json({ error: memberError.message }, { status: 500 });
      }

      allClasses = memberClassesData?.map((member: any) => member.classes).filter(Boolean) || [];
      console.log('[CLASSES_GET] Total student classes:', allClasses.length);
    }

    console.log('[CLASSES_GET] Returning classes:', allClasses.length);
    return NextResponse.json(allClasses);
    
  } catch (err: any) {
    console.error('[CLASSES_GET] Unexpected error:', err);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: err?.message || 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  console.log('[CLASSES_POST] Starting class creation...')
  
  try {
    const validation = await validateBody(request, createClassSchema);
    if ('error' in validation) {
      console.log('[CLASSES_POST] Validation failed:', validation.error);
      return validation.error;
    }
    const { name, description } = validation.data;
    console.log('[CLASSES_POST] Validated data:', { name, description });

    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log('[CLASSES_POST] Auth failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('[CLASSES_POST] User:', user.id);

    // Use subscription_type as the single source of truth (role column removed)
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_type, subscription_tier, classes_created')
      .eq('id', user.id)
      .maybeSingle();

    console.log('[CLASSES_POST] Profile:', profile);

    // subscription_type is the source of truth
    const subscriptionType = profile?.subscription_type || 'student';
    const subscriptionTier = profile?.subscription_tier || 'free';
    const classesCreated = profile?.classes_created || 0;
    
    if (subscriptionType !== 'teacher') {
      console.log('[CLASSES_POST] Not a teacher, type:', subscriptionType);
      return NextResponse.json({ error: 'Only teachers can create classes' }, { status: 403 });
    }

    // Check subscription limits for class creation
    const classLimit = subscriptionTier === 'pro' ? 20 : subscriptionTier === 'premium' ? 5 : 0;
    
    if (classLimit === 0) {
      console.log('[CLASSES_POST] Free tier cannot create classes');
      return NextResponse.json({ 
        error: 'Class creation requires a premium subscription',
        code: 'CLASS_LIMIT_REACHED',
        limit: classLimit,
        current: classesCreated,
        upgradeUrl: '/upgrade'
      }, { status: 403 });
    }
    
    if (classesCreated >= classLimit) {
      console.log('[CLASSES_POST] Class limit reached:', { classesCreated, classLimit, tier: subscriptionTier });
      return NextResponse.json({ 
        error: 'Class limit reached',
        code: 'CLASS_LIMIT_REACHED',
        limit: classLimit,
        current: classesCreated,
        upgradeUrl: '/upgrade'
      }, { status: 403 });
    }

    // Generate join codes
    console.log('[CLASSES_POST] Generating join codes...')
    const { data: joinCode } = await supabase.rpc('generate_join_code');
    const { data: teacherJoinCode } = await supabase.rpc('generate_teacher_join_code');

    console.log('[CLASSES_POST] Generated codes:', { joinCode, teacherJoinCode });

    if (!joinCode) {
      return NextResponse.json({ error: 'Failed to generate join code' }, { status: 500 });
    }

    // Create class
    const insertData = {
      name,
      description,
      join_code: joinCode,
      teacher_join_code: teacherJoinCode || null,
      owner_id: user.id
    };

    console.log('[CLASSES_POST] Inserting class:', insertData);

    const { data, error } = await supabase
      .from('classes')
      .insert([insertData])
      .select('id, name, description, join_code, teacher_join_code')
      .single();

    if (error) {
      console.error('[CLASSES_POST] Class creation failed:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log('[CLASSES_POST] Class created:', data);

    // Auto-add the creator as a teacher member
    console.log('[CLASSES_POST] Adding creator to class_members...')
    await supabase
      .from('class_members')
      .insert({ class_id: data.id, user_id: user.id, role: 'teacher' });

    // Log audit entry
    await logAuditEntry(supabase, {
      userId: user.id,
      classId: data.id,
      action: 'create',
      entityType: 'class',
      entityId: data.id,
      changes: { name, description }
    });

    // Increment classes_created counter
    console.log('[CLASSES_POST] Incrementing classes_created counter...')
    await supabase.rpc('increment_classes_created', { user_id: user.id });

    return NextResponse.json(data);
  } catch (err: any) {
    console.error('[CLASSES_POST] Unexpected error:', err);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: err?.message || 'Unknown error'
    }, { status: 500 });
  }
}
