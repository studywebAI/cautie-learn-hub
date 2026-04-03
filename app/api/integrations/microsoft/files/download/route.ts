import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isEnabledIntegrationAppId, getIntegrationAppById } from '@/lib/integrations/catalog';
import { createClient } from '@/lib/supabase/server';
import { getValidMicrosoftAccessToken } from '@/lib/integrations/microsoft-store';
import { checkRateLimit } from '@/lib/security/request-guards';
import { downloadMicrosoftFile } from '@/lib/integrations/microsoft';

export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  kind: z.string().refine((value) => isEnabledIntegrationAppId(value), 'Unsupported app'),
});

function safeFileName(input: string) {
  const cleaned = input.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
  return cleaned || 'downloaded-file';
}

export async function POST(request: NextRequest) {
  try {
    const rateLimit = checkRateLimit(request, { key: 'ms-files-download', limit: 20, windowMs: 60_000 });
    if (!rateLimit.ok) return rateLimit.response;

    const parsed = RequestSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const app = getIntegrationAppById(parsed.data.kind);
    if (!app || app.provider !== 'microsoft' || !app.enabled) {
      return NextResponse.json({ error: 'Invalid app kind for Microsoft download' }, { status: 400 });
    }

    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const tokenState = await getValidMicrosoftAccessToken(supabase, user.id);
    if (!tokenState?.accessToken) {
      return NextResponse.json({ error: 'Microsoft account not connected' }, { status: 404 });
    }

    const downloaded = await downloadMicrosoftFile({
      accessToken: tokenState.accessToken,
      fileId: parsed.data.id,
    });

    return new NextResponse(downloaded.buffer, {
      status: 200,
      headers: {
        'Content-Type': downloaded.mimeType,
        'Content-Disposition': `attachment; filename="${safeFileName(parsed.data.name)}"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to download Microsoft file' },
      { status: 500 }
    );
  }
}

