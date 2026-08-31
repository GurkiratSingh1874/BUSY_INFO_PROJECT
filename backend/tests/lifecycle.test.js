const assert = require('assert');
const { validateTransition } = require('../utils/lifecycle');

const BASE_URL = 'http://127.0.0.1:5000/api';

// Helper to extract cookie from response headers
const getCookie = (res) => {
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    return setCookie.split(';')[0];
  }
  return '';
};

// Helper for HTTP requests with cookies
const makeRequest = async (url, options = {}, cookie = '') => {
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  if (cookie) {
    headers['Cookie'] = cookie;
  }
  const response = await fetch(`${BASE_URL}${url}`, {
    ...options,
    headers,
  });
  const data = await response.json().catch(() => ({}));
  return { status: response.status, data };
};

// -----------------------------------------------------------------------------
// 1. UNIT TESTS: Pure State Machine Validation Function
// -----------------------------------------------------------------------------
const runUnitTests = () => {
  console.log('\n=== RUNNING LIFECYCLE UNIT TESTS ===');

  // Test: Valid standard forward transitions
  console.log('\n[Unit 1] Testing Valid Forward Transitions...');
  assert.strictEqual(validateTransition('backlog', 'in_progress').isValid, true);
  assert.strictEqual(validateTransition('in_progress', 'in_review').isValid, true);
  assert.strictEqual(validateTransition('in_review', 'done').isValid, true);
  console.log('✔ Backlog ➔ In Progress, In Progress ➔ In Review, In Review ➔ Done are valid.');

  // Test: Same state is valid / no-op
  assert.strictEqual(validateTransition('backlog', 'backlog').isValid, true);
  assert.strictEqual(validateTransition('in_progress', 'in_progress').isValid, true);
  assert.strictEqual(validateTransition('in_review', 'in_review').isValid, true);
  assert.strictEqual(validateTransition('done', 'done').isValid, true);
  assert.strictEqual(validateTransition('blocked', 'blocked').isValid, true);
  console.log('✔ Identical target transitions (no-ops) are valid.');

  // Test: Invalid forward skips
  console.log('\n[Unit 2] Testing Invalid Forward Skips...');
  const backlogToDone = validateTransition('backlog', 'done');
  assert.strictEqual(backlogToDone.isValid, false);
  assert.ok(backlogToDone.message.includes('Backlog cannot jump directly to Done'));

  const backlogToReview = validateTransition('backlog', 'in_review');
  assert.strictEqual(backlogToReview.isValid, false);
  assert.ok(backlogToReview.message.includes('cannot skip In Progress'));

  const progressToDone = validateTransition('in_progress', 'done');
  assert.strictEqual(progressToDone.isValid, false);
  assert.ok(progressToDone.message.includes('cannot jump directly to Done'));
  console.log('✔ All forward skips correctly rejected with informative error messages.');

  // Test: Invalid backward transitions
  console.log('\n[Unit 3] Testing Invalid Backward Transitions...');
  const progressToBacklog = validateTransition('in_progress', 'backlog');
  assert.strictEqual(progressToBacklog.isValid, false);
  assert.ok(progressToBacklog.message.includes('Backward transitions from In Progress to Backlog'));

  const reviewToProgress = validateTransition('in_review', 'in_progress');
  assert.strictEqual(reviewToProgress.isValid, false);
  assert.ok(reviewToProgress.message.includes('Backward transitions from In Review to In Progress'));

  const reviewToBacklog = validateTransition('in_review', 'backlog');
  assert.strictEqual(reviewToBacklog.isValid, false);
  assert.ok(reviewToBacklog.message.includes('Backward transitions from In Review to Backlog'));
  console.log('✔ All backward transitions correctly rejected.');

  // Test: Blocking rules
  console.log('\n[Unit 4] Testing Blocking Transitions...');
  assert.strictEqual(validateTransition('in_progress', 'blocked').isValid, true);
  assert.strictEqual(validateTransition('in_review', 'blocked').isValid, true);

  const backlogToBlocked = validateTransition('backlog', 'blocked');
  assert.strictEqual(backlogToBlocked.isValid, false);
  assert.ok(backlogToBlocked.message.includes('Backlog tasks cannot be Blocked'));

  const doneToBlocked = validateTransition('done', 'blocked');
  assert.strictEqual(doneToBlocked.isValid, false);
  assert.ok(doneToBlocked.message.includes('Completed tasks cannot be directly marked as Blocked'));
  console.log('✔ Blocking is allowed only from In Progress and In Review.');

  // Test: Unblocking rules
  console.log('\n[Unit 5] Testing Unblocking Transitions...');
  // From in_progress
  assert.strictEqual(validateTransition('blocked', 'in_progress', 'in_progress').isValid, true);
  const unblockWrong1 = validateTransition('blocked', 'in_review', 'in_progress');
  assert.strictEqual(unblockWrong1.isValid, false);
  assert.ok(unblockWrong1.message.includes("must return to the state they were blocked from ('in_progress')"));

  const unblockWrong2 = validateTransition('blocked', 'done', 'in_progress');
  assert.strictEqual(unblockWrong2.isValid, false);

  // From in_review
  assert.strictEqual(validateTransition('blocked', 'in_review', 'in_review').isValid, true);
  const unblockWrong3 = validateTransition('blocked', 'in_progress', 'in_review');
  assert.strictEqual(unblockWrong3.isValid, false);
  assert.ok(unblockWrong3.message.includes("must return to the state they were blocked from ('in_review')"));

  // Blocked without preBlockedStatus
  const unblockNoPre = validateTransition('blocked', 'in_progress', null);
  assert.strictEqual(unblockNoPre.isValid, false);
  console.log('✔ Unblocking strictly returns tasks to their exact prior state.');

  // Test: Reopening Done tasks
  console.log('\n[Unit 6] Testing Reopening Completed Tasks...');
  assert.strictEqual(validateTransition('done', 'backlog').isValid, true);
  assert.strictEqual(validateTransition('done', 'in_progress').isValid, true);
  assert.strictEqual(validateTransition('done', 'in_review').isValid, true);
  console.log('✔ Done tasks can be reopened to Backlog, In Progress, or In Review.');

  console.log('\n✔ ALL LIFECYCLE UNIT TESTS PASSED!');
};

