import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Create Supabase client with fallbacks to prevent build errors
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Only create client if we have valid credentials
const supabaseClient = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null;

export async function POST(req: Request) {
  try {
    if (!supabaseClient) {
      return NextResponse.json({
        error: 'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
      }, { status: 503 })
    }

    const json = await req.json()
    
    // Validate create request
    if (!json.type || !json.content) {
      return NextResponse.json({
        error: 'Missing required fields: type and content'
      }, { status: 400 })
    }
    
    // Create the block in Supabase
    const { data, error } = await supabaseClient.from('blocks')
      .insert([{ 
        type: json.type,
        content: json.content,
        chapter_id: json.chapterId || null,
        paragraph_id: json.paragraphId || null
      }])
      .single()
    
    if (error) {
      return NextResponse.json({
        error: `Supabase error creating block: ${error.message}`
      }, { status: 500 })
    }
    
    return NextResponse.json({
      block: data
    })
  } catch (error) {
    console.error('Error creating block:', error)
    return NextResponse.json({
      error: 'Internal server error while creating block'
    }, { status: 500 })
  }
}

export async function PUT(req: Request) {
  try {
    if (!supabaseClient) {
      return NextResponse.json({
        error: 'Supabase is not configured'
      }, { status: 503 })
    }

    const json = await req.json()
    
    // Validate update request
    if (!json.id || !json.type || !json.content) {
      return NextResponse.json({
        error: 'Missing required fields: id, type, and content'
      }, { status: 400 })
    }
    
    // Update the block in Supabase
    const { data, error } = await supabaseClient.from('blocks')
      .update({
        type: json.type,
        content: json.content
      })
      .eq('id', json.id)
      .single()
    
    if (error) {
      return NextResponse.json({
        error: `Supabase error updating block: ${error.message}`
      }, { status: 500 })
    }
    
    return NextResponse.json({
      block: data
    })
  } catch (error) {
    console.error('Error updating block:', error)
    return NextResponse.json({
      error: 'Internal server error while updating block'
    }, { status: 500 })
  }
}

export async function DELETE(req: Request) {
  try {
    if (!supabaseClient) {
      return NextResponse.json({
        error: 'Supabase is not configured'
      }, { status: 503 })
    }

    const json = await req.json()
    
    // Validate deletion request
    if (!json.id) {
      return NextResponse.json({
        error: 'Missing required field: id'
      }, { status: 400 })
    }
    
    // Delete the block from Supabase
    const { error } = await supabaseClient.from('blocks')
      .delete()
      .eq('id', json.id)
    
    if (error) {
      return NextResponse.json({
        error: `Supabase error deleting block: ${error.message}`
      }, { status: 500 })
    }
    
    return NextResponse.json({
      message: 'Block deleted successfully'
    })
  } catch (error) {
    console.error('Error deleting block:', error)
    return NextResponse.json({
      error: 'Internal server error while deleting block'
    }, { status: 500 })
  }
}