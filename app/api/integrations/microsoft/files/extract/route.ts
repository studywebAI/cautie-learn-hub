import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getIntegrationAppById, isEnabledIntegrationAppId } from '@/lib/integrations/catalog';
import { createClient } from '@/lib/supabase/server';
import { getValidMicrosoftAccessToken } from '@/lib/integrations/microsoft-store';
import { extractMicrosoftFileText, fetchMicrosoftFileThumbnail } from '@/lib/integrations/microsoft';
import { checkRateLimit } from '@/lib/security/request-guards';

export const dynamic = 'force-dynamic';

const ItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.string().refine((value) => isEnabledIntegrationAppId(value), 'Unsupported app'),
  webUrl: z.string().optional(),
  mimeType: z.string().optional(),
});

const RequestSchema = z.object({
  items: z.array(ItemSchema).min(1).max(10),
});

export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(request, { key: 'ms-files-extract', limit: 20, windowMs: 60_000 });
    if (!rateLimit.ok) return rateLimit.response;

    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = RequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }
    const hasNonMicrosoftKind = parsed.data.items.some((item) => {
      const app = getIntegrationAppById(item.kind);
      return !app || app.provider !== 'microsoft' || !app.enabled;
    });
    if (hasNonMicrosoftKind) {
      return NextResponse.json({ error: 'Invalid app kind for Microsoft extraction' }, { status: 400 });
    }

    const tokenState = await getValidMicrosoftAccessToken(supabase, user.id);
    if (!tokenState) {
      return NextResponse.json({ error: 'Microsoft account not connected' }, { status: 404 });
    }

    const extracted = await Promise.all(
      parsed.data.items.map(async (item) => {
        const [text, previewUrl] = await Promise.all([
          extractMicrosoftFileText({
            accessToken: tokenState.accessToken,
            fileId: item.id,
            kind: item.kind as 'word' | 'powerpoint' | 'excel' | 'onedrive',
            fileName: item.name,
            mimeType: item.mimeType,
          }).catch(() => ''),
          fetchMicrosoftFileThumbnail({
            accessToken: tokenState.accessToken,
            fileId: item.id,
          }).catch(() => ''),
        ]);
        return {
          id: item.id,
          name: item.name,
          kind: item.kind,
          webUrl: item.webUrl || null,
          mimeType: item.mimeType || null,
          extractedText: text,
          previewUrl: previewUrl || null,
        };
      })
    );

    return NextResponse.json({ items: extracted });
  } catch {
    return NextResponse.json({ error: 'Failed to extract Microsoft file text' }, { status: 500 });
  }
}
