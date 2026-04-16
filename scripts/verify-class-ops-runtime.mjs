import { execSync } from 'node:child_process';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const PROJECT_REF = 'lrcaoisrfragkvmofeyg';
const BASE_URL = 'http://127.0.0.1:9003';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const VERIFY_PASSWORD = 'RuntimeVerify!123';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const logStep = (label) => console.log(`[verify] ${label}`);

function run(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function getApiKeys() {
  const raw = run(`npx supabase projects api-keys --project-ref ${PROJECT_REF} --output json`);
  const rows = JSON.parse(raw);
  const anon = rows.find((row) => row.id === 'anon')?.api_key;
  const service = rows.find((row) => row.id === 'service_role')?.api_key;
  if (!anon || !service) {
    throw new Error('Could not resolve anon/service_role API keys from Supabase CLI');
  }
  return { anon, service };
}

async function waitForServer(url, timeoutMs = 180000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    try {
      const response = await fetch(url, { redirect: 'manual' });
      if (response.status < 500) return;
    } catch {
      // keep waiting
    }
    await delay(1000);
  }
  throw new Error(`Timed out waiting for dev server at ${url}`);
}

function buildCookieHeader(projectRef, session) {
  const cookieName = `sb-${projectRef}-auth-token`;
  const encoded = Buffer.from(JSON.stringify(session)).toString('base64');
  return `${cookieName}=base64-${encoded}`;
}

