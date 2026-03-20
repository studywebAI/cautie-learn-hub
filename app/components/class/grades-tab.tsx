'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, ChevronRight, ChevronLeft, ArrowLeft, Trash2, 
  Edit, Eye, Loader2, Save, Send, X, Check, ClipboardList,
  BarChart3, Users, BookOpen, Target, History, FileText
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

type GradeSet = {
  id: string;
  title: string;
  description?: string;
  category: string;
  weight: number;
  status: string;
  subject?: { id: string; title: string };
  grading_preset?: { id: string; name: string; kind: string; config?: any; is_default?: boolean };
  total_students: number;
  graded_count: number;
  average: number | null;
  created_at: string;
  updated_at: string;
};

type StudentGrade = {
  id: string;
  student_id: string;
  grade_value: string | null;
  grade_numeric?: number | null;
  feedback_text?: string;
  status: string;
  tag?: string;
  student: { id: string; full_name: string; email: string };
};

type Subject = {
  id: string;
  title: string;
};

type GradeHistoryEvent = {
  id: string;
  grade_set_id: string;
  grade_set_title: string;
  student_id: string;
  student_name: string;
  student_email: string | null;
  changed_by: string;
  changed_by_name: string;
  old_value: string | null;
  new_value: string | null;
  old_status: string | null;
  new_status: string | null;
  change_type: string;
  change_reason: string | null;
  created_at: string;
};

type GradePreset = {
  id: string;
  class_id: string;
  name: string;
  kind: 'freeform' | 'numeric_range' | 'letter_scale';
  config: any;
  is_default: boolean;
};

// =============================================
// MAIN GRADES TAB COMPONENT
// =============================================

