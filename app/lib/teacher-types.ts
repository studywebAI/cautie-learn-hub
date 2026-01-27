

export type ClassInfo = {
  id: string;
  name: string;
  studentCount: number;
  averageProgress: number;
  assignmentsDue: number;
  alerts: string[];
};

export type ClassIdea = {
  id: string;
  name: string;
  description: string;
}

export type Student = {
  id: string;
  name: string | null;
  email?: string | null;
  avatarUrl?: string | null;
  overallProgress: number;
};

export type ClassAssignment = {
  id: string;
  classId: string;
  title: string;
  dueDate: string;
  submissions: number;
  totalStudents: number;
};

export type MaterialReference = {
    id: string;
    class_id: string;
    title: string;
    type: 'NOTE' | 'QUIZ' | 'FLASHCARDS' | 'FILE' | 'BLOCK';
    concepts: { id: string; name: string; }[] | null;
    content: any | null; // For quiz/flashcard data
    created_at: string;
}
