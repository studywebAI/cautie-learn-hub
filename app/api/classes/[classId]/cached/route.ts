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
    const [classData, members, analytics] = await Promise.all([
      supabaseClient
        .from('classes')
        .select('*')
        .eq('id', params.classId)
        .single(),
      supabaseClient
        .from('class_members')
        .select('user_id, created_at')
        .eq('class_id', params.classId)
        .order('created_at', { ascending: true }),
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
    
    const memberUserIds = (members.data || []).map((m: any) => m.user_id);
    let profiles: any[] = [];
    if (memberUserIds.length > 0) {
      const { data: profileRows } = await supabaseClient
        .from('profiles')
        .select('id, full_name, avatar_url, email, subscription_type')
        .in('id', memberUserIds);
      profiles = profileRows || [];
    }

    const profileById = new Map(profiles.map((p: any) => [p.id, p]));
    const students = memberUserIds
      .filter((id: string) => (profileById.get(id)?.subscription_type || 'student') !== 'teacher')
      .map((userId: string) => {
        const profile = profileById.get(userId);
        const member = (members.data || []).find((m: any) => m.user_id === userId);
        return {
          user_id: userId,
          created_at: member?.created_at || null,
          profiles: {
            id: userId,
            full_name: profile?.full_name || 'Unknown Student',
            avatar_url: profile?.avatar_url || null,
            email: profile?.email || null
          }
        };
      })
      .sort((a: any, b: any) => (a.profiles.full_name || '').localeCompare(b.profiles.full_name || ''));

    const freshData = {
      class: classData.data,
      students,
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
