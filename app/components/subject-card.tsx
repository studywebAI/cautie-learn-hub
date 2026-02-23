'use client';

import { Card, CardContent } from '@/components/ui/card';
import Link from 'next/link';
import {
  // Science - Biology
  Microscope, FlaskConical, Atom, Beaker, TestTubes, Dna, Bug, Leaf, Feather, 
  // Science - Medical
  Stethoscope, Pill, Bandage, Thermometer, Syringe, Clipboard,
  // Math
  Calculator, Square, Sigma, FunctionSquare, BarChart3, TrendingUp, Hash, Percent, Divide, Plus, Minus, X, Equal, Pi,
  // Languages
  BookOpen, Languages, PenTool, Pen, Pencil, FileText, GraduationCap, Globe, MessageSquare, Mail, Bookmark,
  // Humanities - History & Social
  Landmark, Map, Scale, Users, Heart, Brain, Building2, Scroll, Shield, Cross, Flag,
  // Humanities - Social Sciences
  UserCheck, UserPlus, UserMinus, UsersRound,
  // Arts - Visual
  Palette, Music, Guitar, Piano, Mic, Film, Camera, Brush, Sparkles,
  // Arts - Creative
  Theater, Clapperboard, Radio, Volume2, VolumeX, Headphones, Drum,
  // Tech & IT - General
  Code, Laptop, Smartphone, Cpu, Wifi, Database, Server, Terminal, HardDrive, Monitor, Keyboard, Mouse, Printer,
  // Tech & AI & Data
  Bot, Binary, Brackets, Code2, FileCode, FileJson, Variable,
  // Tech - Web & Internet
  Link2, Signal, Tablet, Watch, Router, Cloud, CloudLightning,
  // Sports & Health - Fitness
  Dumbbell, Activity, HeartPulse, Utensils, Apple, Salad, Footprints, Trophy, Medal,
  // Health - Medical
  Accessibility, HeartHandshake,
  // Education
  School, Library, Book, FileQuestion, Award,
  // Nature - Landscape
  Trees, Mountain, Sun, Moon, Star, Zap, Waves, CloudRain, CloudSnow, Wind, Flame, Droplets,
  // Nature - Animals
  Bird, Fish, Cat, Dog, Rabbit, PawPrint,
  // Business & Finance
  Briefcase, Banknote, CreditCard, TrendingDown, PieChart, Building2 as FinanceBuilding, Wallet, PiggyBank, DollarSign, Euro,
  // Food & Drink
  UtensilsCrossed, ChefHat, Coffee, Wine, GlassWater, Beer, IceCream, Cake, Cookie,
  // Travel & Places
  Plane, Car, Bus, Train, Ship, MapPin, Compass, Tent, Hotel, Store, ShoppingBag, Home,
  // Time & Calendar
  Clock, Calendar, Timer, Hourglass, AlarmClock, CalendarDays, CalendarRange,
  // Communication
  MessageCircle, Phone, PhoneCall, Video, VideoIcon,
  // Security & Safety
  Lock, Unlock, EyeOff, ShieldCheck, ShieldAlert, Fingerprint, Key, KeyRound,
  // Tools & Work
  Wrench, Hammer, Paintbrush, Ruler, Scissors, Paperclip,
  // Office & Business
  Folder, FolderOpen, File, Files, FileCheck, FileClock, Archive, Inbox,
  // Default/Fallback
  Sparkle, Lightbulb, Star as StarIcon, Gift, Diamond, Hexagon, Circle, Square as SquareIcon
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
  
  // Additional tech keywords
  if (searchText.includes('ai') || searchText.includes('artificial intelligence')) return Bot;
  if (searchText.includes('data') || searchText.includes('data science')) return Database;
  if (searchText.includes('robot') || searchText.includes('robotics')) return Bot;
  if (searchText.includes('digital')) return Cpu;
  if (searchText.includes('software')) return Code2;
  
  // Medical & Health
  if (searchText.includes('nursing')) return Stethoscope;
  if (searchText.includes('pharmacy') || searchText.includes('farmacie')) return Pill;
  if (searchText.includes('first aid')) return Bandage;
  if (searchText.includes('anatomy')) return Stethoscope;
  if (searchText.includes('physiology')) return HeartPulse;
  
  // Law & Politics
  if (searchText.includes('legal') || searchText.includes('juridisch')) return Scale;
  if (searchText.includes('government') || searchText.includes('overheid')) return Landmark;
  if (searchText.includes('sociology') || searchText.includes('social')) return Users;
  if (searchText.includes('anthropology')) return UsersRound;
  
  // Sports
  if (searchText.includes('athletics') || searchText.includes('atletiek')) return Trophy;
  if (searchText.includes('football') || searchText.includes('voetbal')) return Trophy;
  if (searchText.includes('tennis')) return Trophy;
  if (searchText.includes('basketball')) return Trophy;
  if (searchText.includes('baseball')) return Trophy;
  if (searchText.includes('hockey')) return Trophy;
  
  // Music & Arts
  if (searchText.includes('song') || searchText.includes('zang')) return Music;
  if (searchText.includes('instrument')) return Guitar;
  if (searchText.includes('piano')) return Music;
  if (searchText.includes('guitar')) return Guitar;
  if (searchText.includes('violin')) return Music;
  if (searchText.includes('drum')) return Drum;
  if (searchText.includes('band')) return Headphones;
  if (searchText.includes('orchestra')) return Headphones;
  if (searchText.includes('sculpture')) return Palette;
  
  // Travel & Tourism
  if (searchText.includes('tourism') || searchText.includes('toerisme')) return Plane;
  if (searchText.includes('hotel')) return Hotel;
  if (searchText.includes('travel') || searchText.includes('reizen')) return Plane;
  if (searchText.includes('transport')) return Train;
  if (searchText.includes('logistics')) return Ship;
  
  // Environment
  if (searchText.includes('climate') || searchText.includes('klimaat')) return Cloud;
  if (searchText.includes('weather') || searchText.includes('weer')) return CloudRain;
  if (searchText.includes('astronomy') || searchText.includes('sterrenkunde')) return Star;
  if (searchText.includes('space')) return Star;
  if (searchText.includes('ocean') || searchText.includes('zee')) return Waves;
  if (searchText.includes('geology')) return Mountain;
  
  // Religion
  if (searchText.includes('islam')) return Cross;
  if (searchText.includes('jewish') || searchText.includes('jodendom')) return Cross;
  if (searchText.includes('christian') || searchText.includes('christelijk')) return Cross;
  if (searchText.includes('buddhist')) return Cross;
  if (searchText.includes('hindu')) return Cross;
  
  // Additional subjects
  if (searchText.includes('marketing')) return Briefcase;
  if (searchText.includes('management')) return Briefcase;
  if (searchText.includes('entrepreneurship')) return Wallet;
  if (searchText.includes('investment')) return TrendingUp;
  if (searchText.includes('tax')) return Banknote;
  if (searchText.includes('real estate')) return Building2;
  
  // More tech
  if (searchText.includes('network') || searchText.includes('netwerk')) return Wifi;
  if (searchText.includes('security') || searchText.includes('beveiliging')) return ShieldCheck;
  if (searchText.includes('cyber')) return ShieldAlert;
  if (searchText.includes('game') || searchText.includes('gaming')) return Monitor;
  if (searchText.includes('design')) return Palette;
  
  // Languages - more specific
  if (searchText.includes('italian') || searchText.includes('italiaans')) return Globe;
  if (searchText.includes('portuguese') || searchText.includes('portugees')) return Globe;
  if (searchText.includes('chinese') || searchText.includes('chinees')) return Globe;
  if (searchText.includes('japanese') || searchText.includes('japans')) return Globe;
  if (searchText.includes('korean')) return Globe;
  if (searchText.includes('arabic') || searchText.includes('arabisch')) return Globe;
  if (searchText.includes('writing') || searchText.includes('schrijven')) return PenTool;
  if (searchText.includes('reading') || searchText.includes('lezen')) return BookOpen;
  if (searchText.includes('speaking') || searchText.includes('spreken')) return MessageSquare;
  if (searchText.includes('listening')) return Headphones;
  if (searchText.includes('grammar')) return FileText;
  if (searchText.includes('vocabulary')) return Book;
  
  // STEM
  if (searchText.includes('science') || searchText.includes('wetenschap')) return FlaskConical;
  if (searchText.includes('lab') || searchText.includes('practicum')) return Microscope;
  if (searchText.includes('research')) return Clipboard;
  
  // Math - more specific
  if (searchText.includes('arithmetic')) return Calculator;
  if (searchText.includes('trigonometry')) return Pi;
  if (searchText.includes('probability')) return Hash;
  if (searchText.includes('accounting')) return Calculator;
  
  // Social
  if (searchText.includes('communication')) return MessageCircle;
  if (searchText.includes('journalism')) return FileText;
  if (searchText.includes('media')) return Film;
  if (searchText.includes('journal')) return FileText;
  
  // Engineering - more specific
  if (searchText.includes('mechanical')) return Wrench;
  if (searchText.includes('civil')) return Building2;
  if (searchText.includes('electrical engineering')) return Zap;
  if (searchText.includes('electronic')) return Cpu;
  if (searchText.includes('automotive')) return Car;
  
  // Agriculture
  if (searchText.includes('farming')) return Leaf;
  if (searchText.includes('horticulture')) return Trees;
  if (searchText.includes('forestry')) return Trees;
  
  // Home Economics
  if (searchText.includes('sewing')) return Scissors;
  if (searchText.includes('textile')) return Scissors;
  if (searchText.includes('interior')) return Home;
  if (searchText.includes('design')) return Ruler;
  
  // Engineering
  if (searchText.includes('engineering') || searchText.includes('engineering')) return Wrench;
  if (searchText.includes('architecture') || searchText.includes('bouwkunde')) return Building2;
  if (searchText.includes('construction') || searchText.includes('bouw')) return Building2;
  if (searchText.includes('mechanic')) return Wrench;
  if (searchText.includes('electrical')) return Zap;
  
  // Default icons based on title hash
  const fallbackIcons = [Sparkle, Lightbulb, StarIcon, Gift, Trophy, Diamond, Award, Book];
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
