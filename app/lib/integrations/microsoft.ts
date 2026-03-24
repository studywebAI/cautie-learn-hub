type MicrosoftTokenResponse = {
  token_type: string;
  scope?: string;
  expires_in: number;
  access_token: string;
  refresh_token?: string;
};

const MICROSOFT_AUTH_BASE = 'https://login.microsoftonline.com/common/oauth2/v2.0';
const MICROSOFT_GRAPH_BASE = 'https://graph.microsoft.com/v1.0';
const MICROSOFT_SCOPES = ['offline_access', 'User.Read', 'Files.Read'];

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

export function getMicrosoftAuthConfig() {
  return {
    clientId: requireEnv('MICROSOFT_CLIENT_ID'),
    clientSecret: requireEnv('MICROSOFT_CLIENT_SECRET'),
    scopes: MICROSOFT_SCOPES.join(' '),
  };
}

export function buildMicrosoftAuthUrl(input: { redirectUri: string; state: string }) {
  const { clientId, scopes } = getMicrosoftAuthConfig();
  const url = new URL(`${MICROSOFT_AUTH_BASE}/authorize`);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('redirect_uri', input.redirectUri);
  url.searchParams.set('response_mode', 'query');
  url.searchParams.set('scope', scopes);
  url.searchParams.set('state', input.state);
  url.searchParams.set('prompt', 'select_account');
  return url.toString();
}

