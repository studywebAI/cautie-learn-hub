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
    
    const cacheKey = `students_${params.classId}`;
    
    // Check if we have cached data
    const cached = await cacheService.get(cacheKey);
    
    if (cached) {
      // Check if data has changed since last cache
      const hasChanged = await changeDetection.hasStudentsChanged(
        params.classId, 
        cached.lastUpdated
      );
      
      if (!hasChanged) {
        return NextResponse.json(cached.data);
      }
    }
    
    // Fetch fresh student data from database
    const supabaseClient = await supabase;
    const { data: students } = await supabaseClient
      .from('class_members')
      .select('user_id, profiles(id, full_name, avatar_url, email), created_at')
      .eq('class_id', params.classId)
      .eq('role', 'student')
      .order('profiles.full_name', { ascending: true });
    
    const freshData = {
      data: students || [],
      lastUpdated: new Date().toISOString()
    };
    
    // Cache the fresh data
    await cacheService.set(cacheKey, freshData, 600000); // 10 minutes TTL
    
    return NextResponse.json(freshData);
    
  } catch (error) {
    console.error('Cached students data error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch students data' },
      { status: 500 }
    );
  }
}