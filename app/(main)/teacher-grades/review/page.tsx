'use client';

import { useEffect, useState, useMemo, useContext, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ChevronLeft, ClipboardCheck, GraduationCap } from 'lucide-react';
import { CautieLoader } from '@/components/ui/cautie-loader';
import { PageHeader } from '@/components/page-header';

type QueueItem = {
  id: string;
  title: string;
  class_id: string;
  class_name: string;
  assignment_id: string | null;
  total_students: number;
  graded_count: number;
  pending_answers: number;
};

function ReviewQueueContent() {
  const context = useContext(AppContext) as AppContextType;
  const isDutch = context?.language === 'nl';
  const classes = context?.classes || [];
  const searchParams = useSearchParams();
  const router = useRouter();
  const mode = searchParams.get('mode') === 'becijferen' ? 'becijferen' : 'nakijken';

  const [nakijken, setNakijken] = useState<QueueItem[]>([]);
  const [becijferen, setBecijferen] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!classes.length) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const results = await Promise.allSettled(
        classes.map(async (cls: any) => {
          const res = await fetch(`/api/classes/${cls.id}/grades/review-queue`);
          if (!res.ok) return { nakijken: [], becijferen: [] };
          const data = await res.json();
          const tag = (rows: any[]) => (rows || []).map((r: any) => ({ ...r, class_id: cls.id, class_name: cls.name }));
          return { nakijken: tag(data.nakijken), becijferen: tag(data.becijferen) };
        })
      );
      const allNakijken = results.flatMap(r => r.status === 'fulfilled' ? r.value.nakijken : []);
      const allBecijferen = results.flatMap(r => r.status === 'fulfilled' ? r.value.becijferen : []);
      setNakijken(allNakijken);
      setBecijferen(allBecijferen);
      setLoading(false);
    })();
  }, [classes]);

  const items = mode === 'nakijken' ? nakijken : becijferen;

  return (
    <div className="page-content max-w-2xl mx-auto py-6 space-y-4">
      <Link href="/teacher-grades" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground w-fit">
        <ChevronLeft className="h-4 w-4" />
        {isDutch ? 'Terug' : 'Back'}
      </Link>

      <PageHeader title={isDutch ? 'Beoordelen' : 'Review'} />

      <div className="flex gap-2">
        <Button
          size="sm"
          variant={mode === 'nakijken' ? 'default' : 'outline'}
          onClick={() => router.push('/teacher-grades/review?mode=nakijken')}
        >
          <ClipboardCheck className="h-4 w-4 mr-1.5" />
          {isDutch ? 'Nog nakijken' : 'To review'} ({nakijken.length})
        </Button>
        <Button
          size="sm"
          variant={mode === 'becijferen' ? 'default' : 'outline'}
          onClick={() => router.push('/teacher-grades/review?mode=becijferen')}
        >
          <GraduationCap className="h-4 w-4 mr-1.5" />
          {isDutch ? 'Nog becijferen' : 'To grade'} ({becijferen.length})
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <CautieLoader label={isDutch ? 'Laden' : 'Loading'} size="md" />
        </div>
      ) : items.length === 0 ? (
        <Card className="p-8 text-center surface-panel border border-border">
          <p className="text-sm text-muted-foreground">
            {mode === 'nakijken'
              ? (isDutch ? 'Niets om na te kijken.' : 'Nothing to review.')
              : (isDutch ? 'Niets om te becijferen.' : 'Nothing to grade.')}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <Link
              key={item.id}
              href={mode === 'nakijken' ? `/teacher-grades/review/${item.id}` : `/teacher-grades/${item.id}/grading`}
            >
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer surface-panel border border-border">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-sm truncate">{item.title}</h3>
                    <p className="text-[11px] text-muted-foreground">{item.class_name}</p>
                  </div>
                  <div className="text-right text-xs text-muted-foreground shrink-0">
                    {mode === 'nakijken'
                      ? <span>{item.pending_answers} {isDutch ? 'te beoordelen' : 'pending'}</span>
                      : <span>{item.graded_count} / {item.total_students}</span>}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReviewQueuePage() {
  return (
    <Suspense fallback={null}>
      <ReviewQueueContent />
    </Suspense>
  );
}
