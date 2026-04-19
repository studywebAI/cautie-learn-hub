import { execSync } from 'node:child_process';
import { spawn } from 'node:child_process';
import process from 'node:process';
import { createClient } from '@supabase/supabase-js';

const PROJECT_REF = 'lrcaoisrfragkvmofeyg';
const BASE_URL = 'http://127.0.0.1:9003';
const SUPABASE_URL = `https://${PROJECT_REF}.supabase.co`;
const VERIFY_PASSWORD = 'RuntimeVerify!123';
const UI_WAIT_TIMEOUT_MS = 120000;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const logStep = (label) => console.log(`[verify-ui] ${label}`);
const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

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

function buildCookie(projectRef, session) {
  const cookieName = `sb-${projectRef}-auth-token`;
  const encoded = Buffer.from(JSON.stringify(session)).toString('base64');
  return {
    name: cookieName,
    value: `base64-${encoded}`,
    domain: '127.0.0.1',
    path: '/',
    httpOnly: false,
    secure: false,
    sameSite: 'Lax',
  };
}

function buildCookieHeader(projectRef, session) {
  const cookieName = `sb-${projectRef}-auth-token`;
  const encoded = Buffer.from(JSON.stringify(session)).toString('base64');
  return `${cookieName}=base64-${encoded}`;
}

