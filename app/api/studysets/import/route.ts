import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { verifyStudysetShareToken } from '@/lib/studysets/share-token';
import { deriveStudysetRuntimeStatus } from '@/lib/studysets/runtime';

export const dynamic = 'force-dynamic';

function toIsoLocalDate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(isoDate: string, offsetDays: number) {
  const parsed = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  parsed.setDate(parsed.getDate() + offsetDays);
  return toIsoLocalDate(parsed);
}

export async function GET(req: NextRequest) {
  try {
    const token = String(new URL(req.url).searchParams.get('token') || '').trim();
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

    const parsed = verifyStudysetShareToken(token);
    if (!parsed) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });

    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: sourceStudyset, error: sourceError } = await (supabase as any)
      .from('studysets')
      .select('id, user_id, name')
      .eq('id', parsed.studysetId)
      .eq('user_id', parsed.ownerUserId)
      .maybeSingle();
    if (sourceError) return NextResponse.json({ error: sourceError.message }, { status: 500 });
    if (!sourceStudyset) return NextResponse.json({ error: 'Shared studyset not found' }, { status: 404 });

    const { data: sourceDays } = await (supabase as any)
      .from('studyset_plan_days')
      .select('id')
      .eq('studyset_id', sourceStudyset.id);
    const dayIds = (Array.isArray(sourceDays) ? sourceDays : []).map((row: any) => String(row.id)).filter(Boolean);
    let taskCount = 0;
    if (dayIds.length > 0) {
      const { data: tasks } = await (supabase as any)
        .from('studyset_plan_tasks')
        .select('id')
        .in('studyset_day_id', dayIds);
      taskCount = (Array.isArray(tasks) ? tasks : []).length;
    }

    return NextResponse.json({
      preview: {
        name: String(sourceStudyset.name || 'Shared studyset'),
        day_count: dayIds.length,
        task_count: taskCount,
      },
    });
  } catch (error) {
    console.error('studyset import GET failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const cookieStore = cookies();
    const supabase = await createClient(cookieStore);
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const token = String(body?.token || '').trim();
    if (!token) return NextResponse.json({ error: 'Missing token' }, { status: 400 });

    const parsed = verifyStudysetShareToken(token);
    if (!parsed) return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 });

    const { data: sourceStudyset, error: sourceError } = await (supabase as any)
      .from('studysets')
      .select('id, user_id, name, confidence_level, target_days, minutes_per_day, source_bundle')
      .eq('id', parsed.studysetId)
      .eq('user_id', parsed.ownerUserId)
      .maybeSingle();

    if (sourceError) return NextResponse.json({ error: sourceError.message }, { status: 500 });
    if (!sourceStudyset) return NextResponse.json({ error: 'Shared studyset not found' }, { status: 404 });

    let importedSourceBundle = sourceStudyset.source_bundle || null;
    try {
      const sourceBundleParsed = sourceStudyset.source_bundle ? JSON.parse(sourceStudyset.source_bundle) : {};
      const runtime =
        sourceBundleParsed?.runtime && typeof sourceBundleParsed.runtime === 'object'
          ? sourceBundleParsed.runtime
          : {};
      importedSourceBundle = JSON.stringify({
        ...sourceBundleParsed,
        runtime: {
          ...runtime,
          imported_from: {
            owner_user_id: parsed.ownerUserId,
            source_studyset_id: sourceStudyset.id,
            imported_at: new Date().toISOString(),
          },
        },
      });
    } catch {
      importedSourceBundle = sourceStudyset.source_bundle || null;
    }

    const { data: createdStudyset, error: createError } = await (supabase as any)
      .from('studysets')
      .insert({
        user_id: user.id,
        class_id: null,
        name: `${sourceStudyset.name} (Imported)`,
        confidence_level: sourceStudyset.confidence_level || 'beginner',
        target_days: Number(sourceStudyset.target_days || 1),
        minutes_per_day: Number(sourceStudyset.minutes_per_day || 45),
        status: 'draft',
        source_bundle: importedSourceBundle,
      })
      .select('id')
      .single();

    if (createError || !createdStudyset) {
      return NextResponse.json({ error: createError?.message || 'Could not import studyset' }, { status: 500 });
    }

    const { data: sourceDays, error: daysError } = await (supabase as any)
      .from('studyset_plan_days')
      .select(`
        id,
        day_number,
        plan_date,
        summary,
        estimated_minutes,
        completed,
        studyset_plan_tasks (
          id,
          task_type,
          title,
          description,
          estimated_minutes,
          position,
          completed
        )
      `)
      .eq('studyset_id', sourceStudyset.id)
      .order('day_number', { ascending: true });

    if (daysError) return NextResponse.json({ error: daysError.message }, { status: 500 });

    const todayIsoForStatus = toIsoLocalDate(new Date());
    const sourceDayDates = (Array.isArray(sourceDays) ? sourceDays : [])
      .map((day: any) => String(day?.plan_date || '').slice(0, 10))
      .filter((date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date))
      .sort();
    const earliestSourceDate = sourceDayDates[0] || null;
    let dayOffset = 0;
    if (earliestSourceDate && earliestSourceDate < todayIso) {
      const earliest = new Date(`${earliestSourceDate}T00:00:00`);
      const today = new Date(`${todayIso}T00:00:00`);
      dayOffset = Math.round((today.getTime() - earliest.getTime()) / (24 * 60 * 60 * 1000));
    }

    const dayIdMap = new Map<string, string>();
    for (const sourceDay of Array.isArray(sourceDays) ? sourceDays : []) {
      const sourcePlanDate = String(sourceDay?.plan_date || '').slice(0, 10);
      const shiftedPlanDate =
        sourcePlanDate && /^\d{4}-\d{2}-\d{2}$/.test(sourcePlanDate)
          ? addDays(sourcePlanDate, dayOffset)
          : null;
      const { data: createdDay, error: createDayError } = await (supabase as any)
        .from('studyset_plan_days')
        .insert({
          studyset_id: createdStudyset.id,
          day_number: Number(sourceDay.day_number || 1),
          plan_date: shiftedPlanDate,
          summary: sourceDay.summary || null,
          estimated_minutes: Number(sourceDay.estimated_minutes || 0),
          completed: false,
        })
        .select('id')
        .single();
      if (createDayError || !createdDay) {
        return NextResponse.json({ error: createDayError?.message || 'Could not import studyset days' }, { status: 500 });
      }
      dayIdMap.set(String(sourceDay.id), String(createdDay.id));
    }

    const taskRows: any[] = [];
    for (const sourceDay of Array.isArray(sourceDays) ? sourceDays : []) {
      const mappedDayId = dayIdMap.get(String(sourceDay.id));
      if (!mappedDayId) continue;
      const tasks = Array.isArray(sourceDay.studyset_plan_tasks) ? sourceDay.studyset_plan_tasks : [];
      for (const task of tasks) {
        taskRows.push({
          studyset_day_id: mappedDayId,
          task_type: String(task.task_type || 'notes'),
          title: String(task.title || 'Task'),
          description: task.description ? String(task.description) : null,
          estimated_minutes: Number(task.estimated_minutes || 10),
          position: Number(task.position || 0),
          completed: false,
        });
      }
    }

    if (taskRows.length > 0) {
      const { error: tasksError } = await (supabase as any)
        .from('studyset_plan_tasks')
        .insert(taskRows);
      if (tasksError) {
        return NextResponse.json({ error: tasksError.message }, { status: 500 });
      }
    }

    const { data: importedDays } = await (supabase as any)
      .from('studyset_plan_days')
      .select(`
        id,
        plan_date,
        studyset_plan_tasks (
          id,
          completed
        )
      `)
      .eq('studyset_id', createdStudyset.id);

    const todayIso = toIsoLocalDate(new Date());
    let totalTasks = 0;
    let completedTasks = 0;
    let hasOverduePendingTasks = false;
    for (const day of Array.isArray(importedDays) ? importedDays : []) {
      const planDate = String(day?.plan_date || '').slice(0, 10);
      for (const task of Array.isArray(day?.studyset_plan_tasks) ? day.studyset_plan_tasks : []) {
        totalTasks += 1;
        if (task?.completed === true) completedTasks += 1;
        else if (planDate && planDate < todayIsoForStatus) hasOverduePendingTasks = true;
      }
    }

    const runtimeStatus = deriveStudysetRuntimeStatus({
      currentStatus: 'draft',
      totalTasks,
      completedTasks,
      hasOverduePendingTasks,
    });
    await (supabase as any)
      .from('studysets')
      .update({
        status: runtimeStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', createdStudyset.id)
      .eq('user_id', user.id);

    return NextResponse.json({ success: true, studysetId: createdStudyset.id });
  } catch (error) {
    console.error('studyset import POST failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
