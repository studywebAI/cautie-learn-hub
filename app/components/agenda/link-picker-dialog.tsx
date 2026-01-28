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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, BookOpen, Loader2, Search, Check, ChevronRight } from 'lucide-react';
import type { MaterialReference } from '@/lib/teacher-types';

type LinkPickerDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (link: { 
    type: 'material' | 'subject' | 'assignment'; 
    url: string; 
    title: string;
    path?: string; // Display path like "Math › Chapter 1 › 1.1 › a"
  }) => void;
  classId?: string;
};

type AssignmentLink = {
  id: string;
  title: string;
  path: string;
  displayPath: string; // Human-readable path
  subjectName: string;
  chapterTitle: string;
  paragraphTitle: string;
  assignmentIndex: string;
};

type SubjectLink = {
  id: string;
  title: string;
  path: string;
  type: 'chapter' | 'paragraph';
};

export function LinkPickerDialog({ isOpen, onClose, onSelect, classId }: LinkPickerDialogProps) {
  const [materials, setMaterials] = useState<MaterialReference[]>([]);
  const [assignments, setAssignments] = useState<AssignmentLink[]>([]);
  const [subjects, setSubjects] = useState<SubjectLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<{ 
    type: 'material' | 'subject' | 'assignment'; 
    url: string; 
    title: string;
    path?: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, classId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch materials
      if (classId) {
        const materialsRes = await fetch(`/api/classes/${classId}/materials`);
        if (materialsRes.ok) {
          const data = await materialsRes.json();
          setMaterials(data.materials || []);
        }
      } else {
        const materialsRes = await fetch('/api/materials');
        if (materialsRes.ok) {
          const data = await materialsRes.json();
          setMaterials(data || []);
        }
      }

      // Fetch subjects with full hierarchy including assignments
      const subjectsRes = await fetch(classId ? `/api/classes/${classId}/subjects` : '/api/subjects');
      if (subjectsRes.ok) {
        const data = await subjectsRes.json();
        const subjectLinks: SubjectLink[] = [];
        const assignmentLinks: AssignmentLink[] = [];
        
        for (const subject of data.subjects || data || []) {
          // Add chapters and paragraphs
          if (subject.chapters) {
            for (const chapter of subject.chapters) {
              subjectLinks.push({
                id: chapter.id,
                title: `${subject.name} › Chapter ${chapter.order_index}: ${chapter.title}`,
                path: `/subjects/${subject.id}/chapters/${chapter.id}`,
                type: 'chapter',
              });
              
              if (chapter.paragraphs) {
                for (const paragraph of chapter.paragraphs) {
                  const paragraphNum = `${chapter.order_index}.${paragraph.order_index}`;
                  
                  subjectLinks.push({
                    id: paragraph.id,
                    title: `${subject.name} › ${paragraphNum}: ${paragraph.title}`,
                    path: `/subjects/${subject.id}/chapters/${chapter.id}/paragraphs/${paragraph.id}`,
                    type: 'paragraph',
                  });
                  
                  // Add assignments
                  if (paragraph.assignments) {
                    for (const assignment of paragraph.assignments) {
                      const assignmentLetter = String.fromCharCode(97 + (assignment.assignment_index || 0));
                      assignmentLinks.push({
                        id: assignment.id,
                        title: assignment.title || `Assignment ${assignmentLetter}`,
                        path: `/subjects/${subject.id}/chapters/${chapter.id}/paragraphs/${paragraph.id}/assignments/${assignment.id}`,
                        displayPath: `${subject.name} › ${chapter.title} › ${paragraphNum} ${paragraph.title} › ${assignmentLetter}`,
                        subjectName: subject.name,
                        chapterTitle: chapter.title,
                        paragraphTitle: paragraph.title,
                        assignmentIndex: assignmentLetter,
                      });
                    }
                  }
                }
              }
            }
          }
        }
        setSubjects(subjectLinks);
        setAssignments(assignmentLinks);
      }
    } catch (error) {
      console.error('Failed to fetch data for link picker:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredMaterials = materials.filter(m => 
    m.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredAssignments = assignments.filter(a => 
    a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    a.displayPath.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredSubjects = subjects.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = () => {
    if (selectedItem) {
      onSelect(selectedItem);
      onClose();
      setSelectedItem(null);
      setSearchQuery('');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Link to Content</DialogTitle>
          <DialogDescription>
            Select an assignment, material, or location. Students can click to navigate directly.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : (
          <Tabs defaultValue="assignments" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="assignments" className="text-xs">
                Assignments ({filteredAssignments.length})
              </TabsTrigger>
              <TabsTrigger value="materials" className="text-xs">
                Files ({filteredMaterials.length})
              </TabsTrigger>
              <TabsTrigger value="subjects" className="text-xs">
                Locations ({filteredSubjects.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="assignments">
              <ScrollArea className="h-[300px]">
                <div className="space-y-1 p-1">
                  {filteredAssignments.length > 0 ? (
                    filteredAssignments.map((assignment) => (
                      <button
                        key={assignment.id}
                        onClick={() => setSelectedItem({
                          type: 'assignment',
                          url: assignment.path,
                          title: assignment.title,
                          path: assignment.displayPath,
                        })}
                        className={`w-full flex flex-col gap-1 p-3 rounded-lg text-left transition-colors ${
                          selectedItem?.url === assignment.path
                            ? 'bg-primary/10 border border-primary'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
                          <span className="truncate">{assignment.title}</span>
                          {selectedItem?.url === assignment.path && (
                            <Check className="h-4 w-4 text-primary ml-auto flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground pl-6">
                          <span className="truncate">{assignment.displayPath}</span>
                        </div>
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No assignments found
                    </p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="materials">
              <ScrollArea className="h-[300px]">
                <div className="space-y-1 p-1">
                  {filteredMaterials.length > 0 ? (
                    filteredMaterials.map((material) => (
                      <button
                        key={material.id}
                        onClick={() => setSelectedItem({
                          type: 'material',
                          url: `/material/${material.id}`,
                          title: material.title,
                        })}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                          selectedItem?.url === `/material/${material.id}`
                            ? 'bg-primary/10 border border-primary'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="truncate">{material.title}</span>
                        {selectedItem?.url === `/material/${material.id}` && (
                          <Check className="h-4 w-4 text-primary ml-auto" />
                        )}
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No materials found
                    </p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="subjects">
              <ScrollArea className="h-[300px]">
                <div className="space-y-1 p-1">
                  {filteredSubjects.length > 0 ? (
                    filteredSubjects.map((subject) => (
                      <button
                        key={subject.id}
                        onClick={() => setSelectedItem({
                          type: 'subject',
                          url: subject.path,
                          title: subject.title,
                        })}
                        className={`w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors ${
                          selectedItem?.url === subject.path
                            ? 'bg-primary/10 border border-primary'
                            : 'hover:bg-muted'
                        }`}
                      >
                        <BookOpen className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-sm truncate">{subject.title}</span>
                        {selectedItem?.url === subject.path && (
                          <Check className="h-4 w-4 text-primary ml-auto" />
                        )}
                      </button>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No subjects found
                    </p>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSelect} disabled={!selectedItem}>
            Add Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
