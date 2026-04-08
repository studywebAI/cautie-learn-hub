import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ENCRYPTION_PREFIX = "v1";

function resolveRawKey(): Buffer {
  const raw = process.env.AI_SECRETS_ENCRYPTION_KEY;
  if (!raw || !raw.trim()) {
    throw new Error("Missing AI_SECRETS_ENCRYPTION_KEY");
  }

  const trimmed = raw.trim();
  if (/^[0-9a-fA-F]{64}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }

  const b64 = Buffer.from(trimmed, "base64");
  if (b64.length === 32) {
    return b64;
  }

  return createHash("sha256").update(trimmed).digest();
}

function getKey(): Buffer {
  const key = resolveRawKey();
  if (key.length !== 32) {
    throw new Error("Invalid AI_SECRETS_ENCRYPTION_KEY length");
  }
  return key;
}

export function encryptSecret(plaintext: string): string {
  const value = plaintext.trim();
  if (!value) return "";

  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    ENCRYPTION_PREFIX,
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptSecret(payload: string | null | undefined): string {
  const raw = String(payload || "").trim();
  if (!raw) return "";

  const [prefix, ivB64, tagB64, dataB64] = raw.split(":");
  if (prefix !== ENCRYPTION_PREFIX || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Invalid encrypted secret format");
  }

  const key = getKey();
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ciphertext = Buffer.from(dataB64, "base64");

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  return plaintext.trim();
}
