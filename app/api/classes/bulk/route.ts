import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse, NextRequest } from 'next/server'
import { bulkClassesSchema, validateBody } from '@/lib/validation'

export async function POST(request: NextRequest) {
  try {
    // Validate request body
    const validation = await validateBody(request, bulkClassesSchema)
    if ('error' in validation) {
      return validation.error
    }
    const { action, class_ids: classIds, data } = validation.data
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!classIds || !Array.isArray(classIds) || classIds.length === 0) {
      return NextResponse.json({ error: 'classIds must be a non-empty array' }, { status: 400 })
    }

    // Verify user is a teacher member of all the classes
    // (owner_id column was removed - all teachers are equal via class_members)
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .single()

    const isTeacher = userProfile?.subscription_type === 'teacher'

    if (!isTeacher) {
      return NextResponse.json({ error: 'Access denied: Only teachers can perform bulk operations' }, { status: 403 })
    }

    // Check if user is a member of each class
    const { data: classMemberships, error: membershipCheck } = await supabase
      .from('class_members')
      .select('class_id')
      .in('class_id', classIds)
      .eq('user_id', user.id)

    if (membershipCheck) {
      return NextResponse.json({ error: membershipCheck.message }, { status: 500 })
    }

    const membershipClassIds = (classMemberships || []).map(m => m.class_id)
    const missingClasses = classIds.filter(id => !membershipClassIds.includes(id))
    
    if (missingClasses.length > 0) {
      return NextResponse.json({ error: 'Access denied: You are not a member of all specified classes' }, { status: 403 })
    }

    let result

    switch (action) {
      case 'archive':
        result = await supabase
          .from('classes')
          .update({ status: 'archived' })
          .in('id', classIds)
        break

      case 'unarchive':
        result = await supabase
          .from('classes')
          .update({ status: null })
          .in('id', classIds)
        break

      case 'delete':
        // First remove all class members
        await supabase
          .from('class_members')
          .delete()
          .in('class_id', classIds)

        // Then delete the classes
        result = await supabase
          .from('classes')
          .delete()
          .in('id', classIds)
        break

      case 'duplicate':
        // Get the classes to duplicate
        const { data: classesToDuplicate, error: fetchError } = await supabase
          .from('classes')
          .select('*')
          .in('id', classIds)

        if (fetchError) {
          return NextResponse.json({ error: fetchError.message }, { status: 500 })
        }

        // Generate new join codes and duplicate classes
        const duplicatedClasses = []
        for (const cls of classesToDuplicate || []) {
          let joinCode
          let existing
          do {
            joinCode = ''
            for (let i = 0; i < 6; i++) {
              joinCode += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'[Math.floor(Math.random() * 36)]
            }
            const result = await supabase
              .from('classes')
              .select('id')
              .eq('join_code', joinCode)
              .maybeSingle()
            existing = result.data
          } while (existing)

          const { data: newClass, error: insertError } = await supabase
            .from('classes')
            .insert({
              name: `${cls.name} (Copy)`,
              description: cls.description,
              owner_id: user.id,
              join_code: joinCode
            })
            .select()
            .single()

          if (insertError) {
            return NextResponse.json({ error: insertError.message }, { status: 500 })
          }

          try {
            await supabase
              .from('class_members')
              .insert({ class_id: newClass.id, user_id: user.id })
          } catch (err: any) {
            console.warn('Failed to insert class_members for duplicated class', newClass.id, err?.message || err)
          }

          duplicatedClasses.push(newClass)
        }

        result = { data: duplicatedClasses }
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    if (result?.error) {
      return NextResponse.json({ error: result.error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, affected: classIds.length })

  } catch (error) {
    console.error('Bulk operation error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
