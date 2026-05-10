export type ClassShareAudience = 'all' | 'teacher';

export type ClassShareRow = {
  id: string;
  text: string;
  attachmentLabel?: string;
  authorName?: string;
  createdAt?: string;
};

type RawShareRow = {
  id?: unknown;
  text?: unknown;
  attachmentLabel?: unknown;
  authorName?: unknown;
  createdAt?: unknown;
};

export function normalizeClassShareRows(input: unknown): ClassShareRow[] {
  const rows = Array.isArray(input) ? input : [];
  return rows
    .map((raw) => {
      const row = (raw || {}) as RawShareRow;
      return {
        id: String(row.id || '').trim(),
        text: String(row.text || '').trim(),
        attachmentLabel: row.attachmentLabel ? String(row.attachmentLabel).trim() : undefined,
        authorName: row.authorName ? String(row.authorName).trim() : undefined,
        createdAt: row.createdAt ? String(row.createdAt) : undefined,
      } as ClassShareRow;
    })
    .filter((row) => Boolean(row.id) && Boolean(row.text || row.attachmentLabel));
}

export async function fetchClassShareRows(classId: string, audience: ClassShareAudience = 'all') {
  const resolvedClassId = String(classId || '').trim();
  if (!resolvedClassId) return [] as ClassShareRow[];

  const response = await fetch(`/api/classes/${resolvedClassId}/share?audience=${audience}`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`Could not load class share (${response.status})`);
  }

  const payload = await response.json().catch(() => ({}));
  return normalizeClassShareRows(payload?.rows || []);
}

export async function postClassShareItem(input: {
  classId: string;
  text: string;
  attachmentLabel?: string;
  audience?: ClassShareAudience;
}) {
  const classId = String(input.classId || '').trim();
  const text = String(input.text || '').trim();
  const attachmentLabel = String(input.attachmentLabel || '').trim();
  const audience: ClassShareAudience = input.audience === 'teacher' ? 'teacher' : 'all';

  if (!classId) throw new Error('Class ID is required');
  if (!text && !attachmentLabel) throw new Error('Message or attachment is required');

  const response = await fetch(`/api/classes/${classId}/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      audience,
      text,
      attachmentLabel: attachmentLabel || undefined,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(String(payload?.error || 'Failed to post class share item'));
  }
}

