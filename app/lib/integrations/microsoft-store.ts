import { decryptSecret, encryptSecret } from '@/lib/integrations/token-crypto';
import { refreshMicrosoftToken, refreshMicrosoftTokenForScope } from '@/lib/integrations/microsoft';

type ConnectionRow = {
  id: string;
  user_id: string;
  provider: 'microsoft';
  account_email: string | null;
  provider_account_id: string | null;
  scope: string | null;
  access_token_encrypted: string;
  refresh_token_encrypted: string | null;
  expires_at: string | null;
  metadata: Record<string, any> | null;
};

export async function getMicrosoftConnection(supabase: any, userId: string): Promise<ConnectionRow | null> {
  const { data, error } = await (supabase as any)
    .from('external_account_connections')
    .select(
      'id, user_id, provider, account_email, provider_account_id, scope, access_token_encrypted, refresh_token_encrypted, expires_at, metadata'
    )
    .eq('user_id', userId)
    .eq('provider', 'microsoft')
    .maybeSingle();

  if (error) {
    const message = String(error?.message || '');
    if (message.toLowerCase().includes('does not exist')) return null;
    throw new Error(message || 'Failed to read Microsoft connection');
  }

  return (data as ConnectionRow | null) || null;
}

export async function upsertMicrosoftConnection(
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
    provider: 'microsoft',
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

  if (error) throw new Error(error.message || 'Failed to store Microsoft connection');
}

export async function deleteMicrosoftConnection(supabase: any, userId: string) {
  const { error } = await (supabase as any)
    .from('external_account_connections')
    .delete()
    .eq('user_id', userId)
    .eq('provider', 'microsoft');
  if (error) {
    const message = String(error?.message || '');
    if (message.toLowerCase().includes('does not exist')) return;
    throw new Error(message || 'Failed to disconnect Microsoft');
  }
}

function isExpiringSoon(expiresAt: string | null) {
  if (!expiresAt) return false;
  const expiresTs = new Date(expiresAt).getTime();
  if (Number.isNaN(expiresTs)) return false;
  return expiresTs - Date.now() < 60_000;
}

export async function getValidMicrosoftAccessToken(supabase: any, userId: string) {
  const connection = await getMicrosoftConnection(supabase, userId);
  if (!connection) return null;

  const currentAccessToken = decryptSecret(connection.access_token_encrypted);
  if (!isExpiringSoon(connection.expires_at)) {
    console.info('[microsoft-token] using-current-access-token', {
      userId,
      expiresAt: connection.expires_at,
    });
    return {
      accessToken: currentAccessToken,
      connection,
    };
  }

  const refreshToken = connection.refresh_token_encrypted ? decryptSecret(connection.refresh_token_encrypted) : '';
  if (!refreshToken) {
    console.warn('[microsoft-token] no-refresh-token-available', {
      userId,
      expiresAt: connection.expires_at,
    });
    return {
      accessToken: currentAccessToken,
      connection,
    };
  }

  console.info('[microsoft-token] refreshing-access-token', {
    userId,
    expiresAt: connection.expires_at,
  });
  const refreshed = await refreshMicrosoftToken(refreshToken);
  const nextExpiresAt = new Date(Date.now() + Number(refreshed.expires_in || 3600) * 1000).toISOString();
  await upsertMicrosoftConnection(supabase, {
    userId,
    accountEmail: connection.account_email,
    providerAccountId: connection.provider_account_id,
    scope: refreshed.scope || connection.scope,
    accessToken: refreshed.access_token,
    refreshToken: refreshed.refresh_token || refreshToken,
    expiresAt: nextExpiresAt,
    metadata: connection.metadata || {},
  });

  console.info('[microsoft-token] refresh-success', {
    userId,
    nextExpiresAt,
    scope: refreshed.scope || connection.scope || null,
  });
  return {
    accessToken: refreshed.access_token,
    connection: await getMicrosoftConnection(supabase, userId),
  };
}

function normalizeResourceScope(resource: string) {
  const trimmed = String(resource || '').trim().replace(/\/+$/, '');
  if (!trimmed) return null;
  return `${trimmed}/.default offline_access`;
}

function resourceScopeCandidates(resource: string) {
  const trimmed = String(resource || '').trim().replace(/\/+$/, '');
  if (!trimmed) return [] as string[];
  if (trimmed === 'https://api.onedrive.com') {
    return [
      'OneDrive.ReadOnly offline_access',
      'OneDrive.ReadWrite offline_access',
      `${trimmed}/.default offline_access`,
    ];
  }
  return [`${trimmed}/.default offline_access`];
}

export async function getMicrosoftAccessTokenForResource(
  supabase: any,
  userId: string,
  resource: string | null | undefined
) {
  const base = await getValidMicrosoftAccessToken(supabase, userId);
  if (!base?.accessToken) return null;

  const targetResource = String(resource || '').trim();
  if (!targetResource || targetResource.includes('graph.microsoft.com')) {
    return { ...base, tokenKind: 'base' as const };
  }

  const connection = base.connection;
  const refreshToken = connection?.refresh_token_encrypted ? decryptSecret(connection.refresh_token_encrypted) : '';
  if (!refreshToken) {
    console.warn('[microsoft-token] resource-token-fallback-no-refresh-token', {
      userId,
      resource: targetResource,
      scope: connection?.scope || null,
    });
    return { ...base, tokenKind: 'base' as const };
  }

  const candidates = resourceScopeCandidates(targetResource);
  for (const scopeCandidate of candidates) {
    try {
      const refreshed = await refreshMicrosoftTokenForScope(refreshToken, scopeCandidate);
      console.info('[microsoft-token] resource-token-success', {
        userId,
        resource: targetResource,
        scopeRequested: scopeCandidate,
        returnedScope: refreshed.scope || null,
      });
      return {
        accessToken: refreshed.access_token,
        connection: {
          ...connection,
          scope: refreshed.scope || connection?.scope || null,
        },
        tokenKind: 'resource' as const,
      };
    } catch (error: any) {
      console.warn('[microsoft-token] resource-token-attempt-failed', {
        userId,
        resource: targetResource,
        scopeRequested: scopeCandidate,
        message: String(error?.message || 'unknown'),
      });
    }
  }

  console.warn('[microsoft-token] resource-token-fallback-failed', {
    userId,
    resource: targetResource,
    scopeRequested: candidates,
  });
  return { ...base, tokenKind: 'base' as const };
}
