'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PreviewManifest } from '@/lib/presentation/types';

type SharePayload = {
  ok: boolean;
  title: string;
  previewManifest: PreviewManifest;
  expiresAt?: string | null;
};

export default function PublicPresentationPage() {
  const params = useParams<{ token: string }>();
  const token = String(params?.token || '');
  const [data, setData] = useState<SharePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    void fetch(`/api/tools/presentation/share/${token}`, { cache: 'no-store' })
      .then(async (response) => {
        if (!response.ok) {
          const payload = await response.json().catch(() => ({}));
          throw new Error(String(payload?.error || 'Could not load shared presentation'));
        }
        return response.json();
      })
      .then((json: SharePayload) => {
        if (cancelled) return;
        setData(json);
      })
      .catch((e: any) => {
        if (cancelled) return;
        setError(String(e?.message || 'Could not load shared presentation'));
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (error) {
    return (
      <div className="mx-auto max-w-5xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Shared preview unavailable</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">{error}</CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="mb-1 text-xl">{data.title}</h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Read-only preview • {data.previewManifest.slideCount} slides
      </p>

      <div className="space-y-4">
        {data.previewManifest.slides.map((slide) => (
          <div key={slide.slideId} className="overflow-hidden rounded-xl border surface-panel">
            <img
              src={slide.imageUrl}
              alt={`Slide ${slide.index}`}
              className="h-auto w-full"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
