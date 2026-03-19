'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, BookOpen, FileText, User, Users, Clock } from 'lucide-react';
import Link from 'next/link';

type SearchResult = {
  id: string;
  type: 'assignment' | 'subject' | 'chapter' | 'student' | 'class';
  title: string;
  subtitle?: string;
  url: string;
};

type SearchPanelProps = {
  classId: string;
};

export function SearchPanel({ classId }: SearchPanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const search = async () => {
      if (query.length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const response = await fetch(`/api/classes/${classId}/search?q=${encodeURIComponent(query)}`);
        if (response.ok) {
          const data = await response.json();
          setResults(data.results || []);
        }
      } catch (error) {
        console.error('Search failed:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [query, classId]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'assignment': return <FileText className="h-4 w-4" />;
      case 'subject': return <BookOpen className="h-4 w-4" />;
      case 'chapter': return <FileText className="h-4 w-4" />;
      case 'student': return <User className="h-4 w-4" />;
      case 'class': return <Users className="h-4 w-4" />;
      default: return <Search className="h-4 w-4" />;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-headline flex items-center gap-2 text-base">
          <Search className="h-5 w-5" />
          Search {classId ? 'Class' : 'All'}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search assignments, subjects, students..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {query.length > 0 && query.length < 2 && (
          <p className="text-sm text-muted-foreground text-center">
            Type at least 2 characters to search
          </p>
        )}

        {loading && (
          <div className="text-center py-4 text-muted-foreground">
            Searching...
          </div>
        )}

        {!loading && results.length > 0 && (
          <ScrollArea className="h-[300px]">
            <div className="space-y-2">
              {results.map(result => (
                <Link prefetch={false}
                  key={`${result.type}-${result.id}`}
                  href={result.url}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent transition-colors"
                >
                  <div className="text-muted-foreground">
                    {getIcon(result.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{result.title}</p>
                    {result.subtitle && (
                      <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                    )}
                  </div>
                  <Badge variant="secondary" className="capitalize">
                    {result.type}
                  </Badge>
                </Link>
              ))}
            </div>
          </ScrollArea>
        )}

        {!loading && query.length >= 2 && results.length === 0 && (
          <div className="text-center py-4">
            <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No results found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

