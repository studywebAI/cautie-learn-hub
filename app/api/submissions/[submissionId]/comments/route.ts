import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

import type { Database } from '@/lib/supabase/database.types'

export const dynamic = 'force-dynamic'

// GET all comments for a submission
export async function GET(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const resolvedParams = await params;
  const submissionId = resolvedParams.submissionId;
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: any) { cookieStore.set(name, value, options) },
        remove(name: string, options: any) { cookieStore.set(name, '', { ...options, maxAge: 0 }) }
      }
    }
  )

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: submissionData, error: submissionError } = await supabase
    .from('submissions')
    .select('user_id')
    .eq('id', submissionId)
    .single();

  if (submissionError || !submissionData) {
    return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
  }

  const canAccess = submissionData.user_id === session.user.id ||
    await checkIfTeacherForSubmission(supabase, submissionId, session.user.id);

  if (!canAccess) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: comments, error: commentsError } = await (supabase as any)
    .from('submission_comments')
    .select(`id, comment, created_at, user_id, profiles!submission_comments_user_id_fkey (full_name, avatar_url, role)`)
    .eq('submission_id', submissionId)
    .order('created_at', { ascending: false });

  if (commentsError) {
    return NextResponse.json({ error: commentsError.message }, { status: 500 });
  }

  return NextResponse.json(comments);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ submissionId: string }> }
) {
  const resolvedParams = await params;
  const submissionId = resolvedParams.submissionId;
  const cookieStore = await cookies()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value },
        set(name: string, value: string, options: any) { cookieStore.set(name, value, options) },
        remove(name: string, options: any) { cookieStore.set(name, '', { ...options, maxAge: 0 }) }
      }
    }
  )

  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const isTeacher = await checkIfTeacherForSubmission(supabase, submissionId, session.user.id);
  if (!isTeacher) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { comment } = await request.json();
  if (!comment || comment.trim() === '') {
    return NextResponse.json({ error: 'Comment is required' }, { status: 400 });
  }

  const { data: newComment, error: insertError } = await (supabase as any)
    .from('submission_comments')
    .insert({ submission_id: submissionId, user_id: session.user.id, comment: comment.trim() })
    .select()
    .single();

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  return NextResponse.json(newComment);
}

async function checkIfTeacherForSubmission(supabase: any, submissionId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('submissions')
    .select(`assignments!inner (class_id, classes!inner (owner_id))`)
    .eq('id', submissionId)
    .single();
  if (error || !data) return false;
  return data.assignments.classes.owner_id === userId;
}
