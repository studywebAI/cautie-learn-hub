import { NextRequest, NextResponse } from 'next/server';
import { getShareSnapshot } from '@/lib/presentation/share-store';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const snapshot = getShareSnapshot(token);
  if (!snapshot) {
    return NextResponse.json({ error: 'Share link not found or expired' }, { status: 404 });
  }

  return NextResponse.json({
    ok: true,
    title: snapshot.title,
    previewManifest: snapshot.previewManifest,
    createdAt: snapshot.createdAt,
    expiresAt: snapshot.expiresAt || null,
  });
}
