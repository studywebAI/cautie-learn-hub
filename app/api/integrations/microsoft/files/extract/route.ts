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

function isImageLike(input: { name?: string; mimeType?: string }) {
  const name = String(input.name || '').toLowerCase();
  const mime = String(input.mimeType || '').toLowerCase();
  return mime.startsWith('image/') || /\.(png|jpe?g|webp|gif|bmp|svg)$/.test(name);
}

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

    const itemIds = Array.from(new Set(parsed.data.items.map((item) => item.id)));
    const existingByProviderItemId = new Map<string, any>();
    try {
      const { data: existing } = await (supabase as any)
        .from('external_integration_sources')
        .select('provider_item_id, extracted_text, extraction_status, metadata')
        .eq('user_id', user.id)
        .eq('provider', 'microsoft')
        .eq('app', 'onedrive')
        .in('provider_item_id', itemIds);
      for (const row of Array.isArray(existing) ? existing : []) {
        const key = String(row?.provider_item_id || '');
        if (!key) continue;
        existingByProviderItemId.set(key, row);
      }
    } catch {
      // Keep extraction resilient if source storage is unavailable.
    }

    const extracted = await Promise.all(
      parsed.data.items.map(async (item) => {
        const cached = existingByProviderItemId.get(item.id);
        const cachedText = typeof cached?.extracted_text === 'string' ? cached.extracted_text : '';
        const cachedStatus = String(cached?.extraction_status || '').toLowerCase();
        const cachedPreviewUrl = typeof cached?.metadata?.preview_url === 'string' ? cached.metadata.preview_url : '';
        const canReuse = cachedStatus === 'ready' || cachedStatus === 'empty';

        if (canReuse) {
          return {
            id: item.id,
            name: item.name,
            kind: item.kind,
            webUrl: item.webUrl || null,
            mimeType: item.mimeType || null,
            extractedText: cachedText,
            previewUrl: cachedPreviewUrl || null,
          };
        }

        const shouldSkipTextExtraction = isImageLike({ name: item.name, mimeType: item.mimeType });
        const [text, previewUrl] = await Promise.all([
          shouldSkipTextExtraction
            ? Promise.resolve('')
            : extractMicrosoftFileText({
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
