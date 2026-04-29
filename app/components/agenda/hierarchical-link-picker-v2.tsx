'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, ChevronRight, Home, BookOpen, FileText, Layers, Plus } from 'lucide-react';

type LinkItem = {
  id: string;
  title: string;
  type: 'subject' | 'chapter' | 'paragraph' | 'assignment';
  path?: string;
  children?: LinkItem[];
  subjectName?: string;
  chapterTitle?: string;
  paragraphTitle?: string;
  assignmentIndex?: string;
};

type SelectedPath = {
  subject?: LinkItem;
  chapter?: LinkItem;
  paragraph?: LinkItem;
};

type LinkSelectPayload = {
  type: 'subject' | 'chapter' | 'paragraph' | 'assignment';
  url: string;
  title: string;
  path?: string;
};

export function HierarchicalLinkPickerV2({
  isOpen,
  onClose,
  onSelect,
  classId,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (link: LinkSelectPayload) => void;
  classId?: string;
}) {
  const [hierarchy, setHierarchy] = useState<LinkItem[]>([]);
  const [currentItems, setCurrentItems] = useState<LinkItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPath, setSelectedPath] = useState<SelectedPath>({});
  const [currentLevel, setCurrentLevel] = useState<'subjects' | 'chapters' | 'paragraphs' | 'assignments'>('subjects');

  useEffect(() => {
    if (isOpen && classId) void fetchHierarchy();
    if (!isOpen) {
      setSearchQuery('');
      setSelectedPath({});
      setCurrentLevel('subjects');
      setCurrentItems(hierarchy);
    }
  }, [isOpen, classId]);

  const fetchHierarchy = async () => {
    if (!classId) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/classes/${classId}/subjects`);
      const data = await response.json();
      if (!response.ok) {
        setHierarchy([]);
        setCurrentItems([]);
        return;
      }

      const rows = Array.isArray(data) ? data : data?.subjects || [];
      const subjects: LinkItem[] = rows.map((subject: any) => {
        const subjectItem: LinkItem = {
          id: subject.id,
          title: subject.title || subject.name || 'Subject',
          type: 'subject',
          path: `/subjects/${subject.id}`,
          children: [],
        };

        const chapters = Array.isArray(subject.chapters) ? subject.chapters : [];
        subjectItem.children = chapters.map((chapter: any) => {
          const chapterItem: LinkItem = {
            id: chapter.id,
            title: chapter.title || 'Chapter',
            type: 'chapter',
            path: `/subjects/${subject.id}/chapters/${chapter.id}`,
            children: [],
            subjectName: subjectItem.title,
          };

          const paragraphs = Array.isArray(chapter.paragraphs) ? chapter.paragraphs : [];
          chapterItem.children = paragraphs.map((paragraph: any) => {
            const paragraphNum = `${chapter.chapter_number ?? ''}.${paragraph.paragraph_number ?? ''}`.replace(/^\./, '');
            const paragraphItem: LinkItem = {
              id: paragraph.id,
              title: paragraphNum ? `${paragraphNum} ${paragraph.title || 'Paragraph'}` : (paragraph.title || 'Paragraph'),
              type: 'paragraph',
              path: `/subjects/${subject.id}/chapters/${chapter.id}/paragraphs/${paragraph.id}`,
              children: [],
              subjectName: subjectItem.title,
              chapterTitle: chapterItem.title,
            };

            const assignments = Array.isArray(paragraph.assignments) ? paragraph.assignments : [];
            paragraphItem.children = assignments.map((assignment: any) => {
              const assignmentLetter = Number.isFinite(assignment.assignment_index)
                ? String.fromCharCode(97 + Number(assignment.assignment_index))
                : 'a';
              return {
                id: assignment.id,
                title: assignment.title || `Assignment ${assignmentLetter}`,
                type: 'assignment',
                path: `/subjects/${subject.id}/chapters/${chapter.id}/paragraphs/${paragraph.id}/assignments/${assignment.id}`,
                subjectName: subjectItem.title,
                chapterTitle: chapterItem.title,
                paragraphTitle: paragraph.title || 'Paragraph',
                assignmentIndex: assignmentLetter,
              };
            });

            return paragraphItem;
          });

          return chapterItem;
        });

        return subjectItem;
      });

      setHierarchy(subjects);
      setCurrentItems(subjects);
      setSelectedPath({});
      setCurrentLevel('subjects');
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = (item: LinkItem) => {
    const path =
      item.type === 'assignment'
        ? `${item.subjectName || ''} > ${item.chapterTitle || ''} > ${item.paragraphTitle || ''}`
        : item.type === 'paragraph'
        ? `${item.subjectName || ''} > ${item.chapterTitle || ''}`
        : item.type === 'chapter'
        ? item.subjectName || ''
        : undefined;

    onSelect({
      type: item.type,
      url: item.path || '#',
      title: item.title,
      path,
    });
  };

  const handleItemClick = (item: LinkItem) => {
    if (item.type === 'assignment') {
      addItem(item);
      return;
    }

    if (item.type === 'subject') {
      setSelectedPath({ subject: item });
      setCurrentLevel('chapters');
      setCurrentItems(item.children || []);
      return;
    }

    if (item.type === 'chapter') {
      setSelectedPath((prev) => ({ ...prev, chapter: item }));
      setCurrentLevel('paragraphs');
      setCurrentItems(item.children || []);
      return;
    }

    setSelectedPath((prev) => ({ ...prev, paragraph: item }));
    setCurrentLevel('assignments');
    setCurrentItems(item.children || []);
  };

  const handleBreadcrumbClick = (level: 'subjects' | 'chapters' | 'paragraphs' | 'assignments') => {
    if (level === 'subjects') {
      setSelectedPath({});
      setCurrentLevel('subjects');
      setCurrentItems(hierarchy);
      return;
    }

    if (level === 'chapters') {
      setSelectedPath((prev) => ({ subject: prev.subject }));
      setCurrentLevel('chapters');
      setCurrentItems(selectedPath.subject?.children || []);
      return;
    }

    if (level === 'paragraphs') {
      setSelectedPath((prev) => ({ subject: prev.subject, chapter: prev.chapter }));
      setCurrentLevel('paragraphs');
      setCurrentItems(selectedPath.chapter?.children || []);
      return;
    }

    setCurrentLevel('assignments');
    setCurrentItems(selectedPath.paragraph?.children || []);
  };

  const breadcrumbs = useMemo(() => {
    const list: Array<{ label: string; level: 'chapters' | 'paragraphs' | 'assignments' }> = [];
    if (selectedPath.subject) list.push({ label: selectedPath.subject.title, level: 'chapters' });
    if (selectedPath.chapter) list.push({ label: selectedPath.chapter.title, level: 'paragraphs' });
    if (selectedPath.paragraph) list.push({ label: selectedPath.paragraph.title, level: 'assignments' });
    return list;
  }, [selectedPath]);

  const filteredItems = currentItems.filter((item) =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getItemIcon = (type: LinkItem['type']) => {
    switch (type) {
      case 'subject':
        return <BookOpen className="h-4 w-4" />;
      case 'chapter':
        return <Layers className="h-4 w-4" />;
      case 'paragraph':
        return <FileText className="h-4 w-4" />;
      default:
        return <BookOpen className="h-4 w-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Subject Content</DialogTitle>
          <DialogDescription>
            Pick a subject, chapter, paragraph, or assignment. You can add from any level.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4 flex items-center gap-2 overflow-x-auto pb-1 text-sm">
          <Button variant="ghost" size="sm" onClick={() => handleBreadcrumbClick('subjects')} className="h-7 px-2">
            <Home className="mr-1 h-3 w-3" />
            Subjects
          </Button>
          {breadcrumbs.map((crumb, idx) => (
            <span key={`${crumb.label}-${idx}`} className="flex items-center gap-2">
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <Button variant="ghost" size="sm" onClick={() => handleBreadcrumbClick(crumb.level)} className="h-7 px-2 text-xs">
                {crumb.label}
              </Button>
            </span>
          ))}
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <ScrollArea className="h-[420px]">
            <div className="space-y-1 p-1">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 rounded-lg px-2 py-2 hover:surface-interactive">
                    <button type="button" onClick={() => handleItemClick(item)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                      {getItemIcon(item.type)}
                      <span className="truncate text-sm font-medium">{item.title}</span>
                      {(item.children?.length || 0) > 0 && <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />}
                    </button>
                    <Button type="button" size="sm" variant="secondary" className="h-7 px-2 text-xs" onClick={() => addItem(item)}>
                      <Plus className="mr-1 h-3 w-3" />
                      Add
                    </Button>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No items found</p>
              )}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-end border-t pt-4">
          <Button variant="secondary" onClick={onClose}>Done</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
