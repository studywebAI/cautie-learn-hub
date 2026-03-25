import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getValidMicrosoftAccessToken } from '@/lib/integrations/microsoft-store';
import { checkRateLimit } from '@/lib/security/request-guards';

export const dynamic = 'force-dynamic';

type DriveProbe = {
  driveType?: string;
  webUrl?: string;
};

function getOrigin(request: NextRequest) {
  return request.nextUrl.origin || process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
}

function resolvePickerBaseUrl(drive: DriveProbe, endpointHint: string | null) {
  const webUrl = String(drive?.webUrl || '');
  const driveType = String(drive?.driveType || '').toLowerCase();

  if (webUrl.includes('onedrive.live.com') || driveType === 'personal') {
    return { baseUrl: 'https://onedrive.live.com/picker', kind: 'consumer' as const };
  }

  if (webUrl) {
    try {
      const url = new URL(webUrl);
      return { baseUrl: `${url.origin}`, kind: 'sharepoint' as const };
    } catch {
      // fall through
    }
  }

  if (endpointHint) {
    try {
      const url = new URL(endpointHint);
      return { baseUrl: `${url.origin}`, kind: 'sharepoint' as const };
    } catch {
      // fall through
    }
  }

  return { baseUrl: 'https://onedrive.live.com/picker', kind: 'consumer' as const };
}

export async function GET(request: NextRequest) {
  const requestId = crypto.randomUUID();
  const rateLimit = checkRateLimit(request, { key: 'ms-picker-bootstrap', limit: 60, windowMs: 60_000 });
  if (!rateLimit.ok) return rateLimit.response;

  try {
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

    const endpointHint = typeof tokenState.connection?.metadata?.endpoint_hint === 'string'
      ? String(tokenState.connection.metadata.endpoint_hint)
      : null;

    const driveProbeRes = await fetch('https://graph.microsoft.com/v1.0/me/drive?$select=driveType,webUrl', {
      headers: { Authorization: `Bearer ${tokenState.accessToken}` },
      cache: 'no-store',
    });
    const driveProbe = await driveProbeRes.json().catch(() => ({})) as DriveProbe;
    const rootChildrenRes = await fetch('https://graph.microsoft.com/v1.0/me/drive/root/children?$top=1', {
      headers: { Authorization: `Bearer ${tokenState.accessToken}` },
      cache: 'no-store',
    }).catch(() => null);
    const recentRes = await fetch('https://graph.microsoft.com/v1.0/me/drive/recent?$top=1', {
      headers: { Authorization: `Bearer ${tokenState.accessToken}` },
      cache: 'no-store',
    }).catch(() => null);
    const rootChildrenPayload = await rootChildrenRes?.json().catch(() => ({}));
    const recentPayload = await recentRes?.json().catch(() => ({}));
    const rootChildrenCount = Array.isArray(rootChildrenPayload?.value) ? rootChildrenPayload.value.length : 0;
    const recentCount = Array.isArray(recentPayload?.value) ? recentPayload.value.length : 0;
    const useRecentEntry = rootChildrenCount === 0 && recentCount > 0;

    const { baseUrl, kind } = resolvePickerBaseUrl(driveProbe, endpointHint);
    const channelId = crypto.randomUUID();
    const origin = getOrigin(request);
    const pickerOptions = {
      sdk: '8.0',
      entry: useRecentEntry ? { oneDrive: { recent: {} } } : { oneDrive: { files: {} } },
      authentication: {},
      messaging: {
        origin,
        channelId,
      },
    };
    const queryString = new URLSearchParams({
      filePicker: JSON.stringify(pickerOptions),
      locale: 'en-us',
    }).toString();
    const action = kind === 'consumer'
      ? `${baseUrl}?${queryString}`
      : `${baseUrl}/_layouts/15/FilePicker.aspx?${queryString}`;

    console.info('[microsoft-picker-bootstrap] ok', {
      requestId,
      userId: user.id,
      kind,
      baseUrl,
      actionHost: (() => {
        try {
          return new URL(action).host;
        } catch {
          return null;
        }
      })(),
      channelId,
      rootChildrenCount,
      recentCount,
      useRecentEntry,
      scope: tokenState.connection?.scope || null,
      tokenExpiresAt: tokenState.connection?.expires_at || null,
    });

    return NextResponse.json({
      channelId,
      kind,
      baseUrl,
      action,
      options: pickerOptions,
      accessToken: tokenState.accessToken,
      scope: tokenState.connection?.scope || null,
      accountEmail: tokenState.connection?.account_email || null,
    });
  } catch (error: any) {
    console.error('[microsoft-picker-bootstrap] failed', {
      requestId,
      message: String(error?.message || 'unknown'),
      stack: error?.stack || null,
    });
    return NextResponse.json({ error: 'Failed to initialize OneDrive picker' }, { status: 500 });
  }
}