async function main() {
  const { chromium } = await import('playwright');
  const { anon, service } = getApiKeys();
  const admin = createClient(SUPABASE_URL, service, { auth: { autoRefreshToken: false, persistSession: false } });
  const anonClient = createClient(SUPABASE_URL, anon, { auth: { autoRefreshToken: false, persistSession: false } });

  const now = Date.now();
  const suffix = `${now}-${Math.random().toString(36).slice(2, 8)}`;
  const teacherEmail = `runtime-ui-teacher-${suffix}@example.com`;
  const studentAEmail = `runtime-ui-student-a-${suffix}@example.com`;
  const studentBEmail = `runtime-ui-student-b-${suffix}@example.com`;

  const createdUserIds = [];
  const createdEntityIds = {
    classId: null,
    subjectId: null,
    chapterId: null,
    paragraphId: null,
    assignmentId: null,
    blockId: null,
  };
  let server = null;
  let browser = null;
  let context = null;
  const serverLogTail = [];

  const pushServerLog = (chunk) => {
    const text = String(chunk || '').trim();
    if (!text) return;
    for (const line of text.split(/\r?\n/)) {
      if (!line.trim()) continue;
      serverLogTail.push(line);
      if (serverLogTail.length > 200) {
        serverLogTail.shift();
      }
    }
  };

  try {
    logStep('Creating disposable users');
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
          language: 'en',
          theme: 'light',
        },
        { onConflict: 'id' }
      );
      if (profileError) throw new Error(`Profile upsert failed for ${email}: ${profileError.message}`);
      const { error: preferenceError } = await admin.from('user_preferences').upsert(
        {
          user_id: data.user.id,
          preference_key: 'first_time_setup_final',
          preference_value: {
            mode: 'account',
            role: subscriptionType,
            language: 'en',
            theme: 'light',
            displayName,
            completedAt: new Date().toISOString(),
          },
        },
        { onConflict: 'user_id,preference_key' }
      );
      if (preferenceError) {
        throw new Error(`User preference upsert failed for ${email}: ${preferenceError.message}`);
      }
      return { id: data.user.id, email, displayName };
    };

    const teacher = await createAuthUser(teacherEmail, 'Runtime UI Teacher', 'teacher');
    const studentA = await createAuthUser(studentAEmail, 'Runtime UI Student A', 'student');
    const studentB = await createAuthUser(studentBEmail, 'Runtime UI Student B', 'student');

    logStep('Creating disposable class + hierarchy');
    const { data: insertedClass, error: classError } = await admin
      .from('classes')
      .insert({
        name: `Runtime UI Verify ${suffix}`,
        description: 'Disposable runtime verification class (UI)',
        user_id: teacher.id,
        owner_type: 'user',
      })
      .select('id')
      .single();
    if (classError || !insertedClass?.id) throw new Error(`Class create failed: ${classError?.message || 'unknown error'}`);
    createdEntityIds.classId = insertedClass.id;

    const { error: membersError } = await admin.from('class_members').insert([
      { class_id: createdEntityIds.classId, user_id: teacher.id, role: 'teacher' },
      { class_id: createdEntityIds.classId, user_id: studentA.id, role: 'student' },
      { class_id: createdEntityIds.classId, user_id: studentB.id, role: 'student' },
    ]);
    if (membersError) throw new Error(`Class members insert failed: ${membersError.message}`);

    const { data: subject, error: subjectError } = await admin
      .from('subjects')
      .insert({
        title: `Runtime Subject ${suffix}`,
        class_id: createdEntityIds.classId,
        user_id: teacher.id,
        status: 'active',
      })
      .select('id')
      .single();
    if (subjectError || !subject?.id) throw new Error(`Subject create failed: ${subjectError?.message || 'unknown error'}`);
    createdEntityIds.subjectId = subject.id;

    const { data: chapter, error: chapterError } = await admin
      .from('chapters')
      .insert({
        subject_id: createdEntityIds.subjectId,
        chapter_number: 1,
        title: `Runtime Chapter ${suffix}`,
      })
      .select('id')
      .single();
    if (chapterError || !chapter?.id) throw new Error(`Chapter create failed: ${chapterError?.message || 'unknown error'}`);
    createdEntityIds.chapterId = chapter.id;

    const { data: paragraph, error: paragraphError } = await admin
      .from('paragraphs')
      .insert({
        chapter_id: createdEntityIds.chapterId,
        paragraph_number: 1,
        title: `Runtime Paragraph ${suffix}`,
      })
      .select('id')
      .single();
    if (paragraphError || !paragraph?.id) throw new Error(`Paragraph create failed: ${paragraphError?.message || 'unknown error'}`);
    createdEntityIds.paragraphId = paragraph.id;

    const { data: assignment, error: assignmentError } = await admin
      .from('assignments')
      .insert({
        class_id: createdEntityIds.classId,
        paragraph_id: createdEntityIds.paragraphId,
        assignment_index: 0,
        title: `Runtime Assignment ${suffix}`,
        answers_enabled: true,
        is_visible: true,
        is_locked: false,
        answer_mode: 'editable',
        ai_grading_enabled: false,
        settings: {},
        user_id: teacher.id,
        owner_type: 'user',
      })
      .select('id')
      .single();
    if (assignmentError || !assignment?.id) throw new Error(`Assignment create failed: ${assignmentError?.message || 'unknown error'}`);
    createdEntityIds.assignmentId = assignment.id;

    const { data: block, error: blockError } = await admin
      .from('blocks')
      .insert({
        assignment_id: createdEntityIds.assignmentId,
        paragraph_id: createdEntityIds.paragraphId,
        chapter_id: createdEntityIds.chapterId,
        type: 'text',
        position: 0,
        data: {
          header: 'Seed Header',
          content: 'Seed body',
          style: 'normal',
        },
        settings: {},
      })
      .select('id')
      .single();
    if (blockError || !block?.id) throw new Error(`Block create failed: ${blockError?.message || 'unknown error'}`);
    createdEntityIds.blockId = block.id;

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
    server.stdout?.on('data', pushServerLog);
    server.stderr?.on('data', pushServerLog);

    await waitForServer(`${BASE_URL}/login`);

    const { data: signInData, error: signInError } = await anonClient.auth.signInWithPassword({
      email: teacherEmail,
      password: VERIFY_PASSWORD,
    });
    if (signInError || !signInData?.session) throw new Error(`Teacher sign-in failed: ${signInError?.message || 'no session'}`);
    const cookieHeader = buildCookieHeader(PROJECT_REF, signInData.session);

    const blocksProbe = await fetch(
      `${BASE_URL}/api/subjects/${createdEntityIds.subjectId}/chapters/${createdEntityIds.chapterId}/paragraphs/${createdEntityIds.paragraphId}/assignments/${createdEntityIds.assignmentId}/blocks`,
      {
        headers: { cookie: cookieHeader },
      }
    );
    const blocksProbeJson = await blocksProbe.json().catch(() => []);
    logStep(`Blocks API probe status=${blocksProbe.status} count=${Array.isArray(blocksProbeJson) ? blocksProbeJson.length : 0}`);

    browser = await chromium.launch({ headless: true });
    context = await browser.newContext();
    await context.addCookies([buildCookie(PROJECT_REF, signInData.session)]);
    const page = await context.newPage();
    const assignmentNetwork = [];
    page.on('response', async (response) => {
      const url = response.url();
      if (!url.includes('/assignments/')) return;
      let bodySummary = null;
      if (url.includes('/blocks')) {
        try {
          const json = await response.json();
          bodySummary = Array.isArray(json) ? { type: 'array', count: json.length } : { type: typeof json };
        } catch {
          bodySummary = { type: 'unreadable' };
        }
      }
      assignmentNetwork.push({
        url,
        method: response.request().method(),
        status: response.status(),
        body: bodySummary,
      });
    });

    const report = {
      class_id: createdEntityIds.classId,
      hierarchy: {
        subject_id: createdEntityIds.subjectId,
        chapter_id: createdEntityIds.chapterId,
        paragraph_id: createdEntityIds.paragraphId,
        assignment_id: createdEntityIds.assignmentId,
        seed_block_id: createdEntityIds.blockId,
      },
      ui_parity: {},
      assignment_editor: {},
      finished_at: null,
    };

    logStep('Verifying Group tab UI parity checks');
    await page.goto(`${BASE_URL}/class/${createdEntityIds.classId}?tab=group`, { waitUntil: 'networkidle' });
    await page.locator('[data-testid="group-tab"]').waitFor({ timeout: UI_WAIT_TIMEOUT_MS });
    const teacherHeadingBox = await page.locator('[data-testid="group-heading-teachers"]').boundingBox();
    const studentHeadingBox = await page.locator('[data-testid="group-heading-students"]').boundingBox();
    const groupImgCount = await page.locator('[data-testid="group-tab"] img').count();
    report.ui_parity.group = {
      headings_found: Boolean(teacherHeadingBox && studentHeadingBox),
      teachers_above_students: Boolean(teacherHeadingBox && studentHeadingBox && teacherHeadingBox.y < studentHeadingBox.y),
      image_count: groupImgCount,
    };
    assert(report.ui_parity.group.headings_found, 'Group headings were not rendered');
    assert(report.ui_parity.group.teachers_above_students, 'Group sections are not stacked with teachers above students');
    assert(report.ui_parity.group.image_count === 0, `Group should not render profile images (found ${groupImgCount})`);

    logStep('Verifying Attendance tab UI parity checks');
    await page.goto(`${BASE_URL}/class/${createdEntityIds.classId}?tab=attendance`, { waitUntil: 'networkidle' });
    await page.locator('[data-testid="attendance-tab"]').waitFor({ timeout: UI_WAIT_TIMEOUT_MS });
    await page.locator(`[data-testid="attendance-student-row-${studentA.id}"]`).waitFor({ timeout: UI_WAIT_TIMEOUT_MS });
    const attendanceImgCount = await page.locator('[data-testid="attendance-tab"] img').count();
    const actionCount = await page
      .locator(`[data-testid="attendance-student-row-${studentA.id}"] [data-testid^="attendance-action-"]`)
      .count();
    const recentActivityMentions = await page
      .locator('[data-testid="attendance-tab"]')
      .getByText(/recent activity/i)
      .count();
    const teacherShownInAttendance = await page
      .locator('[data-testid="attendance-tab"]')
      .getByText(teacherEmail, { exact: false })
      .count();

    report.ui_parity.attendance = {
      image_count: attendanceImgCount,
      first_student_action_count: actionCount,
      recent_activity_mentions: recentActivityMentions,
      teacher_email_visible: teacherShownInAttendance > 0,
    };
    assert(report.ui_parity.attendance.image_count === 0, `Attendance should not render profile images (found ${attendanceImgCount})`);
    assert(report.ui_parity.attendance.first_student_action_count === 6, `Attendance must expose 6 actions (found ${actionCount})`);
    assert(report.ui_parity.attendance.recent_activity_mentions === 0, 'Attendance still shows inline recent activity text');
    assert(report.ui_parity.attendance.teacher_email_visible === false, 'Attendance roster incorrectly shows teacher rows');

    logStep('Verifying Assignment editor runtime interactions');
    await page.goto(
      `${BASE_URL}/subjects/${createdEntityIds.subjectId}/chapters/${createdEntityIds.chapterId}/paragraphs/${createdEntityIds.paragraphId}/assignments/${createdEntityIds.assignmentId}`,
      { waitUntil: 'networkidle' }
    );
    await page.locator('[data-testid="assignment-editor-root"]').waitFor({ timeout: UI_WAIT_TIMEOUT_MS });
    try {
      await page.locator('[data-testid^="assignment-block-"]').first().waitFor({ timeout: UI_WAIT_TIMEOUT_MS });
      await page.locator('[data-testid^="assignment-text-header-"]').first().waitFor({ timeout: UI_WAIT_TIMEOUT_MS });
    } catch (error) {
      const currentUrl = page.url();
      const bodyText = await page.locator('body').innerText().catch(() => '');
      console.error('[verify-ui] assignment block wait failed', {
        currentUrl,
        bodyTextPreview: bodyText.slice(0, 500),
        assignmentNetwork: JSON.stringify(assignmentNetwork),
      });
      throw error;
    }

    const editToggle = page.locator('[data-testid="assignment-edit-toggle"]');
    const sizeButton = page.locator('[data-testid="assignment-size-button"]');
    const seedBlock = page.locator('[data-testid^="assignment-block-"]').first();
    const seedBlockTestId = await seedBlock.getAttribute('data-testid');
    if (!seedBlockTestId) {
      throw new Error('Could not resolve seeded assignment block test id');
    }
    const seedHeader = page.locator('[data-testid^="assignment-text-header-"]').first();

    const initialEditLabel = (await editToggle.textContent())?.trim() || '';
    const disabledBeforeSelect = await seedHeader.isDisabled();

    await seedBlock.click();
    await page.waitForTimeout(120);
    const enabledAfterSelect = !(await seedHeader.isDisabled());

    const editedHeaderText = 'Runtime Edited Header';
    await seedHeader.fill(editedHeaderText);
    const editedHeaderValue = await seedHeader.inputValue();
    assert(editedHeaderValue === editedHeaderText, `Seed header fill did not apply (got "${editedHeaderValue}")`);

    const widthStyleBefore = (await seedBlock.getAttribute('style')) || '';
    await sizeButton.click();
    const sizeSlider = page.locator('[data-testid="assignment-size-slider"]');
    await sizeSlider.focus();
    await page.keyboard.press('Home');
    await page.waitForFunction(
      (testId) => {
        const el = document.querySelector(`[data-testid="${testId}"]`);
        if (!el) return false;
        const style = el.getAttribute('style') || '';
        return /width:\s*38%/.test(style);
      },
      seedBlockTestId,
      { timeout: 5000 }
    );
    const widthStyleAfter = (await seedBlock.getAttribute('style')) || '';

    await editToggle.click();
    const editOffLabel = (await editToggle.textContent())?.trim() || '';
    const disabledWhenEditOff = await seedHeader.isDisabled();
    const sizeDisabledWhenEditOff = await sizeButton.isDisabled();
    await editToggle.click();

    const textHeaderLocator = page.locator('[data-testid^="assignment-text-header-"]');
    const headerCountBefore = await textHeaderLocator.count();

    const templateText = page.locator('[data-testid="assignment-template-text"]');
    const paper = page.locator('[data-testid="assignment-paper"]');
    const templateBox = await templateText.boundingBox();
    const paperBox = await paper.boundingBox();
    if (!templateBox || !paperBox) throw new Error('Could not resolve drag/drop coordinates for template add');

    await page.mouse.move(templateBox.x + templateBox.width / 2, templateBox.y + templateBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(paperBox.x + paperBox.width / 2, paperBox.y + 40, { steps: 12 });
    await page.mouse.move(paperBox.x + paperBox.width / 2, paperBox.y + 120, { steps: 8 });
    await page.mouse.up();

    await page.waitForFunction(
      (expectedCount) => document.querySelectorAll('[data-testid^="assignment-text-header-"]').length > expectedCount,
      headerCountBefore,
      { timeout: 10000 }
    );

    const activeTestIdAfterAdd = await page.evaluate(() => document.activeElement?.getAttribute('data-testid') || '');
    const addedHeaderText = 'Runtime Added Header';
    if (activeTestIdAfterAdd) {
      await page.keyboard.type(addedHeaderText);
      const addedHeaderValue = await page.locator(`[data-testid="${activeTestIdAfterAdd}"]`).inputValue();
      assert(addedHeaderValue === addedHeaderText, `Added header fill did not apply (got "${addedHeaderValue}")`);
    }

    await page.waitForTimeout(7000);
    await page.reload({ waitUntil: 'networkidle' });
    await page.locator('[data-testid="assignment-editor-root"]').waitFor({ timeout: 30000 });

    const headerValuesAfterReload = await page.$$eval(
      'input[data-testid^="assignment-text-header-"]',
      (els) => els.map((el) => el.value)
    );

    const { data: storedBlocks, error: storedBlocksError } = await admin
      .from('blocks')
      .select('id,data,position')
      .eq('assignment_id', createdEntityIds.assignmentId)
      .order('position', { ascending: true });
    if (storedBlocksError) throw new Error(`Failed querying stored blocks: ${storedBlocksError.message}`);

    const hasEditedHeaderInDb = (storedBlocks || []).some((row) => String(row?.data?.header || '') === editedHeaderText);
    const hasAddedHeaderInDb = (storedBlocks || []).some((row) => String(row?.data?.header || '') === addedHeaderText);
    const sawBlockPut = assignmentNetwork.some(
      (entry) => entry.method === 'PUT' && entry.url.includes('/blocks/') && entry.status === 200
    );
    const sawBlockPost = assignmentNetwork.some(
      (entry) => entry.method === 'POST' && entry.url.endsWith('/blocks') && entry.status === 200
    );

    report.assignment_editor = {
      edit_label_initial: initialEditLabel,
      header_disabled_before_select: disabledBeforeSelect,
      header_enabled_after_select: enabledAfterSelect,
      width_style_before: widthStyleBefore,
      width_style_after: widthStyleAfter,
      width_changed_via_size_slider: widthStyleBefore !== widthStyleAfter,
      edit_label_off: editOffLabel,
      header_disabled_when_edit_off: disabledWhenEditOff,
      size_button_disabled_when_edit_off: sizeDisabledWhenEditOff,
      text_header_count_before_add: headerCountBefore,
      focused_testid_after_add: activeTestIdAfterAdd,
      auto_focus_after_add: activeTestIdAfterAdd.startsWith('assignment-text-header-block-'),
      header_values_after_reload: headerValuesAfterReload,
      persisted_headers: {
        edited_header_saved: hasEditedHeaderInDb,
        added_header_saved: hasAddedHeaderInDb,
      },
      save_network: {
        saw_block_put: sawBlockPut,
        saw_block_post: sawBlockPost,
      },
    };
    try {
      assert(initialEditLabel === 'Edit: On', `Expected initial edit label to be "Edit: On", got "${initialEditLabel}"`);
      assert(disabledBeforeSelect, 'Seed text header should start disabled before selecting a block');
      assert(enabledAfterSelect, 'Seed text header should enable after selecting the block');
      assert(widthStyleBefore !== widthStyleAfter, 'Size slider did not change block width style');
      assert(editOffLabel === 'Edit: Off', `Expected edit-off label "Edit: Off", got "${editOffLabel}"`);
      assert(disabledWhenEditOff, 'Header input should be disabled when edit mode is off');
      assert(sizeDisabledWhenEditOff, 'Size button should be disabled when edit mode is off');
      assert(activeTestIdAfterAdd.startsWith('assignment-text-header-block-'), `Auto-focus after adding text block failed (focused: ${activeTestIdAfterAdd || 'none'})`);
      assert(headerValuesAfterReload.includes(editedHeaderText), `Reloaded headers missing edited header "${editedHeaderText}"`);
      assert(headerValuesAfterReload.includes(addedHeaderText), `Reloaded headers missing added header "${addedHeaderText}"`);
      assert(hasEditedHeaderInDb, `Database blocks missing edited header "${editedHeaderText}"`);
      assert(hasAddedHeaderInDb, `Database blocks missing added header "${addedHeaderText}"`);
      assert(sawBlockPut, 'Expected at least one successful block PUT save request');
      assert(sawBlockPost, 'Expected at least one successful block POST save request');
    } catch (error) {
      const serverPattern = /error updating block|unexpected error in block put|failed to update block|column .* does not exist|permission denied|\/blocks\//i;
      const matchIndexes = [];
      for (let i = 0; i < serverLogTail.length; i += 1) {
        if (serverPattern.test(serverLogTail[i])) {
          matchIndexes.push(i);
        }
      }
      const seen = new Set();
      const relevantServerLogs = [];
      for (const idx of matchIndexes) {
        const start = Math.max(0, idx - 3);
        const end = Math.min(serverLogTail.length - 1, idx + 10);
        for (let lineIdx = start; lineIdx <= end; lineIdx += 1) {
          if (seen.has(lineIdx)) continue;
          seen.add(lineIdx);
          relevantServerLogs.push(serverLogTail[lineIdx]);
        }
      }
      console.error('[verify-ui] assertion failure details', {
        assignmentNetwork: JSON.stringify(assignmentNetwork, null, 2),
        headerValuesAfterReload,
        persisted_headers: { hasEditedHeaderInDb, hasAddedHeaderInDb },
        relevantServerLogs,
      });
      throw error;
    }

    report.finished_at = new Date().toISOString();

    console.log('\n===== ASSIGNMENT + UI VERIFICATION REPORT =====');
    console.log(JSON.stringify(report, null, 2));
    console.log('===== END REPORT =====\n');
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
    if (browser) {
      await browser.close().catch(() => {});
    }
    if (server) {
      try {
        run(`taskkill /PID ${server.pid} /T /F`);
      } catch {
        server.kill();
      }
    }

    const {
      classId, subjectId, chapterId, paragraphId, assignmentId, blockId,
    } = createdEntityIds;

    if (blockId) await admin.from('blocks').delete().eq('id', blockId);
    if (assignmentId) await admin.from('blocks').delete().eq('assignment_id', assignmentId);
    if (assignmentId) await admin.from('assignments').delete().eq('id', assignmentId);
    if (paragraphId) await admin.from('paragraphs').delete().eq('id', paragraphId);
    if (chapterId) await admin.from('chapters').delete().eq('id', chapterId);
    if (subjectId) await admin.from('subjects').delete().eq('id', subjectId);
    if (classId) {
      await admin.from('student_attendance').delete().eq('class_id', classId);
      await admin.from('audit_logs').delete().eq('class_id', classId);
      await admin.from('class_members').delete().eq('class_id', classId);
      await admin.from('classes').delete().eq('id', classId);
    }

    for (const userId of createdUserIds) {
      try {
        await admin.auth.admin.deleteUser(userId);
      } catch {
        // best effort cleanup
      }
    }
  }
}

main().catch((error) => {
  console.error('Assignment/UI verification failed:', error);
  process.exitCode = 1;
});
