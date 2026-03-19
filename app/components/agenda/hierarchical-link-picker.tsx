'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ChevronRight, Search, Loader2, BookOpen, Check, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type NavigationLevel = 'subjects' | 'chapters' | 'paragraphs' | 'assignments';

type Subject = { id: string; title: string; name?: string; description?: string | null; };
type Chapter = { id: string; title: string; chapter_number: number; subject_id: string; };
type Paragraph = { id: string; title: string; paragraph_number: number; chapter_id: string; assignment_count?: number; };
type Assignment = { id: string; title: string; assignment_index: number; paragraph_id: string; };

export type LinkedContent = { 
  type: 'material' | 'subject' | 'chapter' | 'paragraph' | 'assignment'; 
  url: string; 
  title: string; 
  path?: string; 
  level?: NavigationLevel; 
};

type HierarchicalLinkPickerProps = { isOpen: boolean; onClose: () => void; onSelect: (link: LinkedContent) => void; classId?: string; };

// Keyboard shortcuts hint component
function KeyboardHint() {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground px-2 py-1 border-t bg-muted/30">
      <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground">â†‘</kbd><kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground">â†“</kbd> Navigate</span>
      <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground">â†µ</kbd> Select</span>
      <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground">â†</kbd> Back</span>
      <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-muted rounded text-foreground">esc</kbd> Close</span>
    </div>
  );
}

function Breadcrumb({ items, currentLevel, onNavigate }: { items: { label: string; level: NavigationLevel; id?: string }[]; currentLevel: NavigationLevel; onNavigate: (index: number) => void; }) {
  return (
    <nav className="flex items-center gap-1 text-sm px-1 pb-2 border-b">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const isActive = item.level === currentLevel && isLast;
        return (
          <div key={`${item.level}-${item.id || index}`} className="flex items-center gap-1">
            {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <button onClick={() => onNavigate(index)} disabled={isActive} className={cn("transition-colors hover:underline", isActive ? "text-foreground font-medium" : "text-muted-foreground hover:text-foreground")}>{item.label}</button>
          </div>
        );
      })}
    </nav>
  );
}

