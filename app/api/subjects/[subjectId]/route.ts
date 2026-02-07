import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string }> }
) {
  const resolvedParams = await params;
  const subjectId = resolvedParams.subjectId;

  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.log('Subject detail - auth failed:', authError);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Simple fetch - service role key bypasses RLS
    // Access control is handled at the list level (students only see subjects from their classes)
    const { data: subject, error: fetchError } = await supabase
      .from('subjects')
      .select('*')
      .eq('id', subjectId)
      .maybeSingle();

    if (fetchError) {
      console.log('Subject detail - fetch error:', fetchError);
      return NextResponse.json({ error: 'Failed to fetch subject' }, { status: 500 });
    }

    if (!subject) {
      console.log('Subject detail - not found for id:', subjectId);
      return NextResponse.json({ error: 'Subject not found' }, { status: 404 });
    }

    return NextResponse.json(subject);

  } catch (err) {
    console.error('Subject detail - unexpected error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
