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
  if (section === 'core') return 'core';
  if (section === 'classes') return 'classes';
  if (section === 'subjects') return 'subjects';
  return 'tools';
}

export function GlobalCommandPaletteDialog({ open, onOpenChange }: GlobalCommandPaletteDialogProps) {
  const router = useRouter();
  const context = useContext(AppContext) as AppContextType | null;
  const [query, setQuery] = useState('');
  const isTeacher = context?.role === 'teacher';

  const commands = useMemo(() => {
    const core: CommandItem[] = [
      { id: 'core-dashboard', label: 'dashboard', href: '/', section: 'core' },
      { id: 'core-manage-classes', label: isTeacher ? 'manage classes' : 'classes', href: '/classes', section: 'core' },
      { id: 'core-subjects', label: 'subjects', href: '/subjects', section: 'core' },
      { id: 'core-agenda', label: 'agenda', href: '/agenda', section: 'core' },
      { id: 'core-material', label: 'material', href: '/material', section: 'core' },
    ];

    const classCommands: CommandItem[] = (context?.classes || [])
      .filter((classItem) => classItem.status !== 'archived')
      .map((classItem) => ({
        id: `class-${classItem.id}`,
        label: classItem.name.toLowerCase(),
        href: `/class/${classItem.id}?tab=subjects`,
        description: 'open class workspace',
        section: 'classes',
      }));

    const subjectCommands: CommandItem[] = (context?.subjects || []).map((subject) => ({
      id: `subject-${subject.id}`,
      label: subject.title.toLowerCase(),
      href: `/subjects/${subject.id}`,
      description: 'open subject',
      section: 'subjects',
    }));

    const tools: CommandItem[] = [
      { id: 'tool-quiz', label: 'quiz tool', href: '/tools/quiz', section: 'tools' },
      { id: 'tool-flashcards', label: 'flashcards tool', href: '/tools/flashcards', section: 'tools' },
      { id: 'tool-notes', label: 'notes tool', href: '/tools/notes', section: 'tools' },
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
          <DialogTitle className="flex items-center gap-2 text-sm lowercase">
            <Command className="h-4 w-4" />
            quick jump
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="search classes, subjects, pages..."
              className="pl-9 lowercase"
            />
          </div>
          <div className="max-h-[52vh] overflow-auto rounded-md border border-border/70">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-sm text-muted-foreground lowercase">no matches</p>
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
                      <p className="truncate text-sm lowercase">{item.label}</p>
                      {item.description ? (
                        <p className="truncate text-xs text-muted-foreground lowercase">{item.description}</p>
                      ) : null}
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground uppercase tracking-wide">
                      {sectionLabel(item.section)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="lowercase">tip: cmd/ctrl + k</span>
            <Button variant="ghost" size="sm" className="h-7 lowercase" onClick={() => onOpenChange(false)}>
              close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