export function GradesTab({ classId }: { classId: string }) {
  const [view, setView] = useState<'menu' | 'new' | 'edit' | 'edit-detail' | 'history' | 'reports'>('menu');
  const [gradeSets, setGradeSets] = useState<GradeSet[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [selectedGradeSetId, setSelectedGradeSetId] = useState<string | null>(null);

  useEffect(() => {
    void loadClassSubjects();
  }, [classId]);

  useEffect(() => {
    void loadGradeSets(selectedSubjectFilter);
  }, [classId, selectedSubjectFilter]);

  const loadClassSubjects = async () => {
    try {
      const response = await fetch(`/api/classes/${classId}/subjects`);
      if (!response.ok) return;
      const data = await response.json();
      const incoming: Subject[] = data.subjects || [];
      setSubjects(incoming);
      if (data.defaultSubjectId) {
        setSelectedSubjectFilter(data.defaultSubjectId);
      } else {
        setSelectedSubjectFilter('all');
      }
    } catch (error) {
      console.error('Failed to load class subjects for grades filter:', error);
      setSelectedSubjectFilter('all');
    }
  };

  const loadGradeSets = async (subjectId: string = 'all') => {
    setLoading(true);
    try {
      const query = subjectId && subjectId !== 'all' ? `?subjectId=${encodeURIComponent(subjectId)}` : '';
      const response = await fetch(`/api/classes/${classId}/grades${query}`);
      if (response.ok) {
        const data = await response.json();
        setGradeSets(data.grade_sets || []);
      }
    } catch (error) {
      console.error('Failed to load grade sets:', error);
    } finally {
      setLoading(false);
    }
  };

  if (view === 'new') {
    return (
      <NewGradesWizard 
        classId={classId} 
        defaultSubjectId={selectedSubjectFilter !== 'all' ? selectedSubjectFilter : ''}
        initialSubjects={subjects}
        onComplete={() => {
          loadGradeSets(selectedSubjectFilter);
          setView('menu');
        }}
        onCancel={() => setView('menu')}
      />
    );
  }

  if (view === 'edit-detail' && selectedGradeSetId) {
    return (
      <EditGradesDetail
        classId={classId}
        gradeSetId={selectedGradeSetId}
        onBack={() => {
          setSelectedGradeSetId(null);
          setView('edit');
        }}
        onDeleted={() => {
          loadGradeSets(selectedSubjectFilter);
          setSelectedGradeSetId(null);
          setView('edit');
        }}
      />
    );
  }

  if (view === 'history') {
    return (
      <GradesHistoryView
        classId={classId}
        onBack={() => setView('menu')}
      />
    );
  }

  if (view === 'reports') {
    return (
      <GradesReportsView
        gradeSets={gradeSets}
        onBack={() => setView('menu')}
      />
    );
  }

  if (view === 'edit') {
    return (
      <EditGradesList
        classId={classId}
        gradeSets={gradeSets}
        loading={loading}
        onSelectGradeSet={(id) => {
          setSelectedGradeSetId(id);
          setView('edit-detail');
        }}
        onRefresh={() => loadGradeSets(selectedSubjectFilter)}
        subjectId={selectedSubjectFilter}
        onBack={() => setView('menu')}
      />
    );
  }

  // Main menu view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Grades</h1>
          <p className="text-muted-foreground">Manage grades for your class</p>
        </div>
        <div className="w-full max-w-[280px]">
          <Label className="mb-1 block text-xs text-muted-foreground">Subject</Label>
          <select
            value={selectedSubjectFilter}
            onChange={(e) => setSelectedSubjectFilter(e.target.value)}
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            <option value="all">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>{subject.title}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* New Grades Card */}
          <Card className="border-2 border-black/20 hover:border-primary/50 transition-colors cursor-pointer" onClick={() => setView('new')}>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Plus className="h-6 w-6 text-primary" />
                </div>
                New Grades
              </CardTitle>
              <CardDescription>
                Create a new grade set and enter grades for your students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Multi-step wizard to create tests, quizzes, or homework assignments and grade your students.
              </p>
            </CardContent>
          </Card>

          {/* Edit Grades Card */}
          <Card 
            className="border-2 border-black/20 hover:border-primary/50 transition-colors cursor-pointer" 
            onClick={() => setView('edit')}
          >
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 rounded-lg bg-secondary/10">
                  <Edit className="h-6 w-6 text-secondary-foreground" />
                </div>
                Edit Grades
              </CardTitle>
              <CardDescription>
                View, edit, or delete existing grade sets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {gradeSets.length} grade set{gradeSets.length !== 1 ? 's' : ''} available. 
                Click to view and manage.
              </p>
            </CardContent>
          </Card>

          {/* History Card */}
          <Card
            className="border-2 border-black/20 hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => setView('history')}
          >
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 rounded-lg bg-muted">
                  <History className="h-6 w-6" />
                </div>
                History
              </CardTitle>
              <CardDescription>
                Track every grade update with who changed what and when
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Audit timeline for compliance, transparency, and quick troubleshooting.
              </p>
            </CardContent>
          </Card>

          {/* Reports Card */}
          <Card
            className="border-2 border-black/20 hover:border-primary/50 transition-colors cursor-pointer"
            onClick={() => setView('reports')}
          >
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 rounded-lg bg-muted">
                  <FileText className="h-6 w-6" />
                </div>
                Reports
              </CardTitle>
              <CardDescription>
                Get class-level performance insights from your grade sets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Class averages, pass-rate signals, and top/bottom performers.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Quick Stats */}
      {gradeSets.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Quick Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold">{gradeSets.length}</p>
                <p className="text-xs text-muted-foreground">Total Grade Sets</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold">{gradeSets.filter(g => g.status === 'published').length}</p>
                <p className="text-xs text-muted-foreground">Published</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold">{gradeSets.filter(g => g.status === 'draft').length}</p>
                <p className="text-xs text-muted-foreground">Drafts</p>
              </div>
              <div className="text-center p-3 bg-muted/30 rounded-lg">
                <p className="text-2xl font-bold">
                  {gradeSets.filter(g => g.average !== null).length > 0 
                    ? (gradeSets.filter(g => g.average !== null).reduce((sum, g) => sum + (g.average || 0), 0) / gradeSets.filter(g => g.average !== null).length).toFixed(1)
                    : '-'}
                </p>
                <p className="text-xs text-muted-foreground">Class Average</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function GradesHistoryView({
  classId,
  onBack
}: {
  classId: string;
  onBack: () => void;
}) {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<GradeHistoryEvent[]>([]);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const loadHistory = async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/classes/${classId}/grades/history`);
        if (!response.ok) throw new Error('Failed to load grade history');
        const data = await response.json();
        setEvents(data.events || []);
      } catch (error) {
        console.error('Failed to load grade history:', error);
      } finally {
        setLoading(false);
      }
    };

    loadHistory();
  }, [classId]);

  const filtered = events.filter((event) => {
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return (
      event.grade_set_title.toLowerCase().includes(q) ||
      event.student_name.toLowerCase().includes(q) ||
      event.changed_by_name.toLowerCase().includes(q) ||
      (event.change_reason || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Grade History</h1>
          <p className="text-muted-foreground">Audit timeline of grade changes</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by student, grade set, teacher, or reason..."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Events</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">No grade history found.</p>
          ) : (
            <div className="space-y-3">
              {filtered.map((event) => (
                <div key={event.id} className="rounded-lg border p-3">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge variant="outline">{event.change_type}</Badge>
                    <p className="font-medium">{event.student_name}</p>
                    <span className="text-muted-foreground text-sm">in</span>
                    <p className="text-sm">{event.grade_set_title}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {event.old_value ?? '-'} {'->'} {event.new_value ?? '-'} · by {event.changed_by_name} · {format(new Date(event.created_at), 'PPp')}
                  </p>
                  {event.change_reason && (
                    <p className="text-sm mt-1">Reason: {event.change_reason}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GradesReportsView({
  gradeSets,
  onBack
}: {
  gradeSets: GradeSet[];
  onBack: () => void;
}) {
  const withAverage = gradeSets.filter((g) => g.average !== null);
  const classAverage = withAverage.length > 0
    ? withAverage.reduce((sum, g) => sum + (g.average || 0), 0) / withAverage.length
    : null;
  const publishedCount = gradeSets.filter((g) => g.status === 'published').length;
  const draftCount = gradeSets.filter((g) => g.status === 'draft').length;
  const sortedByAverage = [...withAverage].sort((a, b) => (b.average || 0) - (a.average || 0));
  const topSet = sortedByAverage[0];
  const lowSet = sortedByAverage[sortedByAverage.length - 1];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Grade Reports</h1>
          <p className="text-muted-foreground">Class-level performance overview</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Grade Sets</p>
            <p className="text-2xl font-bold mt-1">{gradeSets.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Published</p>
            <p className="text-2xl font-bold mt-1">{publishedCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Drafts</p>
            <p className="text-2xl font-bold mt-1">{draftCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Overall Average</p>
            <p className="text-2xl font-bold mt-1">{classAverage !== null ? classAverage.toFixed(1) : '-'}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Performing Grade Set</CardTitle>
          </CardHeader>
          <CardContent>
            {topSet ? (
              <div>
                <p className="font-semibold">{topSet.title}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Average: {topSet.average?.toFixed(1)} · {topSet.graded_count}/{topSet.total_students} graded
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No numeric grade data yet.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Needs Attention</CardTitle>
          </CardHeader>
          <CardContent>
            {lowSet ? (
              <div>
                <p className="font-semibold">{lowSet.title}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Average: {lowSet.average?.toFixed(1)} · {lowSet.graded_count}/{lowSet.total_students} graded
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No numeric grade data yet.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

const toNumeric = (value: string): number | null => {
  if (!value.trim()) return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
};

// =============================================
// NEW GRADES WIZARD (MULTI-STEP)
// =============================================

function NewGradesWizard({
  classId, 
  defaultSubjectId,
  initialSubjects,
  onComplete, 
  onCancel 
}: { 
  classId: string; 
  defaultSubjectId?: string;
  initialSubjects?: Subject[];
  onComplete: () => void; 
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Title
  const [title, setTitle] = useState('');
  
  // Step 2: Weight
  const [weight, setWeight] = useState(1);
  
  // Step 3: Students & Grades
  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [everyoneGrade, setEveryoneGrade] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>(initialSubjects || []);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(defaultSubjectId || '');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [presets, setPresets] = useState<GradePreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');
  const [newPresetName, setNewPresetName] = useState('');
  const [newPresetKind, setNewPresetKind] = useState<'freeform' | 'numeric_range' | 'letter_scale'>('freeform');
  const [newPresetValues, setNewPresetValues] = useState('');

  useEffect(() => {
    if (step >= 3) {
      loadSubjects();
      loadPresets();
    }
  }, [step]);

  useEffect(() => {
    if (defaultSubjectId) {
      setSelectedSubjectId(defaultSubjectId);
    }
  }, [defaultSubjectId]);

  const loadSubjects = async () => {
    try {
      const response = await fetch(`/api/classes/${classId}/subjects`);
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data)) {
          setSubjects(data as Subject[]);
        } else {
          setSubjects(data.subjects || []);
          if (!selectedSubjectId && data.defaultSubjectId) {
            setSelectedSubjectId(data.defaultSubjectId);
          }
        }
      }
    } catch (error) {
      console.error('Failed to load subjects:', error);
    }
  };

  const loadPresets = async () => {
    try {
      const response = await fetch(`/api/classes/${classId}/grading-presets`);
      if (!response.ok) return;
      const data = await response.json();
      const incoming: GradePreset[] = data.presets || [];
      setPresets(incoming);
      const defaultPreset = incoming.find((p) => p.is_default);
      if (defaultPreset) {
        setSelectedPresetId(defaultPreset.id);
      } else if (incoming.length > 0 && !selectedPresetId) {
        setSelectedPresetId(incoming[0].id);
      }
    } catch (error) {
      console.error('Failed to load grading presets:', error);
    }
  };

  const handleNext = async () => {
    if (step === 1) {
      if (!title.trim()) {
        toast({ title: 'Please enter a title', variant: 'destructive' });
        return;
      }
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    } else if (step === 3) {
      // Create grade set and save grades
      await createGradeSet();
    }
  };

  const createGradeSet = async () => {
    setValidationError(null);
    setLoading(true);
    try {
      // Create grade set first
      const response = await fetch(`/api/classes/${classId}/grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          weight,
          subject_id: selectedSubjectId || null,
          grading_preset_id: selectedPresetId || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create grade set');
      }

      const data = await response.json();
      
      // If we have grades, update them
      if (students.length > 0) {
        const gradesWithValues = students.filter(s => {
          const hasNumeric = typeof s.grade_numeric === 'number' && !Number.isNaN(s.grade_numeric);
          const hasText = !!(s.grade_value && s.grade_value.trim() !== '');
          return hasNumeric || hasText;
        });
        
        if (gradesWithValues.length > 0) {
          const updateResponse = await fetch(`/api/classes/${classId}/grades/${data.grade_set.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update_student_grades',
              student_grades: gradesWithValues.map(s => ({
                id: s.id,
                grade_numeric: s.grade_numeric ?? null,
                grade_value: s.grade_value
              }))
            })
          });

          if (!updateResponse.ok) {
            console.error('Failed to update grades');
          }
        }
      }

      toast({ title: 'Grade set created successfully!' });
      onComplete();
    } catch (error: any) {
      toast({ title: error.message || 'Failed to create grade set', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const updateStudentGrade = (studentId: string, value: string) => {
    setValidationError(null);
    const numeric = toNumeric(value);
    setStudents(students.map(s => 
      s.student_id === studentId
        ? {
            ...s,
            grade_value: value.trim() ? value : null,
            grade_numeric: numeric
          }
        : s
    ));
  };

  const createPreset = async () => {
    if (!newPresetName.trim()) {
      toast({ title: 'Preset name is required', variant: 'destructive' });
      return;
    }

    const config =
      newPresetKind === 'letter_scale'
        ? { values: newPresetValues.split(',').map(v => v.trim()).filter(Boolean) }
        : {};

    const response = await fetch(`/api/classes/${classId}/grading-presets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newPresetName.trim(),
        kind: newPresetKind,
        config,
        is_default: presets.length === 0
      })
    });

    if (!response.ok) {
      const error = await response.json();
      toast({ title: error.error || 'Failed to create preset', variant: 'destructive' });
      return;
    }

    const data = await response.json();
    const created = data.preset as GradePreset;
    setPresets((prev) => [...prev, created]);
    setSelectedPresetId(created.id);
    setNewPresetName('');
    setNewPresetKind('freeform');
    setNewPresetValues('');
  };

  // Apply "everyone" grade to all students
  const applyToAll = () => {
    setValidationError(null);
    const numeric = toNumeric(everyoneGrade);
    setStudents(students.map(s => {
      return {
        ...s,
        grade_value: everyoneGrade.trim() ? everyoneGrade : null,
        grade_numeric: numeric
      };
    }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Grades</h1>
          <p className="text-muted-foreground">Create a new grade set for your class</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              step >= s ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 3 && <div className={`w-12 h-0.5 ${step > s ? 'bg-primary' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <Card>
        <CardContent className="pt-6">
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Title of Grade Set
                </Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Math Test 1, Quiz Week 3, Homework February"
                  className="text-lg border-2 border-black/20"
                />
                <p className="text-sm text-muted-foreground">
                  Give your grade set a descriptive title
                </p>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Weight (how much it counts)</Label>
                <div className="flex gap-3 items-center">
                  {[1, 2, 3].map((w) => (
                    <Button
                      key={w}
                      variant={weight === w ? 'default' : 'outline'}
                      onClick={() => setWeight(w)}
                      className="w-16"
                    >
                      {w}x
                    </Button>
                  ))}
                  <Input
                    type="number"
                    value={weight}
                    onChange={(e) => setWeight(parseFloat(e.target.value) || 1)}
                    className="w-20 border-2 border-black/20"
                    min={0.5}
                    max={10}
                    step={0.5}
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  For example: 3x for a big test, 1x for a small quiz
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-base font-semibold">Grading Preset</Label>
                <select
                  value={selectedPresetId}
                  onChange={(e) => setSelectedPresetId(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">No preset (free score)</option>
                  {presets.map((preset) => (
                    <option key={preset.id} value={preset.id}>
                      {preset.name} ({preset.kind})
                    </option>
                  ))}
                </select>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <Input
                    value={newPresetName}
                    onChange={(e) => setNewPresetName(e.target.value)}
                    placeholder="New preset name"
                  />
                  <select
                    value={newPresetKind}
                    onChange={(e) => setNewPresetKind(e.target.value as 'freeform' | 'numeric_range' | 'letter_scale')}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="freeform">Freeform</option>
                    <option value="numeric_range">Numeric Range</option>
                    <option value="letter_scale">Letter Scale</option>
                  </select>
                  <Button type="button" variant="outline" onClick={createPreset}>Save Preset</Button>
                </div>
                {newPresetKind === 'letter_scale' && (
                  <Input
                    value={newPresetValues}
                    onChange={(e) => setNewPresetValues(e.target.value)}
                    placeholder="Comma-separated values (e.g. A,B,C,D,E,F)"
                  />
                )}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              {/* Subject selector */}
              {subjects.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Subject (optional)
                  </Label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="">No specific subject</option>
                    {subjects.map((subj) => (
                      <option key={subj.id} value={subj.id}>{subj.title}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Everyone grade */}
              <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
                <Label className="text-base font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Everyone
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Input
                    value={everyoneGrade}
                    onChange={(e) => setEveryoneGrade(e.target.value)}
                    className="border-2 border-black/20"
                    placeholder="Example: 8.7 or B+"
                  />
                  <Button onClick={applyToAll} variant="outline">
                    Apply
                  </Button>
                </div>
              </div>

              {/* Students list */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Students</Label>
                {validationError && (
                  <p className="text-sm text-red-600">{validationError}</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 px-3 text-xs text-muted-foreground">
                  <div className="md:col-span-8">Student</div>
                  <div className="md:col-span-4 text-center">Score</div>
                </div>
                <div className="border rounded-lg divide-y max-h-96 overflow-auto">
                  {students.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin" />
                      <p>Loading...</p>
                    </div>
                  ) : (
                    students.map((student) => (
                      <div key={student.student_id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 items-center">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{student.student.full_name || student.student.email || 'Unknown Student'}</p>
                          <p className="text-xs text-muted-foreground truncate">{student.student.email || 'No email available'}</p>
                        </div>
                        <Input
                          value={student.grade_value ?? ''}
                          onChange={(e) => updateStudentGrade(student.student_id, e.target.value)}
                          className="md:col-span-4 text-center"
                          placeholder="Score"
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6 pt-4 border-t">
            <Button variant="outline" onClick={step === 1 ? onCancel : () => setStep(step - 1)}>
              <ChevronLeft className="h-4 w-4 mr-1" />
              {step === 1 ? 'Cancel' : 'Back'}
            </Button>
            <Button onClick={handleNext} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : step < 3 ? (
                <>
                  Next <ChevronRight className="h-4 w-4 ml-1" />
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-1" />
                  Create Grade Set
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Load students when entering step 3 */}
      {step === 3 && students.length === 0 && !loading && (
        <StudentGrader classId={classId} onStudentsLoaded={setStudents} />
      )}
    </div>
  );
}

// Helper component to load students - directly from class_members
function StudentGrader({ classId, onStudentsLoaded }: { classId: string; onStudentsLoaded: (students: StudentGrade[]) => void }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        console.log('[StudentGrader] Loading students for class:', classId);
        
        // Directly fetch class members (students) from the API
        const response = await fetch(`/api/classes/${classId}/members`);
        console.log('[StudentGrader] Members API response:', response.status, response.ok);
        
        if (response.ok) {
          const members = await response.json(); // Returns array directly
          console.log('[StudentGrader] Members received:', members.length, members);
          
          // Transform class members to student grades format
          const studentGrades: StudentGrade[] = members
            .filter((m: any) => (
              m.role === 'student' ||
              m.subscription_type === 'student' ||
              m.profile?.subscription_type === 'student' ||
              m.profiles?.subscription_type === 'student'
            ))
            .map((m: any) => ({
              id: m.id || crypto.randomUUID(),
              student_id: m.user_id || m.id,
              grade_numeric: null,
              grade_value: null,
              status: 'draft',
              student: {
                id: m.user_id || m.id,
                full_name: m.profile?.full_name || m.profiles?.full_name || '',
                email: m.profile?.email || m.profiles?.email || m.email || 'Unknown'
              }
            }));
          
          console.log('[StudentGrader] Student grades:', studentGrades.length, studentGrades);
          onStudentsLoaded(studentGrades);
        } else {
          const errorText = await response.text();
          console.log('[StudentGrader] ❌ Members API error:', response.status, errorText);
          
          setError('Could not load students. API error: ' + response.status);
        }
      } catch (err: any) {
        console.error('[StudentGrader] ❌ Failed to load students:', err);
        setError('Failed to load students: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [classId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-4">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span>Loading students...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-center">
        {error}
      </div>
    );
  }

  return null;
}

// =============================================
// EDIT GRADES LIST
// =============================================

function EditGradesList({
  classId,
  gradeSets,
  loading,
  subjectId,
  onSelectGradeSet,
  onRefresh,
  onBack
}: {
  classId: string;
  gradeSets: GradeSet[];
  loading: boolean;
  subjectId?: string;
  onSelectGradeSet: (id: string) => void;
  onRefresh: () => void;
  onBack: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">Edit Grades</h1>
          <p className="text-muted-foreground">Manage existing grade sets</p>
        </div>
        <Button variant="outline" onClick={onRefresh}>
          Refresh
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : gradeSets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardList className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">No grade sets yet</p>
            <p className="text-sm text-muted-foreground">Create your first grade set to get started</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {gradeSets.map((gs) => (
            <Card 
              key={gs.id} 
              className="hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => onSelectGradeSet(gs.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">{gs.title}</h3>
                      <Badge variant={gs.status === 'published' ? 'default' : 'secondary'}>
                        {gs.status}
                      </Badge>
                      <Badge variant="outline">{gs.weight}x</Badge>
                    </div>
                    <div className="flex gap-4 mt-1 text-sm text-muted-foreground">
                      <span>{gs.category}</span>
                      <span>{gs.graded_count}/{gs.total_students} graded</span>
                      {gs.average !== null && <span>Avg: {gs.average}</span>}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================
// EDIT GRADES DETAIL (view/edit single grade set)
// =============================================

function EditGradesDetail({ 
  classId, 
  gradeSetId, 
  onBack,
  onDeleted
}: { 
  classId: string; 
  gradeSetId: string; 
  onBack: () => void;
  onDeleted: () => void;
}) {
  const { toast } = useToast();
  const [gradeSet, setGradeSet] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState<any[]>([]);
  const [everyoneGrade, setEveryoneGrade] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [presets, setPresets] = useState<GradePreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('');

  useEffect(() => {
    loadGradeSet();
    loadPresets();
  }, [gradeSetId]);

  const loadPresets = async () => {
    try {
      const response = await fetch(`/api/classes/${classId}/grading-presets`);
      if (!response.ok) return;
      const data = await response.json();
      setPresets(data.presets || []);
    } catch (error) {
      console.error('Failed to load grading presets:', error);
    }
  };

  const loadGradeSet = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/classes/${classId}/grades/${gradeSetId}`);
      if (response.ok) {
        const data = await response.json();
        setGradeSet(data.grade_set);
        setStudents(data.grade_set.student_grades || []);
        setSelectedPresetId(data.grade_set.grading_preset?.id || '');
      }
    } catch (error) {
      console.error('Failed to load grade set:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStudentGrade = (studentId: string, value: string) => {
    setValidationError(null);
    const numeric = toNumeric(value);
    setStudents(students.map(s => 
      s.student_id === studentId
        ? {
            ...s,
            grade_value: value.trim() ? value : null,
            grade_numeric: numeric
          }
        : s
    ));
  };

  const applyToAll = () => {
    setValidationError(null);
    const numeric = toNumeric(everyoneGrade);
    setStudents(students.map(s => {
      return {
        ...s,
        grade_value: everyoneGrade.trim() ? everyoneGrade : null,
        grade_numeric: numeric
      };
    }));
  };

  const saveGrades = async () => {
    setValidationError(null);
    setSaving(true);
    try {
      if ((gradeSet?.grading_preset?.id || '') !== selectedPresetId) {
        const presetResp = await fetch(`/api/classes/${classId}/grades/${gradeSetId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'update_grade_set',
            grading_preset_id: selectedPresetId || null
          })
        });
        if (!presetResp.ok) {
          throw new Error('Failed to update grading preset');
        }
      }

      const response = await fetch(`/api/classes/${classId}/grades/${gradeSetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_student_grades',
          student_grades: students.map(s => ({
            id: s.id,
            grade_numeric: s.grade_numeric ?? null,
            grade_value: s.grade_value
          }))
        })
      });

      if (response.ok) {
        toast({ title: 'Grades saved successfully!' });
      } else {
        throw new Error('Failed to save');
      }
    } catch (error) {
      toast({ title: 'Failed to save grades', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const publishGrades = async () => {
    setValidationError(null);
    setSaving(true);
    try {
      const response = await fetch(`/api/classes/${classId}/grades/${gradeSetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'publish' })
      });

      if (response.ok) {
        toast({ title: 'Grades published!' });
        loadGradeSet();
      } else {
        throw new Error('Failed to publish');
      }
    } catch (error) {
      toast({ title: 'Failed to publish grades', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const deleteGradeSet = async () => {
    if (!confirm('Are you sure you want to delete this grade set? This cannot be undone.')) {
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/classes/${classId}/grades/${gradeSetId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast({ title: 'Grade set deleted' });
        onDeleted();
      } else {
        throw new Error('Failed to delete');
      }
    } catch (error) {
      toast({ title: 'Failed to delete grade set', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!gradeSet) {
    return (
      <div className="text-center py-12">
        <p>Grade set not found</p>
        <Button onClick={onBack} className="mt-4">Go Back</Button>
      </div>
    );
  }

  const canPublish = gradeSet.status === 'draft' && !saving;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{gradeSet.title}</h1>
            <Badge variant={gradeSet.status === 'published' ? 'default' : 'secondary'}>
              {gradeSet.status}
            </Badge>
            <Badge variant="outline">Professional Mode</Badge>
          </div>
          <p className="text-muted-foreground">
            {gradeSet.category} • {gradeSet.weight}x weight • {gradeSet.graded_count}/{gradeSet.total_students} graded
            {gradeSet.average !== null && ` • Avg: ${gradeSet.average}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={deleteGradeSet} disabled={saving}>
            <Trash2 className="h-4 w-4 mr-1" />
            Delete
          </Button>
          {gradeSet.status === 'draft' && (
            <Button onClick={publishGrades} disabled={!canPublish}>
              <Send className="h-4 w-4 mr-1" />
              Publish
            </Button>
          )}
          <Button onClick={saveGrades} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{gradeSet.total_students}</p>
            <p className="text-xs text-muted-foreground">Students</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{gradeSet.graded_count}</p>
            <p className="text-xs text-muted-foreground">Graded</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{gradeSet.total_students - gradeSet.graded_count}</p>
            <p className="text-xs text-muted-foreground">Missing</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{gradeSet.average ?? '-'}</p>
            <p className="text-xs text-muted-foreground">Average</p>
          </CardContent>
        </Card>
      </div>

      {/* Grades Input */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Student Grades</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="font-semibold">Grading Preset</Label>
            <select
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              className="w-full p-2 border rounded-md"
            >
              <option value="">No preset (free score)</option>
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.name} ({preset.kind})
                </option>
              ))}
            </select>
          </div>
          {validationError && (
            <p className="text-sm text-red-600">{validationError}</p>
          )}
          {/* Everyone grade */}
          <div className="space-y-2 p-4 bg-muted/30 rounded-lg">
            <Label className="font-semibold flex items-center gap-2">
              <Users className="h-4 w-4" />
              Everyone
            </Label>
            <div className="flex gap-2">
              <Input
                value={everyoneGrade}
                onChange={(e) => setEveryoneGrade(e.target.value)}
                className="border-2 border-black/20"
                placeholder="Example: 8.7 or B+"
              />
              <Button onClick={applyToAll} variant="outline">
                Apply
              </Button>
            </div>
          </div>

          {/* Students list */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 px-3 text-xs text-muted-foreground">
            <div className="md:col-span-8">Student</div>
            <div className="md:col-span-4 text-center">Score</div>
          </div>
          <div className="border rounded-lg divide-y">
            {students.map((student) => (
              <div key={student.student_id} className="grid grid-cols-1 md:grid-cols-12 gap-3 p-3 items-center">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{student.student?.full_name || student.student?.email || 'Unknown Student'}</p>
                  <p className="text-xs text-muted-foreground truncate">{student.student?.email || 'No email available'}</p>
                </div>
                <Input
                  value={student.grade_value ?? ''}
                  onChange={(e) => updateStudentGrade(student.student_id, e.target.value)}
                  className="md:col-span-4 text-center"
                  placeholder="Score"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
