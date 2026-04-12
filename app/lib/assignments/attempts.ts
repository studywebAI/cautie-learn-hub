import { AssignmentSettings } from '@/lib/assignments/settings';

type AttemptClientMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
};

export async function getOrCreateAttempt(
  supabase: any,
  assignmentId: string,
  userId: string,
  settings: AssignmentSettings,
  clientMeta?: AttemptClientMeta,
) {
  const nowIso = new Date().toISOString();

  const { data: existingOpen } = await supabase
    .from('assignment_attempts')
    .select('*')
    .eq('assignment_id', assignmentId)
    .eq('student_id', userId)
    .in('status', ['in_progress'])
    .order('attempt_no', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingOpen) {
    if (settings.antiCheat.restrictIpOrDevice) {
      if (
        (existingOpen.ip_address && clientMeta?.ipAddress && existingOpen.ip_address !== clientMeta.ipAddress) ||
        (existingOpen.user_agent && clientMeta?.userAgent && existingOpen.user_agent !== clientMeta.userAgent)
      ) {
        return { blocked: true as const, reason: 'device_or_ip_mismatch' };
      }
    }
    return existingOpen;
  }

  const { data: allAttempts } = await supabase
    .from('assignment_attempts')
    .select('*')
    .eq('assignment_id', assignmentId)
    .eq('student_id', userId)
    .order('attempt_no', { ascending: true });

  const attempts = allAttempts || [];
  const maxAttempts = settings.attempts.maxAttempts;
  if (maxAttempts !== null && maxAttempts > 0 && attempts.length >= maxAttempts) {
    return { blocked: true as const, reason: 'max_attempts_reached', attempts };
  }

  const latest = attempts.length > 0 ? attempts[attempts.length - 1] : null;
  if (latest && settings.attempts.cooldownMinutes > 0 && latest.submitted_at) {
    const nextAllowedTs = new Date(latest.submitted_at).getTime() + settings.attempts.cooldownMinutes * 60_000;
    if (Date.now() < nextAllowedTs) {
      return {
        blocked: true as const,
        reason: 'cooldown_active',
        nextAllowedAt: new Date(nextAllowedTs).toISOString(),
      };
    }
  }

  const nextNo = (attempts[attempts.length - 1]?.attempt_no || 0) + 1;
  const dueAt = settings.time.durationMinutes && settings.time.durationMinutes > 0
    ? new Date(Date.now() + settings.time.durationMinutes * 60_000).toISOString()
    : null;

  const { data: created, error: createError } = await supabase
    .from('assignment_attempts')
    .insert({
      assignment_id: assignmentId,
      student_id: userId,
      attempt_no: nextNo,
      status: 'in_progress',
      started_at: nowIso,
      due_at: dueAt,
      ip_address: clientMeta?.ipAddress ?? null,
      user_agent: clientMeta?.userAgent ?? null,
      settings_snapshot: settings,
    })
    .select('*')
    .single();

  if (createError) {
    throw createError;
  }

  return created;
}

export async function markAttemptSubmitted(supabase: any, attemptId: string, score: number, maxScore: number) {
  const nowIso = new Date().toISOString();
  const status = 'submitted';
  const { data, error } = await supabase
    .from('assignment_attempts')
    .update({
      submitted_at: nowIso,
      status,
      score,
      max_score: maxScore,
    })
    .eq('id', attemptId)
    .select('*')
    .single();

  if (error) throw error;
  return data;
}

export async function isAttemptExpired(attempt: any): Promise<boolean> {
  if (!attempt?.due_at) return false;
  const due = new Date(attempt.due_at).getTime();
  if (!Number.isFinite(due)) return false;
  return Date.now() > due;
}
