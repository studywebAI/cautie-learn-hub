// Bridges the toets-lifecycle (assignments/attempts) with the Grades system.
// See docs/grades-feature-brainstorm.md sections H/I/J.

const TEST_TYPES = new Set(['small_test', 'big_test']);

// Get-or-create the grade_sets row for a test assignment. Idempotent (unique
// index on grade_sets.assignment_id). Returns null for non-test assignments
// or assignments without a class.
export async function ensureGradeSetForAssignment(supabase: any, assignmentId: string): Promise<string | null> {
  const { data: assignment } = await supabase
    .from('assignments')
    .select('id, class_id, title, type')
    .eq('id', assignmentId)
    .maybeSingle();

  if (!assignment || !TEST_TYPES.has((assignment as any).type) || !(assignment as any).class_id) {
    return null;
  }

  const { data: existing } = await supabase
    .from('grade_sets')
    .select('id')
    .eq('assignment_id', assignmentId)
    .maybeSingle();
  if (existing) return (existing as any).id;

  const classId = (assignment as any).class_id;

  const { data: members } = await supabase
    .from('class_members')
    .select('user_id, role')
    .eq('class_id', classId);

  const teacherRoles = new Set(['teacher', 'owner', 'admin', 'creator', 'ta']);
  let creatorId = (members || []).find((m: any) => teacherRoles.has(String(m.role || '').toLowerCase()))?.user_id || null;

  if (!creatorId) {
    // Legacy class_members rows may miss `role` — fall back to global teacher role.
    const memberIds = (members || []).map((m: any) => m.user_id).filter(Boolean);
    if (memberIds.length > 0) {
      const { data: teacherProfile } = await supabase
        .from('profiles')
        .select('id')
        .in('id', memberIds)
        .eq('subscription_type', 'teacher')
        .limit(1)
        .maybeSingle();
      creatorId = teacherProfile?.id || null;
    }
  }
  if (!creatorId) return null;

  const { data: created, error } = await supabase
    .from('grade_sets')
    .insert({
      class_id: classId,
      assignment_id: assignmentId,
      title: (assignment as any).title || 'Toets',
      category: 'test',
      weight: 1,
      status: 'grading',
      created_by: creatorId,
    })
    .select('id')
    .maybeSingle();

  // Unique index collision means another request already created it concurrently.
  if (error || !created) {
    const { data: raceWinner } = await supabase
      .from('grade_sets')
      .select('id')
      .eq('assignment_id', assignmentId)
      .maybeSingle();
    return raceWinner?.id || null;
  }

  const studentIds = (members || [])
    .filter((m: any) => {
      const role = String(m.role || '').toLowerCase();
      return role === 'student' || role === '';
    })
    .map((m: any) => m.user_id)
    .filter((id: string) => id !== creatorId);

  if (studentIds.length > 0) {
    await supabase.from('student_grades').insert(
      studentIds.map((id: string) => ({ grade_set_id: (created as any).id, student_id: id, status: 'draft' }))
    );
  }

  return (created as any).id;
}

export type GradeScaleBin = { min: number; max: number; label: string; numeric?: number | null };
export type GradeScaleConfig = { templateType: 'scale_template'; system: string; bins: GradeScaleBin[] };

// Built-in country/system starting points. Teachers can adjust bins after picking one.
// Stored as class_grading_presets.kind='freeform' with config.templateType marking
// it as a scale template (see app/api/classes/[classId]/grading-presets/route.ts).
export const GRADE_TEMPLATE_PRESETS: Record<string, { name: string; config: GradeScaleConfig }> = {
  nl_1_10: {
    name: 'Nederland (1-10)',
    config: {
      templateType: 'scale_template',
      system: 'nl_1_10',
      bins: [
        { min: 90, max: 100, label: '9-10', numeric: 9.5 },
        { min: 80, max: 89.99, label: '8', numeric: 8 },
        { min: 70, max: 79.99, label: '7', numeric: 7 },
        { min: 60, max: 69.99, label: '6', numeric: 6 },
        { min: 55, max: 59.99, label: '5,5', numeric: 5.5 },
        { min: 0, max: 54.99, label: 'onvoldoende', numeric: 4 },
      ],
    },
  },
  us_a_f: {
    name: 'VS (A-F)',
    config: {
      templateType: 'scale_template',
      system: 'us_a_f',
      bins: [
        { min: 90, max: 100, label: 'A', numeric: null },
        { min: 80, max: 89.99, label: 'B', numeric: null },
        { min: 70, max: 79.99, label: 'C', numeric: null },
        { min: 60, max: 69.99, label: 'D', numeric: null },
        { min: 0, max: 59.99, label: 'F', numeric: null },
      ],
    },
  },
  de_1_6: {
    name: 'Duitsland (1-6)',
    config: {
      templateType: 'scale_template',
      system: 'de_1_6',
      bins: [
        { min: 92, max: 100, label: '1', numeric: 1 },
        { min: 81, max: 91.99, label: '2', numeric: 2 },
        { min: 67, max: 80.99, label: '3', numeric: 3 },
        { min: 50, max: 66.99, label: '4', numeric: 4 },
        { min: 30, max: 49.99, label: '5', numeric: 5 },
        { min: 0, max: 29.99, label: '6', numeric: 6 },
      ],
    },
  },
};

// Apply a grading-scale template to a raw score, returning the matching bin.
export function applyGradeScale(config: GradeScaleConfig, score: number, maxScore: number): GradeScaleBin | null {
  if (!maxScore || maxScore <= 0) return null;
  const pct = Math.max(0, Math.min(100, (score / maxScore) * 100));
  const bins = [...(config.bins || [])].sort((a, b) => b.min - a.min);
  return bins.find(b => pct >= b.min && pct <= b.max) || bins[bins.length - 1] || null;
}
