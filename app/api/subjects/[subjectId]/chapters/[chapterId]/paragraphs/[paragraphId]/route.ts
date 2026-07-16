import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse, NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

async function userHasSubjectAccess(supabase: any, userId: string, subjectId: string): Promise<boolean> {
  const { data: subject } = await (supabase as any)
    .from('subjects')
    .select('id, user_id, class_id')
    .eq('id', subjectId)
    .maybeSingle();

  if (!subject) return false;
  if (subject.user_id === userId) return true;

  const { data: memberships } = await supabase
    .from('class_members')
    .select('class_id')
    .eq('user_id', userId);
  const classIds = (memberships || []).map((m: any) => m.class_id).filter(Boolean);
  if (classIds.length === 0) return false;
  if (subject.class_id && classIds.includes(subject.class_id)) return true;

  const { data: links } = await (supabase as any)
    .from('class_subjects')
    .select('subject_id')
    .eq('subject_id', subjectId)
    .in('class_id', classIds)
    .limit(1);

  return !!(links && links.length > 0);
}

// GET single paragraph
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const hasSubjectAccess = await userHasSubjectAccess(supabase, user.id, resolvedParams.subjectId);
    if (!hasSubjectAccess) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    const { data: chapterMatch } = await (supabase as any)
      .from('chapters')
      .select('id')
      .eq('id', resolvedParams.chapterId)
      .eq('subject_id', resolvedParams.subjectId)
      .maybeSingle();

    if (!chapterMatch) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const { data: paragraph, error } = await (supabase as any)
      .from('paragraphs')
      .select('*')
      .eq('id', resolvedParams.paragraphId)
      .eq('chapter_id', resolvedParams.chapterId)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!paragraph) {
      return NextResponse.json({ error: 'Paragraph not found' }, { status: 404 });
    }

    return NextResponse.json(paragraph);

  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PATCH paragraph settings (teachers only) — currently just prerequisite_paragraph_id,
// moved out of the paragraph-creation dialog into an explicit per-paragraph setting.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string }> }
) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!Object.prototype.hasOwnProperty.call(body, 'prerequisite_paragraph_id')) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }
    const prerequisiteParagraphId =
      typeof body.prerequisite_paragraph_id === 'string' && body.prerequisite_paragraph_id
        ? body.prerequisite_paragraph_id
        : null;

    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: subject } = await (supabase as any)
      .from('subjects')
      .select('id, user_id')
      .eq('id', resolvedParams.subjectId)
      .maybeSingle();
    if (!subject || subject.user_id !== user.id) {
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    const { data: paragraph } = await (supabase as any)
      .from('paragraphs')
      .select('id')
      .eq('id', resolvedParams.paragraphId)
      .eq('chapter_id', resolvedParams.chapterId)
      .maybeSingle();
    if (!paragraph) {
      return NextResponse.json({ error: 'Paragraph not found' }, { status: 404 });
    }

    if (prerequisiteParagraphId === resolvedParams.paragraphId) {
      return NextResponse.json({ error: 'A paragraph cannot require itself' }, { status: 400 });
    }

    const { data: updated, error: updateError } = await (supabase as any)
      .from('paragraphs')
      .update({ prerequisite_paragraph_id: prerequisiteParagraphId })
      .eq('id', resolvedParams.paragraphId)
      .select()
      .single();

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
