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
  BarChart3, Users, BookOpen, Target
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
  feedback_text?: string;
  status: string;
  tag?: string;
  student: { id: string; full_name: string; email: string };
};

type Subject = {
  id: string;
  title: string;
};

// =============================================
// MAIN GRADES TAB COMPONENT
// =============================================

export function GradesTab({ classId }: { classId: string }) {
  const [view, setView] = useState<'menu' | 'new' | 'edit' | 'edit-detail'>('menu');
  const [gradeSets, setGradeSets] = useState<GradeSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGradeSetId, setSelectedGradeSetId] = useState<string | null>(null);

  useEffect(() => {
    loadGradeSets();
  }, [classId]);

  const loadGradeSets = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/classes/${classId}/grades`);
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
        onComplete={() => {
          loadGradeSets();
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
          loadGradeSets();
          setSelectedGradeSetId(null);
          setView('edit');
        }}
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
        onRefresh={loadGradeSets}
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
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

// =============================================
// NEW GRADES WIZARD (MULTI-STEP)
// =============================================

function NewGradesWizard({ 
  classId, 
  onComplete, 
  onCancel 
}: { 
  classId: string; 
  onComplete: () => void; 
  onCancel: () => void;
}) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Step 1: Title
  const [title, setTitle] = useState('');
  
  // Step 2: Weight & Category
  const [category, setCategory] = useState('test');
  const [weight, setWeight] = useState(1);
  
  // Step 3: Students & Grades
  const [students, setStudents] = useState<StudentGrade[]>([]);
  const [everyoneGrade, setEveryoneGrade] = useState('');
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('');

  useEffect(() => {
    if (step >= 3) {
      loadSubjects();
    }
  }, [step]);

  const loadSubjects = async () => {
    try {
      const response = await fetch(`/api/classes/${classId}/subjects`);
      if (response.ok) {
        const data = await response.json();
        setSubjects(data.subjects || []);
      }
    } catch (error) {
      console.error('Failed to load subjects:', error);
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
    setLoading(true);
    try {
      // Create grade set first
      const response = await fetch(`/api/classes/${classId}/grades`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          category,
          weight,
          subject_id: selectedSubjectId || null
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create grade set');
      }

      const data = await response.json();
      
      // If we have grades, update them
      if (students.length > 0) {
        const gradesWithValues = students.filter(s => s.grade_value && s.grade_value.trim() !== '');
        
        if (gradesWithValues.length > 0) {
          const updateResponse = await fetch(`/api/classes/${classId}/grades/${data.grade_set.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'update_student_grades',
              student_grades: gradesWithValues.map(s => ({
                id: s.id,
                grade_value: s.grade_value,
                status: 'draft'
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
    setStudents(students.map(s => 
      s.student_id === studentId ? { ...s, grade_value: value } : s
    ));
  };

  // Apply "everyone" grade to all students
  const applyToAll = () => {
    setStudents(students.map(s => ({ ...s, grade_value: everyoneGrade })));
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
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-base font-semibold">Category</Label>
                <div className="grid grid-cols-3 gap-3">
                  {['test', 'quiz', 'homework', 'exam'].map((cat) => (
                    <Button
                      key={cat}
                      variant={category === cat ? 'default' : 'outline'}
                      onClick={() => setCategory(cat)}
                      className="capitalize"
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>

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
                <div className="flex gap-2">
                  <Input
                    value={everyoneGrade}
                    onChange={(e) => setEveryoneGrade(e.target.value)}
                    placeholder="Apply to all students"
                    className="border-2 border-black/20"
                  />
                  <Button onClick={applyToAll} variant="outline">
                    Apply
                  </Button>
                </div>
              </div>

              {/* Students list */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Students</Label>
                <div className="border rounded-lg divide-y max-h-96 overflow-auto">
                  {students.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                      <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>Loading students...</p>
                    </div>
                  ) : (
                    students.map((student) => (
                      <div key={student.student_id} className="flex items-center gap-3 p-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{student.student.full_name}</p>
                          <p className="text-xs text-muted-foreground truncate">{student.student.email}</p>
                        </div>
                        <Input
                          value={student.grade_value || ''}
                          onChange={(e) => updateStudentGrade(student.student_id, e.target.value)}
                          placeholder="Grade"
                          className="w-24 text-center"
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

// Helper component to load students
function StudentGrader({ classId, onStudentsLoaded }: { classId: string; onStudentsLoaded: (students: StudentGrade[]) => void }) {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const response = await fetch(`/api/classes/${classId}/grades`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            title: '_temp_grade_set_', 
            category: 'test', 
            weight: 1 
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Now fetch the grade set with students
          const gradeSetResponse = await fetch(`/api/classes/${classId}/grades/${data.grade_set.id}`);
          if (gradeSetResponse.ok) {
            const gradeSetData = await gradeSetResponse.json();
            onStudentsLoaded(gradeSetData.grade_set.student_grades || []);
            
            // Delete the temp grade set
            await fetch(`/api/classes/${classId}/grades/${data.grade_set.id}`, {
              method: 'DELETE'
            });
          }
        }
      } catch (error) {
        console.error('Failed to load students:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [classId]);

  if (!loading) return null;
  
  return (
    <div className="flex items-center justify-center py-4">
      <Loader2 className="h-5 w-5 animate-spin mr-2" />
      <span>Loading students...</span>
    </div>
  );
}

// =============================================
// EDIT GRADES LIST
// =============================================

function EditGradesList({ 
  classId, 
  gradeSets, 
  loading, 
  onSelectGradeSet, 
  onRefresh,
  onBack 
}: { 
  classId: string; 
  gradeSets: GradeSet[]; 
  loading: boolean;
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

  useEffect(() => {
    loadGradeSet();
  }, [gradeSetId]);

  const loadGradeSet = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/classes/${classId}/grades/${gradeSetId}`);
      if (response.ok) {
        const data = await response.json();
        setGradeSet(data.grade_set);
        setStudents(data.grade_set.student_grades || []);
      }
    } catch (error) {
      console.error('Failed to load grade set:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStudentGrade = (studentId: string, value: string) => {
    setStudents(students.map(s => 
      s.student_id === studentId ? { ...s, grade_value: value } : s
    ));
  };

  const applyToAll = () => {
    setStudents(students.map(s => ({ ...s, grade_value: everyoneGrade })));
  };

  const saveGrades = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/classes/${classId}/grades/${gradeSetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_student_grades',
          student_grades: students.map(s => ({
            id: s.id,
            grade_value: s.grade_value,
            status: 'draft'
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
            <Button onClick={publishGrades} disabled={saving}>
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
                placeholder="Apply to all students"
                className="border-2 border-black/20"
              />
              <Button onClick={applyToAll} variant="outline">
                Apply
              </Button>
            </div>
          </div>

          {/* Students list */}
          <div className="border rounded-lg divide-y">
            {students.map((student) => (
              <div key={student.student_id} className="flex items-center gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{student.student?.full_name || 'Unknown'}</p>
                  <p className="text-xs text-muted-foreground truncate">{student.student?.email || ''}</p>
                </div>
                <Input
                  value={student.grade_value || ''}
                  onChange={(e) => updateStudentGrade(student.student_id, e.target.value)}
                  placeholder="Grade"
                  className="w-24 text-center"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
