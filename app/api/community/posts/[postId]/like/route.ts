import { NextRequest, NextResponse } from 'next/server';
import { getAuthedToolboxContext } from '@/lib/toolbox/server';

export async function POST(
  _request: NextRequest,
  context: { params: { postId: string } }
) {
  try {
    const { supabase, user } = await getAuthedToolboxContext();
    const postId = String(context.params.postId || '').trim();
    if (!postId) return NextResponse.json({ error: 'postId is required' }, { status: 400 });

    const { data: post } = await supabase
      .from('community_posts')
      .select('id, like_count')
      .eq('id', postId)
      .eq('status', 'published')
      .eq('visibility', 'public')
      .maybeSingle();
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    const { data: existing } = await supabase
      .from('community_post_likes')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    let liked = false;
    if (existing) {
      await supabase.from('community_post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      liked = false;
    } else {
      await supabase.from('community_post_likes').insert({ post_id: postId, user_id: user.id });
      liked = true;
    }

    const { count } = await supabase
      .from('community_post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    const likeCount = Number(count || 0);
    await supabase.from('community_posts').update({ like_count: likeCount, updated_at: new Date().toISOString() }).eq('id', postId);

    return NextResponse.json({ liked, likeCount });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to toggle like' }, { status: 500 });
  }
}
