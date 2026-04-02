import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createShareSnapshot } from '@/lib/presentation/share-store';
import { PreviewManifest } from '@/lib/presentation/types';

export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  title: z.string().min(1),
  previewManifest: z.custom<PreviewManifest>(),
  expiresInHours: z.number().min(1).max(720).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const parsed = RequestSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 });
    }

    const snapshot = createShareSnapshot({
      title: parsed.data.title,
      previewManifest: parsed.data.previewManifest,
      expiresInHours: parsed.data.expiresInHours,
    });

    const baseUrl = req.nextUrl.origin;
    return NextResponse.json({
      ok: true,
      token: snapshot.token,
      shareUrl: `${baseUrl}/p/${snapshot.token}`,
      expiresAt: snapshot.expiresAt || null,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to publish preview link' }, { status: 500 });
  }
}
