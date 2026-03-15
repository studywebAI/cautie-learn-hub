import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type ClassSummary = {
  id: string;
  name: string;
  status?: string | null;
  studentCount: number;
  subjectCount: number;
};

type SubjectSummary = {
  id: string;
  title: string;
};

const MAX_CLASS_IDS = 8;

function parseClassIds(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, MAX_CLASS_IDS);
}

export async function GET(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const { data: auth } = await supabase.auth.getUser();
    const user = auth?.user;

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const requestedClassIds = parseClassIds(request.nextUrl.searchParams.get('classIds'));

    const { data: memberships, error: membershipsError } = await supabase
      .from('class_members')
      .select('class_id')
      .eq('user_id', user.id);

    if (membershipsError) {
      return NextResponse.json({ error: membershipsError.message }, { status: 500 });
    }

    const memberClassIds = (memberships || []).map((membership: any) => membership.class_id);
    const allowedRequestedClassIds = requestedClassIds.filter((id) => memberClassIds.includes(id));
    const scopedClassIds =
      allowedRequestedClassIds.length > 0 ? allowedRequestedClassIds : memberClassIds.slice(0, MAX_CLASS_IDS);

    if (scopedClassIds.length === 0) {
      return NextResponse.json({
        generatedAt: new Date().toISOString(),
        classes: [],
        subjectsByClass: {},
      });
    }

    const [classesResult, membersResult, classSubjectsResult, directSubjectsResult] = await Promise.all([
      supabase.from('classes').select('id, name, status').in('id', scopedClassIds),
      supabase.from('class_members').select('class_id, user_id').in('class_id', scopedClassIds),
      (supabase as any)
        .from('class_subjects')
        .select('class_id, subjects:subject_id(id, title)')
        .in('class_id', scopedClassIds),
      (supabase as any)
        .from('subjects')
        .select('id, title, class_id')
        .in('class_id', scopedClassIds),
    ]);

    if (classesResult.error) {
      return NextResponse.json({ error: classesResult.error.message }, { status: 500 });
    }
    if (membersResult.error) {
      return NextResponse.json({ error: membersResult.error.message }, { status: 500 });
    }
    if (classSubjectsResult.error) {
      return NextResponse.json({ error: classSubjectsResult.error.message }, { status: 500 });
    }
    if (directSubjectsResult.error) {
      return NextResponse.json({ error: directSubjectsResult.error.message }, { status: 500 });
    }

    const studentsByClass = new Map<string, Set<string>>();
    for (const row of membersResult.data || []) {
      const classId = row.class_id as string;
      const userId = row.user_id as string;
      if (!studentsByClass.has(classId)) studentsByClass.set(classId, new Set());
      studentsByClass.get(classId)!.add(userId);
    }

    const subjectsByClass = new Map<string, Map<string, SubjectSummary>>();
    for (const classId of scopedClassIds) {
      subjectsByClass.set(classId, new Map());
    }

    for (const link of classSubjectsResult.data || []) {
      const classId = link.class_id as string;
      const subject = link.subjects as SubjectSummary | null;
      if (!classId || !subject?.id) continue;
      subjectsByClass.get(classId)?.set(subject.id, { id: subject.id, title: subject.title });
    }

    for (const subject of directSubjectsResult.data || []) {
      const classId = subject.class_id as string | null;
      if (!classId || !subject.id) continue;
      subjectsByClass.get(classId)?.set(subject.id, { id: subject.id, title: subject.title });
    }

    const classSummaries: ClassSummary[] = (classesResult.data || [])
      .map((classRow: any) => {
        const id = classRow.id as string;
        return {
          id,
          name: classRow.name,
          status: classRow.status,
          studentCount: studentsByClass.get(id)?.size || 0,
          subjectCount: subjectsByClass.get(id)?.size || 0,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    const subjectsByClassPayload = Object.fromEntries(
      Array.from(subjectsByClass.entries()).map(([classId, subjectMap]) => [classId, Array.from(subjectMap.values())])
    );

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      classes: classSummaries,
      subjectsByClass: subjectsByClassPayload,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}

