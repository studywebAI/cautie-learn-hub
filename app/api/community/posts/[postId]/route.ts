import { NextRequest, NextResponse } from 'next/server';
import { getAuthedToolboxContext } from '@/lib/toolbox/server';

export async function GET(
  _request: NextRequest,
  context: { params: { postId: string } }
) {
  try {
    const { supabase, user } = await getAuthedToolboxContext();
    const postId = String(context.params.postId || '').trim();
    if (!postId) {
      return NextResponse.json({ error: 'postId is required' }, { status: 400 });
    }

    const { data: post, error } = await supabase
      .from('community_posts')
      .select('*')
      .eq('id', postId)
      .eq('status', 'published')
      .eq('visibility', 'public')
      .maybeSingle();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    const creatorId = String((post as any).user_id || '');
    let creatorName = 'Anonymous';
    let creatorAvatarUrl: string | null = null;

    if (creatorId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', creatorId)
        .maybeSingle();
      creatorName = String((profile as any)?.full_name || 'Anonymous');
      creatorAvatarUrl = (profile as any)?.avatar_url || null;
    }

    let artifact = null as any;
    let version = null as any;
    const artifactId = String((post as any).artifact_id || '');
    if (artifactId) {
      const { data: artifactRow } = await supabase
        .from('artifacts')
        .select('id, tool_id, title, latest_version, updated_at, metadata')
        .eq('id', artifactId)
        .maybeSingle();
      artifact = artifactRow || null;
      if (artifactRow) {
        const { data: versionRow } = await supabase
          .from('artifact_versions')
          .select('version_number, content, metadata, created_at')
          .eq('artifact_id', artifactId)
          .eq('version_number', (artifactRow as any).latest_version || 1)
          .maybeSingle();
        version = versionRow || null;
      }
    }

    const { count: likeCount } = await supabase
      .from('community_post_likes')
      .select('*', { count: 'exact', head: true })
      .eq('post_id', postId);

    const { data: likeRow } = await supabase
      .from('community_post_likes')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    return NextResponse.json({
      post: {
        ...post,
        creator_name: creatorName,
        creator_avatar_url: creatorAvatarUrl,
        like_count: Number((likeCount || (post as any).like_count || 0)),
        liked_by_me: Boolean(likeRow),
      },
      artifact,
      version,
    });
  } catch (error: any) {
    if (error?.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ error: error?.message || 'Failed to fetch post' }, { status: 500 });
  }
}
