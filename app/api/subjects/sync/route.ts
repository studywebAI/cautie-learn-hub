import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createHash } from 'crypto';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

type SubjectRow = {
  id: string;
  class_id?: string | null;
};

function stableHash(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
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

    const classId = request.nextUrl.searchParams.get('classId');
    const clientChecksum = request.nextUrl.searchParams.get('checksum') || '';
    const subjectsUrl = new URL('/api/subjects', request.url);
    if (classId) subjectsUrl.searchParams.set('classId', classId);

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .maybeSingle();

    const isTeacher = profile?.subscription_type === 'teacher';
    const scopedSubjectIds = new Set<string>();
    const scopedClassIds = new Set<string>();

    if (isTeacher) {
      const [ownedSubjects, linkedSubjects] = await Promise.all([
        (supabase as any).from('subjects').select('id, class_id').eq('user_id', user.id),
        classId
          ? (supabase as any).from('class_subjects').select('subject_id').eq('class_id', classId)
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (ownedSubjects.error) return NextResponse.json({ error: ownedSubjects.error.message }, { status: 500 });
      if (linkedSubjects.error) return NextResponse.json({ error: linkedSubjects.error.message }, { status: 500 });

      for (const row of (ownedSubjects.data || []) as SubjectRow[]) {
        if (classId && row.class_id !== classId) continue;
        scopedSubjectIds.add(row.id);
        if (row.class_id) scopedClassIds.add(row.class_id);
      }
      for (const row of linkedSubjects.data || []) scopedSubjectIds.add(row.subject_id as string);
      if (classId) scopedClassIds.add(classId);
    } else {
      const { data: memberships, error: membershipsError } = await supabase
        .from('class_members')
        .select('class_id')
        .eq('user_id', user.id);

      if (membershipsError) return NextResponse.json({ error: membershipsError.message }, { status: 500 });

      const memberClassIds = (memberships || []).map((m: any) => m.class_id).filter(Boolean);
      const resolvedClassIds = classId ? memberClassIds.filter((id: string) => id === classId) : memberClassIds;
      for (const id of resolvedClassIds) scopedClassIds.add(id);

      if (resolvedClassIds.length > 0) {
        const [directSubjects, linkedSubjects] = await Promise.all([
          (supabase as any).from('subjects').select('id').in('class_id', resolvedClassIds),
          (supabase as any).from('class_subjects').select('subject_id').in('class_id', resolvedClassIds),
        ]);

        if (directSubjects.error) return NextResponse.json({ error: directSubjects.error.message }, { status: 500 });
        if (linkedSubjects.error) return NextResponse.json({ error: linkedSubjects.error.message }, { status: 500 });

        for (const row of directSubjects.data || []) scopedSubjectIds.add(row.id as string);
        for (const row of linkedSubjects.data || []) scopedSubjectIds.add(row.subject_id as string);
      }
    }

    const subjectIds = Array.from(scopedSubjectIds);
    const classIds = Array.from(scopedClassIds);

    if (subjectIds.length === 0) {
      const emptyChecksum = stableHash({ subjectIds: [], classIds: [] });
      return NextResponse.json({
        changed: clientChecksum !== emptyChecksum,
        checksum: emptyChecksum,
        subjects: [],
      });
    }

    const [subjectsRows, classSubjectRows, chapterRows] = await Promise.all([
      (supabase as any).from('subjects').select('id, updated_at, created_at').in('id', subjectIds),
      classIds.length > 0
        ? (supabase as any)
            .from('class_subjects')
            .select('class_id, subject_id, created_at')
            .in('class_id', classIds)
            .in('subject_id', subjectIds)
        : Promise.resolve({ data: [], error: null }),
      (supabase as any).from('chapters').select('id, subject_id, updated_at, created_at').in('subject_id', subjectIds),
    ]);

    if (subjectsRows.error) return NextResponse.json({ error: subjectsRows.error.message }, { status: 500 });
    if (classSubjectRows.error) return NextResponse.json({ error: classSubjectRows.error.message }, { status: 500 });
    if (chapterRows.error) return NextResponse.json({ error: chapterRows.error.message }, { status: 500 });

    const chapterIds = (chapterRows.data || []).map((row: any) => row.id).filter(Boolean);

    const [paragraphRows, sessionRows] = await Promise.all([
      chapterIds.length > 0
        ? (supabase as any).from('paragraphs').select('id, chapter_id, updated_at, created_at').in('chapter_id', chapterIds)
        : Promise.resolve({ data: [], error: null }),
      (supabase as any)
        .from('session_logs')
        .select('subject_id, paragraph_id, started_at')
        .eq('user_id', user.id)
        .in('subject_id', subjectIds)
        .order('started_at', { ascending: false })
        .limit(200),
    ]);

    if (paragraphRows.error) return NextResponse.json({ error: paragraphRows.error.message }, { status: 500 });
    if (sessionRows.error) return NextResponse.json({ error: sessionRows.error.message }, { status: 500 });

    const paragraphIds = (paragraphRows.data || []).map((row: any) => row.id).filter(Boolean);
    const assignmentsRows =
      paragraphIds.length > 0
        ? await (supabase as any).from('assignments').select('id, paragraph_id, updated_at, created_at').in('paragraph_id', paragraphIds)
        : { data: [], error: null };

    if (assignmentsRows.error) return NextResponse.json({ error: assignmentsRows.error.message }, { status: 500 });

    const checksumPayload = {
      subjects: (subjectsRows.data || []).map((row: any) => [row.id, row.updated_at || row.created_at || null]),
      classSubjects: (classSubjectRows.data || []).map((row: any) => [row.class_id, row.subject_id, row.created_at || null]),
      chapters: (chapterRows.data || []).map((row: any) => [row.id, row.subject_id, row.updated_at || row.created_at || null]),
      paragraphs: (paragraphRows.data || []).map((row: any) => [row.id, row.chapter_id, row.updated_at || row.created_at || null]),
      assignments: (assignmentsRows.data || []).map((row: any) => [row.id, row.paragraph_id, row.updated_at || row.created_at || null]),
      sessions: (sessionRows.data || []).map((row: any) => [row.subject_id, row.paragraph_id, row.started_at || null]),
    };

    const checksum = stableHash(checksumPayload);
    if (clientChecksum && clientChecksum === checksum) {
      return NextResponse.json({ changed: false, checksum });
    }

    const subjectsResponse = await fetch(subjectsUrl, {
      headers: { cookie: request.headers.get('cookie') || '' },
      cache: 'no-store',
    });

    if (!subjectsResponse.ok) {
      return NextResponse.json(
        { error: `Failed to refresh subjects (${subjectsResponse.status})` },
        { status: subjectsResponse.status },
      );
    }

    const subjects = await subjectsResponse.json();
    return NextResponse.json({
      changed: true,
      checksum,
      subjects: Array.isArray(subjects) ? subjects : [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 });
  }
}
