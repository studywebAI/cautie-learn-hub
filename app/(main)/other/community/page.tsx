'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Loader2, Search, Flame, Sparkles, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

type CommunityItem = {
  id: string;
  artifactId: string;
  toolId: string;
  title: string;
  description: string;
  tags: string[];
  subject: string | null;
  difficulty: string | null;
  language: string | null;
  likeCount: number;
  saveCount: number;
  playCount: number;
  publishedAt: string;
  creatorName: string;
  likedByMe: boolean;
};

type FeedResponse = {
  items: CommunityItem[];
  sections: {
    trending: CommunityItem[];
    newest: CommunityItem[];
    mostLiked: CommunityItem[];
  };
};

const sectionMeta = [
  { key: 'trending', label: 'Trending', icon: Flame },
  { key: 'newest', label: 'New', icon: Sparkles },
  { key: 'mostLiked', label: 'Most liked', icon: Star },
] as const;

const toolLabel = (toolId: string) => {
  const id = String(toolId || '').toLowerCase();
  if (id === 'quiz') return 'Quiz';
  if (id === 'flashcards') return 'Flashcards';
  if (id === 'notes') return 'Summary';
  return id || 'Tool';
};

function CommunityCard({ item }: { item: CommunityItem }) {
  return (
    <article className="rounded-xl border border-border bg-card p-3">
      <div className="mb-1 flex items-center justify-between gap-2">
        <Badge variant="secondary">{toolLabel(item.toolId)}</Badge>
        <p className="text-[11px] text-muted-foreground">{new Date(item.publishedAt).toLocaleDateString()}</p>
      </div>
      <h3 className="line-clamp-2 text-sm font-semibold">{item.title}</h3>
      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.description || 'No description'}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {item.subject && <Badge variant="outline">{item.subject}</Badge>}
        {item.difficulty && <Badge variant="outline">{item.difficulty}</Badge>}
        {item.language && <Badge variant="outline">{item.language}</Badge>}
      </div>
      {item.tags?.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.tags.slice(0, 4).map((tag) => (
            <span key={`${item.id}-${tag}`} className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
              #{tag}
            </span>
          ))}
        </div>
      )}
      <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
        <span>by {item.creatorName}</span>
        <span>{item.likeCount} likes</span>
      </div>
      <div className="mt-2 flex gap-2">
        <Button asChild variant="outline" size="sm" className="h-7 rounded-full text-xs">
          <Link href={`/other/community/${item.id}`}>Open</Link>
        </Button>
        <Button asChild size="sm" className="h-7 rounded-full text-xs">
          <Link href={`/material/${item.artifactId}`}>Play</Link>
        </Button>
      </div>
    </article>
  );
}

export default function OtherCommunityPage() {
  const [loading, setLoading] = useState(false);
  const [feed, setFeed] = useState<FeedResponse | null>(null);
  const [query, setQuery] = useState('');
  const [type, setType] = useState('');
  const [subject, setSubject] = useState('');
  const [creator, setCreator] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [language, setLanguage] = useState('');
  const [minLikes, setMinLikes] = useState('');

  const loadFeed = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set('q', query.trim());
      if (type.trim()) params.set('type', type.trim());
      if (subject.trim()) params.set('subject', subject.trim());
      if (creator.trim()) params.set('creator', creator.trim());
      if (difficulty.trim()) params.set('difficulty', difficulty.trim());
      if (language.trim()) params.set('language', language.trim());
      if (minLikes.trim()) params.set('minLikes', minLikes.trim());

      const response = await fetch(`/api/community/feed?${params.toString()}`, { cache: 'no-store' });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(String(payload?.error || 'Failed to load community feed'));
      setFeed(payload as FeedResponse);
    } catch {
      setFeed({ items: [], sections: { trending: [], newest: [], mostLiked: [] } });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const forYou = useMemo(() => {
    if (!feed) return [];
    return [...feed.sections.trending].slice(0, 6);
  }, [feed]);

  return (
    <div className="h-full overflow-auto">
      <div className="mx-auto w-full max-w-7xl space-y-4 p-4 md:p-6">
        <div>
          <h1 className="text-xl font-semibold">Community</h1>
          <p className="text-sm text-muted-foreground">Shared quizzes, flashcards, and summaries. Nothing is auto-published.</p>
        </div>

        <section className="rounded-2xl border border-border bg-card p-3">
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-4">
            <div className="relative md:col-span-2">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search keywords, topic, creator..."
                className="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-3 text-sm outline-none focus:ring-1 focus:ring-ring"
              />
            </div>
            <input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Subject" className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring" />
            <input value={creator} onChange={(e) => setCreator(e.target.value)} placeholder="Creator" className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-5">
            <select value={type} onChange={(e) => setType(e.target.value)} className="h-9 rounded-lg border border-border bg-background px-2 text-sm">
              <option value="">Type: all</option>
              <option value="quiz">Quiz</option>
              <option value="flashcards">Flashcards</option>
              <option value="notes">Summary</option>
            </select>
            <input value={difficulty} onChange={(e) => setDifficulty(e.target.value)} placeholder="Difficulty" className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring" />
            <input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="Language" className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring" />
            <input value={minLikes} onChange={(e) => setMinLikes(e.target.value)} placeholder="Min likes" className="h-9 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:ring-1 focus:ring-ring" />
            <Button className="h-9 rounded-lg" onClick={() => void loadFeed()} disabled={loading}>
              {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}
              Search
            </Button>
          </div>
        </section>

        {loading && (
          <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading community feed...</div>
        )}

        {!loading && (
          <>
            {sectionMeta.map((section) => {
              const Icon = section.icon;
              const entries = feed?.sections?.[section.key] || [];
              return (
                <section key={section.key} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <h2 className="text-sm font-semibold">{section.label}</h2>
                  </div>
                  {entries.length === 0 ? (
                    <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">No items yet.</div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {entries.slice(0, 9).map((item) => (
                        <CommunityCard key={`${section.key}-${item.id}`} item={item} />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}

            <section className="space-y-2">
              <h2 className="text-sm font-semibold">For you</h2>
              {forYou.length === 0 ? (
                <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground">
                  Recommendations will improve as you use more tools.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                  {forYou.map((item) => (
                    <CommunityCard key={`for-you-${item.id}`} item={item} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </div>
  );
}
