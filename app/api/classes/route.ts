import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  console.log(`[${requestId}] GET /api/classes - Started at ${new Date().toISOString()}`);

  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    // Log environment check
    console.log(`[${requestId}] GET /api/classes - Environment check:`, {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSecretKey: !!process.env.SUPABASE_SECRET_KEY,
      supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) || 'missing'
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error(`[${requestId}] GET /api/classes - Auth error:`, {
        error: authError.message,
        status: authError.status,
        code: (authError as any).code,
        timestamp: new Date().toISOString(),
        hint: 'If "User from sub claim in JWT does not exist", the user needs to log out and log back in, or the user was deleted from Supabase'
      });
      
      // Special handling for "user doesn't exist" error
      if (authError.message.includes('User from sub claim in JWT does not exist')) {
        return NextResponse.json({ 
          error: 'Session expired or invalid', 
          details: 'Please log out and log back in. Your session may have become invalid.',
          code: 'SESSION_INVALID',
          requestId 
        }, { status: 401 });
      }
      
      return NextResponse.json({ error: 'Authentication failed', details: authError.message }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const guestId = searchParams.get('guestId');
    const includeArchived = searchParams.get('includeArchived') === 'true';

    console.log(`[${requestId}] GET /api/classes - Auth details:`, {
      hasUser: !!user,
      userId: user?.id || 'none',
      guestId: guestId || 'none',
      includeArchived,
      userAgent: request.headers.get('user-agent')?.substring(0, 100) || 'unknown'
    });

    if (!user && !guestId) {
      console.log(`[${requestId}] GET /api/classes - No user or guest ID provided, returning empty array`);
      return NextResponse.json([]);
    }

  let allClasses: any[] = [];

  if (user) {
    // Get GLOBAL user role. from profiles table (website-wide teacher/student mode)
    console.log(`[${requestId}] GET /api/classes - Fetching user profile for role determination`);

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error(`[${requestId}] GET /api/classes - Profile fetch error:`, {
        error: profileError.message,
        code: profileError.code,
        details: profileError.details,
        hint: profileError.hint,
        userId: user.id,
        timestamp: new Date().toISOString()
      });
      // Continue with default role but log the error
    }

    const userRole = profile?.role || 'student'; // Default to student if no profile exists
    const isTeacher = userRole === 'teacher';

    console.log(`[${requestId}] GET /api/classes - Role determination:`, {
      userRole,
      isTeacher,
      profileFound: !!profile,
      profileError: profileError?.message || 'none'
    });

    if (isTeacher) {
      // TEACHERS: See classes they own (for management and creation)
      console.log(`[${requestId}] GET /api/classes - Teacher mode: fetching owned classes`);

      let query = supabase
        .from('classes')
        .select('*')
        .eq('owner_id', user.id);

      if (!includeArchived) {
        query = query.or('status.is.null,status.neq.archived');
        console.log(`[${requestId}] GET /api/classes - Excluding archived classes`);
      }

      const { data, error } = await query;

      if (error) {
        console.error(`[${requestId}] GET /api/classes - Teacher classes query failed:`, {
          error: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          userId: user.id,
          timestamp: new Date().toISOString()
        });
        return NextResponse.json({
          error: error.message,
          details: 'Failed to fetch classes for teacher',
          requestId
        }, { status: 500 });
      }

      allClasses = data || [];
      console.log(`[${requestId}] GET /api/classes - Teacher fetched ${allClasses.length} classes successfully`);
    } else {
      // STUDENTS: Only see classes they're members of (cannot own/create classes)
      console.log(`[${requestId}] GET /api/classes - Student mode: fetching member classes only`);

      const { data: memberClassesData, error: memberError } = await supabase
        .from('class_members')
        .select('classes(*)')
        .eq('user_id', user.id);

      if (memberError) {
        console.error(`[${requestId}] GET /api/classes - Student member classes query failed:`, {
          error: memberError.message,
          code: memberError.code,
          details: memberError.details,
          hint: memberError.hint,
          userId: user.id,
          timestamp: new Date().toISOString()
        });
        return NextResponse.json({
          error: memberError.message,
          details: 'Failed to fetch member classes for student',
          requestId
        }, { status: 500 });
      }

      // Students only see classes they've joined
      allClasses = memberClassesData?.map((member: any) => member.classes).filter((cls: any) => cls) || [];
      console.log(`[${requestId}] GET /api/classes - Student fetched ${allClasses.length} member classes successfully`);
    }

    // Remove duplicates (though there shouldn't be any with the filtering above)
    const uniqueClasses = Array.from(new Map(allClasses.map(c => [c.id, c])).values());

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] GET /api/classes - Completed successfully:`, {
      classesReturned: uniqueClasses.length,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(uniqueClasses);
  } else if (guestId) {
    console.log(`[${requestId}] GET /api/classes - Guest mode, returning empty array`);
    return NextResponse.json([]);
  } else {
    console.log(`[${requestId}] GET /api/classes - Unexpected state, returning empty array`);
    return NextResponse.json([]);
  }
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] GET /api/classes - Unexpected error:`, {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : 'No stack trace',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      url: request.url,
      method: request.method,
      userAgent: request.headers.get('user-agent')
    });
    return NextResponse.json({
      error: 'Internal server error',
      requestId,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(7);

  console.log(`[${requestId}] POST /api/classes - Started at ${new Date().toISOString()}`);

  try {
    const { name, description, guestId } = await request.json();

    console.log(`[${requestId}] POST /api/classes - Request payload:`, {
      name: name?.substring(0, 50) || 'undefined',
      description: description?.substring(0, 50) || 'undefined',
      hasGuestId: !!guestId,
      contentLength: request.headers.get('content-length')
    });

    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    // Log environment check
    console.log(`[${requestId}] POST /api/classes - Environment check:`, {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasSecretKey: !!process.env.SUPABASE_SECRET_KEY,
      supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 30) || 'missing'
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError) {
      console.error(`[${requestId}] POST /api/classes - Auth error:`, {
        error: authError.message,
        status: authError.status,
        code: (authError as any).code,
        name: authError.name,
        timestamp: new Date().toISOString(),
        hint: 'If "User from sub claim in JWT does not exist", the user needs to log out and log back in'
      });
      
      // Special handling for "user doesn't exist" error
      if (authError.message.includes('User from sub claim in JWT does not exist')) {
        return NextResponse.json({
          error: 'Session expired or invalid',
          details: 'Please log out and log back in. Your session may have become invalid.',
          code: 'SESSION_INVALID',
          requestId
        }, { status: 401 });
      }
      
      return NextResponse.json({
        error: 'Authentication failed',
        details: authError.message,
        requestId
      }, { status: 401 });
    }

    console.log(`[${requestId}] POST /api/classes - Auth successful:`, {
      userId: user?.id || 'none',
      guestId: guestId || 'none',
      userAgent: request.headers.get('user-agent')?.substring(0, 100) || 'unknown'
    });

    if (!user && !guestId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Generate unique join code instantly using database function (PERFORMANCE FIX #1)
    const { data: joinCode, error: codeError } = await supabase.rpc('generate_join_code');
    if (codeError || !joinCode) {
       console.error('Join code generation error:', codeError);
       return NextResponse.json({ error: 'Failed to generate join code' }, { status: 500 });
    }

    // Only allow authenticated TEACHERS to create classes
    if (!user) {
      return NextResponse.json({ error: 'Authentication required to create classes' }, { status: 401 });
    }

    // Check if user is a teacher (only teachers can create classes)
    console.log(`[${requestId}] POST /api/classes - Checking user role for class creation`);

    // Ensure profile exists first
    const { data: existingProfile, error: profileCheckError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    let userRole: string = 'student';

    if (existingProfile?.role) {
      userRole = existingProfile.role;
      console.log(`[${requestId}] POST /api/classes - Profile exists with role: ${userRole}`);
    } else {
      // Create profile if it doesn't exist
      console.log(`[${requestId}] POST /api/classes - Creating default profile`);
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          role: 'student',
          full_name: user.user_metadata?.full_name || '',
          avatar_url: user.user_metadata?.avatar_url || null
        });

      if (insertError) {
        console.error(`[${requestId}] POST /api/classes - Profile creation failed:`, insertError);
        return NextResponse.json({
          error: 'Failed to create user profile',
          details: insertError.message,
          requestId
        }, { status: 500 });
      }
      userRole = 'student';
      console.log(`[${requestId}] POST /api/classes - Default profile created`);
    }

    console.log(`[${requestId}] POST /api/classes - Role check:`, {
      userRole,
      canCreateClasses: userRole === 'teacher'
    });

    if (userRole !== 'teacher') {
      console.log(`[${requestId}] POST /api/classes - Access denied: user is ${userRole}, needs teacher`);
      return NextResponse.json({
        error: 'Only teachers can create classes',
        userRole,
        requestId
      }, { status: 403 });
    }

    // Cast to correct insert type - only use fields that exist in the database schema
    const insertData = {
      name,
      description,
      join_code: joinCode,
      owner_id: user.id
    };

    console.log(`[${requestId}] POST /api/classes - Attempting to create class:`, {
      name: insertData.name,
      joinCode: insertData.join_code,
      ownerId: insertData.owner_id
    });

    const { data, error } = await supabase
      .from('classes')
      .insert([insertData])
      .select('id, name, description, join_code')
      .single();

    if (error) {
      console.error(`[${requestId}] POST /api/classes - Class creation failed:`, {
        error: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint,
        insertData,
        userId: user.id
      });
      return NextResponse.json({
        error: error.message,
        details: 'Failed to create class in database',
        requestId
      }, { status: 500 });
    }

    const duration = Date.now() - startTime;
    console.log(`[${requestId}] POST /api/classes - Class created successfully:`, {
      classId: data.id,
      className: data.name,
      joinCode: data.join_code,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json(data);
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(`[${requestId}] POST /api/classes - Unexpected error:`, {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : 'No stack trace',
      duration: `${duration}ms`,
      timestamp: new Date().toISOString(),
      url: request.url,
      method: request.method,
      userAgent: request.headers.get('user-agent'),
      contentType: request.headers.get('content-type')
    });
    return NextResponse.json({
      error: 'Internal server error',
      requestId,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}