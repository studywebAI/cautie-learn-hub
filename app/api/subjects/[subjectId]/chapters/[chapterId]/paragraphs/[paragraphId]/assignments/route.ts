import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// GET assignments for a paragraph
export async function GET(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const resolvedParams = await params;

    console.log(`GET /api/subjects/${resolvedParams.subjectId}/chapters/${resolvedParams.chapterId}/paragraphs/${resolvedParams.paragraphId}/assignments - Called`);

    // Simple fetch - just get assignments
    console.log(`Fetching assignments for paragraph: ${resolvedParams.paragraphId}`);

    const { data: assignments, error } = await supabase
      .from('assignments')
      .select('*')
      .eq('paragraph_id', resolvedParams.paragraphId)
      .order('assignment_index', { ascending: true })

    console.log(`Assignments query result:`, { assignments, error });

    if (error) {
      console.log(`Assignments fetch error:`, error);
      // Return empty array instead of error to prevent infinite loading
      console.log(`Returning empty assignments array to prevent infinite loading`);
      return NextResponse.json([])
    }

    // Ensure we have an array
    const safeAssignments = assignments || [];

    console.log(`Found ${assignments?.length || 0} assignments`);

    // Transform assignments to include letter indexing
    const transformedAssignments = safeAssignments.map(assignment => {
      const getLetterIndex = (index: number) => {
        if (index === 0) return 'a';
        let result = '';
        let num = index;
        while (num >= 0) {
          result = String.fromCharCode(97 + (num % 26)) + result;
          num = Math.floor(num / 26) - 1;
          if (num < 0) break;
        }
        return result;
      };

      return {
        ...assignment,
        letter_index: getLetterIndex(assignment.assignment_index),
        block_count: 0 // Will be calculated separately if needed
      };
    })

    console.log(`Assignments found:`, transformedAssignments?.length || 0);
    return NextResponse.json(transformedAssignments)

  } catch (err) {
    console.error(`Unexpected error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create new assignment
export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string }> }
) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const resolvedParams = await params;

    console.log(`POST /api/subjects/${resolvedParams.subjectId}/chapters/${resolvedParams.chapterId}/paragraphs/${resolvedParams.paragraphId}/assignments - Called`);
    const { title, answers_enabled = false } = await request.json()

    console.log(`Creating assignment for paragraph:`, resolvedParams.paragraphId, `title:`, title);

    // Get max assignment index for this paragraph
    const { data: existingAssignments, error: countError } = await supabase
      .from('assignments')
      .select('assignment_index')
      .eq('paragraph_id', resolvedParams.paragraphId)
      .order('assignment_index', { ascending: false })
      .limit(1)

    const nextIndex = (existingAssignments?.[0]?.assignment_index || 0) + 1

    // Create assignment
    const { data: assignment, error: insertError } = await supabase
      .from('assignments')
      .insert({
        paragraph_id: resolvedParams.paragraphId,
        assignment_index: nextIndex,
        title: title?.trim(),
        answers_enabled
      })
      .select()
      .single()

    if (insertError) {
      console.log(`Assignment creation error:`, insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    // Calculate letter index
    const getLetterIndex = (index: number) => {
      if (index === 0) return 'a';
      let result = '';
      let num = index;
      while (num >= 0) {
        result = String.fromCharCode(97 + (num % 26)) + result;
        num = Math.floor(num / 26) - 1;
        if (num < 0) break;
      }
      return result;
    };

    console.log(`Assignment created:`, assignment);
    return NextResponse.json({
      ...assignment,
      letter_index: getLetterIndex(assignment.assignment_index),
      block_count: 0
    })

  } catch (err) {
    console.error(`Unexpected error:`, err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}