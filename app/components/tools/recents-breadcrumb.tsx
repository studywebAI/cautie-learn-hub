'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useParams } from 'next/navigation';

type RecentStudyset = {
  id: string;
  name: string;
  timestamp: number;
};

const RECENTS_STORAGE_KEY = 'tools-recent-studysets';
const MAX_RECENTS = 5;

export function RecentsLinksUpdater() {
  // This component updates the recents list whenever the page loads
  const params = useParams<{ studysetId?: string }>();
  const studysetId = params?.studysetId as string | undefined;

  useEffect(() => {
    if (!studysetId) return;

    const loadStudysetName = async () => {
      try {
        const response = await fetch(`/api/studysets/${studysetId}`, { cache: 'no-store' });
        if (!response.ok) return;
        const data = await response.json();
        const studyset = data.studyset;
        if (!studyset?.id) return;

        // Update recents list
        const existing = JSON.parse(typeof window !== 'undefined' ? window.localStorage.getItem(RECENTS_STORAGE_KEY) || '[]' : '[]');
        const updated = existing.filter((r: RecentStudyset) => r.id !== studysetId);
        updated.unshift({
          id: studysetId,
          name: studyset.name,
          timestamp: Date.now(),
        });

        if (typeof window !== 'undefined') {
          window.localStorage.setItem(
            RECENTS_STORAGE_KEY,
            JSON.stringify(updated.slice(0, MAX_RECENTS))
          );
        }
      } catch (error) {
        // Silently fail
      }
    };

    void loadStudysetName();
  }, [studysetId]);

  return null;
}

export function RecentsBreadcrumb() {
  const params = useParams<{ studysetId?: string }>();
  const currentStudysetId = params?.studysetId as string | undefined;
  const [recents, setRecents] = useState<RecentStudyset[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(RECENTS_STORAGE_KEY);
    const items = stored ? JSON.parse(stored) : [];
    // Show only recent items that are NOT the current one
    const filtered = items.filter((r: RecentStudyset) => r.id !== currentStudysetId);
    setRecents(filtered.slice(0, 3));
  }, [currentStudysetId]);

  if (recents.length === 0) return null;

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-muted-foreground">Recent:</span>
      <div className="flex items-center gap-1">
        {recents.map((recent, index) => (
          <div key={recent.id} className="flex items-center gap-1">
            <Link
              href={`/tools/studyset/${recent.id}`}
              className="truncate text-primary hover:underline max-w-[100px]"
              title={recent.name}
            >
              {recent.name}
            </Link>
            {index < recents.length - 1 && (
              <ChevronRight className="h-3 w-3 text-muted-foreground/50" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
