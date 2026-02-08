'use client';

import type { Subject } from "@/lib/types";
import { SubjectCard } from "@/components/subject-card";

type MySubjectsGridProps = {
  subjects: Subject[];
};

export function MySubjectsGrid({ subjects }: MySubjectsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {subjects.map((subject) => (
        <SubjectCard
          key={subject.id}
          subject={{
            id: subject.id,
            title: subject.name || subject.title || 'Untitled',
            description: subject.description,
            cover_image_url: subject.cover_image_url,
            classes: subject.classes,
          }}
        />
      ))}
    </div>
  );
}
