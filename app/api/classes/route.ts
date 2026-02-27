import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

import { createClassSchema } from '@/lib/validation/schemas'
import { validateBody } from '@/lib/validation/validate'

import { logAuditEntry } from '@/lib/auth/class-permissions'

export const dynamic = 'force-dynamic'

function log(...args: any[]) {
  console.log('[CLASSES]', ...args)
}

export async function GET(request: NextRequest) {
  log('GET - Starting request...')
  
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      log('GET - Auth error', {
        message: authError.message,
        status: authError.status,
        name: authError.name
      });
      if (authError.message.includes('User from sub claim in JWT does not exist')) {
        return NextResponse.json({ error: 'Session expired or invalid', code: 'SESSION_INVALID' }, { status: 401 });
      }
      return NextResponse.json({ error: 'Authentication failed', details: authError.message }, { status: 401 });
    }

    if (!user) {
      log('GET - No user found, returning empty array');
      return NextResponse.json([]);
    }

    log('GET - Authenticated user details:', {
      id: user.id,
      email: user.email,
      user_metadata: user.user_metadata,
      created_at: user.created_at
    });

    // Use subscription_type as the single source of truth (role column removed)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('subscription_type, subscription_tier, classes_created')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      log('GET - Profile fetch error:', {
        message: profileError.message,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint
      });
    }

    // Create profile if doesn't exist
    if (!profile) {
      console.log('[CLASSES_GET] Creating missing profile for user', user.id)
      await supabase.from('profiles').insert({
        id: user.id,
        subscription_type: 'student',
        subscription_tier: 'free',
        full_name: user.user_metadata?.full_name || '',
        avatar_url: user.user_metadata?.avatar_url || null
      });
      const { data: createdProfile, error: createdProfileError } = await supabase
        .from('profiles')
        .select('subscription_type, subscription_tier, classes_created')
        .eq('id', user.id)
        .maybeSingle();
      log('GET - Created profile result:', {
        createdProfile,
        createdProfileError
      });
    }

    // subscription_type is the source of truth (not role)
    const userRole = profile?.subscription_type || 'student';
    const userTier = profile?.subscription_tier || 'free';
    const classesCreated = profile?.classes_created ?? 0;
    const isTeacher = userRole === 'teacher';
    
    log('GET - Profile summary:', {
      subscription_type: userRole,
      subscription_tier: userTier,
      classes_created: classesCreated,
      isTeacher
    });
    let allClasses: any[] = [];

    if (isTeacher) {
      // TEACHERS: See ALL classes they're members of
      // (role is now global via subscription_type)
      log('GET - Teacher branch: fetching class memberships from class_members...');
      
      const { data: memberClasses, error: memberError } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id);

      log('GET - Member classes raw:', {
        total: memberClasses?.length,
        sample: memberClasses?.slice(0, 5).map(m => ({ class_id: m.class_id })),
        error: memberError
      });

      if (memberError) {
        log('GET - Member classes error:', memberError);
        return NextResponse.json({ error: memberError.message }, { status: 500 });
      }

      // Get the actual class details
      const classIds = (memberClasses || []).map(m => m.class_id);
      log('Teacher class IDs:', classIds);

      if (classIds.length > 0) {
        const { data: classesData, error: classesError } = await supabase
          .from('classes')
          .select('*')
          .in('id', classIds);

        log('Classes data:', { 
          count: classesData?.length, 
          error: classesError,
          sample: classesData?.slice(0, 3).map(c => ({ id: c.id, name: c.name, status: c.status }))
        });
        allClasses = classesData || [];
      } else {
        log('No class memberships found for teacher');
      }

      log('Total teacher classes (pre-filter):', allClasses.length);

      const includeArchived = request.nextUrl.searchParams.get('includeArchived') === 'true';
      if (!includeArchived) {
        allClasses = allClasses.filter(c => !c.status || c.status !== 'archived');
      }
    } else {
      // STUDENTS: Only see classes they're members of
      log('GET - Student branch - fetching classes via class_members + join', { userId: user.id })
      
      const { data: memberClassesData, error: memberError } = await supabase
        .from('class_members')
        .select('classes(*)')
        .eq('user_id', user.id);

      log('GET - Student member classes:', {
        count: memberClassesData?.length,
        sample: memberClassesData?.slice(0, 3).map((m: any) => m.classes?.id || m.class_id),
        error: memberError
      });

      if (memberError) {
        log('GET - Student classes error:', memberError);
        return NextResponse.json({ error: memberError.message }, { status: 500 });
      }

      allClasses = memberClassesData?.map((member: any) => member.classes).filter(Boolean) || [];
      log('Total student classes (final):', allClasses.length);
    }

    log('Returning classes:', allClasses.length, 'includeArchived:', request.nextUrl.searchParams.get('includeArchived') === 'true');
    return NextResponse.json(allClasses);
    
  } catch (err: any) {
    log('GET - Unexpected error', err);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: err?.message || 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  log('POST - Starting class creation...')
  
  try {
    const validation = await validateBody(request, createClassSchema);
    if ('error' in validation) {
      log('POST - Validation failed:', validation.error);
      return validation.error;
    }
    const { name, description } = validation.data;
    log('POST - Validated data:', { name, description });

    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      log('POST - Auth failed', authError?.message)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    log('POST - Authenticated user', user.id);

    // Use subscription_type as the single source of truth (role column removed)
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_type, subscription_tier, classes_created')
      .eq('id', user.id)
      .maybeSingle();

    log('POST - Profile snapshot:', profile);

    // subscription_type is the source of truth
    const subscriptionType = profile?.subscription_type || 'student';
    const subscriptionTier = profile?.subscription_tier || 'free';
    const classesCreated = profile?.classes_created || 0;
    
    if (subscriptionType !== 'teacher') {
      log('POST - Rejected: not teacher', subscriptionType);
      return NextResponse.json({ error: 'Only teachers can create classes' }, { status: 403 });
    }

    // Check subscription limits for class creation
    const classLimit = subscriptionTier === 'pro' ? 20 : subscriptionTier === 'premium' ? 5 : 0;
    
    log('POST - Class creation check:', {
      subscriptionType,
      subscriptionTier,
      classLimit,
      classesCreated,
      canCreate: classesCreated < classLimit
    });
    
    if (classLimit === 0) {
      log('POST - Free tier creator blocked', { subscriptionTier });
      return NextResponse.json({ 
        error: 'Class creation requires a premium subscription',
        code: 'CLASS_LIMIT_REACHED',
        limit: classLimit,
        current: classesCreated,
        upgradeUrl: '/upgrade'
      }, { status: 403 });
    }
    
    if (classesCreated >= classLimit) {
      log('POST - Class limit reached', { classesCreated, classLimit, tier: subscriptionTier });
      return NextResponse.json({ 
        error: 'Class limit reached',
        code: 'CLASS_LIMIT_REACHED',
        limit: classLimit,
        current: classesCreated,
        upgradeUrl: '/upgrade'
      }, { status: 403 });
    }

    // Generate join codes
    log('POST - Generating join codes...')
    const { data: joinCode } = await supabase.rpc('generate_join_code');
    const { data: teacherJoinCode } = await supabase.rpc('generate_teacher_join_code');

    log('POST - Generated join codes', { joinCode, teacherJoinCode });

    if (!joinCode) {
      return NextResponse.json({ error: 'Failed to generate join code' }, { status: 500 });
    }

    // Create class - set user_id for RLS (owner_id column removed)
    const insertData = {
      name,
      description,
      join_code: joinCode,
      teacher_join_code: teacherJoinCode || null,
      user_id: user.id
    };

    log('POST - Inserting class', insertData);

    const { data, error } = await supabase
      .from('classes')
      .insert([insertData])
      .select('id, name, description, join_code, teacher_join_code')
      .single();

    if (error) {
      log('POST - Class creation failed', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    log('POST - Class created:', data);

    // Auto-add the creator as a member (no role column - use subscription_type)
    log('POST - Adding creator to class_members', { class_id: data.id, user_id: user.id });
    const { error: memberError } = await supabase
      .from('class_members')
      .insert({ class_id: data.id, user_id: user.id });

    if (memberError) {
      log('POST - class_members insert failed', memberError.message);
      return NextResponse.json({ error: 'Failed to add creator to class_members' }, { status: 500 });
    }

    log('POST - class_members insert succeeded', { class_id: data.id });

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
    log('POST - Incrementing classes_created counter')
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
