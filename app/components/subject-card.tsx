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
  // Sciences
  biology: ['🧬', '🔬', '🌿', '🦠', '🧫'],
  chemistry: ['⚗️', '🧪', '🔥', '💎', '🧫'],
  physics: ['⚛️', '🔭', '🌌', '⚡', '🧲'],
  science: ['🔬', '🧪', '🌍', '💡', '📊'],
  
  // Math
  math: ['🔢', '📐', '📏', '🧮', '➗'],
  mathematics: ['🔢', '📐', '📏', '🧮', '➗'],
  algebra: ['📐', '🔢', '✖️', '➕', '🧮'],
  geometry: ['📐', '📏', '🔺', '⬡', '🔵'],
  calculus: ['📈', '📐', '∞', '🔢', '📊'],
  
  // Languages
  english: ['📖', '✍️', '🗣️', '📚', '🇬🇧'],
  dutch: ['🇳🇱', '📖', '✍️', '🗣️', '📚'],
  nederlands: ['🇳🇱', '📖', '✍️', '🗣️', '📝'],
  german: ['🇩🇪', '📖', '✍️', '🗣️', '📚'],
  deutsch: ['🇩🇪', '📖', '✍️', '🗣️', '📝'],
  french: ['🇫🇷', '📖', '✍️', '🗣️', '🥐'],
  spanish: ['🇪🇸', '📖', '✍️', '🗣️', '📚'],
  latin: ['🏛️', '📜', '✍️', '📖', '🗣️'],
  
  // Social studies
  history: ['🏛️', '📜', '⚔️', '🗺️', '👑'],
  geography: ['🌍', '🗺️', '🏔️', '🌊', '🧭'],
  economics: ['📈', '💰', '🏦', '📊', '💵'],
  politics: ['🏛️', '⚖️', '🗳️', '📜', '🤝'],
  sociology: ['👥', '🏙️', '📊', '🤝', '🌐'],
  philosophy: ['🤔', '📖', '💭', '⚖️', '🏛️'],
  
  // Arts
  art: ['🎨', '🖌️', '🖼️', '🎭', '✨'],
  music: ['🎵', '🎶', '🎹', '🎸', '🎤'],
  drama: ['🎭', '🎬', '🎤', '📽️', '🌟'],
  
  // Tech
  computer: ['💻', '⌨️', '🖥️', '🔧', '📡'],
  programming: ['💻', '⌨️', '🖥️', '🔧', '🤖'],
  informatica: ['💻', '⌨️', '🖥️', '🔧', '📡'],
  technology: ['💻', '⚙️', '🔧', '📱', '🤖'],
  
  // Sports & health
  sport: ['⚽', '🏃', '🏀', '🎯', '🏊'],
  gym: ['🏋️', '🏃', '💪', '⚽', '🤸'],
  health: ['❤️', '🏥', '🧘', '🍎', '💊'],
  
  // Other
  religion: ['🙏', '📖', '⛪', '☪️', '🕉️'],
  psychology: ['🧠', '💭', '🔍', '📊', '🤔'],
};

function getSubjectEmojis(title: string, description?: string | null): string[] {
  const searchText = `${title} ${description || ''}`.toLowerCase();
  
  // Try to find matching emojis from keyword map
  for (const [keyword, emojis] of Object.entries(SUBJECT_EMOJI_MAP)) {
    if (searchText.includes(keyword)) {
      return emojis;
    }
  }
  
  // Fallback: generate from title hash
  const fallbackEmojis = ['📚', '📖', '✏️', '📝', '🎓', '💡', '🔬', '🌍', '📐', '🧮', '🎨', '🎵', '⚽', '🏛️', '🔢'];
  const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const selected = [];
  for (let i = 0; i < 5; i++) {
    selected.push(fallbackEmojis[(hash + i * 7) % fallbackEmojis.length]);
  }
  return selected;
}

function EmojiCover({ title, description }: { title: string; description?: string | null }) {
  const emojis = getSubjectEmojis(title, description);
  
  // Positions for scattered emoji placement
  const positions = [
    { top: '15%', left: '20%', rotate: -15, size: 'text-3xl' },
    { top: '25%', left: '65%', rotate: 12, size: 'text-4xl' },
    { top: '55%', left: '35%', rotate: -8, size: 'text-4xl' },
    { top: '45%', left: '75%', rotate: 20, size: 'text-2xl' },
    { top: '70%', left: '15%', rotate: 5, size: 'text-3xl' },
  ];

  return (
    <div className="w-full h-full bg-muted relative overflow-hidden">
      {emojis.map((emoji, i) => (
        <span
          key={i}
          className={`absolute ${positions[i].size} select-none`}
          style={{
            top: positions[i].top,
            left: positions[i].left,
            transform: `rotate(${positions[i].rotate}deg)`,
            opacity: 0.7,
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

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow h-full flex flex-col">
      <CardContent className="p-0 flex flex-col h-full">
        {/* Top half - Cover (clickable → chapter overview) */}
        <Link href={`/subjects/${subject.id}`} className="block">
          <div className="aspect-[4/3] relative cursor-pointer">
            {subject.cover_image_url ? (
              <img
                src={subject.cover_image_url}
                alt={subject.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <EmojiCover title={subject.title} description={subject.description} />
            )}
            
            {/* Title overlay - top left */}
            <div className="absolute top-3 left-3 right-3">
              <p className="text-sm font-medium text-foreground bg-background/80 backdrop-blur-sm px-2 py-1 rounded inline-block">
                {subject.title}
              </p>
            </div>
            
            {/* Linked classes - bottom left */}
            {subject.classes && subject.classes.length > 0 && (
              <div className="absolute bottom-3 left-3 flex flex-wrap gap-1">
                {subject.classes.slice(0, 2).map((cls) => (
                  <span key={cls.id} className="text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded">
                    {cls.name}
                  </span>
                ))}
                {subject.classes.length > 2 && (
                  <span className="text-xs text-muted-foreground bg-background/80 backdrop-blur-sm px-2 py-0.5 rounded">
                    +{subject.classes.length - 2}
                  </span>
                )}
              </div>
            )}
          </div>
        </Link>

        {/* Bottom half - 3 Paragraphs with progress */}
        <div className="p-3 space-y-1.5 bg-background flex-1">
          {paragraphs.length > 0 ? (
            paragraphs.map((p) => {
              const isLast = p.id === lastParagraphId;
              // TODO: Get actual progress from progress tracking
              const progress = 0;
              const roundedProgress = Math.ceil(progress);

              return (
                <Link
                  key={p.id}
                  href={`/subjects/${subject.id}/chapters/${p.chapter_id}/paragraphs/${p.id}`}
                  className={`flex items-center gap-2 text-xs py-1 px-1.5 rounded transition-colors hover:bg-muted/50 ${
                    isLast ? 'bg-muted/30' : ''
                  }`}
                >
                  <span className="bg-foreground text-background px-1.5 py-0.5 rounded text-xs font-medium shrink-0 min-w-[2rem] text-center">
                    {p.chapter_number}.{p.paragraph_number}
                  </span>
                  <span className="truncate flex-1">{p.title}</span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-muted-foreground w-7 text-right text-xs">
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
