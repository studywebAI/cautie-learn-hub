import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// POST — restore an assignment to a prior version's blocks/settings.
// Snapshots the CURRENT state first (so restoring is itself undoable via
// Doc history), then deletes the current blocks and re-inserts the
// snapshot's blocks, and updates the assignment's settings/title/description
// if the snapshot captured them.
export async function POST(
  request: Request,
  { params }: { params: Promise<{ subjectId: string; chapterId: string; paragraphId: string; assignmentId: string; versionId: string }> }
) {
  try {
    const cookieStore = await cookies()
    const supabase = await createClient(cookieStore)
    const resolvedParams = await params

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: assignment } = await (supabase as any)
      .from('assignments')
      .select('id, class_id, title, description')
      .eq('id', resolvedParams.assignmentId)
      .maybeSingle()
    if (!assignment) return NextResponse.json({ error: 'Assignment not found' }, { status: 404 })

    if (assignment.class_id) {
      const { data: membership } = await supabase
        .from('class_members')
        .select('role')
        .eq('class_id', assignment.class_id)
        .eq('user_id', user.id)
        .maybeSingle()
      const role = String(membership?.role || '').toLowerCase()
      const isTeacher = role === 'teacher' || role === 'owner' || role === 'admin' || role === 'creator'
      if (!isTeacher) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: version, error: versionError } = await (supabase as any)
      .from('assignment_versions')
      .select('*')
      .eq('id', resolvedParams.versionId)
      .eq('assignment_id', resolvedParams.assignmentId)
      .maybeSingle()
    if (versionError || !version) {
      if (versionError) console.error('[versions-restore] version_lookup_error', { message: versionError.message, versionId: resolvedParams.versionId })
      return NextResponse.json({ error: 'Version not found' }, { status: 404 })
    }

    // Snapshot the pre-restore state so restoring is itself undoable.
    const { data: currentBlocks, error: currentBlocksError } = await (supabase as any)
      .from('blocks')
      .select('*')
      .eq('assignment_id', resolvedParams.assignmentId)
      .order('position', { ascending: true })
    if (currentBlocksError) {
      console.error('[versions-restore] current_blocks_fetch_error', { message: currentBlocksError.message, assignmentId: resolvedParams.assignmentId })
    }

    const { error: preRestoreSnapshotError } = await (supabase as any).from('assignment_versions').insert({
      assignment_id: resolvedParams.assignmentId,
      blocks_snapshot: currentBlocks || [],
      title_snapshot: assignment.title,
      description_snapshot: assignment.description,
      created_by: user.id,
    })
    if (preRestoreSnapshotError) {
      console.error('[versions-restore] pre_restore_snapshot_error', { message: preRestoreSnapshotError.message, assignmentId: resolvedParams.assignmentId })
      return NextResponse.json({ error: 'Failed to snapshot current state before restoring' }, { status: 500 })
    }

    // Replace current blocks with the snapshot's blocks.
    const { error: deleteError } = await (supabase as any).from('blocks').delete().eq('assignment_id', resolvedParams.assignmentId)
    if (deleteError) {
      console.error('[versions-restore] delete_current_blocks_error', { message: deleteError.message, assignmentId: resolvedParams.assignmentId })
      return NextResponse.json({ error: 'Failed to clear current blocks' }, { status: 500 })
    }

    const blocksToInsert = (version.blocks_snapshot || []).map((b: any) => ({
      assignment_id: resolvedParams.assignmentId,
      type: b.type,
      position: b.position,
      data: b.data,
      settings: b.settings || null,
      locked: b.locked || false,
      show_feedback: b.show_feedback || false,
      ai_grading_override: b.ai_grading_override || null,
      attached_to_block_id: null, // ids change on re-insert; attachments can't be reliably remapped here
    }))
    if (blocksToInsert.length > 0) {
      const { error: insertError } = await (supabase as any).from('blocks').insert(blocksToInsert)
      if (insertError) {
        console.error('[versions-restore] blocks_insert_error', { message: insertError.message, assignmentId: resolvedParams.assignmentId, blockCount: blocksToInsert.length })
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }
    }

    const assignmentUpdate: Record<string, any> = {}
    if (version.title_snapshot) assignmentUpdate.title = version.title_snapshot
    if (version.description_snapshot !== null && version.description_snapshot !== undefined) {
      assignmentUpdate.description = version.description_snapshot
    }
    if (version.settings_snapshot) assignmentUpdate.settings = version.settings_snapshot
    if (Object.keys(assignmentUpdate).length > 0) {
      const { error: assignmentUpdateError } = await (supabase as any).from('assignments').update(assignmentUpdate).eq('id', resolvedParams.assignmentId)
      if (assignmentUpdateError) {
        console.error('[versions-restore] assignment_update_error', { message: assignmentUpdateError.message, assignmentId: resolvedParams.assignmentId })
      }
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[versions-restore] unhandled_error', { message: err?.message, stack: err?.stack })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
