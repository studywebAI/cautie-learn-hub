import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse, NextRequest } from 'next/server'

import { createBlockSchema } from '@/lib/validation/schemas'
import { validateBody } from '@/lib/validation/validate'
import { getClassPermission } from '@/lib/auth/class-permissions'


export const dynamic = 'force-dynamic'

// GET blocks for a user (standalone endpoint for browsing blocks)
export async function GET(request: Request) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const { searchParams } = new URL(request.url)
    const paragraphId = searchParams.get('paragraph_id')
    const assignmentId = searchParams.get('assignment_id')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    let query = supabase
      .from('blocks')
      .select('*')
      .order('position', { ascending: true })

    if (paragraphId) {
      query = query.eq('paragraph_id', paragraphId)
    }
    if (assignmentId) {
      query = query.eq('assignment_id', assignmentId)
    }

    const { data: blocks, error } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(blocks || [])
  } catch (error) {
    console.error('Error fetching blocks:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST create a new block (standalone endpoint - can link to paragraph or assignment)
export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateBody(request, createBlockSchema);
    if ('error' in validation) {
      return validation.error;
    }
    const { type, data: blockData, paragraph_id, assignment_id, position, locked, show_feedback, ai_grading_override } = validation.data;

    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!type || !blockData) {
      return NextResponse.json({ error: 'Missing required fields: type and data' }, { status: 400 })
    }

    // Use subscription_type as the single source of truth (role column removed)
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .maybeSingle()

    const userRole = profile?.subscription_type || 'student'

    // Verify access if linking to paragraph or assignment
    if (paragraph_id || assignment_id) {
      if (userRole !== 'teacher') {
        return NextResponse.json({ error: 'Only teachers can create blocks' }, { status: 403 })
      }

      // Verify the parent exists and user has access
      if (paragraph_id) {
        const { data: paragraph } = await (supabase as any)
          .from('paragraphs')
          .select('id, chapters!inner(id, subjects!inner(id, user_id))')
          .eq('id', paragraph_id)
          .single()

        if (!paragraph) {
          return NextResponse.json({ error: 'Paragraph not found' }, { status: 404 })
        }

        const chapter = paragraph.chapters
        const subject = chapter?.subjects

        if (subject?.user_id !== user.id) {
          return NextResponse.json({ error: 'Access denied to this paragraph' }, { status: 403 })
        }
      }

      if (assignment_id) {
        const { data: assignment } = await (supabase as any)
          .from('assignments')
          .select('id, class_id')
          .eq('id', assignment_id)
          .maybeSingle()

        if (!assignment) {
          return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })
        }

        if (!assignment.class_id) {
          return NextResponse.json({ error: 'Assignment is not linked to a class' }, { status: 400 })
        }

        const perm = await getClassPermission(supabase as any, assignment.class_id, user.id)
        if (!perm.isMember || !perm.isTeacher) {
          return NextResponse.json({ error: 'Access denied to this assignment' }, { status: 403 })
        }
      }
    }

    // Get max position if not provided
    let maxPosition = position
    if (maxPosition === undefined || maxPosition === null) {
      let positionQuery = supabase
        .from('blocks')
        .select('position')
        .order('position', { ascending: false })

      if (paragraph_id) {
        positionQuery = positionQuery.eq('paragraph_id', paragraph_id)
      }
      if (assignment_id) {
        positionQuery = positionQuery.eq('assignment_id', assignment_id)
      }

      const { data: existingBlocks } = await positionQuery.limit(1)
      maxPosition = (existingBlocks?.[0]?.position ?? -1) + 1
    }

    // Create the block
    const { data: block, error: insertError } = await (supabase
      .from('blocks') as any)
      .insert({
        type,
        data: blockData,
        paragraph_id: paragraph_id || null,
        assignment_id: assignment_id || null,
        position: maxPosition,
        locked: locked || false,
        show_feedback: show_feedback || false,
        ai_grading_override: ai_grading_override || null,
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 })
    }

    return NextResponse.json(block)
  } catch (error) {
    console.error('Error creating block:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
