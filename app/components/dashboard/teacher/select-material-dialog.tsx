
'use client';

import { useState, useContext, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, FileSignature, BrainCircuit, Copy, File, Check } from 'lucide-react';
import { AppContext, AppContextType } from '@/contexts/app-context';
import type { MaterialReference } from '@/lib/teacher-types';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

const iconMap = {
  NOTE: FileSignature,
  QUIZ: BrainCircuit,
  FLASHCARDS: Copy,
  FILE: File,
};

type SelectMaterialDialogProps = {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  classId: string;
  onMaterialSelected: (material: Pick<MaterialReference, 'id' | 'title'>) => void;
};

export function SelectMaterialDialog({ isOpen, setIsOpen, classId, onMaterialSelected }: SelectMaterialDialogProps) {
  const { materials, isLoading: isContextLoading, refetchMaterials } = useContext(AppContext) as AppContextType;
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && classId) {
      refetchMaterials(classId);
    }
  }, [isOpen, classId, refetchMaterials]);

  const handleSelect = () => {
    const selected = materials.find(m => m.id === selectedId);
    if (selected) {
      onMaterialSelected({ id: selected.id, title: selected.title });
    }
  };

  const isLoading = isContextLoading && materials.length === 0;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Attach Existing Material</DialogTitle>
          <DialogDescription>
            Select a material from your class library to attach to this assignment.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-96 w-full pr-6">
            <div className="space-y-3">
            {isLoading ? (
                <div className="flex justify-center items-center h-48">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : materials.length > 0 ? (
                materials.map((material) => {
                    const Icon = iconMap[material.type] || File;
                    const isSelected = selectedId === material.id;
                    return (
                    <button
                        key={material.id}
                        onClick={() => setSelectedId(material.id)}
                        className={cn(
                        "w-full text-left p-3 border rounded-lg flex items-center gap-4 transition-colors",
                        isSelected ? "bg-primary/10 border-primary" : "hover:bg-muted/50"
                        )}
                    >
                        <Icon className="h-6 w-6 text-primary flex-shrink-0" />
                        <div className="flex-1">
                        <p className="font-semibold">{material.title}</p>
                        <p className="text-xs text-muted-foreground">{material.type}</p>
                        </div>
                        {isSelected && <Check className="h-5 w-5 text-primary" />}
                    </button>
                    );
                })
            ) : (
                <div className="text-center text-muted-foreground py-16">
                    <p>No materials found in this class.</p>
                    <p className="text-sm">You can create new materials from the teacher dashboard.</p>
                </div>
            )}
            </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleSelect} disabled={!selectedId}>Attach Material</Button>
        </div>

      </DialogContent>
    </Dialog>
  );
}
