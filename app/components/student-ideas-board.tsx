'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Lightbulb, Send } from 'lucide-react';

interface Idea {
  id: string;
  title: string;
  content: string;
  created_at: string;
  status: 'submitted' | 'reviewing' | 'approved' | 'rejected';
}

export function StudentIdeasBoard() {
  const [ideas, setIdeas] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchIdeas = async () => {
      try {
        const res = await fetch('/api/student/ideas');
        if (res.ok) {
          const data = await res.json();
          setIdeas(data.ideas || []);
        }
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };

    fetchIdeas();
  }, []);

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      alert('Please fill in both title and idea');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/student/ideas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      });

      if (res.ok) {
        const data = await res.json();
        setIdeas([data.idea, ...ideas]);
        setTitle('');
        setContent('');
      } else {
        alert('Failed to submit idea');
      }
    } catch (err) {
      alert('Error submitting idea');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Submit form */}
      <div className="rounded-lg border border-border bg-background p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="h-4 w-4 text-[var(--accent-brand)]" />
          <h3 className="font-medium text-sm">Share Your Ideas</h3>
        </div>

        <input
          type="text"
          placeholder="What's your idea? (title)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-brand)]"
        />

        <textarea
          placeholder="Describe your idea in detail..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent-brand)] resize-none"
        />

        <div className="flex justify-end">
          <Button
            onClick={handleSubmit}
            disabled={submitting || !title.trim() || !content.trim()}
            className="gap-2"
          >
            <Send className="h-3.5 w-3.5" />
            Submit Idea
          </Button>
        </div>
      </div>

      {/* Ideas list */}
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading ideas...</div>
      ) : ideas.length === 0 ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          No ideas submitted yet. Be the first!
        </div>
      ) : (
        <div className="space-y-2">
          {ideas.map((idea) => (
            <div
              key={idea.id}
              className="p-4 rounded-lg border border-border bg-background hover:bg-[hsl(var(--interactive-hover))] transition-colors"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <h4 className="font-medium text-sm">{idea.title}</h4>
                <span
                  className={`text-[10px] px-2 py-1 rounded-full font-medium ${
                    idea.status === 'approved'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : idea.status === 'rejected'
                      ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                      : idea.status === 'reviewing'
                      ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}
                >
                  {idea.status}
                </span>
              </div>
              <p className="text-xs text-foreground/80 mb-1">{idea.content}</p>
              <p className="text-[10px] text-muted-foreground">
                {new Date(idea.created_at).toLocaleDateString('en-GB')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
