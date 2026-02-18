import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse, NextRequest } from 'next/server'

import type { Database } from '@/lib/supabase/database.types'
import { logAuditEntry } from '@/lib/auth/class-permissions'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

// Validation schema for invite request
const inviteSchema = z.object({
  studentEmails: z.array(z.string().email()).optional(),
  teacherEmails: z.array(z.string().email()).optional(),
  scheduledTime: z.string().optional(),
})

// POST - Send invites to students/teachers by email
export async function POST(request: NextRequest, { params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  
  // Parse and validate request body
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const validation = inviteSchema.safeParse(body)
  if (!validation.success) {
    return NextResponse.json({ error: 'Invalid request data', details: validation.error.errors }, { status: 400 })
  }

  const { studentEmails, teacherEmails, scheduledTime } = validation.data

  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get class info to verify ownership
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('id, name, join_code, teacher_join_code, owner_id')
    .eq('id', classId)
    .single()

  if (classError || !classData) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 })
  }

  // Check if user is owner or teacher
  const { data: memberData } = await supabase
    .from('class_members')
    .select('role')
    .eq('class_id', classId)
    .eq('user_id', user.id)
    .single()

  const isOwner = classData.owner_id === user.id
  const isTeacher = memberData?.role === 'teacher'

  if (!isOwner && !isTeacher) {
    return NextResponse.json({ error: 'Only class owners and teachers can send invites' }, { status: 403 })
  }

  // Get user profile for notifications
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single()

  const inviterName = profile?.full_name || 'A teacher'

  // Results tracking
  const results = {
    students: { invited: [] as string[], failed: [] as string[] },
    teachers: { invited: [] as string[], failed: [] as string[] },
    scheduled: !!scheduledTime,
  }

  // Process student invites
  if (studentEmails && studentEmails.length > 0) {
    for (const email of studentEmails) {
      try {
        // Create a notification for the invite (in real app, would send email)
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: user.id, // Send to inviter for now
            type: 'class_invite',
            title: 'Class Invitation Sent',
            message: `Invitation sent to ${email} for class "${classData.name}"`,
            data: {
              classId: classData.id,
              className: classData.name,
              joinCode: classData.join_code,
              inviteeEmail: email,
              role: 'student',
              scheduledTime,
              inviterName,
            },
          })

        if (notifError) {
          console.error('Failed to create notification:', notifError)
          results.students.failed.push(email)
        } else {
          results.students.invited.push(email)
        }
      } catch (err) {
        console.error('Error inviting student:', err)
        results.students.failed.push(email)
      }
    }
  }

  // Process teacher invites
  if (teacherEmails && teacherEmails.length > 0) {
    for (const email of teacherEmails) {
      try {
        // Teachers can only be invited by owners
        if (!isOwner) {
          results.teachers.failed.push(email)
          continue
        }

        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: user.id,
            type: 'class_invite',
            title: 'Teacher Invitation Sent',
            message: `Invitation sent to ${email} for class "${classData.name}"`,
            data: {
              classId: classData.id,
              className: classData.name,
              joinCode: classData.teacher_join_code,
              inviteeEmail: email,
              role: 'teacher',
              scheduledTime,
              inviterName,
            },
          })

        if (notifError) {
          console.error('Failed to create notification:', notifError)
          results.teachers.failed.push(email)
        } else {
          results.teachers.invited.push(email)
        }
      } catch (err) {
        console.error('Error inviting teacher:', err)
        results.teachers.failed.push(email)
      }
    }
  }

  // Log audit entry
  await logAuditEntry(supabase, {
    userId: user.id,
    classId: classData.id,
    action: 'invite',
    entityType: 'member',
    metadata: {
      studentInvites: results.students.invited,
      teacherInvites: results.teachers.invited,
      scheduledTime,
    },
  })

  // Return results
  const totalInvited = results.students.invited.length + results.teachers.invited.length
  const totalFailed = results.students.failed.length + results.teachers.failed.length

  if (totalInvited === 0 && totalFailed > 0) {
    return NextResponse.json({
      message: 'Failed to send invites',
      results,
    }, { status: 400 })
  }

  if (scheduledTime) {
    return NextResponse.json({
      message: `Invites scheduled for ${new Date(scheduledTime).toLocaleString()}`,
      results,
    })
  }

  return NextResponse.json({
    message: `Successfully sent ${totalInvited} invite${totalInvited !== 1 ? 's' : ''}`,
    results,
  })
}

// GET - Get class invite info
export async function GET(request: NextRequest, { params }: { params: Promise<{ classId: string }> }) {
  const { classId } = await params;
  
  const cookieStore = cookies()
  const supabase = await createClient(cookieStore)

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Get class info
  const { data: classData, error: classError } = await supabase
    .from('classes')
    .select('id, name, join_code, teacher_join_code, owner_id')
    .eq('id', classId)
    .single()

  if (classError || !classData) {
    return NextResponse.json({ error: 'Class not found' }, { status: 404 })
  }

  // Check if user is owner or member
  const isOwner = classData.owner_id === user.id
  const { data: memberData } = await supabase
    .from('class_members')
    .select('role')
    .eq('class_id', classId)
    .eq('user_id', user.id)
    .single()

  const isMember = !!memberData

  // Only owners and members can view invite info
  if (!isOwner && !isMember) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }

  // Get invite statistics
  const { count: studentCount } = await supabase
    .from('class_members')
    .select('*', { count: 'exact', head: true })
    .eq('class_id', classId)
    .eq('role', 'student')

  const { count: teacherCount } = await supabase
    .from('class_members')
    .select('*', { count: 'exact', head: true })
    .eq('class_id', classId)
    .eq('role', 'teacher')

  return NextResponse.json({
    classId: classData.id,
    className: classData.name,
    joinCode: classData.join_code,
    teacherJoinCode: isOwner || memberData?.role === 'teacher' ? classData.teacher_join_code : null,
    memberCount: {
      students: studentCount || 0,
      teachers: teacherCount || 0,
    },
    canInviteTeachers: isOwner,
  })
}
