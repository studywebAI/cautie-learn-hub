import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

type SubjectCreateRequest = {
  title: string
  description?: string
  classId?: string | null
}

type SubjectUpdateRequest = {
  id: string
  title?: string
  description?: string
  classId?: string | null
}

type SubjectDeleteRequest = {
  id: string
}

export async function POST(req: Request) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const json = await req.json()

    // Validate create request
    if (!json.title) {
      return NextResponse.json({
        error: 'Missing required field: title'
      }, { status: 400 })
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Create the subject in Supabase
    const { data, error } = await supabase.from('subjects')
      .insert([{
        title: json.title,
        user_id: user.id,
        class_id: json.classId || null
      }])
      .single()

    if (error) {
      return NextResponse.json({
        error: `Supabase error creating subject: ${error.message}`
      }, { status: 500 })
    }

    return NextResponse.json({
      subject: data
    })
  } catch (error) {
    console.error('Error creating subject:', error)
    return NextResponse.json({
      error: 'Internal server error while creating subject'
    }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const json = await req.json()

    // Validate update request
    if (!json.id) {
      return NextResponse.json({
        error: 'Missing required field: id'
      }, { status: 400 })
    }

    // Update the subject in Supabase
    const { data, error } = await supabase.from('subjects')
      .update({
        title: json.title,
        class_id: json.classId
      })
      .eq('id', json.id)
      .single()

    if (error) {
      return NextResponse.json({
        error: `Supabase error updating subject: ${error.message}`
      }, { status: 500 })
    }

    return NextResponse.json({
      subject: data
    })
  } catch (error) {
    console.error('Error updating subject:', error)
    return NextResponse.json({
      error: 'Internal server error while updating subject'
    }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const json = await req.json()

    // Validate deletion request
    if (!json.id) {
      return NextResponse.json({
        error: 'Missing required field: id'
      }, { status: 400 })
    }

    // Delete the subject from Supabase
    const { error } = await supabase.from('subjects')
      .delete()
      .eq('id', json.id)
    
    if (error) {
      return NextResponse.json({
        error: `Supabase error deleting subject: ${error.message}`
      }, { status: 500 })
    }
    
    return NextResponse.json({
      message: 'Subject deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting subject:', error)
    return NextResponse.json({
      error: 'Internal server error while deleting subject'
    }, { status: 500 })
  }
}