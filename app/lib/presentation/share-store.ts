import { PreviewManifest } from '@/lib/presentation/types';

type ShareSnapshot = {
  token: string;
  title: string;
  previewManifest: PreviewManifest;
  createdAt: string;
  expiresAt?: string;
  revokedAt?: string;
};

const globalStore = globalThis as typeof globalThis & {
  __presentationShareStore?: Map<string, ShareSnapshot>;
};

function getStore() {
  if (!globalStore.__presentationShareStore) {
    globalStore.__presentationShareStore = new Map<string, ShareSnapshot>();
  }
  return globalStore.__presentationShareStore;
}

export function createShareSnapshot(input: {
  title: string;
  previewManifest: PreviewManifest;
  expiresInHours?: number;
}) {
  const token = crypto.randomUUID().replace(/-/g, '');
  const expiresAt =
    typeof input.expiresInHours === 'number' && input.expiresInHours > 0
      ? new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000).toISOString()
      : undefined;
  const snapshot: ShareSnapshot = {
    token,
    title: input.title,
    previewManifest: input.previewManifest,
    createdAt: new Date().toISOString(),
    expiresAt,
  };
  getStore().set(token, snapshot);
  return snapshot;
}

export function getShareSnapshot(token: string) {
  const snapshot = getStore().get(token);
  if (!snapshot) return null;
  if (snapshot.revokedAt) return null;
  if (snapshot.expiresAt && new Date(snapshot.expiresAt).getTime() < Date.now()) return null;
  return snapshot;
}

export function revokeShareSnapshot(token: string) {
  const snapshot = getStore().get(token);
  if (!snapshot) return false;
  snapshot.revokedAt = new Date().toISOString();
  getStore().set(token, snapshot);
  return true;
}