async function main() {
  logStep('Resolving Supabase keys');
  const { anon, service } = getApiKeys();
  const admin = createClient(SUPABASE_URL, service, { auth: { autoRefreshToken: false, persistSession: false } });
  const anonClient = createClient(SUPABASE_URL, anon, { auth: { autoRefreshToken: false, persistSession: false } });

  const now = Date.now();
  const suffix = `${now}-${Math.random().toString(36).slice(2, 8)}`;
  const teacherEmail = `runtime-teacher-${suffix}@example.com`;
  const studentAEmail = `runtime-student-a-${suffix}@example.com`;
  const studentBEmail = `runtime-student-b-${suffix}@example.com`;

  const createdUserIds = [];
  let createdClassId = null;
  let server = null;

  try {
    logStep('Creating disposable teacher/student users');
    const createAuthUser = async (email, displayName, subscriptionType) => {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: VERIFY_PASSWORD,
        email_confirm: true,
        user_metadata: { display_name: displayName },
      });
      if (error || !data?.user?.id) {
        throw new Error(`Failed creating auth user ${email}: ${error?.message || 'unknown error'}`);
      }
      createdUserIds.push(data.user.id);
      const { error: profileError } = await admin.from('profiles').upsert(
        {
          id: data.user.id,
          email,
          display_name: displayName,
          full_name: displayName,
          subscription_type: subscriptionType,
        },
        { onConflict: 'id' }
      );
      if (profileError) {
        throw new Error(`Failed upserting profile for ${email}: ${profileError.message}`);
      }
      return { id: data.user.id, email, displayName };
    };

    const teacher = await createAuthUser(teacherEmail, 'Runtime Teacher', 'teacher');
    const studentA = await createAuthUser(studentAEmail, 'Runtime Student A', 'student');
    const studentB = await createAuthUser(studentBEmail, 'Runtime Student B', 'student');

    const { data: insertedClass, error: classError } = await admin
      .from('classes')
      .insert({
        name: `Runtime Verify ${suffix}`,
        description: 'Disposable runtime verification class',
        user_id: teacher.id,
        owner_type: 'user',
      })
      .select('id,name')
      .single();
    if (classError || !insertedClass?.id) {
      throw new Error(`Failed creating class: ${classError?.message || 'unknown error'}`);
    }
    createdClassId = insertedClass.id;
    logStep(`Created disposable class ${createdClassId}`);

    const { error: memberError } = await admin.from('class_members').insert([
      { class_id: createdClassId, user_id: teacher.id, role: 'teacher' },
      { class_id: createdClassId, user_id: studentA.id, role: 'student' },
      { class_id: createdClassId, user_id: studentB.id, role: 'student' },
    ]);
    if (memberError) {
      throw new Error(`Failed inserting class members: ${memberError.message}`);
    }
    logStep('Inserted class members');

    logStep('Starting local dev server');
    server = spawn('npm', ['run', 'dev'], {
      cwd: process.cwd(),
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: SUPABASE_URL,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
        SUPABASE_SERVICE_ROLE_KEY: service,
      },
    });

    await waitForServer(`${BASE_URL}/login`);
    logStep('Dev server is reachable');

    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email: teacherEmail,
      password: VERIFY_PASSWORD,
    });
    if (signInError || !signInData?.session) {
      throw new Error(`Teacher sign-in failed: ${signInError?.message || 'no session returned'}`);
    }
    logStep('Teacher sign-in succeeded');
    const cookieHeader = buildCookieHeader(PROJECT_REF, signInData.session);

    const api = async (path, init = {}) => {
      const headers = {
        cookie: cookieHeader,
        ...(init.body ? { 'content-type': 'application/json' } : {}),
        ...(init.headers || {}),
      };
      const response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
      const text = await response.text();
      let json = null;
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
      return { status: response.status, json, text };
    };

    const attendanceInitial = await api(`/api/classes/${createdClassId}/attendance`);
    if (attendanceInitial.status !== 200) {
      throw new Error(`Initial attendance GET failed: ${attendanceInitial.status} ${attendanceInitial.text}`);
    }

    const studentIds = (attendanceInitial.json?.students || []).map((row) => row.id);
    if (studentIds.length !== 2 || studentIds.includes(teacher.id)) {
      throw new Error(`Attendance GET did not return students-only roster. Received IDs: ${JSON.stringify(studentIds)}`);
    }
    logStep('Verified attendance students-only roster');

    const actionSpecs = [
      {
        label: 'Present',
        payload: { studentId: studentA.id, isPresent: true, hasHomeworkIncomplete: false, wasTooLate: false, customMessage: '' },
        expectedCodes: ['EVT-ATT-001'],
      },
      {
        label: 'Absent',
        payload: { studentId: studentA.id, isPresent: false, hasHomeworkIncomplete: false, wasTooLate: false, customMessage: '' },
        expectedCodes: ['EVT-ATT-001'],
      },
      {
        label: 'Homework',
        payload: { studentId: studentA.id, isPresent: true, hasHomeworkIncomplete: true, wasTooLate: false, customMessage: '' },
        expectedCodes: ['EVT-ATT-001', 'EVT-ATT-002'],
      },
      {
        label: 'Late',
        payload: { studentId: studentA.id, isPresent: true, hasHomeworkIncomplete: false, wasTooLate: true, customMessage: '' },
        expectedCodes: ['EVT-ATT-001', 'EVT-ATT-003'],
      },
      {
        label: 'Custom event',
        payload: { studentId: studentA.id, isPresent: true, hasHomeworkIncomplete: false, wasTooLate: false, customMessage: 'Custom runtime event' },
        expectedCodes: ['EVT-ATT-001', 'EVT-CUS-001'],
      },
    ];

    const actionEvidence = [];
    for (const spec of actionSpecs) {
      logStep(`Executing attendance action: ${spec.label}`);
      const postResult = await api(`/api/classes/${createdClassId}/attendance`, {
        method: 'POST',
        body: JSON.stringify(spec.payload),
      });
      if (postResult.status !== 200) {
        throw new Error(`Attendance POST failed for ${spec.label}: ${postResult.status} ${postResult.text}`);
      }
      const attendanceId = postResult.json?.attendance?.id;
      if (!attendanceId) {
        throw new Error(`Attendance POST response missing attendance.id for ${spec.label}`);
      }

      const { data: attendanceRows, error: attendanceRowsError } = await admin
        .from('student_attendance')
        .select('id,student_id,class_id,is_present,has_homework_incomplete,was_too_late,created_by,created_at')
        .eq('id', attendanceId)
        .limit(1);
      if (attendanceRowsError || !attendanceRows?.[0]) {
        throw new Error(`No attendance row found for ${spec.label}: ${attendanceRowsError?.message || 'missing row'}`);
      }
      const attendanceRow = attendanceRows[0];

      const { data: recentAuditRows, error: auditError } = await admin
        .from('audit_logs')
        .select('id,action,metadata,created_at,user_id')
        .eq('class_id', createdClassId)
        .eq('entity_id', attendanceId)
        .order('created_at', { ascending: false })
        .limit(30);
      if (auditError) {
        throw new Error(`Audit log query failed for ${spec.label}: ${auditError.message}`);
      }
      const relevantLogs = (recentAuditRows || []).filter(
        (row) => String(row?.metadata?.student_id || '') === spec.payload.studentId
      );
      const foundCodes = Array.from(
        new Set(
          relevantLogs
            .map((row) => String(row?.metadata?.log_code || '').trim())
            .filter(Boolean)
        )
      );
      const missingCodes = spec.expectedCodes.filter((code) => !foundCodes.includes(code));
      if (missingCodes.length > 0) {
        throw new Error(`Missing expected log code(s) for ${spec.label}: ${missingCodes.join(', ')}`);
      }

      actionEvidence.push({
        action: spec.label,
        api_status: postResult.status,
        attendance_row: attendanceRow,
        audit_rows: relevantLogs.map((log) => ({
          id: log.id,
          action: log.action,
          log_code: log?.metadata?.log_code || null,
          log_category: log?.metadata?.log_category || null,
          student_id: log?.metadata?.student_id || null,
          created_at: log.created_at,
        })),
      });
    }

    const renameTo = 'Runtime Alias Student';
    logStep('Executing class-scoped rename');
    const renameResult = await api(`/api/classes/${createdClassId}/members`, {
      method: 'PATCH',
      body: JSON.stringify({
        user_id: studentA.id,
        display_name: renameTo,
      }),
    });
    if (renameResult.status !== 200) {
      throw new Error(`Rename PATCH failed: ${renameResult.status} ${renameResult.text}`);
    }

    const { data: renamedMemberRows, error: renamedMemberError } = await admin
      .from('class_members')
      .select('class_id,user_id,display_name,role')
      .eq('class_id', createdClassId)
      .eq('user_id', studentA.id)
      .limit(1);
    if (renamedMemberError || !renamedMemberRows?.[0]) {
      throw new Error(`Could not confirm renamed class member row: ${renamedMemberError?.message || 'missing row'}`);
    }
    const renamedMember = renamedMemberRows[0];

    const { data: renameAuditRows, error: renameAuditError } = await admin
      .from('audit_logs')
      .select('id,action,metadata,created_at')
      .eq('class_id', createdClassId)
      .eq('action', 'member_rename')
      .eq('entity_id', studentA.id)
      .order('created_at', { ascending: false })
      .limit(20);
    if (renameAuditError) {
      throw new Error(`Failed querying rename audit rows: ${renameAuditError.message}`);
    }
    const renameAudit = (renameAuditRows || []).find(
      (row) => row?.action === 'member_rename' && row?.metadata?.log_code === 'ROS-MEM-001'
    );
    if (!renameAudit) {
      throw new Error('Rename audit row with ROS-MEM-001 not found');
    }

    const groupAfterRename = await api(`/api/classes/${createdClassId}/group`);
    const attendanceAfterRename = await api(`/api/classes/${createdClassId}/attendance`);
    const logsAfterRename = await api(`/api/classes/${createdClassId}/audit-logs?student_id=${studentA.id}&limit=50`);
    const eventsFilter = await api(`/api/classes/${createdClassId}/audit-logs?category=events&student_id=${studentA.id}&limit=50`);
    const codeFilter = await api(`/api/classes/${createdClassId}/audit-logs?code=ROS-MEM-001&student_id=${studentA.id}&limit=50`);

    if (groupAfterRename.status !== 200 || attendanceAfterRename.status !== 200 || logsAfterRename.status !== 200) {
      throw new Error('Post-rename GET verification failed');
    }

    const groupStudentName = (groupAfterRename.json?.students || []).find((row) => row.id === studentA.id)?.name || null;
    const attendanceStudentName = (attendanceAfterRename.json?.students || []).find((row) => row.id === studentA.id)?.name || null;
    const logsHaveAlias = (logsAfterRename.json?.logs || []).some((row) => row?.metadata_user_labels?.student_id === renameTo);

    if (groupStudentName !== renameTo || attendanceStudentName !== renameTo || !logsHaveAlias) {
      throw new Error(
        `Alias propagation failed. group=${groupStudentName}, attendance=${attendanceStudentName}, logsAlias=${logsHaveAlias}`
      );
    }
    logStep('Verified alias propagation across Group/Attendance/Logs');

    const eventsAreFiltered = (eventsFilter.json?.logs || []).every((row) => row.log_category === 'events');
    const codeIsFiltered = (codeFilter.json?.logs || []).every((row) => row.log_code === 'ROS-MEM-001');

    const report = {
      class_id: createdClassId,
      teacher_id: teacher.id,
      student_ids: [studentA.id, studentB.id],
      attendance_get_students_only: {
        status: attendanceInitial.status,
        total_students: attendanceInitial.json?.totalStudents || 0,
        returned_student_ids: studentIds,
        teacher_excluded: !studentIds.includes(teacher.id),
      },
      attendance_actions: actionEvidence,
      rename: {
        api_status: renameResult.status,
        class_member_row: renamedMember,
        rename_audit: {
          id: renameAudit.id,
          action: renameAudit.action,
          log_code: renameAudit.metadata?.log_code || null,
          log_category: renameAudit.metadata?.log_category || null,
          student_id: renameAudit.metadata?.student_id || null,
          created_at: renameAudit.created_at,
        },
        propagated_names: {
          group: groupStudentName,
          attendance: attendanceStudentName,
          logs_alias_visible: logsHaveAlias,
        },
      },
      logs_filters: {
        category_events_status: eventsFilter.status,
        category_events_all_events: eventsAreFiltered,
        code_filter_status: codeFilter.status,
        code_filter_all_ros_mem_001: codeIsFiltered,
      },
      finished_at: new Date().toISOString(),
    };

    console.log('\n===== RUNTIME VERIFICATION REPORT =====');
    console.log(JSON.stringify(report, null, 2));
    console.log('===== END REPORT =====\n');
  } finally {
    if (server) {
      try {
        run(`taskkill /PID ${server.pid} /T /F`);
      } catch {
        server.kill();
      }
    }

    logStep('Cleaning up disposable runtime data');
    if (createdClassId) {
      await admin.from('class_members').delete().eq('class_id', createdClassId);
      await admin.from('audit_logs').delete().eq('class_id', createdClassId);
      await admin.from('student_attendance').delete().eq('class_id', createdClassId);
      await admin.from('classes').delete().eq('id', createdClassId);
    }

    for (const userId of createdUserIds) {
      try {
        await admin.auth.admin.deleteUser(userId);
      } catch {
        // cleanup best-effort
      }
    }
  }
}

main().catch((error) => {
  console.error('Runtime verification failed:', error);
  process.exitCode = 1;
});
