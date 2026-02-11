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
import { ChevronRight, ChevronDown, BookOpen, FileText, FolderOpen, Folder, Loader2, Search, Check, MapPin } from 'lucide-react';

interface Subject {
  id: string;
  name: string;
  description?: string;
  class_id?: string;
  chapters?: Chapter[];
}

interface Chapter {
  id: string;
  title: string;
  order_index: number;
  paragraphs?: Paragraph[];
}

interface Paragraph {
  id: string;
  title: string;
  order_index: number;
  assignments?: Assignment[];
}

interface Assignment {
  id: string;
  title: string;
  assignment_index: number;
}

interface NavigationState {
  subjectId: string | null;
  chapterId: string | null;
  paragraphId: string | null;
}

interface HierarchicalLinkPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (link: {
    type: 'subject' | 'chapter' | 'paragraph' | 'assignment';
    url: string;
    title: string;
    path: string;
  }) => void;
  classId?: string;
}

export function HierarchicalLinkPickerV2({ isOpen, onClose, onSelect, classId }: HierarchicalLinkPickerProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [nav, setNav] = useState<NavigationState>({ subjectId: null, chapterId: null, paragraphId: null });
  const [selectedLink, setSelectedLink] = useState<{
    type: 'subject' | 'chapter' | 'paragraph' | 'assignment';
    url: string;
    title: string;
    path: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchSubjects();
    }
  }, [isOpen, classId]);

  const fetchSubjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(classId ? `/api/classes/${classId}/subjects` : '/api/subjects');
      if (res.ok) {
        const data = await res.json();
        setSubjects(data.subjects || data || []);
      }
    } catch (error) {
      console.error('Failed to fetch subjects:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Build path string from current navigation
  const getCurrentPath = (): string => {
    if (!nav.subjectId) return '';
    
    const subject = subjects.find(s => s.id === nav.subjectId);
    if (!subject) return subject?.name || '';
    
    let path = subject.name;
    
    if (nav.chapterId && subject.chapters) {
      const chapter = subject.chapters.find(c => c.id === nav.chapterId);
      if (chapter) {
        path += ` › ${chapter.title}`;
        
        if (nav.paragraphId && chapter.paragraphs) {
          const paragraph = chapter.paragraphs.find(p => p.id === nav.paragraphId);
          if (paragraph) {
            path += ` › ${chapter.order_index}.${paragraph.order_index} ${paragraph.title}`;
          }
        }
      }
    }
    return path;
  };

  const getCurrentTitle = (): string => {
    if (!nav.subjectId) return 'Select a Subject';
    
    const subject = subjects.find(s => s.id === nav.subjectId);
    if (!nav.chapterId) return subject?.name || 'Select a Chapter';
    
    const chapter = subject?.chapters?.find(c => c.id === nav.chapterId);
    if (!nav.paragraphId) return chapter?.title || 'Select a Paragraph';
    
    const paragraph = chapter?.paragraphs?.find(p => p.id === nav.paragraphId);
    if (!paragraph?.assignments?.length) return paragraph?.title || 'Select an Assignment';
    
    return paragraph?.title || 'Select';
  };

  // Navigate back one level
  const goBack = () => {
    if (nav.paragraphId) {
      setNav({ ...nav, paragraphId: null });
    } else if (nav.chapterId) {
      setNav({ ...nav, chapterId: null });
    } else {
      setNav({ subjectId: null, chapterId: null, paragraphId: null });
    }
  };

  // Handle selection at any level
  const handleSelectAtLevel = (
    type: 'subject' | 'chapter' | 'paragraph' | 'assignment',
    id: string,
    title: string
  ) => {
    const path = getCurrentPath();
    
    let url: string;
    if (type === 'subject') {
      url = `/subjects/${id}`;
    } else if (type === 'chapter') {
      url = `/subjects/${nav.subjectId}/chapters/${id}`;
    } else if (type === 'paragraph') {
      url = `/subjects/${nav.subjectId}/chapters/${nav.chapterId}/paragraphs/${id}`;
    } else {
      url = `/subjects/${nav.subjectId}/chapters/${nav.chapterId}/paragraphs/${nav.paragraphId}/assignments/${id}`;
    }
    
    const link = { type, url, title, path: path + (type === 'assignment' ? ` › ${title}` : '') };
    setSelectedLink(link);
  };

  // Filter items based on search
  const filterBySearch = <T extends { title?: string; name?: string }>(items: T[]): T[] => {
    if (!searchQuery) return items;
    const query = searchQuery.toLowerCase();
    return items.filter(item => 
      (item.title?.toLowerCase().includes(query)) ||
      (item.name?.toLowerCase().includes(query))
    );
  };

  const currentSubject = subjects.find(s => s.id === nav.subjectId);
  const currentChapter = currentSubject?.chapters?.find(c => c.id === nav.chapterId);
  const currentParagraph = currentChapter?.paragraphs?.find(p => p.id === nav.paragraphId);

  // Determine what to show based on navigation state
  const showSubjects = !nav.subjectId;
  const showChapters = nav.subjectId && !nav.chapterId;
  const showParagraphs = nav.subjectId && nav.chapterId && !nav.paragraphId;
  const showAssignments = nav.subjectId && nav.chapterId && nav.paragraphId;

  return (
    <Dialog open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link to Learning Material</DialogTitle>
          <DialogDescription>
            Navigate through subjects, chapters, and paragraphs to find content.
          </DialogDescription>
        </DialogHeader>

        {/* Breadcrumb / Back Navigation */}
        {(nav.subjectId || selectedLink) && (
          <div className="flex items-center gap-2 pb-2 border-b">
            {nav.subjectId && (
              <>
                <Button variant="ghost" size="sm" onClick={() => {
                  setNav({ subjectId: null, chapterId: null, paragraphId: null });
                  setSelectedLink(null);
                }}>
                  Subjects
                </Button>
                {nav.chapterId && (
                  <>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <Button variant="ghost" size="sm" onClick={goBack}>
                      {currentSubject?.name}
                    </Button>
                  </>
                )}
                {nav.paragraphId && (
                  <>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <Button variant="ghost" size="sm" onClick={goBack}>
                      {currentChapter?.title}
                    </Button>
                  </>
                )}
                {showAssignments && (
                  <>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{currentParagraph?.title}</span>
                  </>
                )}
              </>
            )}
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            {/* SUBJECTS LEVEL */}
            {showSubjects && (
              <div className="space-y-1">
                {filterBySearch(subjects).map((subject) => (
                  <button
                    key={subject.id}
                    onClick={() => {
                      setNav({ ...nav, subjectId: subject.id });
                      handleSelectAtLevel('subject', subject.id, subject.name);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      selectedLink?.type === 'subject' && selectedLink?.url === `/subjects/${subject.id}`
                        ? 'bg-primary/10 border border-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <FolderOpen className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium">{subject.name}</div>
                      {subject.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {subject.description}
                        </div>
                      )}
                      {subject.chapters && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {subject.chapters.length} chapters
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
                {filterBySearch(subjects).length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No subjects found
                  </p>
                )}
              </div>
            )}

            {/* CHAPTERS LEVEL */}
            {showChapters && currentSubject?.chapters && (
              <div className="space-y-1">
                {filterBySearch(currentSubject.chapters).map((chapter) => (
                  <button
                    key={chapter.id}
                    onClick={() => {
                      setNav({ ...nav, chapterId: chapter.id });
                      handleSelectAtLevel('chapter', chapter.id, chapter.title);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      selectedLink?.type === 'chapter' && selectedLink?.url === `/subjects/${nav.subjectId}/chapters/${chapter.id}`
                        ? 'bg-primary/10 border border-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <Folder className="h-5 w-5 text-amber-500 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium">
                        Chapter {chapter.order_index}: {chapter.title}
                      </div>
                      {chapter.paragraphs && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {chapter.paragraphs.length} paragraphs
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            )}

            {/* PARAGRAPHS LEVEL */}
            {showParagraphs && currentChapter?.paragraphs && (
              <div className="space-y-1">
                {filterBySearch(currentChapter.paragraphs).map((paragraph) => (
                  <div key={paragraph.id}>
                    {/* Paragraph item - can select directly */}
                    <button
                      onClick={() => {
                        setNav({ ...nav, paragraphId: paragraph.id });
                        handleSelectAtLevel('paragraph', paragraph.id, paragraph.title);
                      }}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                        selectedLink?.type === 'paragraph' && selectedLink?.url === `/subjects/${nav.subjectId}/chapters/${nav.chapterId}/paragraphs/${paragraph.id}`
                          ? 'bg-primary/10 border border-primary'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <MapPin className="h-5 w-5 text-green-500 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="font-medium">
                          {currentChapter.order_index}.{paragraph.order_index} {paragraph.title}
                        </div>
                        {paragraph.assignments && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {paragraph.assignments.length} assignments
                          </div>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                    
                    {/* Direct "Link to this paragraph" button */}
                    <button
                      onClick={() => {
                        handleSelectAtLevel('paragraph', paragraph.id, paragraph.title);
                      }}
                      className={`w-full ml-12 mb-1 text-xs text-left px-3 py-1.5 rounded transition-colors ${
                        selectedLink?.type === 'paragraph' && selectedLink?.url === `/subjects/${nav.subjectId}/chapters/${nav.chapterId}/paragraphs/${paragraph.id}`
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      Link to this paragraph instead
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* ASSIGNMENTS LEVEL */}
            {showAssignments && currentParagraph?.assignments && (
              <div className="space-y-1">
                {currentParagraph.assignments.map((assignment) => (
                  <button
                    key={assignment.id}
                    onClick={() => {
                      handleSelectAtLevel('assignment', assignment.id, assignment.title);
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                      selectedLink?.type === 'assignment' && selectedLink?.url === `/subjects/${nav.subjectId}/chapters/${nav.chapterId}/paragraphs/${nav.paragraphId}/assignments/${assignment.id}`
                        ? 'bg-primary/10 border border-primary'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <FileText className="h-5 w-5 text-blue-500 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium">
                        {String.fromCharCode(97 + (assignment.assignment_index || 0))} {assignment.title || 'Untitled'}
                      </div>
                    </div>
                    {selectedLink?.type === 'assignment' && selectedLink?.url === `/subjects/${nav.subjectId}/chapters/${nav.chapterId}/paragraphs/${nav.paragraphId}/assignments/${assignment.id}` && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </button>
                ))}
                {currentParagraph.assignments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No assignments in this paragraph
                  </p>
                )}
              </div>
            )}
          </ScrollArea>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            {selectedLink && (
              <span>Selected: {selectedLink.path || selectedLink.title}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button 
              onClick={() => {
                if (selectedLink) {
                  onSelect(selectedLink);
                  onClose();
                  setNav({ subjectId: null, chapterId: null, paragraphId: null });
                  setSelectedLink(null);
                  setSearchQuery('');
                }
              }} 
              disabled={!selectedLink}
            >
              Link Here
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
