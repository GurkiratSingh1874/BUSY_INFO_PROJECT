const assert = require('assert');

const BASE_URL = 'http://localhost:5000/api';

const getCookie = (res) => {
  const setCookie = res.headers.get('set-cookie');
  if (!setCookie) return null;
  return setCookie.split(';')[0];
};

const makeRequest = async (endpoint, options = {}, cookie = null) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (cookie) {
    headers['Cookie'] = cookie;
  }
  const res = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    // Non-JSON response
  }
  return { status: res.status, headers: res.headers, data };
};

const runDashboardTests = async () => {
  console.log('\n=== RUNNING DASHBOARD & METRICS TESTS (GOAL 8) ===');

  try {
    // 1. Authenticate users
    console.log('\n[TEST 1] Authenticating Manager, Alice (Member 1), and Bob (Member 2)...');
    const mgrRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@example.com', password: 'manager123' }),
    });
    assert.strictEqual(mgrRes.status, 200);
    const managerCookie = getCookie(mgrRes);
    const managerUser = (await makeRequest('/auth/me', { method: 'GET' }, managerCookie)).data.user;

    const mbr1Res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'member1@example.com', password: 'member123' }),
    });
    assert.strictEqual(mbr1Res.status, 200);
    const member1Cookie = getCookie(mbr1Res);
    const member1User = (await makeRequest('/auth/me', { method: 'GET' }, member1Cookie)).data.user;

    const mbr2Res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'member2@example.com', password: 'member123' }),
    });
    assert.strictEqual(mbr2Res.status, 200);
    const member2Cookie = getCookie(mbr2Res);
    const member2User = (await makeRequest('/auth/me', { method: 'GET' }, member2Cookie)).data.user;

    console.log('✔ Authenticated all users successfully.');

    // 2. Set up test projects
    console.log('\n[TEST 2] Setting up Test Projects & Scoped Tasks...');
    const pAKey = 'PDASH_A' + Math.floor(Math.random() * 1000);
    const pARes = await makeRequest('/projects', {
      method: 'POST',
      body: JSON.stringify({
        key: pAKey,
        name: 'Dashboard Alpha Project',
        ownerId: managerUser.id,
        members: [managerUser.id, member1User.id], // Manager & Alice
      }),
    }, managerCookie);
    const projAId = pARes.data.data._id;

    const pBKey = 'PDASH_B' + Math.floor(Math.random() * 1000);
    const pBRes = await makeRequest('/projects', {
      method: 'POST',
      body: JSON.stringify({
        key: pBKey,
        name: 'Dashboard Beta Project',
        ownerId: managerUser.id,
        members: [managerUser.id, member2User.id], // Manager & Bob
      }),
    }, managerCookie);
    const projBId = pBRes.data.data._id;

    // Dates setup
    const now = new Date();

    // Past date (overdue): 5 days ago
    const pastDate = new Date(now);
    pastDate.setDate(now.getDate() - 5);

    // Due this week: compute a date guaranteed to be within the current Monday-Sunday window
    const day = now.getDay();
    const diffToMonday = (day === 0 ? -6 : 1) - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);
    const dueThisWeekDate = new Date(monday);
    dueThisWeekDate.setDate(monday.getDate() + 3); // Thursday of current week
    dueThisWeekDate.setHours(12, 0, 0, 0);

    // Due in future (next month)
    const futureDate = new Date(now);
    futureDate.setDate(now.getDate() + 25);

    // Create Tasks in Project A (Alice's project)
    // Task A1: Backlog, unassigned, future date
    const tA1 = (await makeRequest(`/tasks/project/${projAId}`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Task A1 - Backlog Future',
        priority: 'medium',
        dueDate: futureDate.toISOString(),
      }),
    }, managerCookie)).data.data;

    // Task A2: In Progress, assigned to Alice, overdue
    const tA2 = (await makeRequest(`/tasks/project/${projAId}`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Task A2 - In Progress Overdue',
        priority: 'high',
        dueDate: pastDate.toISOString(),
        assignees: [member1User.id],
      }),
    }, managerCookie)).data.data;
    await makeRequest(`/tasks/${tA2._id}`, { method: 'PUT', body: JSON.stringify({ status: 'in_progress' }) }, managerCookie);

    // Task A3: In Review, assigned to Alice, due this week
    const tA3 = (await makeRequest(`/tasks/project/${projAId}`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Task A3 - In Review Due This Week',
        priority: 'low',
        dueDate: dueThisWeekDate.toISOString(),
        assignees: [member1User.id],
      }),
    }, managerCookie)).data.data;
    await makeRequest(`/tasks/${tA3._id}`, { method: 'PUT', body: JSON.stringify({ status: 'in_progress' }) }, managerCookie);
    await makeRequest(`/tasks/${tA3._id}`, { method: 'PUT', body: JSON.stringify({ status: 'in_review' }) }, managerCookie);

    // Task A4: Done, assigned to Alice, completed this week
    const tA4 = (await makeRequest(`/tasks/project/${projAId}`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Task A4 - Done Completed',
        priority: 'high',
        assignees: [member1User.id],
      }),
    }, managerCookie)).data.data;
    await makeRequest(`/tasks/${tA4._id}`, { method: 'PUT', body: JSON.stringify({ status: 'in_progress' }) }, managerCookie);
    await makeRequest(`/tasks/${tA4._id}`, { method: 'PUT', body: JSON.stringify({ status: 'in_review' }) }, managerCookie);
    await makeRequest(`/tasks/${tA4._id}`, { method: 'PUT', body: JSON.stringify({ status: 'done' }) }, managerCookie);

    // Create Tasks in Project B (Bob's project)
    // Task B1: In Progress, assigned to Bob, future date
    const tB1 = (await makeRequest(`/tasks/project/${projBId}`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Task B1 - In Progress Bob',
        priority: 'medium',
        dueDate: futureDate.toISOString(),
        assignees: [member2User.id],
      }),
    }, managerCookie)).data.data;
    await makeRequest(`/tasks/${tB1._id}`, { method: 'PUT', body: JSON.stringify({ status: 'in_progress' }) }, managerCookie);

    console.log('✔ Seeded projects and tasks for metric validation.');

    // 3. Test Dashboard Scoped to Project A
    console.log('\n[TEST 3] Testing Dashboard Metrics for Project A...');
    const dashARes = await makeRequest(`/dashboard?projectId=${projAId}`, { method: 'GET' }, managerCookie);
    assert.strictEqual(dashARes.status, 200);

    const dA = dashARes.data.data;
    assert.strictEqual(dA.summary.openTasks, 3, 'Project A should have 3 open tasks (A1, A2, A3)');
    assert.strictEqual(dA.summary.overdueTasks, 1, 'Project A should have 1 overdue task (A2)');
    assert.strictEqual(dA.summary.dueThisWeek, 1, 'Project A should have 1 task due this week (A3)');
    assert.strictEqual(dA.summary.completedThisWeek, 1, 'Project A should have 1 completed task this week (A4)');

    // Status breakdown
    const backlogItem = dA.byStatus.find(s => s.status === 'backlog');
    const inProgressItem = dA.byStatus.find(s => s.status === 'in_progress');
    const inReviewItem = dA.byStatus.find(s => s.status === 'in_review');
    const doneItem = dA.byStatus.find(s => s.status === 'done');
    const blockedItem = dA.byStatus.find(s => s.status === 'blocked');

    assert.strictEqual(backlogItem.count, 1, 'Backlog count should be 1');
    assert.strictEqual(inProgressItem.count, 1, 'In Progress count should be 1');
    assert.strictEqual(inReviewItem.count, 1, 'In Review count should be 1');
    assert.strictEqual(doneItem.count, 1, 'Done count should be 1');
    assert.strictEqual(blockedItem.count, 0, 'Blocked count should be 0');

    // Assignee breakdown
    const aliceWorkload = dA.byAssignee.find(a => a.name === member1User.name);
    const unassignedWorkload = dA.byAssignee.find(a => a.userId === 'unassigned');
    assert.ok(aliceWorkload, 'Alice should be listed in assignee breakdown');
    assert.strictEqual(aliceWorkload.count, 3, 'Alice should have 3 tasks in Project A');
    assert.ok(unassignedWorkload, 'Unassigned workload should be present');
    assert.strictEqual(unassignedWorkload.count, 1, 'Should have 1 unassigned task');

    // 8-week completions trend
    assert.strictEqual(dA.completionsByWeek.length, 8, 'Should return exactly 8 weekly buckets');
    const currentWeekBucket = dA.completionsByWeek[7];
    assert.strictEqual(currentWeekBucket.week, 'This Week');
    assert.strictEqual(currentWeekBucket.completed, 1, 'This Week should have 1 completion');

    console.log('✔ Project A dashboard metrics, status breakdown, and weekly trend verified.');

    // 4. Test Member Permission Scoping
    console.log('\n[TEST 4] Testing Member Permission Scoping (Alice vs Bob)...');
    // Alice requests Project A (valid - she is a member)
    const aliceProjARes = await makeRequest(`/dashboard?projectId=${projAId}`, { method: 'GET' }, member1Cookie);
    assert.strictEqual(aliceProjARes.status, 200, 'Alice should have access to Project A');
    // Verify Bob is NOT in Project A assignee breakdown
    const bobInProjA = aliceProjARes.data.data.byAssignee.find(a => a.name === member2User.name);
    assert.strictEqual(bobInProjA, undefined, "Bob should not appear in Project A's dashboard");

    // Alice requests Project B (she is NOT a member) -> MUST be 403 Forbidden
    const aliceProjBRes = await makeRequest(`/dashboard?projectId=${projBId}`, { method: 'GET' }, member1Cookie);
    assert.strictEqual(aliceProjBRes.status, 403, 'Alice must receive 403 Forbidden when querying Project B dashboard');

    // Bob requests Project A (he is NOT a member) -> MUST be 403 Forbidden
    const bobProjARes = await makeRequest(`/dashboard?projectId=${projAId}`, { method: 'GET' }, member2Cookie);
    assert.strictEqual(bobProjARes.status, 403, 'Bob must receive 403 Forbidden when querying Project A dashboard');

    // Bob requests Project B (valid - he is a member)
    const bobProjBRes = await makeRequest(`/dashboard?projectId=${projBId}`, { method: 'GET' }, member2Cookie);
    assert.strictEqual(bobProjBRes.status, 200, 'Bob should have access to Project B');
    assert.strictEqual(bobProjBRes.data.data.summary.openTasks, 1, 'Bob should see 1 open task in Project B');

    console.log('✔ Member project isolation and 403 Forbidden boundaries strictly verified.');

    // 6. Clean up test projects
    console.log('\n[TEST 6] Cleaning up Test Projects...');
    await makeRequest(`/projects/${projAId}`, { method: 'DELETE' }, managerCookie);
    await makeRequest(`/projects/${projBId}`, { method: 'DELETE' }, managerCookie);
    console.log('✔ Cleaned up dashboard test projects.');

    console.log('\n✔✔✔ ALL DASHBOARD & METRICS TESTS PASSED SUCCESSFULLY! ✔✔✔\n');
  } catch (error) {
    console.error('\n❌ DASHBOARD TEST FAILED:\n', error);
    process.exit(1);
  }
};

runDashboardTests();
