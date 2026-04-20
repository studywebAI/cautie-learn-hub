import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const REQUIRED_TABLES = [
  'studysets',
  'studyset_plan_days',
  'studyset_plan_tasks',
  'studyset_task_attempts',
  'studyset_mastery_topics',
  'external_account_connections',
  'external_integration_sources',
  'external_integration_ingestion_jobs',
  'tool_run_sources',
  'ai_error_logs',
];

const REQUIRED_COLUMNS: Record<string, string[]> = {
  studysets: ['id', 'user_id', 'name', 'status', 'source_bundle'],
  studyset_plan_days: ['id', 'studyset_id', 'day_number', 'plan_date', 'completed'],
  studyset_plan_tasks: ['id', 'studyset_day_id', 'task_type', 'title', 'completed'],
  studyset_task_attempts: ['id', 'studyset_id', 'studyset_task_id', 'score', 'total_items', 'correct_items'],
  studyset_mastery_topics: ['id', 'studyset_id', 'topic_key', 'weakness_score', 'mastery_score'],
  external_account_connections: ['id', 'user_id', 'provider', 'access_token_encrypted'],
  external_integration_sources: ['id', 'user_id', 'provider', 'app', 'provider_item_id', 'is_selected'],
  external_integration_ingestion_jobs: ['id', 'user_id', 'source_id', 'status', 'attempts', 'max_attempts'],
  tool_run_sources: ['id', 'run_id', 'user_id', 'provider', 'app'],
  ai_error_logs: ['id', 'run_id', 'user_id', 'provider_attempted', 'stage', 'error_message'],
};

export async function GET() {
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

    const missingTables: string[] = [];
    const missingColumns: Array<{ table: string; columns: string[] }> = [];
    const permissionIssues: Array<{ table: string; message: string }> = [];

    for (const table of REQUIRED_TABLES) {
      const expected = REQUIRED_COLUMNS[table] || [];
      const query = expected.join(',');
      const { error } = await (supabase as any)
        .from(table)
        .select(query)
        .limit(1);

      if (!error) continue;

      const message = String(error.message || '').toLowerCase();
      if (message.includes('does not exist') || message.includes('relation') && message.includes('not found')) {
        missingTables.push(table);
        continue;
      }

      if (message.includes('permission denied') || message.includes('not allowed')) {
        permissionIssues.push({ table, message: error.message || 'Permission denied' });
        continue;
      }

      const missing = expected.filter((column) => message.includes(`column "${column.toLowerCase()}"`) || message.includes(` ${column.toLowerCase()} `));
      if (missing.length > 0) missingColumns.push({ table, columns: missing });
    }

    const ok = missingTables.length === 0 && missingColumns.length === 0;
    return NextResponse.json({
      ok,
      checked_at: new Date().toISOString(),
      missing_tables: missingTables,
      missing_columns: missingColumns,
      permission_issues: permissionIssues,
    });
  } catch (error) {
    console.error('studysets runtime health GET failed', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
