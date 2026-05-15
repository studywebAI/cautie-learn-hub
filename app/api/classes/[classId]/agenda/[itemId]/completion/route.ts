'use server';

import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { classId: string; itemId: string } }
) {
  try {
    const supabase = createServerComponentClient({
      cookies,
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { itemId } = params;

    // Fetch completion status
    const { data: completion } = await supabase
      .from('student_task_completion')
      .select('completed, completed_at')
      .eq('agenda_item_id', itemId)
      .eq('student_id', user.id)
      .single();

    return NextResponse.json({
      completed: completion?.completed || false,
      completed_at: completion?.completed_at || null,
    });
  } catch (error: any) {
    return NextResponse.json(
      { completed: false, error: 'Could not fetch completion status' },
      { status: 200 } // Return 200 with default value
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { classId: string; itemId: string } }
) {
  try {
    const supabase = createServerComponentClient({
      cookies,
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { classId, itemId } = params;
    const { completed } = await request.json();

    // Verify user has access to this class
    const { data: classData } = await supabase
      .from('classes')
      .select('id')
      .eq('id', classId)
      .single();

    if (!classData) {
      return NextResponse.json(
        { error: 'Class not found' },
        { status: 404 }
      );
    }

    // Check if student_task_completion record exists
    const { data: existingRecord } = await supabase
      .from('student_task_completion')
      .select('id')
      .eq('agenda_item_id', itemId)
      .eq('student_id', user.id)
      .single();

    if (existingRecord) {
      // Update existing record
      const { error } = await supabase
        .from('student_task_completion')
        .update({
          completed,
          completed_at: completed ? new Date().toISOString() : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingRecord.id);

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }
    } else {
      // Create new record
      const { error } = await supabase
        .from('student_task_completion')
        .insert({
          agenda_item_id: itemId,
          student_id: user.id,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        });

      if (error) {
        return NextResponse.json(
          { error: error.message },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      completed,
      message: completed ? 'Task marked as complete' : 'Task marked as incomplete',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
