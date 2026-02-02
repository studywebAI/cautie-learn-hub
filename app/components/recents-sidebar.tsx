'use client';

import { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BrainCircuit,
  Copy,
  FileSignature,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { AppContext, AppContextType } from '@/contexts/app-context';
import { useSidebar } from '@/components/ui/sidebar';

type RecentMaterial = {
  id: string;
  title: string | null;
  type: string;
  updated_at: string;
};

const TYPE_ICONS = {
  flashcards: Copy,
  notes: FileSignature,
  quiz: BrainCircuit,
  mindmap: BrainCircuit,
  wordweb: BrainCircuit,
  timeline: FileSignature,
};

const TYPE_LABELS = {
  flashcards: 'Flashcards',
  notes: 'Notes',
  quiz: 'Quiz',
  mindmap: 'Mind Map',
  wordweb: 'Word Web',
  timeline: 'Timeline',
};

export function RecentsSidebar() {
  const { session } = useContext(AppContext) as AppContextType;
  const [recents, setRecents] = useState<RecentMaterial[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { state } = useSidebar();
  
  // Hide completely when sidebar is collapsed
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

  // Don't render anything when collapsed
  if (isCollapsed) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Recents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-3 bg-muted rounded w-3/4 mb-1"></div>
              <div className="h-2 bg-muted rounded w-1/2"></div>
            </div>
          ))}
        </CardContent>
      </Card>
    );
  }

  if (recents.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-xs font-medium flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Recents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground text-center py-2">
            No recent materials
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium flex items-center gap-1">
          <Clock className="h-3 w-3" />
          Recents
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {recents.map((item) => {
          const Icon = TYPE_ICONS[item.type as keyof typeof TYPE_ICONS] || FileSignature;
          const typeLabel = TYPE_LABELS[item.type as keyof typeof TYPE_LABELS] || item.type;

          return (
            <div
              key={item.id}
              className="flex items-center gap-2 p-1.5 rounded-md border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
              onClick={() => window.location.href = `/material/${item.id}`}
            >
              <Icon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate" title={item.title || 'Untitled'}>
                  {item.title || 'Untitled'}
                </p>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                    {typeLabel}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}