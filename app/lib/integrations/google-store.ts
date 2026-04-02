import { decryptSecret, encryptSecret } from '@/lib/integrations/token-crypto';

type GoogleConnectionRow = {
  id: string;
  user_id: string;
  provider: 'google';
  account_email: string | null;
  provider_account_id: string | null;
  scope: string | null;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  expires_at: string | null;
  metadata: Record<string, any> | null;
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function isExpiringSoon(expiresAt: string | null) {
  if (!expiresAt) return false;
  const expiresTs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresTs)) return false;
  return expiresTs - Date.now() < 60_000;
}

export async function getGoogleConnection(supabase: any, userId: string): Promise<GoogleConnectionRow | null> {
  const { data, error } = await (supabase as any)
    .from('external_account_connections')
    .select(
      'id, user_id, provider, account_email, provider_account_id, scope, access_token_encrypted, refresh_token_encrypted, expires_at, metadata'
    )
    .eq('user_id', userId)
    .eq('provider', 'google')
    .maybeSingle();

  if (error) {
    const message = String(error?.message || '');
    if (message.toLowerCase().includes('does not exist')) return null;
    throw new Error(message || 'Failed to read Google connection');
  }
  return (data as GoogleConnectionRow | null) || null;
}

export async function upsertGoogleConnection(
  supabase: any,
  input: {
    userId: string;
    accountEmail?: string | null;
    providerAccountId?: string | null;
    scope?: string | null;
    accessToken: string;
    refreshToken?: string | null;
    expiresAt?: string | null;
    metadata?: Record<string, any>;
  }
) {
  const payload = {
    user_id: input.userId,
    provider: 'google',
    account_email: input.accountEmail || null,
    provider_account_id: input.providerAccountId || null,
    scope: input.scope || null,
    access_token_encrypted: encryptSecret(input.accessToken),
    refresh_token_encrypted: input.refreshToken ? encryptSecret(input.refreshToken) : null,
    expires_at: input.expiresAt || null,
    metadata: input.metadata || {},
    updated_at: new Date().toISOString(),
  };

  const { error } = await (supabase as any)
    .from('external_account_connections')
    .upsert(payload, { onConflict: 'user_id,provider' });

  if (error) throw new Error(error.message || 'Failed to store Google connection');
}

async function refreshGoogleToken(refreshToken: string) {
  const clientId = requireEnv('GOOGLE_CLIENT_ID');
  const clientSecret = requireEnv('GOOGLE_CLIENT_SECRET');
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }).toString(),
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error_description || payload?.error || 'Google token refresh failed';
    throw new Error(message);
  }
  return payload as { access_token: string; expires_in: number; scope?: string; token_type?: string };
}

export async function getValidGoogleAccessToken(supabase: any, userId: string) {
  const connection = await getGoogleConnection(supabase, userId);
  if (!connection) return null;

  const currentAccessToken = decryptSecret(connection.access_token_encrypted);
  if (!isExpiringSoon(connection.expires_at)) {
    return {
      accessToken: currentAccessToken,
      connection,
    };
  }

  const refreshToken = connection.refresh_token_encrypted ? decryptSecret(connection.refresh_token_encrypted) : '';
  if (!refreshToken) {
    return {
      accessToken: currentAccessToken,
      connection,
    };
  }

  const refreshed = await refreshGoogleToken(refreshToken);
  const nextExpiresAt = new Date(Date.now() + Number(refreshed.expires_in || 3600) * 1000).toISOString();

  await upsertGoogleConnection(supabase, {
    userId,
    accountEmail: connection.account_email,
    providerAccountId: connection.provider_account_id,
    scope: refreshed.scope || connection.scope,
    accessToken: refreshed.access_token,
    refreshToken,
    expiresAt: nextExpiresAt,
    metadata: connection.metadata || {},
  });

  return {
    accessToken: refreshed.access_token,
    connection: await getGoogleConnection(supabase, userId),
  };
}
