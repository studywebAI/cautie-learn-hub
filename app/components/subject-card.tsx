'use client';

import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import {
  // Science
  Microscope, FlaskConical, Atom, Beaker, TestTubes, Dna, Bug, Leaf, Feather,
  // Math
  Calculator, Square, Sigma, FunctionSquare, BarChart3, TrendingUp,
  // Languages
  BookOpen, Languages, PenTool, Pen, FileText, GraduationCap, Globe, MessageSquare,
  // Humanities
  Landmark, Map, Scale, Users, Heart, Brain, Building, Scroll, Shield, Cross,
  // Arts
  Palette, Music, Guitar, Piano, Mic, Film, Camera, Brush, Sparkles,
  // Tech & IT
  Code, Laptop, Smartphone, Cpu, Wifi, Database, Server, Terminal,
  // Sports & Health
  Dumbbell, Activity, HeartPulse, Utensils, Apple, Salad, Footprints,
  Trophy,
  // Education
  School, Library, Book, BookMarked, FileQuestion, Award,
  // Nature & Animals
  Trees, Mountain, Cloud, Sun, Moon, Star, Zap, Waves,
  // Business & Finance
  Briefcase, Banknote, CreditCard, TrendingDown, PieChart, Building2,
  // Food
  UtensilsCrossed, ChefHat, Coffee, Wine, GlassWater,
  // Tools
  Wrench,
  // Default
  Sparkle, Lightbulb, Star as StarIcon, Gift, Crown, Diamond
} from 'lucide-react';

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

// Comprehensive keyword-to-icon component mapping
function getSubjectIcon(title: string, description?: string | null) {
  const searchText = `${title} ${description || ''}`.toLowerCase();
  
  // Check keywords in order of specificity
  if (searchText.includes('biology') || searchText.includes('biologie')) return Bug;
  if (searchText.includes('chemistry') || searchText.includes('chemie')) return FlaskConical;
  if (searchText.includes('physics') || searchText.includes('fysica')) return Atom;
  if (searchText.includes('math') || searchText.includes('mathematics') || searchText.includes('wiskunde')) return Calculator;
  if (searchText.includes('algebra')) return FunctionSquare;
  if (searchText.includes('geometry')) return Square;
  if (searchText.includes('calculus')) return Sigma;
  if (searchText.includes('statistics')) return TrendingUp;
  
  if (searchText.includes('english')) return BookOpen;
  if (searchText.includes('dutch') || searchText.includes('nederlands')) return Globe;
  if (searchText.includes('german') || searchText.includes('duits')) return Globe;
  if (searchText.includes('french') || searchText.includes('frans')) return Globe;
  if (searchText.includes('spanish') || searchText.includes('spaans')) return Globe;
  if (searchText.includes('latin')) return Scroll;
  if (searchText.includes('language') || searchText.includes('taal')) return Languages;
  
  if (searchText.includes('history') || searchText.includes('geschiedenis')) return Landmark;
  if (searchText.includes('geography') || searchText.includes('aardrijkskunde')) return Map;
  if (searchText.includes('economics') || searchText.includes('economie')) return Banknote;
  if (searchText.includes('politics') || searchText.includes('politiek')) return Scale;
  if (searchText.includes('law') || searchText.includes('recht')) return Scale;
  if (searchText.includes('philosophy') || searchText.includes('filosofie')) return Brain;
  if (searchText.includes('psychology') || searchText.includes('psychologie')) return Heart;
  if (searchText.includes('sociology')) return Users;
  
  if (searchText.includes('art') || searchText.includes('kunst')) return Palette;
  if (searchText.includes('music') || searchText.includes('muziek')) return Music;
  if (searchText.includes('drama') || searchText.includes('theater')) return Mic;
  if (searchText.includes('film') || searchText.includes('film')) return Film;
  if (searchText.includes('photography') || searchText.includes('fotografie')) return Camera;
  if (searchText.includes('drawing') || searchText.includes('tekenen')) return Brush;
  
  if (searchText.includes('computer') || searchText.includes('computer')) return Laptop;
  if (searchText.includes('programming') || searchText.includes('programmeren')) return Code;
  if (searchText.includes('coding')) return Terminal;
  if (searchText.includes('technology') || searchText.includes('techniek')) return Cpu;
  if (searchText.includes('informatics') || searchText.includes('informatica')) return Database;
  if (searchText.includes('web') || searchText.includes('web')) return Wifi;
  
  if (searchText.includes('sport') || searchText.includes('sport')) return Trophy;
  if (searchText.includes('gym') || searchText.includes('turnen')) return Dumbbell;
  if (searchText.includes('fitness')) return Activity;
  if (searchText.includes('health') || searchText.includes('gezondheid')) return HeartPulse;
  if (searchText.includes('medicine') || searchText.includes('geneeskunde')) return HeartPulse;
  if (searchText.includes('yoga') || searchText.includes('meditatie')) return Activity;
  if (searchText.includes('swimming') || searchText.includes('zwemmen')) return Waves;
  if (searchText.includes('dance') || searchText.includes('dansen')) return Footprints;
  if (searchText.includes('running') || searchText.includes('rennen')) return Footprints;
  
  if (searchText.includes('school') || searchText.includes('school')) return School;
  if (searchText.includes('university') || searchText.includes('universiteit')) return GraduationCap;
  if (searchText.includes('study') || searchText.includes('studeren')) return BookOpen;
  if (searchText.includes('learning') || searchText.includes('leren')) return Lightbulb;
  if (searchText.includes('exam') || searchText.includes('examen')) return FileQuestion;
  
  if (searchText.includes('nature') || searchText.includes('natuur')) return Trees;
  if (searchText.includes('environmental') || searchText.includes('milieu')) return Leaf;
  if (searchText.includes('animals') || searchText.includes('dieren')) return Feather;
  if (searchText.includes('agriculture') || searchText.includes('landbouw')) return Leaf;
  if (searchText.includes('ecology')) return Trees;
  
  if (searchText.includes('business') || searchText.includes('ondernemen')) return Briefcase;
  if (searchText.includes('finance') || searchText.includes('financieel')) return CreditCard;
  if (searchText.includes('accounting') || searchText.includes('administratie')) return Building2;
  
  if (searchText.includes('cooking') || searchText.includes('koken')) return ChefHat;
  if (searchText.includes('food') || searchText.includes('eten')) return UtensilsCrossed;
  if (searchText.includes('nutrition') || searchText.includes('voeding')) return Apple;
  if (searchText.includes('bakery')) return ChefHat;
  
  if (searchText.includes('religion') || searchText.includes('godsdienst')) return Cross;
  if (searchText.includes('ethics') || searchText.includes('ethiek')) return Scale;
  
  if (searchText.includes('engineering') || searchText.includes('engineering')) return Wrench;
  if (searchText.includes('architecture') || searchText.includes('bouwkunde')) return Building;
  if (searchText.includes('construction') || searchText.includes('bouw')) return Building;
  if (searchText.includes('mechanic')) return Wrench;
  if (searchText.includes('electrical')) return Zap;
  
  // Default icons based on title hash
  const fallbackIcons = [Sparkle, Lightbulb, StarIcon, Gift, Crown, Diamond, Award, Book];
  const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return fallbackIcons[hash % fallbackIcons.length];
}

function IconCover({ title, description }: { title: string; description?: string | null }) {
  const IconComponent = getSubjectIcon(title, description);

  return (
    <div className="w-full h-full bg-primary/10 flex items-center justify-center relative overflow-hidden">
      <IconComponent className="w-20 h-20 text-primary" strokeWidth={1.5} />
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
              <IconCover title={subject.title} description={subject.description} />
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
