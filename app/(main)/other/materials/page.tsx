'use client';

import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';

type MaterialKind = 'text' | 'file' | 'image' | 'onedrive';

type MaterialEntry = {
  id: string;
  title: string;
  type: MaterialKind;
  preview: string;
  detail: string;
  dateIso: string;
};

const MATERIALS_STORAGE_KEY = 'tools.source_input.materials.v1';

export default function OtherMaterialsPage() {
  const [materials, setMaterials] = useState<MaterialEntry[]>([]);
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(MATERIALS_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return;
      const safe: MaterialEntry[] = parsed
        .filter((item: any) => item && typeof item.id === 'string')
        .map((item: any) => ({
          id: String(item.id),
          title: String(item.title || 'Untitled'),
          type: (item.type || 'text') as MaterialKind,
          preview: String(item.preview || ''),
          detail: String(item.detail || ''),
          dateIso: String(item.dateIso || new Date().toISOString()),
        }));
      safe.sort((a, b) => new Date(b.dateIso).getTime() - new Date(a.dateIso).getTime());
      setMaterials(safe);
    } catch {
      setMaterials([]);
    }
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return materials;
    return materials.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.detail.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
    );
  }, [materials, search]);

  const selectedMaterial = useMemo(
    () => filtered.find((item) => item.id === selectedId) || filtered[0] || null,
    [filtered, selectedId]
  );

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto w-full max-w-7xl p-4 md:p-6">
        <div className="mb-4">
          <h1 className="text-xl font-semibold">Materials</h1>
          <p className="text-sm text-muted-foreground">Auto-saved files, images, OneDrive docs, and text sources.</p>
        </div>

        <section className="rounded-2xl border border-border bg-card p-3">
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search materials..."
              className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No materials yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                {filtered.map((material) => {
                  const selected = material.id === selectedMaterial?.id;
                  return (
                    <button
                      key={material.id}
                      type="button"
                      onClick={() => setSelectedId(material.id)}
                      className={`rounded-xl border p-2 text-left transition-colors ${
                        selected
                          ? 'border-[hsl(var(--sidebar-accent)/0.9)] bg-[hsl(var(--sidebar-accent)/0.14)]'
                          : 'border-border bg-background hover:bg-muted/40'
                      }`}
                    >
                      <p className="truncate text-xs font-medium">{material.title}</p>
                      <div className="mt-1 rounded-md border border-border bg-muted/40 p-2">
                        <div className="h-24 overflow-hidden rounded bg-background p-1 text-[10px] text-muted-foreground">
                          {material.type === 'image' ? (
                            <img src={material.preview} alt={material.title} className="h-full w-full object-cover" />
                          ) : (
                            <pre className="whitespace-pre-wrap break-words font-sans">{material.preview || 'No preview'}</pre>
                          )}
                        </div>
                      </div>
                      <p className="mt-1 text-[10px] text-muted-foreground">{material.type}</p>
                      <p className="text-[10px] text-muted-foreground">{new Date(material.dateIso).toLocaleString()}</p>
                    </button>
                  );
                })}
              </div>

              {selectedMaterial && (
                <aside className="rounded-xl border border-border bg-background p-3">
                  <p className="text-sm font-medium">{selectedMaterial.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{selectedMaterial.type}</p>
                  <p className="text-xs text-muted-foreground">{new Date(selectedMaterial.dateIso).toLocaleString()}</p>
                  <div className="mt-3 rounded-md border border-border bg-muted/30 p-2">
                    {selectedMaterial.type === 'image' ? (
                      <img src={selectedMaterial.preview} alt={selectedMaterial.title} className="h-40 w-full rounded object-cover" />
                    ) : (
                      <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-words text-xs font-sans">
                        {selectedMaterial.detail || selectedMaterial.preview || 'No content'}
                      </pre>
                    )}
                  </div>
                </aside>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
