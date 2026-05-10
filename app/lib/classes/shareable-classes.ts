export type ShareableClassOption = {
  id: string;
  name: string;
};

export function extractShareableClasses(classesLike: unknown): ShareableClassOption[] {
  const input = Array.isArray(classesLike) ? classesLike : [];
  return input
    .filter((item: any) => item && item.status !== 'archived')
    .map((item: any) => ({
      id: String(item?.id || '').trim(),
      name: String(item?.name || 'Untitled class').trim() || 'Untitled class',
    }))
    .filter((item: ShareableClassOption) => Boolean(item.id));
}

