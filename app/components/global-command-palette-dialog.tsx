'use client';

import { useContext, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Command, Search } from 'lucide-react';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type CommandItem = {
  id: string;
  label: string;
  href: string;
  description?: string;
  section: 'core' | 'classes' | 'subjects' | 'tools';
};

type GlobalCommandPaletteDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function sectionLabel(section: CommandItem['section']) {
  if (section === 'core') return 'Core';
  if (section === 'classes') return 'Classes';
  if (section === 'subjects') return 'Subjects';
  return 'Tools';
}

export function GlobalCommandPaletteDialog({ open, onOpenChange }: GlobalCommandPaletteDialogProps) {
  const router = useRouter();
  const context = useContext(AppContext) as AppContextType | null;
  const [query, setQuery] = useState('');
  const isTeacher = context?.role === 'teacher';

  const commands = useMemo(() => {
    const core: CommandItem[] = [
      { id: 'core-dashboard', label: 'Dashboard', href: '/', section: 'core' },
      { id: 'core-manage-classes', label: isTeacher ? 'Manage Classes' : 'Classes', href: '/classes', section: 'core' },
      { id: 'core-subjects', label: 'Subjects', href: '/subjects', section: 'core' },
      { id: 'core-agenda', label: 'Agenda', href: '/agenda', section: 'core' },
      { id: 'core-material', label: 'Material', href: '/material', section: 'core' },
    ];

    const classCommands: CommandItem[] = (context?.classes || [])
      .filter((classItem) => classItem.status !== 'archived')
      .map((classItem) => ({
        id: `class-${classItem.id}`,
        label: classItem.name,
            href: `/class/${classItem.id}?tab=group`,
        description: 'Open class workspace',
        section: 'classes',
      }));

    const subjectCommands: CommandItem[] = (context?.subjects || []).map((subject) => ({
      id: `subject-${subject.id}`,
      label: subject.title,
      href: `/subjects/${subject.id}`,
      description: 'Open subject',
      section: 'subjects',
    }));

    const tools: CommandItem[] = [
      { id: 'tool-quiz', label: 'Quiz Tool', href: '/tools/quiz', section: 'tools' },
      { id: 'tool-flashcards', label: 'Flashcards Tool', href: '/tools/flashcards', section: 'tools' },
      { id: 'tool-notes', label: 'Notes Tool', href: '/tools/notes', section: 'tools' },
      { id: 'tool-presentation', label: 'Presentation Tool', href: '/tools/presentation', section: 'tools' },
    ];

    return [...core, ...classCommands, ...subjectCommands, ...tools];
  }, [context?.classes, context?.subjects, isTeacher]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands.slice(0, 30);
    return commands
      .filter((item) => `${item.label} ${item.description || ''} ${item.section}`.toLowerCase().includes(q))
      .slice(0, 40);
  }, [commands, query]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Command className="h-4 w-4" />
            Quick Jump
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search classes, subjects, pages..."
              className="pl-9"
            />
          </div>
          <div className="max-h-[52vh] overflow-auto rounded-md border border-border/70">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-foreground/75">No matches</p>
            ) : (
              <div className="divide-y divide-border/60">
                {filtered.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={cn(
                      'w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors',
                      'flex items-center justify-between gap-3'
                    )}
                    onClick={() => {
                      onOpenChange(false);
                      setQuery('');
                      router.push(item.href);
                    }}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm">{item.label}</p>
                      {item.description ? (
                        <p className="truncate text-xs text-foreground/65">{item.description}</p>
                      ) : null}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-foreground/65 tracking-wide">
                      {sectionLabel(item.section)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-foreground/65">
            <span>Tip: Cmd/Ctrl + K</span>
            <Button variant="ghost" size="sm" className="h-7" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
