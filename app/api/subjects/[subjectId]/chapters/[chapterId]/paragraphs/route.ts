import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse, NextRequest } from 'next/server'

import { createParagraphSchema } from '@/lib/validation/schemas'
import { validateBody } from '@/lib/validation/validate'


export const dynamic = 'force-dynamic'

// Helper: check if student has access to a subject through class memberships
async function studentHasSubjectAccess(supabase: any, userId: string, subjectId: string): Promise<boolean> {
  const { data: memberships } = await supabase
    .from('class_members')
    .select('class_id')
    .eq('user_id', userId);

  const classIds = (memberships || []).map((m: any) => m.class_id);
  if (classIds.length === 0) return false;

  const { data: links } = await (supabase as any)
    .from('class_subjects')
    .select('subject_id')
    .eq('subject_id', subjectId)
    .in('class_id', classIds)
    .limit(1);

  if (links && links.length > 0) return true;

  const { data: directSubject } = await (supabase as any)
    .from('subjects')
    .select('id')
    .eq('id', subjectId)
    .in('class_id', classIds)
    .maybeSingle();

  return !!directSubject;
}

// GET paragraphs for a chapter
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user subscription type
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .maybeSingle();

    const isTeacher = profile?.subscription_type === 'teacher';

    // Verify access to the subject
    if (isTeacher) {
      const { data: subject } = await (supabase as any)
        .from('subjects')
        .select('id, user_id, class_id')
        .eq('id', resolvedParams.subjectId)
        .maybeSingle();

      if (!subject) return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
      if (subject.user_id !== user.id) {
        const { data: memberships } = await supabase
          .from('class_members')
          .select('class_id')
          .eq('user_id', user.id);
        const memberClassIds = (memberships || []).map((m: any) => m.class_id).filter(Boolean);
        const directMatch = subject.class_id && memberClassIds.includes(subject.class_id);

        if (!directMatch) {
          const { data: linkMembership } = await (supabase as any)
            .from('class_subjects')
            .select('class_id')
            .eq('subject_id', resolvedParams.subjectId)
            .in('class_id', memberClassIds)
            .limit(1);

          if (!linkMembership || linkMembership.length === 0) {
            return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
          }
        }
      }
    } else {
      const hasAccess = await studentHasSubjectAccess(supabase, user.id, resolvedParams.subjectId);
      if (!hasAccess) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Fetch paragraphs with optional per-user progress snapshot
    const { data: paragraphs, error } = await (supabase as any)
      .from('paragraphs')
      .select(`
        id,
        title,
        paragraph_number,
        chapter_id,
        progress_snapshots(
          student_id,
          completion_percent
        )
      `)
      .eq('chapter_id', resolvedParams.chapterId)
      .order('paragraph_number', { ascending: true });

    if (error) {
      console.log('Paragraphs fetch error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch paragraphs' }, { status: 500 });
    }

    const normalizedParagraphs = (paragraphs || []).map((paragraph: any) => {
      const progressRows = Array.isArray(paragraph.progress_snapshots) ? paragraph.progress_snapshots : [];
      const ownProgress = progressRows.find((row: any) => row.student_id === user.id);
      return {
        id: paragraph.id,
        title: paragraph.title,
        paragraph_number: paragraph.paragraph_number,
        chapter_id: paragraph.chapter_id,
        completion_percent: ownProgress?.completion_percent ?? 0,
      };
    });

    return NextResponse.json(normalizedParagraphs);

  } catch (err) {
    console.error('Paragraphs GET error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST create new paragraph (teachers only)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string; chapterId: string }> }
) {
  try {
    // Validate request body
    const validation = await validateBody(request, createParagraphSchema);
    if ('error' in validation) {
      return validation.error;
    }
    const { title } = validation.data;

    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get max paragraph number
    const { data: existingParagraphs } = await (supabase as any)
      .from('paragraphs')
      .select('paragraph_number')
      .eq('chapter_id', resolvedParams.chapterId)
      .order('paragraph_number', { ascending: false })
      .limit(1);

    const nextNumber = (existingParagraphs?.[0]?.paragraph_number || 0) + 1;

    const { data: paragraph, error: insertError } = await (supabase as any)
      .from('paragraphs')
      .insert({
        chapter_id: resolvedParams.chapterId,
        paragraph_number: nextNumber,
        title: title?.trim()
      })
      .select()
      .single();

    if (insertError) {
      console.log('Paragraph creation error:', insertError.message);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json(paragraph);

  } catch (err) {
    console.error('Paragraphs POST error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
