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
  const response = await fetch(`${MICROSOFT_AUTH_BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error_description || payload?.error || 'Microsoft token exchange failed';
    throw new Error(message);
  }

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

export type MicrosoftFileKind = 'word' | 'powerpoint';

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

  return items.filter((item) => item.kind === input.kind);
}
