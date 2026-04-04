import { NextRequest, NextResponse } from 'next/server';
import { getAuthedToolboxContext } from '@/lib/toolbox/server';

const toNumber = (value: string | null, fallback: number) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const norm = (value: string | null) => String(value || '').trim().toLowerCase();

export async function GET(request: NextRequest) {
  try {
    const { supabase, user } = await getAuthedToolboxContext();
    const { searchParams } = new URL(request.url);

    const q = norm(searchParams.get('q'));
    const type = norm(searchParams.get('type'));
    const subject = norm(searchParams.get('subject'));
    const difficulty = norm(searchParams.get('difficulty'));
    const language = norm(searchParams.get('language'));
    const creator = norm(searchParams.get('creator'));
    const minLikes = Math.max(0, toNumber(searchParams.get('minLikes'), 0));
    const limit = Math.min(120, Math.max(1, toNumber(searchParams.get('limit'), 60)));

    const { data: rawPosts, error } = await supabase
      .from('community_posts')
      .select('*')
      .eq('status', 'published')
      .eq('visibility', 'public')
      .order('published_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const posts = Array.isArray(rawPosts) ? rawPosts : [];
    const userIds = Array.from(new Set(posts.map((post: any) => String(post.user_id || '')).filter(Boolean)));

    const profileById = new Map<string, { full_name: string | null; avatar_url: string | null }>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .in('id', userIds);
      for (const profile of profiles || []) {
        profileById.set(String((profile as any).id), {
          full_name: (profile as any).full_name ?? null,
          avatar_url: (profile as any).avatar_url ?? null,
        });
      }
    }

    const postIds = posts.map((post: any) => String(post.id));
    const likedSet = new Set<string>();
    if (postIds.length > 0) {
      const { data: likes } = await supabase
        .from('community_post_likes')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', postIds);
      for (const like of likes || []) likedSet.add(String((like as any).post_id));
    }

    const enriched = posts.map((post: any) => {
      const creatorInfo = profileById.get(String(post.user_id));
      return {
        id: String(post.id),
        artifactId: String(post.artifact_id),
        toolId: String(post.tool_id || ''),
        title: String(post.title || 'Untitled'),
        description: String(post.description || ''),
        tags: Array.isArray(post.tags) ? post.tags.map((tag: any) => String(tag)) : [],
        subject: post.subject ? String(post.subject) : null,
        difficulty: post.difficulty ? String(post.difficulty) : null,
        language: post.language ? String(post.language) : null,
        likeCount: Number(post.like_count || 0),
        saveCount: Number(post.save_count || 0),
        playCount: Number(post.play_count || 0),
        createdAt: String(post.created_at),
        publishedAt: String(post.published_at || post.created_at),
        creatorId: String(post.user_id),
        creatorName: creatorInfo?.full_name || 'Anonymous',
        creatorAvatarUrl: creatorInfo?.avatar_url || null,
        likedByMe: likedSet.has(String(post.id)),
      };
    });

    const filtered = enriched.filter((item) => {
      if (type && item.toolId.toLowerCase() !== type) return false;
      if (subject && String(item.subject || '').toLowerCase() !== subject) return false;
      if (difficulty && String(item.difficulty || '').toLowerCase() !== difficulty) return false;
      if (language && String(item.language || '').toLowerCase() !== language) return false;
      if (minLikes > 0 && item.likeCount < minLikes) return false;
      if (creator && !item.creatorName.toLowerCase().includes(creator)) return false;
      if (q) {
        const haystack = [
          item.title,
          item.description,
          item.subject || '',
          item.toolId,
          item.creatorName,
          ...(item.tags || []),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    const now = Date.now();
    const trending = [...filtered]
      .sort((a, b) => {
        const aAgeHours = Math.max(1, (now - new Date(a.publishedAt).getTime()) / (1000 * 60 * 60));
        const bAgeHours = Math.max(1, (now - new Date(b.publishedAt).getTime()) / (1000 * 60 * 60));
        const aScore = (a.likeCount * 4 + a.playCount * 1.5 + a.saveCount * 2) / Math.pow(aAgeHours + 2, 0.42);
        const bScore = (b.likeCount * 4 + b.playCount * 1.5 + b.saveCount * 2) / Math.pow(bAgeHours + 2, 0.42);
        return bScore - aScore;
      })
      .slice(0, 24);

    const newest = [...filtered]
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 24);

    const mostLiked = [...filtered]
      .sort((a, b) => b.likeCount - a.likeCount || new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, 24);

    return NextResponse.json({
      items: filtered,
      sections: {
        trending,
        newest,
        mostLiked,
      },
    });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to fetch community feed' }, { status: 500 });
  }
}
