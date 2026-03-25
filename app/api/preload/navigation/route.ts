import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || `preload-nav-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  try {
    const startedAt = Date.now()
    console.info('[preload-navigation] start', {
      requestId,
      path: request.nextUrl.pathname,
      classId: request.nextUrl.searchParams.get('classId') || null,
    })
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    if (!user) {
      console.warn('[preload-navigation] unauthorized', { requestId })
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const classIdFilter = request.nextUrl.searchParams.get('classId') || ''

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_type')
      .eq('id', user.id)
      .maybeSingle()

    const isTeacher = (profile?.subscription_type || 'student') === 'teacher'

    const { data: memberships, error: membershipsError } = await supabase
      .from('class_members')
      .select('class_id')
      .eq('user_id', user.id)

    if (membershipsError) {
      console.error('[preload-navigation] memberships failed', { requestId, message: membershipsError.message })
      return NextResponse.json({ error: membershipsError.message }, { status: 500 })
    }

    const classIds = Array.from(new Set((memberships || []).map((m: any) => m.class_id).filter(Boolean)))

    const classesResult =
      classIds.length > 0
        ? await supabase.from('classes').select('*').in('id', classIds).order('created_at', { ascending: false })
        : { data: [], error: null as any }

    if (classesResult.error) {
      console.error('[preload-navigation] classes failed', { requestId, message: classesResult.error.message })
      return NextResponse.json({ error: classesResult.error.message }, { status: 500 })
    }

    let subjects: any[] = []
    if (isTeacher) {
      const ownSubjectsQuery = (supabase as any)
        .from('subjects')
        .select('id')
        .eq('user_id', user.id)

      const ownSubjectsResult = classIdFilter
        ? await ownSubjectsQuery.eq('class_id', classIdFilter)
        : await ownSubjectsQuery

      if (ownSubjectsResult.error) {
        console.error('[preload-navigation] own subjects failed', { requestId, message: ownSubjectsResult.error.message })
        return NextResponse.json({ error: ownSubjectsResult.error.message }, { status: 500 })
      }

      let taughtSubjectIds: string[] = []
      try {
        const taughtLinksResult = await (supabase as any)
          .from('subject_teachers')
          .select('subject_id')
          .eq('teacher_id', user.id)

        if (!taughtLinksResult.error) {
          taughtSubjectIds = Array.from(
            new Set((taughtLinksResult.data || []).map((row: any) => row.subject_id).filter(Boolean))
          )
        }
      } catch {
        taughtSubjectIds = []
      }

      const ownSubjectIds = (ownSubjectsResult.data || []).map((row: any) => row.id).filter(Boolean)
      const mergedSubjectIds = Array.from(new Set([...ownSubjectIds, ...taughtSubjectIds]))

      if (mergedSubjectIds.length > 0) {
        let subjectsQuery = (supabase as any)
          .from('subjects')
          .select('id, title, description, cover_type, cover_image_url, class_id, class_subjects(classes:class_id(id, name))')
          .in('id', mergedSubjectIds)
          .order('created_at', { ascending: false })

        if (classIdFilter) {
          subjectsQuery = subjectsQuery.eq('class_id', classIdFilter)
        }

        const subjectsResult = await subjectsQuery
        if (subjectsResult.error) {
          console.error('[preload-navigation] teacher subjects query failed; returning empty subjects fallback', {
            requestId,
            message: subjectsResult.error.message,
          })
          subjects = []
        } else {
          subjects = (subjectsResult.data || []).map((s: any) => ({
            ...s,
            classes: Array.isArray(s.class_subjects)
              ? s.class_subjects.map((cs: any) => cs.classes).filter(Boolean)
              : [],
          }))
        }
      } else {
        subjects = []
      }
    } else {
      if (classIds.length > 0) {
        const [classSubjectsResult, directSubjectsResult] = await Promise.all([
          (supabase as any).from('class_subjects').select('subject_id').in('class_id', classIds),
          (supabase as any).from('subjects').select('id').in('class_id', classIds),
        ])

        if (classSubjectsResult.error) {
          console.error('[preload-navigation] class_subjects failed', { requestId, message: classSubjectsResult.error.message })
          return NextResponse.json({ error: classSubjectsResult.error.message }, { status: 500 })
        }
        if (directSubjectsResult.error) {
          console.error('[preload-navigation] direct subjects failed', { requestId, message: directSubjectsResult.error.message })
          return NextResponse.json({ error: directSubjectsResult.error.message }, { status: 500 })
        }

        const subjectIds = Array.from(
          new Set([
            ...(classSubjectsResult.data || []).map((cs: any) => cs.subject_id),
            ...(directSubjectsResult.data || []).map((s: any) => s.id),
          ])
        ).filter(Boolean)

        if (subjectIds.length > 0) {
          const subjectsResult = await (supabase as any)
            .from('subjects')
            .select('id, title, description, cover_type, cover_image_url, class_id, class_subjects(classes:class_id(id, name))')
            .in('id', subjectIds)

          if (subjectsResult.error) {
            console.error('[preload-navigation] student subjects query failed; returning empty subjects fallback', {
              requestId,
              message: subjectsResult.error.message,
            })
            subjects = []
          } else {
            subjects = (subjectsResult.data || []).map((s: any) => ({
              ...s,
              classes: Array.isArray(s.class_subjects)
                ? s.class_subjects.map((cs: any) => cs.classes).filter(Boolean)
                : [],
            }))
          }
        }
      }
    }

    console.info('[preload-navigation] success', {
      requestId,
      durationMs: Date.now() - startedAt,
      classCount: Array.isArray(classesResult.data) ? classesResult.data.length : 0,
      subjectCount: subjects.length,
      isTeacher,
    })
    return NextResponse.json(
      {
        classes: classesResult.data || [],
        subjects,
        generatedAt: new Date().toISOString(),
      },
      {
        headers: { 'x-preload-navigation-duration-ms': String(Date.now() - startedAt) },
      }
    )
  } catch (error: any) {
    console.error('[preload-navigation] exception', { requestId, message: error?.message || 'Internal server error' })
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}
