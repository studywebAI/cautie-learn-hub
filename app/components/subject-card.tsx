'use client';

import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';

type ParagraphContext = {
  paragraphs: {
    id: string;
    title: string;
    paragraph_number: number;
    chapter_id: string;
    chapter_number: number;
    chapter_title: string;
    progress_percent?: number;
  }[];
  lastParagraphId: string | null;
};

type SubjectCardProps = {
  subject: {
    id: string;
    title: string;
    description?: string | null;
    cover_type?: string;
    cover_image_url?: string;
    classes?: { id: string; name: string }[];
    paragraphContext?: ParagraphContext;
  };
};

// Keyword-to-emoji mapping for auto-generated covers
const SUBJECT_EMOJI_MAP: Record<string, string[]> = {
  biology: ['🧬', '🔬', '🌿', '🦠', '🧫'],
  chemistry: ['⚗️', '🧪', '🔥', '💎', '🧫'],
  physics: ['⚛️', '🔭', '🌌', '⚡', '🧲'],
  science: ['🔬', '🧪', '🌍', '💡', '📊'],
  math: ['🔢', '📐', '📏', '🧮', '➗'],
  mathematics: ['🔢', '📐', '📏', '🧮', '➗'],
  algebra: ['📐', '🔢', '✖️', '➕', '🧮'],
  geometry: ['📐', '📏', '🔺', '⬡', '🔵'],
  calculus: ['📈', '📐', '∞', '🔢', '📊'],
  english: ['📖', '✍️', '🗣️', '📚', '🇬🇧'],
  dutch: ['🇳🇱', '📖', '✍️', '🗣️', '📚'],
  nederlands: ['🇳🇱', '📖', '✍️', '🗣️', '📝'],
  german: ['🇩🇪', '📖', '✍️', '🗣️', '📚'],
  deutsch: ['🇩🇪', '📖', '✍️', '🗣️', '📝'],
  french: ['🇫🇷', '📖', '✍️', '🗣️', '🥐'],
  spanish: ['🇪🇸', '📖', '✍️', '🗣️', '📚'],
  latin: ['🏛️', '📜', '✍️', '📖', '🗣️'],
  history: ['🏛️', '📜', '⚔️', '🗺️', '👑'],
  geography: ['🌍', '🗺️', '🏔️', '🌊', '🧭'],
  economics: ['📈', '💰', '🏦', '📊', '💵'],
  politics: ['🏛️', '⚖️', '🗳️', '📜', '🤝'],
  sociology: ['👥', '🏙️', '📊', '🤝', '🌐'],
  philosophy: ['🤔', '📖', '💭', '⚖️', '🏛️'],
  art: ['🎨', '🖌️', '🖼️', '🎭', '✨'],
  music: ['🎵', '🎶', '🎹', '🎸', '🎤'],
  drama: ['🎭', '🎬', '🎤', '📽️', '🌟'],
  computer: ['💻', '⌨️', '🖥️', '🔧', '📡'],
  programming: ['💻', '⌨️', '🖥️', '🔧', '🤖'],
  informatica: ['💻', '⌨️', '🖥️', '🔧', '📡'],
  technology: ['💻', '⚙️', '🔧', '📱', '🤖'],
  sport: ['⚽', '🏃', '🏀', '🎯', '🏊'],
  gym: ['🏋️', '🏃', '💪', '⚽', '🤸'],
  health: ['❤️', '🏥', '🧘', '🍎', '💊'],
  religion: ['🙏', '📖', '⛪', '☪️', '🕉️'],
  psychology: ['🧠', '💭', '🔍', '📊', '🤔'],
};

function getSubjectEmojis(title: string, description?: string | null): string[] {
  const searchText = `${title} ${description || ''}`.toLowerCase();
  for (const [keyword, emojis] of Object.entries(SUBJECT_EMOJI_MAP)) {
    if (searchText.includes(keyword)) return emojis;
  }
  const fallbackEmojis = ['📚', '📖', '✏️', '📝', '🎓', '💡', '🔬', '🌍', '📐', '🧮', '🎨', '🎵', '⚽', '🏛️', '🔢'];
  const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return Array.from({ length: 5 }, (_, i) => fallbackEmojis[(hash + i * 7) % fallbackEmojis.length]);
}

function EmojiCover({ title, description }: { title: string; description?: string | null }) {
  const emojis = getSubjectEmojis(title, description);
  const positions = [
    { top: '15%', left: '20%', rotate: -15, size: 'text-3xl' },
    { top: '25%', left: '65%', rotate: 12, size: 'text-4xl' },
    { top: '55%', left: '35%', rotate: -8, size: 'text-4xl' },
    { top: '45%', left: '75%', rotate: 20, size: 'text-2xl' },
    { top: '70%', left: '15%', rotate: 5, size: 'text-3xl' },
  ];

  return (
    <div className="w-full h-full bg-foreground relative overflow-hidden">
      {emojis.map((emoji, i) => (
        <span
          key={i}
          className={`absolute ${positions[i].size} select-none`}
          style={{
            top: positions[i].top,
            left: positions[i].left,
            transform: `rotate(${positions[i].rotate}deg)`,
            opacity: 0.85,
          }}
        >
          {emoji}
        </span>
      ))}
    </div>
  );
}

export function SubjectCard({ subject }: SubjectCardProps) {
  const paragraphs = subject.paragraphContext?.paragraphs || [];
  const lastParagraphId = subject.paragraphContext?.lastParagraphId;
  const className = subject.classes?.[0]?.name;

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col rounded-xl">
      <CardContent className="p-0 flex flex-col h-full">
        {/* Title + Class above cover */}
        <div className="px-3 pt-3 pb-2">
          <h3 className="text-sm font-semibold truncate">{subject.title}</h3>
          {className && (
            <p className="text-xs text-muted-foreground truncate">{className}</p>
          )}
        </div>

        {/* Cover area (clickable → chapter overview) */}
        <Link href={`/subjects/${subject.id}`} className="block">
          <div className="aspect-[16/9] relative cursor-pointer mx-3 rounded-lg overflow-hidden">
            {subject.cover_image_url ? (
              <img
                src={subject.cover_image_url}
                alt={subject.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <EmojiCover title={subject.title} description={subject.description} />
            )}
          </div>
        </Link>

        {/* Paragraphs with progress */}
        <div className="px-3 pt-2 pb-3 space-y-1 flex-1">
          {paragraphs.length > 0 ? (
            paragraphs.map((p) => {
              const isLast = p.id === lastParagraphId;
              const progress = p.progress_percent || 0;
              const roundedProgress = Math.ceil(progress);

              return (
                <Link
                  key={p.id}
                  href={`/subjects/${subject.id}/chapters/${p.chapter_id}/paragraphs/${p.id}`}
                  className={`flex items-center gap-2 text-xs py-1.5 px-2 rounded-lg transition-colors hover:bg-muted/50 ${
                    isLast ? 'bg-muted/40' : ''
                  }`}
                >
                  <span className="bg-foreground text-background px-2 py-0.5 rounded-full text-xs font-medium shrink-0 min-w-[2.2rem] text-center">
                    {p.chapter_number}.{p.paragraph_number}
                  </span>
                  <span className="truncate flex-1 text-xs">{p.title}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-muted-foreground text-xs tabular-nums w-7 text-right">
                      {roundedProgress}%
                    </span>
                    <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${roundedProgress}%` }}
                      />
                    </div>
                  </div>
                </Link>
              );
            })
          ) : (
            <p className="text-xs text-muted-foreground text-center py-3">No paragraphs yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