async function postToken(params: URLSearchParams) {
  console.info('[microsoft-oauth] token-request', {
    grantType: params.get('grant_type'),
    hasClientId: Boolean(params.get('client_id')),
    hasClientSecret: Boolean(params.get('client_secret')),
    hasCode: Boolean(params.get('code')),
    hasRefreshToken: Boolean(params.get('refresh_token')),
  });
  const response = await fetch(`${MICROSOFT_AUTH_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error_description || payload?.error || 'Microsoft token exchange failed';
    console.error('[microsoft-oauth] token-failed', {
      status: response.status,
      message,
      error: payload?.error || null,
    });
    throw new Error(message);
  }

  console.info('[microsoft-oauth] token-success', {
    tokenType: payload?.token_type || null,
    expiresIn: payload?.expires_in || null,
    hasRefreshToken: Boolean(payload?.refresh_token),
  });

  return payload as MicrosoftTokenResponse;
}

export async function exchangeMicrosoftCodeForToken(input: { code: string; redirectUri: string }) {
  const { clientId, clientSecret, scopes } = getMicrosoftAuthConfig();
  const params = new URLSearchParams();
  params.set('client_id', clientId);
  params.set('client_secret', clientSecret);
  params.set('grant_type', 'authorization_code');
  params.set('code', input.code);
  params.set('redirect_uri', input.redirectUri);
  params.set('scope', scopes);
  return postToken(params);
}

export async function refreshMicrosoftToken(refreshToken: string) {
  const { clientId, clientSecret, scopes } = getMicrosoftAuthConfig();
  const params = new URLSearchParams();
  params.set('client_id', clientId);
  params.set('client_secret', clientSecret);
  params.set('grant_type', 'refresh_token');
  params.set('refresh_token', refreshToken);
  params.set('scope', scopes);
  return postToken(params);
}

export async function fetchMicrosoftProfile(accessToken: string) {
  const response = await fetch(`${MICROSOFT_GRAPH_BASE}/me?$select=id,displayName,mail,userPrincipalName`, {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || 'Failed to fetch Microsoft profile';
    throw new Error(message);
  }
  return payload as { id?: string; displayName?: string; mail?: string; userPrincipalName?: string };
}

export type MicrosoftFileKind = 'word' | 'powerpoint' | 'excel' | 'onedrive';

export type MicrosoftFileItem = {
  id: string;
  name: string;
  webUrl?: string;
  size?: number;
  lastModifiedDateTime?: string;
  kind: MicrosoftFileKind;
  mimeType?: string;
};

function detectKind(name?: string, mimeType?: string): MicrosoftFileKind | null {
  const n = (name || '').toLowerCase();
  const m = (mimeType || '').toLowerCase();
  const isWord =
    n.endsWith('.doc') ||
    n.endsWith('.docx') ||
    m.includes('wordprocessingml') ||
    m === 'application/msword';
  if (isWord) return 'word';

  const isPowerPoint =
    n.endsWith('.ppt') ||
    n.endsWith('.pptx') ||
    m.includes('presentationml') ||
    m === 'application/vnd.ms-powerpoint';
  if (isPowerPoint) return 'powerpoint';

  const isExcel =
    n.endsWith('.xls') ||
    n.endsWith('.xlsx') ||
    m.includes('spreadsheetml') ||
    m === 'application/vnd.ms-excel';
  if (isExcel) return 'excel';

  return null;
}

export async function listMicrosoftFiles(input: { accessToken: string; kind: MicrosoftFileKind; query?: string }) {
  const endpointUrl = input.query?.trim()
    ? new URL(`${MICROSOFT_GRAPH_BASE}/me/drive/root/search(q='${input.query.trim().replace(/'/g, "''")}')`)
    : new URL(`${MICROSOFT_GRAPH_BASE}/me/drive/recent`);
  endpointUrl.searchParams.set('$top', '40');

  const response = await fetch(endpointUrl.toString(), {
    headers: { Authorization: `Bearer ${input.accessToken}` },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || 'Failed to list Microsoft files';
    console.error('[microsoft-graph] list-files-failed', {
      kind: input.kind,
      query: input.query || '',
      status: response.status,
      message,
    });
    throw new Error(message);
  }

  const values = Array.isArray(payload?.value) ? payload.value : [];
  const items: MicrosoftFileItem[] = values
    .map((item: any) => {
      const kind = detectKind(item?.name, item?.file?.mimeType);
      if (!kind) return null;
      return {
        id: String(item.id),
        name: String(item.name || 'Untitled'),
        webUrl: item.webUrl ? String(item.webUrl) : undefined,
        size: typeof item.size === 'number' ? item.size : undefined,
        lastModifiedDateTime: item.lastModifiedDateTime ? String(item.lastModifiedDateTime) : undefined,
        kind,
        mimeType: item?.file?.mimeType ? String(item.file.mimeType) : undefined,
      } as MicrosoftFileItem;
    })
    .filter(Boolean) as MicrosoftFileItem[];

  if (input.kind === 'onedrive') {
    console.info('[microsoft-graph] list-files-success', {
      kind: input.kind,
      query: input.query || '',
      count: items.length,
    });
    return items;
  }
  const filtered = items.filter((item) => item.kind === input.kind);
  console.info('[microsoft-graph] list-files-success', {
    kind: input.kind,
    query: input.query || '',
    count: filtered.length,
    unfilteredCount: items.length,
  });
  return filtered;
}

export async function extractMicrosoftFileText(input: {
  accessToken: string;
  fileId: string;
  kind: MicrosoftFileKind;
}) {
  const fileId = encodeURIComponent(input.fileId);
  const textEndpoint = `${MICROSOFT_GRAPH_BASE}/me/drive/items/${fileId}/content?format=text`;

  const textResponse = await fetch(textEndpoint, {
    headers: { Authorization: `Bearer ${input.accessToken}` },
    cache: 'no-store',
  });

  if (textResponse.ok) {
    const asText = await textResponse.text();
    return asText.trim();
  }

  // Fallback: attempt normal content fetch and best-effort text decode.
  const binaryResponse = await fetch(`${MICROSOFT_GRAPH_BASE}/me/drive/items/${fileId}/content`, {
    headers: { Authorization: `Bearer ${input.accessToken}` },
    cache: 'no-store',
  });
  if (!binaryResponse.ok) {
    const payload = await binaryResponse.json().catch(() => ({}));
    const message = payload?.error?.message || 'Failed to load Microsoft file content';
    throw new Error(message);
  }

  const contentType = (binaryResponse.headers.get('content-type') || '').toLowerCase();
  if (contentType.startsWith('text/')) {
    return (await binaryResponse.text()).trim();
  }

  return '';
}
