import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { revokePresentationShareSnapshot, getPresentationShareSnapshotByToken } from '@/lib/presentation/store';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient(cookies());
    const snapshot = await getPresentationShareSnapshotByToken({ supabase, token });
    if (!snapshot) {
      return NextResponse.json({ error: 'Share link not found or expired' }, { status: 404 });
    }
    return NextResponse.json({
      ok: true,
      title: snapshot.title,
      previewManifest: snapshot.preview_manifest_json,
      createdAt: snapshot.created_at,
      expiresAt: snapshot.expires_at || null,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to load shared preview' }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient(cookies());
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const revoked = await revokePresentationShareSnapshot({ supabase, userId: user.id, token });
    if (!revoked) {
      return NextResponse.json({ error: 'Share link not found' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, revoked: true });
  } catch {
    return NextResponse.json({ error: 'Failed to revoke share link' }, { status: 500 });
  }
}
