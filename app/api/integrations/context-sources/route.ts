import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getValidMicrosoftAccessToken } from '@/lib/integrations/microsoft-store';
import { extractMicrosoftFileText } from '@/lib/integrations/microsoft';
import {
  clearSelectedIntegrationSources,
  listIntegrationSources,
  upsertIntegrationSource,
} from '@/lib/integrations/source-store';
import { checkRateLimit } from '@/lib/security/request-guards';

export const dynamic = 'force-dynamic';

const ItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  mimeType: z.string().optional(),
  webUrl: z.string().optional(),
});

const PostBodySchema = z.object({
  provider: z.enum(['microsoft']),
  app: z.enum(['word', 'powerpoint', 'excel']),
  items: z.array(ItemSchema).min(1).max(15),
  replaceSelection: z.boolean().optional().default(true),
});

function normalizeSourceStoreError(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes('external_integration_sources')) {
    return 'Integration source storage is not set up yet.';
  }
  return message;
}

export async function GET(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(request, { key: 'integration-sources-get', limit: 80, windowMs: 60_000 });
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

    const provider = request.nextUrl.searchParams.get('provider') || undefined;
    const app = request.nextUrl.searchParams.get('app') || undefined;
    const selectedOnly = request.nextUrl.searchParams.get('selected') === '1';

    const items = await listIntegrationSources(supabase, user.id, {
      provider,
      app,
      selectedOnly,
      limit: 50,
    });

    return NextResponse.json({ items });
  } catch (error: any) {
    const message = normalizeSourceStoreError(String(error?.message || 'Failed to get integration sources'));
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(request, { key: 'integration-sources-post', limit: 20, windowMs: 60_000 });
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

    const parsed = PostBodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload', details: parsed.error.issues }, { status: 400 });
    }
    const body = parsed.data;

    if (body.replaceSelection) {
      await clearSelectedIntegrationSources(supabase, {
        userId: user.id,
        provider: body.provider,
        app: body.app,
      });
    }

    if (body.provider !== 'microsoft') {
      return NextResponse.json({ error: 'Provider not supported yet' }, { status: 400 });
    }

    const tokenState = await getValidMicrosoftAccessToken(supabase, user.id);
    if (!tokenState) {
      return NextResponse.json({ error: 'Microsoft account not connected' }, { status: 404 });
    }

    const results = [];
    for (const item of body.items) {
      const extractedText = await extractMicrosoftFileText({
        accessToken: tokenState.accessToken,
        fileId: item.id,
        kind: body.app,
      }).catch(() => '');

      const status = extractedText.trim().length > 0 ? 'ready' : 'empty';
      const source = await upsertIntegrationSource(supabase, {
        userId: user.id,
        provider: body.provider,
        app: body.app,
        providerItemId: item.id,
        name: item.name,
        mimeType: item.mimeType || null,
        webUrl: item.webUrl || null,
        extractedText: extractedText || null,
        extractionStatus: status,
        isSelected: true,
        metadata: {
          imported_at: new Date().toISOString(),
        },
      });
      results.push(source);
    }

    return NextResponse.json({ items: results });
  } catch (error: any) {
    const message = normalizeSourceStoreError(String(error?.message || 'Failed to save integration sources'));
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
