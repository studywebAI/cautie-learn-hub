import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';

const ALGO = 'aes-256-gcm';

function getKeyMaterial() {
  const raw = process.env.INTEGRATION_TOKEN_ENCRYPTION_KEY || process.env.SUPABASE_SECRET_KEY || '';
  if (!raw) {
    throw new Error('Missing token encryption key');
  }
  return createHash('sha256').update(raw).digest();
}

export function encryptSecret(value: string) {
  if (!value) return '';
  const key = getKeyMaterial();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptSecret(payload: string | null | undefined) {
  if (!payload) return '';
  const [ivPart, tagPart, encryptedPart] = payload.split('.');
  if (!ivPart || !tagPart || !encryptedPart) {
    throw new Error('Invalid encrypted payload format');
  }
  const key = getKeyMaterial();
  const iv = Buffer.from(ivPart, 'base64url');
  const tag = Buffer.from(tagPart, 'base64url');
  const encrypted = Buffer.from(encryptedPart, 'base64url');
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}
