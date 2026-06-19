import {
  Atom,
  Brain,
  BookOpen,
  Calculator,
  Code2,
  Compass,
  Dna,
  FlaskConical,
  GraduationCap,
  Globe,
  Landmark,
  Languages,
  Lightbulb,
  Microscope,
  Music,
  Palette,
  Pencil,
  PenTool,
  Route,
  Sigma,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export type IconOption = {
  id: string;
  Icon: LucideIcon;
};

export type ColorOption = {
  id: string;
  swatchClass: string;
};

// Shared across the create wizard, the home dashboard and the per-studyset
// settings page so every "pick a look" surface offers the exact same set —
// only layout/placement should differ between pages, never the palette.
export const ICON_OPTIONS: IconOption[] = [
  { id: 'book-open', Icon: BookOpen },
  { id: 'flask', Icon: FlaskConical },
  { id: 'landmark', Icon: Landmark },
  { id: 'globe', Icon: Globe },
  { id: 'calculator', Icon: Calculator },
  { id: 'dna', Icon: Dna },
  { id: 'atom', Icon: Atom },
  { id: 'pencil', Icon: Pencil },
  { id: 'code', Icon: Code2 },
  { id: 'brain', Icon: Brain },
  { id: 'graduation-cap', Icon: GraduationCap },
  { id: 'languages', Icon: Languages },
  { id: 'music', Icon: Music },
  { id: 'palette', Icon: Palette },
  { id: 'microscope', Icon: Microscope },
  { id: 'sigma', Icon: Sigma },
  { id: 'compass', Icon: Compass },
  { id: 'pen-tool', Icon: PenTool },
  { id: 'lightbulb', Icon: Lightbulb },
];

export const COLOR_OPTIONS: ColorOption[] = [
  { id: 'cobalt', swatchClass: 'bg-[#3a5be7]' },
  { id: 'azure', swatchClass: 'bg-[#1d9bf0]' },
  { id: 'turquoise', swatchClass: 'bg-[#19b5a5]' },
  { id: 'mint', swatchClass: 'bg-[#25c47a]' },
  { id: 'lime', swatchClass: 'bg-[#6ad63a]' },
  { id: 'amber', swatchClass: 'bg-[#f4b400]' },
  { id: 'orange', swatchClass: 'bg-[#f78422]' },
  { id: 'coral', swatchClass: 'bg-[#ff6f61]' },
  { id: 'rose', swatchClass: 'bg-[#ff4f8b]' },
  { id: 'magenta', swatchClass: 'bg-[#d946ef]' },
  { id: 'violet', swatchClass: 'bg-[#8b5cf6]' },
  { id: 'grape', swatchClass: 'bg-[#5f3dc4]' },
  { id: 'charcoal', swatchClass: 'bg-[#4b5563]' },
  { id: 'slate', swatchClass: 'bg-[#64748b]' },
];

export function colorHex(colorId: string | null | undefined) {
  const found = COLOR_OPTIONS.find((option) => option.id === colorId);
  if (!found) return '#6b7c4e';
  const match = found.swatchClass.match(/#([0-9a-fA-F]{6})/);
  return match ? `#${match[1]}` : '#6b7c4e';
}

export function iconForId(iconId: string | null | undefined): LucideIcon {
  return ICON_OPTIONS.find((option) => option.id === iconId)?.Icon || Route;
}

export function statusMeta(status: string) {
  switch (status) {
    case 'due':
      return { label: 'Due', className: 'bg-[#fbe9e7] text-[#9b3a32] border border-[#f1c4bf]' };
    case 'completed':
      return { label: 'Completed', className: 'bg-[#e8eddf] text-[#4a5735] border border-[#d4dcc2]' };
    case 'draft':
      return { label: 'Draft', className: 'bg-muted text-muted-foreground border border-border/60' };
    case 'archived':
      return { label: 'Archived', className: 'bg-muted text-muted-foreground border border-border/60' };
    default:
      return { label: 'Active', className: 'bg-[#eef1e7] text-[#5b6b41] border border-[#d8e0c8]' };
  }
}
