import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { CacheService } from '@/lib/cache/cache-service';
import { ChangeDetectionService } from '@/lib/cache/change-detection';
import { cookies } from 'next/headers';

export async function GET(
  request: Request,
  { params }: { params: { classId: string } }
) {
  try {
    const cookieStore = cookies();
    const supabase = createClient(cookieStore);
    const cacheService = new CacheService();
    const changeDetection = new ChangeDetectionService();
    
    const cacheKey = `class_${params.classId}`;
    
    // Check if we have cached data
    const cached = await cacheService.get(cacheKey);
    
    if (cached) {
      // Check if data has changed since last cache
      const hasChanged = await changeDetection.hasClassChanged(
        params.classId, 
        cached.lastUpdated
      );
      
      if (!hasChanged) {
        return NextResponse.json(cached.data);
      }
    }
    
    // Fetch fresh data from database
    const supabaseClient = await supabase;
    const [classData, students, analytics] = await Promise.all([
      supabaseClient
        .from('classes')
        .select('*')
        .eq('id', params.classId)
        .single(),
      supabaseClient
        .from('class_members')
        .select('user_id, profiles(id, full_name, avatar_url, email), created_at')
        .eq('class_id', params.classId)
        .eq('role', 'student')
        .order('profiles.full_name', { ascending: true }),
      supabaseClient
        .from('analytics')
        .select('*')
        .eq('class_id', params.classId)
        .single()
    ]);
    
    if (classData.error) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }
    
    const freshData = {
      class: classData.data,
      students: students.data || [],
      analytics: analytics.data || null,
      lastUpdated: new Date().toISOString()
    };
    
    // Cache the fresh data
    await cacheService.set(cacheKey, freshData, 300000); // 5 minutes TTL
    
    return NextResponse.json(freshData);
    
  } catch (error) {
    console.error('Cached class data error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch class data' },
      { status: 500 }
    );
  }
}