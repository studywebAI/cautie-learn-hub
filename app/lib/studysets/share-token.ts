import { createHmac, timingSafeEqual } from 'crypto';

type ShareTokenPayload = {
  studysetId: string;
  ownerUserId: string;
  iat: number;
  exp: number;
};

function getSecret() {
  return (
    process.env.STUDYSET_SHARE_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'local-dev-studyset-share-secret'
  );
}

function base64UrlEncode(value: string) {
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function signSegment(segment: string) {
  return createHmac('sha256', getSecret()).update(segment).digest('base64url');
}

export function createStudysetShareToken(input: {
  studysetId: string;
  ownerUserId: string;
  ttlSeconds?: number;
}) {
  const now = Math.floor(Date.now() / 1000);
  const payload: ShareTokenPayload = {
    studysetId: String(input.studysetId),
    ownerUserId: String(input.ownerUserId),
    iat: now,
    exp: now + Math.max(60, Number(input.ttlSeconds || 60 * 60 * 24 * 30)),
  };
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signSegment(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyStudysetShareToken(token: string) {
  const parts = String(token || '').split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, incomingSig] = parts;
  if (!encodedPayload || !incomingSig) return null;

  const expectedSig = signSegment(encodedPayload);
  const a = Buffer.from(incomingSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  let parsed: ShareTokenPayload;
  try {
    parsed = JSON.parse(base64UrlDecode(encodedPayload));
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (!parsed?.studysetId || !parsed?.ownerUserId || !parsed?.exp || now > Number(parsed.exp)) {
    return null;
  }
  return parsed;
}
