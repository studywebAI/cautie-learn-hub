'use client';

import { useState, useEffect, useContext } from 'react';
import {
  BrainCircuit,
  Copy,
  FileSignature,
  BookOpen,
  Clock
} from 'lucide-react';
import { format } from 'date-fns';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { useSidebar } from '@/components/ui/sidebar';

type RecentItem = {
  id: string;
  title: string | null;
  type: string;
  updated_at: string;
};

const TYPE_ICONS: Record<string, typeof BrainCircuit> = {
  flashcards: Copy,
  notes: FileSignature,
  quiz: BrainCircuit,
  mindmap: BrainCircuit,
  wordweb: BrainCircuit,
  timeline: FileSignature,
  subject: BookOpen,
  assignment: FileSignature,
};

const TYPE_LABELS: Record<string, string> = {
  flashcards: 'Flashcards',
  notes: 'Notes',
  quiz: 'Quiz',
  mindmap: 'Mind Map',
  wordweb: 'Word Web',
  timeline: 'Timeline',
  subject: 'Subject',
  assignment: 'Assignment',
};

export function RecentsSidebar() {
  const { session } = useContext(AppContext) as AppContextType;
  const [recents, setRecents] = useState<RecentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { state } = useSidebar();
  
  const isCollapsed = state === 'collapsed';

  useEffect(() => {
    if (session) {
      fetch('/api/materials?limit=5')
        .then(response => response.json())
        .then(data => {
          setRecents(data.materials || []);
        })
        .catch(error => {
          console.error('Failed to fetch recent materials:', error);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else {
      setIsLoading(false);
    }
  }, [session]);

  if (isCollapsed) return null;

  if (isLoading) {
    return (
      <div className="px-2">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2 px-1">
          <Clock className="h-3 w-3" />
          Recents
        </p>
        <div className="space-y-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse h-6 bg-muted rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (recents.length === 0) {
    return (
      <div className="px-2">
        <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2 px-1">
          <Clock className="h-3 w-3" />
          Recents
        </p>
        <p className="text-xs text-muted-foreground text-center py-2 bg-muted/30 rounded border border-border">
          No recent activity
        </p>
      </div>
    );
  }

  return (
    <div className="px-2">
      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-2 px-1">
        <Clock className="h-3 w-3" />
        Recents
      </p>
      <div className="rounded border border-border bg-muted/20 divide-y divide-border">
        {recents.map((item) => {
          const Icon = TYPE_ICONS[item.type] || FileSignature;
          const typeLabel = TYPE_LABELS[item.type] || item.type;
          const dateStr = format(new Date(item.updated_at), 'MMM d');

          return (
            <div
              key={item.id}
              className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => window.location.href = `/material/${item.id}`}
            >
              <Icon className="h-3 w-3 text-muted-foreground shrink-0" />
              <span className="text-xs flex-1 truncate">
                {typeLabel}
              </span>
              <span className="text-xs text-muted-foreground shrink-0">
                {dateStr}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
