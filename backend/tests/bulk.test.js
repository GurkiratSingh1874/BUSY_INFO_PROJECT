const assert = require('assert');

const BASE_URL = 'http://127.0.0.1:5000/api';

const getCookie = (res) => {
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    return setCookie.split(';')[0];
  }
  return '';
};

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

  const contentType = response.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await response.json().catch(() => ({}));
  } else {
    data = await response.text().catch(() => '');
  }

  return { status: response.status, data, headers: response.headers };
};

const runBulkTests = async () => {
  console.log('\n=== RUNNING BULK OPERATIONS & CSV EXPORT TESTS (GOAL 7) ===');

  try {
    // 1. Authenticate users
    console.log('\n[TEST 1] Authenticating Manager, Alice (Member 1), and Bob (Member 2)...');
    const mgrRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@example.com', password: 'manager123' }),
    });
    assert.strictEqual(mgrRes.status, 200, 'Manager login failed');
    const managerCookie = getCookie(mgrRes);
    assert.ok(managerCookie, 'Manager cookie missing');
    const managerUser = (await makeRequest('/auth/me', { method: 'GET' }, managerCookie)).data.user;
    assert.ok(managerUser, 'Manager user data missing');

    const mbr1Res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'member1@example.com', password: 'member123' }),
    });
    assert.strictEqual(mbr1Res.status, 200, 'Member 1 login failed');
    const member1Cookie = getCookie(mbr1Res);
    assert.ok(member1Cookie, 'Member 1 cookie missing');
    const member1User = (await makeRequest('/auth/me', { method: 'GET' }, member1Cookie)).data.user;
    assert.ok(member1User, 'Member 1 user data missing');

    const mbr2Res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'member2@example.com', password: 'member123' }),
    });
    assert.strictEqual(mbr2Res.status, 200, 'Member 2 login failed');
    const member2Cookie = getCookie(mbr2Res);
    assert.ok(member2Cookie, 'Member 2 cookie missing');
    const member2User = (await makeRequest('/auth/me', { method: 'GET' }, member2Cookie)).data.user;
    assert.ok(member2User, 'Member 2 user data missing');

    console.log('✔ Authenticated users successfully.');

    // 2. Set up test projects and tasks
    console.log('\n[TEST 2] Setting up Test Projects & Tasks...');
    const pAKey = 'PBULK' + Math.floor(Math.random() * 1000);
    const pARes = await makeRequest('/projects', {
      method: 'POST',
      body: JSON.stringify({
        key: pAKey,
        name: 'Bulk Alpha Project',
        ownerId: managerUser.id,
        members: [managerUser.id, member1User.id], // Manager & Alice only
      }),
    }, managerCookie);
    const projAId = pARes.data.data._id;

    const pBKey = 'PBETA' + Math.floor(Math.random() * 1000);
    const pBRes = await makeRequest('/projects', {
      method: 'POST',
      body: JSON.stringify({
        key: pBKey,
        name: 'Bulk Beta Project',
        ownerId: managerUser.id,
        members: [managerUser.id, member2User.id], // Manager & Bob only
      }),
    }, managerCookie);
    const projBId = pBRes.data.data._id;

    // Create tasks in Project A
    const t1 = (await makeRequest(`/tasks/project/${projAId}`, {
      method: 'POST',
      body: JSON.stringify({ title: 'Task 1 in Backlog', priority: 'medium' }),
    }, managerCookie)).data.data;

    const t2 = (await makeRequest(`/tasks/project/${projAId}`, {
      method: 'POST',
      body: JSON.stringify({ title: 'Task 2 in Progress', priority: 'high' }),
    }, managerCookie)).data.data;
    await makeRequest(`/tasks/${t2._id}`, { method: 'PUT', body: JSON.stringify({ status: 'in_progress' }) }, managerCookie);

    const t3Blocker = (await makeRequest(`/tasks/project/${projAId}`, {
      method: 'POST',
      body: JSON.stringify({ title: 'Blocker Task', priority: 'low' }),
    }, managerCookie)).data.data;

    const t4 = (await makeRequest(`/tasks/project/${projAId}`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Task 4 in Review with Blocker',
        priority: 'high',
        blockers: [t3Blocker._id],
      }),
    }, managerCookie)).data.data;
    await makeRequest(`/tasks/${t4._id}`, { method: 'PUT', body: JSON.stringify({ status: 'in_progress' }) }, managerCookie);
    await makeRequest(`/tasks/${t4._id}`, { method: 'PUT', body: JSON.stringify({ status: 'in_review' }) }, managerCookie);

    // Create task in Project B
    const tB1 = (await makeRequest(`/tasks/project/${projBId}`, {
      method: 'POST',
      body: JSON.stringify({ title: 'Project B Task Assigned to Bob', priority: 'medium' }),
    }, managerCookie)).data.data;

    console.log('✔ Test projects and tasks seeded.');

    // 3. Test Mixed Successful / Failed Bulk Status Transition
    console.log('\n[TEST 3] Testing Mixed Bulk Status Transitions (Partial Success / Failures)...');
    // Attempt to move [t1 (backlog), t2 (in_progress)] to target status 'in_progress'
    // t1 (backlog -> in_progress): valid -> SUCCESS
    // t2 (in_progress -> in_progress): already in_progress -> SUCCESS (no-op)
    // t4 (in_review -> done): blocked by unfinished t3Blocker -> REJECTED
    const bulkStatusRes = await makeRequest('/tasks/bulk', {
      method: 'POST',
      body: JSON.stringify({
        taskIds: [t1._id, t4._id],
        action: 'status',
        payload: { status: 'in_progress' },
      }),
    }, managerCookie);

    assert.strictEqual(bulkStatusRes.status, 200);
    assert.strictEqual(bulkStatusRes.data.summary.total, 2);
    assert.strictEqual(bulkStatusRes.data.summary.succeeded, 1);
    assert.strictEqual(bulkStatusRes.data.summary.failed, 1);

    const r1 = bulkStatusRes.data.results.find(r => r.taskId === t1._id);
    const r4 = bulkStatusRes.data.results.find(r => r.taskId === t4._id);
    assert.strictEqual(r1.status, 'SUCCESS');
    assert.strictEqual(r4.status, 'REJECTED');
    assert.ok(r4.reason.toLowerCase().includes('backward') || r4.reason.toLowerCase().includes('invalid'));
    console.log('✔ Bulk status: Task 1 succeeded, Task 4 rejected with explanation.');

    // Attempt to move t4 to 'done' while blocker is unfinished
    const bulkDoneRes = await makeRequest('/tasks/bulk', {
      method: 'POST',
      body: JSON.stringify({
        taskIds: [t4._id],
        action: 'status',
        payload: { status: 'done' },
      }),
    }, managerCookie);
    assert.strictEqual(bulkDoneRes.status, 200);
    assert.strictEqual(bulkDoneRes.data.summary.failed, 1);
    assert.ok(bulkDoneRes.data.results[0].reason.includes('blocked by unfinished tasks'));
    console.log('✔ Bulk status: Blocker dependency rejection reported accurately.');

    // 4. Test Bulk Assignees Change (Valid vs Invalid Non-Project Member)
    console.log('\n[TEST 4] Testing Bulk Assignee Validation...');
    // Attempt to assign Bob (member2) to Task 1 (which belongs to Project A where Bob is NOT a member)
    const bulkInvalidAssignee = await makeRequest('/tasks/bulk', {
      method: 'POST',
      body: JSON.stringify({
        taskIds: [t1._id],
        action: 'assignees',
        payload: { assignees: [member2User.id] },
      }),
    }, managerCookie);

    assert.strictEqual(bulkInvalidAssignee.status, 200);
    assert.strictEqual(bulkInvalidAssignee.data.summary.failed, 1);
    assert.ok(bulkInvalidAssignee.data.results[0].reason.includes('must be registered members'));
    console.log('✔ Non-project member assignment rejected in bulk operation.');

    // Bulk assign Alice (member1, valid project member) to Task 1 and Task 2
    const bulkValidAssignee = await makeRequest('/tasks/bulk', {
      method: 'POST',
      body: JSON.stringify({
        taskIds: [t1._id, t2._id],
        action: 'assignees',
        payload: { assignees: [member1User.id] },
      }),
    }, managerCookie);

    assert.strictEqual(bulkValidAssignee.status, 200);
    assert.strictEqual(bulkValidAssignee.data.summary.succeeded, 2);
    console.log('✔ Valid project members successfully assigned across multiple tasks in bulk.');

    // 5. Test Bulk Due Date Change
    console.log('\n[TEST 5] Testing Bulk Due Date Updates...');
    const newDueDate = '2026-11-20';
    const bulkDueDateRes = await makeRequest('/tasks/bulk', {
      method: 'POST',
      body: JSON.stringify({
        taskIds: [t1._id, t2._id],
        action: 'dueDate',
        payload: { dueDate: newDueDate },
      }),
    }, managerCookie);

    assert.strictEqual(bulkDueDateRes.status, 200);
    assert.strictEqual(bulkDueDateRes.data.summary.succeeded, 2);
    console.log('✔ Bulk due dates updated successfully.');

    // 6. Test Permission Boundaries on Bulk Operations
    console.log('\n[TEST 6] Testing Permission Boundaries on Bulk Operations...');
    // Alice (Member 1) attempts to bulk modify tB1 (Project B, which Alice does not belong to)
    const aliceBulkRes = await makeRequest('/tasks/bulk', {
      method: 'POST',
      body: JSON.stringify({
        taskIds: [tB1._id],
        action: 'status',
        payload: { status: 'in_progress' },
      }),
    }, member1Cookie);

    assert.strictEqual(aliceBulkRes.status, 200);
    assert.strictEqual(aliceBulkRes.data.summary.failed, 1);
    assert.ok(aliceBulkRes.data.results[0].reason.includes('Access denied'));
    console.log('✔ Server rejected unauthorized bulk operation from non-member.');

    // 7. Test Filtered CSV Export
    console.log('\n[TEST 7] Testing Filtered CSV Export...');
    // Export only tasks from Project A
    const csvProjA = await makeRequest(`/tasks/export/csv?projectId=${projAId}`, { method: 'GET' }, managerCookie);
    assert.strictEqual(csvProjA.status, 200);
    assert.ok(csvProjA.headers.get('content-type').includes('text/csv'));
    assert.ok(csvProjA.data.includes('"Task ID","Project Key","Project Name","Title"'));
    assert.ok(csvProjA.data.includes('Task 1 in Backlog'));
    assert.ok(csvProjA.data.includes(pAKey));
    // Verify tasks from Project B are NOT included
    assert.strictEqual(csvProjA.data.includes(pBKey), false, 'Project B tasks leaked into Project A CSV export');
    console.log('✔ CSV export scoped strictly to requested project filter.');

    // Text search filter export
    const csvSearch = await makeRequest('/tasks/export/csv?search=Blocker', { method: 'GET' }, managerCookie);
    assert.strictEqual(csvSearch.status, 200);
    assert.ok(csvSearch.data.includes('Blocker Task'));
    assert.strictEqual(csvSearch.data.includes('Task 2 in Progress'), false);
    console.log('✔ CSV export filtered by text search verified.');

    // Member access boundary on CSV export
    const aliceCsvUnauthorized = await makeRequest(`/tasks/export/csv?projectId=${projBId}`, { method: 'GET' }, member1Cookie);
    assert.strictEqual(aliceCsvUnauthorized.status, 403);
    console.log('✔ Unauthorized CSV export rejected with 403 Forbidden.');

    // Clean up test projects
    await makeRequest(`/projects/${projAId}`, { method: 'DELETE' }, managerCookie);
    await makeRequest(`/projects/${projBId}`, { method: 'DELETE' }, managerCookie);
    console.log('✔ Cleaned up bulk test projects.');

    console.log('\n✔✔✔ ALL BULK OPERATIONS & CSV EXPORT TESTS PASSED SUCCESSFULLY! ✔✔✔\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ BULK OPERATIONS TEST FAILED:');
    console.error(err);
    process.exit(1);
  }
};

runBulkTests();
