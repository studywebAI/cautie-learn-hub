import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const { action, classIds, data } = await request.json()
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)

    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!classIds || !Array.isArray(classIds) || classIds.length === 0) {
      return NextResponse.json({ error: 'classIds must be a non-empty array' }, { status: 400 })
    }

    // Verify user owns all the classes
    const { data: ownedClasses, error: ownershipCheck } = await supabase
      .from('classes')
      .select('id')
      .in('id', classIds)
      .eq('owner_id', user.id)

    if (ownershipCheck) {
      return NextResponse.json({ error: ownershipCheck.message }, { status: 500 })
    }

    if (ownedClasses?.length !== classIds.length) {
      return NextResponse.json({ error: 'Access denied: You do not own all specified classes' }, { status: 403 })
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