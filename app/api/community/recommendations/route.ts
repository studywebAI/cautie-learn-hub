import { NextRequest, NextResponse } from 'next/server';
import { getAuthedToolboxContext } from '@/lib/toolbox/server';

const norm = (value: string | null) => String(value || '').trim().toLowerCase();

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await getAuthedToolboxContext();
    const { searchParams } = new URL(request.url);
    const q = norm(searchParams.get('q'));
    const type = norm(searchParams.get('type'));
    const limit = Math.min(12, Math.max(1, Number(searchParams.get('limit') || 6)));

    const { data, error } = await supabase
      .from('community_posts')
      .select('id, tool_id, title, description, subject, difficulty, language, like_count, play_count, published_at')
      .eq('status', 'published')
      .eq('visibility', 'public')
      .order('published_at', { ascending: false })
      .limit(120);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const now = Date.now();
    const items = (Array.isArray(data) ? data : [])
      .map((item: any) => ({
        id: String(item.id),
        toolId: String(item.tool_id || ''),
        title: String(item.title || ''),
        description: String(item.description || ''),
        subject: item.subject ? String(item.subject) : null,
        difficulty: item.difficulty ? String(item.difficulty) : null,
        language: item.language ? String(item.language) : null,
        likeCount: Number(item.like_count || 0),
        playCount: Number(item.play_count || 0),
        publishedAt: String(item.published_at || ''),
      }))
      .filter((item) => (type ? item.toolId.toLowerCase() === type : true))
      .filter((item) => {
        if (!q) return true;
        const haystack = `${item.title} ${item.description} ${item.subject || ''}`.toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => {
        const aAgeHours = Math.max(1, (now - new Date(a.publishedAt).getTime()) / (1000 * 60 * 60));
        const bAgeHours = Math.max(1, (now - new Date(b.publishedAt).getTime()) / (1000 * 60 * 60));
        const aScore = (a.likeCount * 3 + a.playCount) / Math.pow(aAgeHours + 2, 0.45);
        const bScore = (b.likeCount * 3 + b.playCount) / Math.pow(bAgeHours + 2, 0.45);
        return bScore - aScore;
      })
      .slice(0, limit);

    return NextResponse.json({ items });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to fetch recommendations' }, { status: 500 });
  }
}