// -----------------------------------------------------------------------------
// 2. INTEGRATION TESTS: HTTP API & Database Dependency Validations
// -----------------------------------------------------------------------------
const runIntegrationTests = async () => {
  console.log('\n=== RUNNING LIFECYCLE API INTEGRATION TESTS ===');

  // Authenticate manager
  const loginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'manager@example.com', password: 'manager123' }),
  });
  const cookie = getCookie(loginRes);
  assert.ok(cookie, 'Failed to authenticate manager for API lifecycle tests');
  const profile = await makeRequest('/auth/me', { method: 'GET' }, cookie);
  const managerId = profile.data.user.id;

  // Create a dedicated test project
  const projectKey = 'LC' + Math.floor(Math.random() * 10000);
  const projRes = await makeRequest('/projects', {
    method: 'POST',
    body: JSON.stringify({
      key: projectKey,
      name: 'Lifecycle Testing Project',
      ownerId: managerId,
      members: [managerId],
    }),
  }, cookie);
  assert.strictEqual(projRes.status, 201, 'Project creation failed');
  const projectId = projRes.data.data._id;
  console.log(`✔ Created test project: ${projectKey} (${projectId})`);

  // Create Task 1 (for transition testing)
  const t1Res = await makeRequest(`/tasks/project/${projectId}`, {
    method: 'POST',
    body: JSON.stringify({ title: 'Task 1: Lifecycle Flow' }),
  }, cookie);
  assert.strictEqual(t1Res.status, 201);
  const task1Id = t1Res.data.data._id;
  console.log(`✔ Created Task 1: ${task1Id}`);

  // 1. Test Invalid Forward Jump: Backlog -> Done
  console.log('\n[API 1] Testing Server Rejection of Backlog ➔ Done...');
  const jumpDone = await makeRequest(`/tasks/${task1Id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'done' }),
  }, cookie);
  assert.strictEqual(jumpDone.status, 400, 'Server permitted Backlog -> Done jump');
  assert.ok(jumpDone.data.error.includes('Backlog cannot jump directly to Done'));
  console.log('✔ Server rejected Backlog ➔ Done with 400 and clear error message.');

  // 2. Test Invalid Forward Jump: Backlog -> In Review
  console.log('\n[API 2] Testing Server Rejection of Backlog ➔ In Review...');
  const jumpReview = await makeRequest(`/tasks/${task1Id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'in_review' }),
  }, cookie);
  assert.strictEqual(jumpReview.status, 400, 'Server permitted Backlog -> In Review jump');
  assert.ok(jumpReview.data.error.includes('cannot skip In Progress'));
  console.log('✔ Server rejected Backlog ➔ In Review with 400.');

  // 3. Test Valid: Backlog -> In Progress
  console.log('\n[API 3] Testing Valid Backlog ➔ In Progress...');
  const step1 = await makeRequest(`/tasks/${task1Id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'in_progress' }),
  }, cookie);
  assert.strictEqual(step1.status, 200);
  assert.strictEqual(step1.data.data.status, 'in_progress');
  console.log('✔ Transitioned Task 1 to In Progress.');

  // 4. Test Invalid: In Progress -> Done
  console.log('\n[API 4] Testing Server Rejection of In Progress ➔ Done...');
  const progressToDone = await makeRequest(`/tasks/${task1Id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'done' }),
  }, cookie);
  assert.strictEqual(progressToDone.status, 400);
  assert.ok(progressToDone.data.error.includes('cannot jump directly to Done'));
  console.log('✔ Server rejected In Progress ➔ Done with 400.');

  // 5. Test Invalid: In Progress -> Backlog (Backward)
  console.log('\n[API 5] Testing Server Rejection of In Progress ➔ Backlog...');
  const progressToBacklog = await makeRequest(`/tasks/${task1Id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'backlog' }),
  }, cookie);
  assert.strictEqual(progressToBacklog.status, 400);
  assert.ok(progressToBacklog.data.error.includes('Backward transitions from In Progress to Backlog'));
  console.log('✔ Server rejected In Progress ➔ Backlog with 400.');

  // 6. Test Blocking & Unblocking from In Progress
  console.log('\n[API 6] Testing Blocking and Unblocking from In Progress...');
  const blockFromProgress = await makeRequest(`/tasks/${task1Id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'blocked' }),
  }, cookie);
  assert.strictEqual(blockFromProgress.status, 200);
  assert.strictEqual(blockFromProgress.data.data.status, 'blocked');
  assert.strictEqual(blockFromProgress.data.data.preBlockedStatus, 'in_progress');
  console.log('✔ Task marked as Blocked; recorded preBlockedStatus = in_progress.');

  // Attempt invalid unblock to in_review
  const unblockIllegal = await makeRequest(`/tasks/${task1Id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'in_review' }),
  }, cookie);
  assert.strictEqual(unblockIllegal.status, 400);
  assert.ok(unblockIllegal.data.error.includes("must return to the state they were blocked from ('in_progress')"));
  console.log('✔ Server rejected unblocking to in_review.');

  // Valid unblock back to in_progress
  const unblockValid = await makeRequest(`/tasks/${task1Id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'in_progress' }),
  }, cookie);
  assert.strictEqual(unblockValid.status, 200);
  assert.strictEqual(unblockValid.data.data.status, 'in_progress');
  assert.strictEqual(unblockValid.data.data.preBlockedStatus, null);
  console.log('✔ Task successfully unblocked back to in_progress.');

  // 7. Move to In Review
  console.log('\n[API 7] Transitioning In Progress ➔ In Review...');
  const step2 = await makeRequest(`/tasks/${task1Id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'in_review' }),
  }, cookie);
  assert.strictEqual(step2.status, 200);
  assert.strictEqual(step2.data.data.status, 'in_review');
  console.log('✔ Task 1 moved to In Review.');

  // 8. Test Blocking & Unblocking from In Review
  console.log('\n[API 8] Testing Blocking and Unblocking from In Review...');
  const blockFromReview = await makeRequest(`/tasks/${task1Id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'blocked' }),
  }, cookie);
  assert.strictEqual(blockFromReview.status, 200);
  assert.strictEqual(blockFromReview.data.data.preBlockedStatus, 'in_review');

  const unblockToReview = await makeRequest(`/tasks/${task1Id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'in_review' }),
  }, cookie);
  assert.strictEqual(unblockToReview.status, 200);
  assert.strictEqual(unblockToReview.data.data.status, 'in_review');
  console.log('✔ Task successfully blocked and unblocked back to in_review.');

  // 9. Test Dependency Blocking on Transition to Done
  console.log('\n[API 9] Testing Dependencies Preventing Transition to Done...');
  // Create Blocker Task (Task B in backlog)
  const blockerRes = await makeRequest(`/tasks/project/${projectId}`, {
    method: 'POST',
    body: JSON.stringify({ title: 'Blocker Dependency Task B' }),
  }, cookie);
  const blockerTaskId = blockerRes.data.data._id;

  // Add Task B as blocker on Task 1
  await makeRequest(`/tasks/${task1Id}`, {
    method: 'PUT',
    body: JSON.stringify({ blockers: [blockerTaskId] }),
  }, cookie);
  console.log(`✔ Attached unfinished blocker (${blockerTaskId}) to Task 1.`);

  // Attempt to mark Task 1 as Done -> Must be rejected by server
  const blockedDoneAttempt = await makeRequest(`/tasks/${task1Id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'done' }),
  }, cookie);
  assert.strictEqual(blockedDoneAttempt.status, 400, 'Server allowed task with unfinished blockers to reach Done');
  assert.ok(blockedDoneAttempt.data.error.includes('blocked by unfinished tasks'));
  console.log('✔ Server rejected transition to Done because dependency is unfinished.');

  // 10. Resolve Blocker Dependency and Complete Task 1
  console.log('\n[API 10] Resolving Blocker Dependency and Transitioning to Done...');
  // Move Blocker Task: backlog -> in_progress -> in_review -> done
  await makeRequest(`/tasks/${blockerTaskId}`, { method: 'PUT', body: JSON.stringify({ status: 'in_progress' }) }, cookie);
  await makeRequest(`/tasks/${blockerTaskId}`, { method: 'PUT', body: JSON.stringify({ status: 'in_review' }) }, cookie);
  const blockerDoneRes = await makeRequest(`/tasks/${blockerTaskId}`, { method: 'PUT', body: JSON.stringify({ status: 'done' }) }, cookie);
  assert.strictEqual(blockerDoneRes.status, 200);
  console.log('✔ Blocker Dependency Task B completed (status = done).');

  // Now attempt to mark Task 1 as Done -> Must succeed!
  const task1DoneRes = await makeRequest(`/tasks/${task1Id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'done' }),
  }, cookie);
  assert.strictEqual(task1DoneRes.status, 200, 'Failed to complete task after blockers resolved');
  assert.strictEqual(task1DoneRes.data.data.status, 'done');
  console.log('✔ Task 1 successfully moved to Done now that blocker dependency is satisfied.');

  // 11. Test Reopening Done Task
  console.log('\n[API 11] Testing Reopening Completed Tasks...');
  const reopenToBacklog = await makeRequest(`/tasks/${task1Id}`, {
    method: 'PUT',
    body: JSON.stringify({ status: 'backlog' }),
  }, cookie);
  assert.strictEqual(reopenToBacklog.status, 200);
  assert.strictEqual(reopenToBacklog.data.data.status, 'backlog');
  console.log('✔ Reopened Task 1 to Backlog.');

  // Clean up project
  await makeRequest(`/projects/${projectId}`, { method: 'DELETE' }, cookie);
  console.log('✔ Cleaned up lifecycle test project.');

  console.log('\n✔ ALL LIFECYCLE API INTEGRATION TESTS PASSED SUCCESSFULLY!\n');
};

const main = async () => {
  try {
    runUnitTests();
    await runIntegrationTests();
    console.log('🎉 ALL LIFECYCLE UNIT & INTEGRATION TESTS COMPLETED WITHOUT ERROR! 🎉');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ TEST RUN FAILED:');
    console.error(err);
    process.exit(1);
  }
};

main();
