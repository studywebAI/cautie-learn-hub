'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Search, ChevronRight, Home, BookOpen, FileText, Layers } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

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
  assignment?: LinkItem;
};

export function HierarchicalLinkPickerV2({ 
  isOpen, 
  onClose, 
  onSelect, 
  classId 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSelect: (link: { 
    type: 'subject' | 'chapter' | 'paragraph' | 'assignment'; 
    url: string; 
    title: string; 
    path?: string;
  }) => void; 
  classId?: string;
}) {
  const [hierarchy, setHierarchy] = useState<LinkItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPath, setSelectedPath] = useState<SelectedPath>({});
  const [currentLevel, setCurrentLevel] = useState<'subjects' | 'chapters' | 'paragraphs' | 'assignments'>('subjects');
  const [currentItems, setCurrentItems] = useState<LinkItem[]>([]);

  useEffect(() => {
    if (isOpen && classId) {
      fetchHierarchy();
    }
  }, [isOpen, classId]);

  const fetchHierarchy = async () => {
    setIsLoading(true);
    try {
      if (!classId) {
        console.warn('No classId provided');
        setHierarchy([]);
        setCurrentItems([]);
        return;
      }

      const response = await fetch(`/api/classes/${classId}/subjects`);
      if (response.ok) {
        const data = await response.json();
        const subjects: LinkItem[] = [];
        
        // The API returns an array directly, not { subjects: [...] }
        const subjectsArray = Array.isArray(data) ? data : (data.subjects || []);
        
        console.log('Fetched subjects array:', subjectsArray); // Debug
        
        if (subjectsArray.length === 0) {
          console.warn('No subjects returned for class:', classId);
        }
        
        for (const subject of subjectsArray) {
          const subjectItem: LinkItem = {
            id: subject.id,
            title: subject.title || subject.name,
            type: 'subject',
            path: `/subjects/${subject.id}`,
            children: [],
          };
          
          if (subject.chapters) {
            for (const chapter of subject.chapters) {
              const chapterItem: LinkItem = {
                id: chapter.id,
                title: chapter.title,
                type: 'chapter',
                path: `/subjects/${subject.id}/chapters/${chapter.id}`,
                children: [],
                subjectName: subjectItem.title,
              };
              
              if (chapter.paragraphs) {
                for (const paragraph of chapter.paragraphs) {
                  const paragraphNum = `${chapter.order_index}.${paragraph.order_index}`;
                  const paragraphItem: LinkItem = {
                    id: paragraph.id,
                    title: `${paragraphNum}: ${paragraph.title}`,
                    type: 'paragraph',
                    path: `/subjects/${subject.id}/chapters/${chapter.id}/paragraphs/${paragraph.id}`,
                    children: [],
                    subjectName: subjectItem.title,
                    chapterTitle: chapter.title,
                  };
                  
                  if (paragraph.assignments) {
                    for (const assignment of paragraph.assignments) {
                      const assignmentLetter = String.fromCharCode(97 + (assignment.assignment_index || 0));
                      const assignmentItem: LinkItem = {
                        id: assignment.id,
                        title: assignment.title || `Assignment ${assignmentLetter}`,
                        type: 'assignment',
                        path: `/subjects/${subject.id}/chapters/${chapter.id}/paragraphs/${paragraph.id}/assignments/${assignment.id}`,
                        subjectName: subjectItem.title,
                        chapterTitle: chapter.title,
                        paragraphTitle: paragraph.title,
                        assignmentIndex: assignmentLetter,
                      };
                      paragraphItem.children?.push(assignmentItem);
                    }
                  }
                  
                  chapterItem.children?.push(paragraphItem);
                }
              }
              
              subjectItem.children?.push(chapterItem);
            }
          }
          
          subjects.push(subjectItem);
        }
        
        setHierarchy(subjects);
        setCurrentItems(subjects);
        console.log('Hierarchy built:', subjects); // Debug
      } else {
        console.error('Failed to fetch subjects:', response.status, response.statusText);
        setHierarchy([]);
        setCurrentItems([]);
      }
    } catch (error) {
      console.error('Failed to fetch hierarchy:', error);
      setHierarchy([]);
      setCurrentItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleItemClick = (item: LinkItem) => {
    if (item.type === 'assignment') {
      // Assignment selected - confirm and return
      onSelect({
        type: 'assignment',
        url: item.path || '',
        title: item.title,
        path: `${item.subjectName} › ${item.chapterTitle} › ${item.paragraphTitle} › ${item.assignmentIndex}`,
      });
      onClose();
      return;
    }

    // For subject/chapter/paragraph, drill down
    if (item.type === 'subject') {
      setSelectedPath({ subject: item });
      setCurrentLevel('chapters');
      setCurrentItems(item.children || []);
    } else if (item.type === 'chapter') {
      setSelectedPath(prev => ({ ...prev, chapter: item }));
      setCurrentLevel('paragraphs');
      setCurrentItems(item.children || []);
    } else if (item.type === 'paragraph') {
      setSelectedPath(prev => ({ ...prev, paragraph: item }));
      setCurrentLevel('assignments');
      setCurrentItems(item.children || []);
    }
  };

  const handleBreadcrumbClick = (level: 'subjects' | 'chapters' | 'paragraphs' | 'assignments') => {
    if (level === 'subjects') {
      setSelectedPath({});
      setCurrentLevel('subjects');
      setCurrentItems(hierarchy);
    } else if (level === 'chapters') {
      setSelectedPath(prev => ({ subject: prev.subject }));
      setCurrentLevel('chapters');
      setCurrentItems(selectedPath.subject?.children || []);
    } else if (level === 'paragraphs') {
      setSelectedPath(prev => ({ subject: prev.subject, chapter: prev.chapter }));
      setCurrentLevel('paragraphs');
      setCurrentItems(selectedPath.chapter?.children || []);
    } else if (level === 'assignments') {
      setSelectedPath(prev => ({ subject: prev.subject, chapter: prev.chapter, paragraph: prev.paragraph }));
      setCurrentLevel('assignments');
      setCurrentItems(selectedPath.paragraph?.children || []);
    }
  };

  const getBreadcrumbItems = () => {
    const items = [];
    if (selectedPath.subject) {
      items.push({ label: selectedPath.subject.title, level: 'chapters' as const });
    }
    if (selectedPath.chapter) {
      items.push({ label: selectedPath.chapter.title, level: 'paragraphs' as const });
    }
    if (selectedPath.paragraph) {
      items.push({ label: selectedPath.paragraph.title, level: 'assignments' as const });
    }
    return items;
  };

  const filteredItems = (currentItems || []).filter(item =>
    item.title.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  // Debug
  if (searchQuery === '') {
    console.log('Current items:', currentItems?.length, 'Filtered:', filteredItems.length);
  }

  const getItemIcon = (type: LinkItem['type']) => {
    switch (type) {
      case 'subject': return <BookOpen className="h-4 w-4" />;
      case 'chapter': return <Layers className="h-4 w-4" />;
      case 'paragraph': return <FileText className="h-4 w-4" />;
      case 'assignment': return <BookOpen className="h-4 w-4" />;
    }
  };

  const getItemDescription = (item: LinkItem) => {
    if (item.type === 'assignment') {
      return `${item.subjectName} › ${item.chapterTitle} › ${item.paragraphTitle}`;
    }
    if (item.type === 'paragraph') {
      return `${item.subjectName} › ${item.chapterTitle}`;
    }
    if (item.type === 'chapter') {
      return item.subjectName;
    }
    return '';
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Link to Content</DialogTitle>
          <DialogDescription>
            Navigate through your subjects and select an assignment, chapter, or paragraph.
          </DialogDescription>
        </DialogHeader>

        {/* Breadcrumb Navigation */}
        <div className="flex items-center gap-2 text-sm mb-4 overflow-x-auto pb-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleBreadcrumbClick('subjects')}
            className="h-7 px-2"
          >
            <Home className="h-3 w-3 mr-1" />
            Subjects
          </Button>
          
          {getBreadcrumbItems().map((item, idx) => (
            <span key={idx} className="flex items-center gap-2">
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleBreadcrumbClick(item.level)}
                className="h-7 px-2 text-xs"
              >
                {item.label}
              </Button>
            </span>
          ))}
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Content List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-1 p-1">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className="w-full flex flex-col gap-1 p-3 rounded-lg text-left transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center gap-2">
                      {getItemIcon(item.type)}
                      <span className="truncate font-medium">{item.title}</span>
                      <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
                    </div>
                    {getItemDescription(item) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground pl-6">
                        <span className="truncate">{getItemDescription(item)}</span>
                      </div>
                    )}
                  </button>
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No items found
                </p>
              )}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
