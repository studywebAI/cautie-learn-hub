import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { generateStudyMaterials } from '@/lib/claude-client';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ studysetId: string }> }
) {
  try {
    const { studysetId } = await params;
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { option, agenda, materials } = await req.json();

    // Verify ownership
    const { data: studyset } = await (supabase as any)
      .from('studysets')
      .select('id, owner_id, name')
      .eq('id', studysetId)
      .single();

    if (!studyset || studyset.owner_id !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Extract text from materials array
    let materialsText = '';
    if (Array.isArray(materials) && materials.length > 0) {
      materialsText = materials
        .map((m: any) => {
          if (typeof m === 'string') return m;
          if (m.content) return m.content;
          if (m.text) return m.text;
          return JSON.stringify(m);
        })
        .join('\n\n');
    }

    // Extract agenda settings
    const knowledgeLevel = agenda?.knowledgeLevel || 'intermediate';
    const studyDays = Array.isArray(agenda?.daysPerWeek) ? agenda.daysPerWeek : [];
    const workflowType = option?.type || 'balanced';
    const workflowSetting = option?.setting || 'self-paced';

    // Call Claude API to generate study materials
    const generatedMaterials = await generateStudyMaterials({
      studysetName: studyset.name,
      materials: materialsText || 'General study materials',
      knowledgeLevel,
      studyDays,
      workflowType,
      workflowSetting,
    });

    // Save generated content to database
    await (supabase as any)
      .from('studyset_workflow_state')
      .update({
        ai_generation_style: option,
        generated_at: new Date().toISOString(),
      })
      .eq('studyset_id', studysetId)
      .catch(() => {}); // Ignore if table doesn't exist

    return NextResponse.json({
      success: true,
      studysetId,
      generationStyle: option,
      flashcardsGenerated: generatedMaterials.flashcards.length,
      quizzesGenerated: generatedMaterials.quizzes.length,
      flashcards: generatedMaterials.flashcards,
      quizzes: generatedMaterials.quizzes,
      studyGuide: generatedMaterials.studyGuide,
      message: 'Content generated successfully.',
    });
  } catch (error) {
    console.error('Error generating workflow:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
