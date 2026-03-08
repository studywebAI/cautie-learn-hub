'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Command, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

type CommandItem = {
  id: string;
  label: string;
  href: string;
  description?: string;
};

const COMMANDS: CommandItem[] = [
  { id: 'quiz', label: 'Open Quiz Studio', href: '/tools/quiz', description: 'Generate and run quizzes' },
  { id: 'flashcards', label: 'Open Flashcards Studio', href: '/tools/flashcards', description: 'Build decks and study cards' },
  { id: 'notes', label: 'Open Notes Studio', href: '/tools/notes', description: 'Generate structured notes' },
  { id: 'materials', label: 'Open Material Library', href: '/material', description: 'Browse and manage saved output' },
];

export function ToolboxCommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter((item) => `${item.label} ${item.description || ''}`.toLowerCase().includes(q));
  }, [query]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Command className="mr-2 h-4 w-4" />
          Command Palette
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Toolbox Commands</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search commands..." className="pl-9" />
          </div>
          <div className="space-y-2">
            {filtered.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setOpen(false)}
                className="block rounded-md border p-3 hover:bg-muted/50"
              >
                <p className="text-sm font-medium">{item.label}</p>
                {item.description && <p className="text-xs text-muted-foreground">{item.description}</p>}
              </Link>
            ))}
            {filtered.length === 0 && <p className="text-sm text-muted-foreground">No commands found.</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
