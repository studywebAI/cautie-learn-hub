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
import { FileText, BookOpen, Loader2, Search, Link as LinkIcon, Check } from 'lucide-react';
import type { MaterialReference } from '@/lib/teacher-types';

type LinkPickerDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (link: { type: 'material' | 'subject'; url: string; title: string }) => void;
  classId?: string;
};

type SubjectLink = {
  id: string;
  title: string;
  path: string;
  type: 'chapter' | 'paragraph' | 'assignment';
};

export function LinkPickerDialog({ isOpen, onClose, onSelect, classId }: LinkPickerDialogProps) {
  const [materials, setMaterials] = useState<MaterialReference[]>([]);
  const [subjects, setSubjects] = useState<SubjectLink[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItem, setSelectedItem] = useState<{ type: 'material' | 'subject'; url: string; title: string } | null>(null);

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
        // Fetch all materials for teacher
        const materialsRes = await fetch('/api/materials');
        if (materialsRes.ok) {
          const data = await materialsRes.json();
          setMaterials(data || []);
        }
      }

      // Fetch subjects/chapters/paragraphs
      const subjectsRes = await fetch('/api/subjects');
      if (subjectsRes.ok) {
        const data = await subjectsRes.json();
        const links: SubjectLink[] = [];
        
        for (const subject of data.subjects || []) {
          // Add chapters
          if (subject.chapters) {
            for (const chapter of subject.chapters) {
              links.push({
                id: chapter.id,
                title: `${subject.name} › Chapter ${chapter.order_index}: ${chapter.title}`,
                path: `/subjects/${subject.id}/chapters/${chapter.id}`,
                type: 'chapter',
              });
              
              // Add paragraphs
              if (chapter.paragraphs) {
                for (const paragraph of chapter.paragraphs) {
                  links.push({
                    id: paragraph.id,
                    title: `${subject.name} › ${chapter.order_index}.${paragraph.order_index}: ${paragraph.title}`,
                    path: `/subjects/${subject.id}/chapters/${chapter.id}/paragraphs/${paragraph.id}`,
                    type: 'paragraph',
                  });
                }
              }
            }
          }
        }
        setSubjects(links);
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
          <DialogTitle className="flex items-center gap-2">
            <LinkIcon className="h-5 w-5" />
            Link to Content
          </DialogTitle>
          <DialogDescription>
            Select a material or subject location to link. Students will be able to click and navigate directly.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search materials and subjects..."
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
          <Tabs defaultValue="materials" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="materials" className="gap-2">
                <FileText className="h-4 w-4" />
                Materials ({filteredMaterials.length})
              </TabsTrigger>
              <TabsTrigger value="subjects" className="gap-2">
                <BookOpen className="h-4 w-4" />
                Subjects ({filteredSubjects.length})
              </TabsTrigger>
            </TabsList>

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
            Insert Link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