function ItemCard({ icon: Icon, label, badge, isSelected, onClick, showBadge }: { icon: any; label: string; badge?: string | number; isSelected: boolean; onClick: () => void; showBadge?: boolean }) {
  return (
    <div onClick={onClick} className={cn("group relative flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer", isSelected ? "bg-primary/10 border-primary" : "hover:bg-muted hover:border-muted-foreground/25")}>
      <div className={cn("w-8 h-8 rounded-md flex items-center justify-center text-sm font-medium transition-colors", isSelected ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
        {showBadge ? badge : <Icon className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0"><h4 className="font-medium truncate">{label}</h4>{badge && showBadge && <p className="text-xs text-muted-foreground">{badge}</p>}</div>
      {isSelected ? <Check className="h-5 w-5 text-primary" /> : showBadge ? <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" /> : <div className="w-8" />}
    </div>
  );
}

export function HierarchicalLinkPicker({ isOpen, onClose, onSelect, classId }: HierarchicalLinkPickerProps) {
  const { toast } = useToast();
  const [currentLevel, setCurrentLevel] = useState<NavigationLevel>('subjects');
  const [navigationStack, setNavigationStack] = useState<Array<{ level: NavigationLevel; subjectId?: string; chapterId?: string; paragraphId?: string; }>>([{ level: 'subjects' }]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [paragraphs, setParagraphs] = useState<Paragraph[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<LinkedContent | null>(null);
  const currentNav = navigationStack[navigationStack.length - 1];

  const fetchSubjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const url = classId ? `/api/classes/${classId}/subjects` : '/api/subjects';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setSubjects(Array.isArray(data) ? data : (data.subjects || []));
      }
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  }, [classId]);

  const fetchChapters = useCallback(async (subjectId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/subjects/${subjectId}/chapters`);
      if (res.ok) { const data = await res.json(); setChapters(Array.isArray(data) ? data : (data.chapters || [])); }
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  }, []);

  const fetchParagraphs = useCallback(async (chapterId: string, subjectId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs`);
      if (res.ok) { const data = await res.json(); setParagraphs(Array.isArray(data) ? data : (data.paragraphs || [])); }
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  }, []);

  const fetchAssignments = useCallback(async (paragraphId: string, subjectId: string, chapterId: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/subjects/${subjectId}/chapters/${chapterId}/paragraphs/${paragraphId}/assignments`);
      if (res.ok) { const data = await res.json(); setAssignments(Array.isArray(data) ? data : (data.assignments || [])); }
    } catch (e) { console.error(e); } finally { setIsLoading(false); }
  }, []);

  useEffect(() => { if (isOpen && currentLevel === 'subjects') fetchSubjects(); }, [isOpen, currentLevel, fetchSubjects]);

  const navigateTo = (level: NavigationLevel, params: { subjectId?: string; chapterId?: string; paragraphId?: string }) => {
    const newStack = [...navigationStack, { level, ...params }];
    setNavigationStack(newStack);
    setCurrentLevel(level);
    setSearchQuery('');
    setSelectedItem(null);
    if (level === 'chapters' && params.subjectId) fetchChapters(params.subjectId);
    else if (level === 'paragraphs' && params.chapterId && params.subjectId) fetchParagraphs(params.chapterId, params.subjectId);
    else if (level === 'assignments' && params.paragraphId && params.subjectId && params.chapterId) fetchAssignments(params.paragraphId, params.subjectId, params.chapterId);
  };

  const navigateBack = (index: number) => {
    const newStack = navigationStack.slice(0, index + 1);
    setNavigationStack(newStack);
    setCurrentLevel(newStack[newStack.length - 1].level);
    setSearchQuery('');
    setSelectedItem(null);
  };

  const breadcrumbItems = useMemo(() => {
    const items: { label: string; level: NavigationLevel; id?: string }[] = [];
    if (currentNav.subjectId) {
      const subj = subjects.find(s => s.id === currentNav.subjectId);
      items.push({ label: subj?.title || 'Subject', level: 'subjects', id: currentNav.subjectId });
    } else { items.push({ label: 'Subjects', level: 'subjects' }); }
    if (currentNav.chapterId) {
      const chap = chapters.find(c => c.id === currentNav.chapterId);
      items.push({ label: chap ? `Ch. ${chap.chapter_number}` : 'Chapters', level: 'chapters', id: currentNav.chapterId });
    }
    if (currentNav.paragraphId) {
      const para = paragraphs.find(p => p.id === currentNav.paragraphId);
      items.push({ label: para ? `${para.paragraph_number}` : 'Paragraphs', level: 'paragraphs', id: currentNav.paragraphId });
    }
    return items;
  }, [navigationStack, currentNav, subjects, chapters, paragraphs]);

  const handleSelect = (item: LinkedContent) => {
    onSelect(item);
    onClose();
    setNavigationStack([{ level: 'subjects' }]);
    setCurrentLevel('subjects');
    setSelectedItem(null);
    setSearchQuery('');
  };

  const handleSelectParagraph = (paragraph: Paragraph) => {
    const subject = subjects.find(s => s.id === currentNav.subjectId);
    const chapter = chapters.find(c => c.id === currentNav.chapterId);
    const link: LinkedContent = {
      type: 'paragraph',
      url: `/subjects/${subject?.id}/chapters/${chapter?.id}/paragraphs/${paragraph.id}`,
      title: `${subject?.title || 'Subject'} â€º ${chapter?.title || 'Chapter'} â€º ${paragraph.title}`,
      level: 'paragraphs',
    };
    handleSelect(link);
  };

  const handleSelectAssignment = (assignment: Assignment) => {
    const subject = subjects.find(s => s.id === currentNav.subjectId);
    const chapter = chapters.find(c => c.id === currentNav.chapterId);
    const paragraph = paragraphs.find(p => p.id === currentNav.paragraphId);
    const letter = String.fromCharCode(97 + (assignment.assignment_index || 0));
    const link: LinkedContent = {
      type: 'assignment',
      url: `/subjects/${subject?.id}/chapters/${chapter?.id}/paragraphs/${paragraph?.id}/assignments/${assignment.id}`,
      title: assignment.title || `Assignment ${letter}`,
      path: `${subject?.title} â€º ${chapter?.title} â€º ${paragraph?.title} â€º ${letter}`,
      level: 'assignments',
    };
    handleSelect(link);
  };

  const filteredSubjects = subjects.filter(s => (s.title || s.name || '').toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredChapters = chapters.filter(c => c.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredParagraphs = paragraphs.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredAssignments = assignments.filter(a => (a.title || '').toLowerCase().includes(searchQuery.toLowerCase()));

  // Get current items based on level
  const currentItems = useMemo(() => {
    switch (currentLevel) {
      case 'subjects': return filteredSubjects;
      case 'chapters': return filteredChapters;
      case 'paragraphs': return filteredParagraphs;
      case 'assignments': return filteredAssignments;
      default: return [];
    }
  }, [currentLevel, filteredSubjects, filteredChapters, filteredParagraphs, filteredAssignments]);

  // Track selected index for keyboard navigation
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Reset selection when level changes
  useEffect(() => { setSelectedIndex(0); }, [currentLevel, searchQuery]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const maxIndex = currentItems.length - 1;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => Math.min(prev + 1, maxIndex));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'Enter':
          e.preventDefault();
          if (currentItems[selectedIndex]) {
            if (currentLevel === 'subjects') {
              navigateTo('chapters', { subjectId: currentItems[selectedIndex].id });
            } else if (currentLevel === 'chapters') {
              navigateTo('paragraphs', { subjectId: currentNav.subjectId!, chapterId: currentItems[selectedIndex].id });
            } else if (currentLevel === 'paragraphs') {
              const para = currentItems[selectedIndex] as Paragraph;
              navigateTo('assignments', { subjectId: currentNav.subjectId!, chapterId: currentNav.chapterId!, paragraphId: para.id });
            } else if (currentLevel === 'assignments') {
              handleSelectAssignment(currentItems[selectedIndex] as Assignment);
            }
          }
          break;
        case 'ArrowLeft':
          if (navigationStack.length > 1) {
            e.preventDefault();
            navigateBack(navigationStack.length - 2);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, currentLevel, selectedIndex, currentItems, navigationStack, currentNav, navigateTo, navigateBack, handleSelectAssignment, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); setNavigationStack([{ level: 'subjects' }]); setCurrentLevel('subjects'); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link to Content</DialogTitle>
          <DialogDescription>Navigate through the hierarchy to select what students should link to.</DialogDescription>
        </DialogHeader>
        
        <Breadcrumb items={breadcrumbItems} currentLevel={currentLevel} onNavigate={navigateBack} />
        
        <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" /></div>
        
        <ScrollArea className="h-[320px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : currentLevel === 'subjects' ? (
            filteredSubjects.length > 0 ? (
              <div className="space-y-2 p-1">
                {filteredSubjects.map((subject, index) => (
                  <ItemCard key={subject.id} icon={BookOpen} label={subject.title || subject.name || ''} badge={subject.description || undefined} isSelected={index === selectedIndex} onClick={() => navigateTo('chapters', { subjectId: subject.id })} showBadge={true} />
                ))}
              </div>
            ) : <div className="text-center py-12 text-muted-foreground">No subjects found</div>
          ) : currentLevel === 'chapters' ? (
            filteredChapters.length > 0 ? (
              <div className="space-y-2 p-1">
                {filteredChapters.map((chapter, index) => (
                  <ItemCard key={chapter.id} icon={BookOpen} label={chapter.title} badge={chapter.chapter_number} isSelected={index === selectedIndex} onClick={() => navigateTo('paragraphs', { subjectId: currentNav.subjectId!, chapterId: chapter.id })} showBadge={true} />
                ))}
              </div>
            ) : <div className="text-center py-12 text-muted-foreground">No chapters found</div>
          ) : currentLevel === 'paragraphs' ? (
            <div className="space-y-2 p-1">
              {filteredParagraphs.length > 0 ? (
                filteredParagraphs.map((paragraph, index) => (
                  <div key={paragraph.id} className="space-y-1">
                    <ItemCard icon={BookOpen} label={paragraph.title} badge={paragraph.paragraph_number} isSelected={index === selectedIndex} onClick={() => navigateTo('assignments', { subjectId: currentNav.subjectId!, chapterId: currentNav.chapterId!, paragraphId: paragraph.id })} showBadge={true} />
                    <button onClick={() => handleSelectParagraph(paragraph)} className="w-full text-xs text-muted-foreground hover:text-foreground py-1.5 px-3 rounded bg-muted/50 hover:bg-muted transition-colors ml-4">Select this paragraph</button>
                  </div>
                ))
              ) : <div className="text-center py-12 text-muted-foreground">No paragraphs found</div>}
            </div>
          ) : currentLevel === 'assignments' ? (
            filteredAssignments.length > 0 ? (
              <div className="space-y-2 p-1">
                {filteredAssignments.map((assignment, index) => (
                  <ItemCard key={assignment.id} icon={BookOpen} label={assignment.title || `Assignment ${String.fromCharCode(97 + (assignment.assignment_index || 0))}`} badge={String.fromCharCode(97 + (assignment.assignment_index || 0))} isSelected={index === selectedIndex} onClick={() => handleSelectAssignment(assignment)} showBadge={true} />
                ))}
              </div>
            ) : <div className="text-center py-12 text-muted-foreground">No assignments found</div>
          ) : null}
        </ScrollArea>
        
        <div className="border-t">
          <KeyboardHint />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

