import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const startedAt = Date.now()
    const cookieStore = cookies()
    const supabase = await createClient(cookieStore)
    const { data: auth } = await supabase.auth.getUser()
    const user = auth?.user
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
      return NextResponse.json({ error: membershipsError.message }, { status: 500 })
    }

    const classIds = Array.from(new Set((memberships || []).map((m: any) => m.class_id).filter(Boolean)))

    const classesResult =
      classIds.length > 0
        ? await supabase.from('classes').select('*').in('id', classIds).order('created_at', { ascending: false })
        : { data: [], error: null as any }

    if (classesResult.error) {
      return NextResponse.json({ error: classesResult.error.message }, { status: 500 })
    }

    let subjects: any[] = []
    if (isTeacher) {
      let query = (supabase as any)
        .from('subjects')
        .select('id, title, description, cover_type, cover_image_url, class_id, class_subjects(classes:class_id(id, name))')
        .or(`user_id.eq.${user.id},id.in.(SELECT subject_id FROM subject_teachers WHERE teacher_id = '${user.id}')`)
        .order('created_at', { ascending: false })

      if (classIdFilter) {
        query = query.eq('class_id', classIdFilter)
      }

      const subjectsResult = await query
      if (subjectsResult.error) {
        return NextResponse.json({ error: subjectsResult.error.message }, { status: 500 })
      }
      subjects = (subjectsResult.data || []).map((s: any) => ({
        ...s,
        classes: Array.isArray(s.class_subjects)
          ? s.class_subjects.map((cs: any) => cs.classes).filter(Boolean)
          : [],
      }))
    } else {
      if (classIds.length > 0) {
        const [classSubjectsResult, directSubjectsResult] = await Promise.all([
          (supabase as any).from('class_subjects').select('subject_id').in('class_id', classIds),
          (supabase as any).from('subjects').select('id').in('class_id', classIds),
        ])

        if (classSubjectsResult.error) {
          return NextResponse.json({ error: classSubjectsResult.error.message }, { status: 500 })
        }
        if (directSubjectsResult.error) {
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
            return NextResponse.json({ error: subjectsResult.error.message }, { status: 500 })
          }

          subjects = (subjectsResult.data || []).map((s: any) => ({
            ...s,
            classes: Array.isArray(s.class_subjects)
              ? s.class_subjects.map((cs: any) => cs.classes).filter(Boolean)
              : [],
          }))
        }
      }
    }

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
    return NextResponse.json({ error: error?.message || 'Internal server error' }, { status: 500 })
  }
}

