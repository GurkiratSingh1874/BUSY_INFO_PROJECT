const assert = require('assert');

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

const runSearchFilterTests = async () => {
  console.log('\n=== RUNNING SERVER-SIDE SEARCH, FILTER & PAGINATION TESTS (GOAL 6) ===');

  try {
    // 1. Authenticate Manager and Members
    console.log('\n[TEST 1] Authenticating Manager & Member accounts...');
    const mgrRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@example.com', password: 'manager123' }),
    });
    const managerCookie = getCookie(mgrRes);
    assert.ok(managerCookie, 'Manager cookie extraction failed');
    const managerUser = (await makeRequest('/auth/me', { method: 'GET' }, managerCookie)).data.user;

    const mbr1Res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'member1@example.com', password: 'member123' }),
    });
    const member1Cookie = getCookie(mbr1Res);
    assert.ok(member1Cookie, 'Member 1 cookie extraction failed');
    const member1User = (await makeRequest('/auth/me', { method: 'GET' }, member1Cookie)).data.user;

    const mbr2Res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'member2@example.com', password: 'member123' }),
    });
    const member2Cookie = getCookie(mbr2Res);
    assert.ok(member2Cookie, 'Member 2 cookie extraction failed');
    const member2User = (await makeRequest('/auth/me', { method: 'GET' }, member2Cookie)).data.user;

    console.log('✔ Authenticated Manager, Member 1 (Alice), and Member 2 (Bob).');

    // 2. Set up Test Projects & Tasks Seed
    console.log('\n[TEST 2] Setting up Test Projects & Varied Tasks...');
    const p1Key = 'PSEARCH' + Math.floor(Math.random() * 1000);
    const p1Res = await makeRequest('/projects', {
      method: 'POST',
      body: JSON.stringify({
        key: p1Key,
        name: 'Search Alpha Project',
        ownerId: managerUser.id,
        members: [managerUser.id, member1User.id], // Only Alice and Manager
      }),
    }, managerCookie);
    const proj1Id = p1Res.data.data._id;

    const p2Key = 'PBETA' + Math.floor(Math.random() * 1000);
    const p2Res = await makeRequest('/projects', {
      method: 'POST',
      body: JSON.stringify({
        key: p2Key,
        name: 'Search Beta Project',
        ownerId: managerUser.id,
        members: [managerUser.id, member2User.id], // Only Bob and Manager
      }),
    }, managerCookie);
    const proj2Id = p2Res.data.data._id;

    // Create a variety of tasks in Project 1
    // Task A: High priority, assigned to Alice, Overdue
    const pastDate = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    const futureDate1 = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();
    const futureDate2 = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString();

    const tA = await makeRequest(`/tasks/project/${proj1Id}`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Fix Authentication Token Leak',
        description: 'Critical bug regarding session expiration and security headers.',
        priority: 'high',
        dueDate: pastDate,
        assignees: [member1User.id],
      }),
    }, managerCookie);
    const taskAId = tA.data.data._id;

    // Task B: Medium priority, assigned to Alice, in_progress
    const tB = await makeRequest(`/tasks/project/${proj1Id}`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Build Search Bar Filter UI',
        description: 'Design dark theme filter dropdowns and text input.',
        priority: 'medium',
        dueDate: futureDate1,
        assignees: [member1User.id],
      }),
    }, managerCookie);
    const taskBId = tB.data.data._id;
    await makeRequest(`/tasks/${taskBId}`, { method: 'PUT', body: JSON.stringify({ status: 'in_progress' }) }, managerCookie);

    // Task C: Low priority, unassigned, in_review
    const tC = await makeRequest(`/tasks/project/${proj1Id}`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Documentation Review and Polish',
        description: 'Update decisions.md and schema architecture documents.',
        priority: 'low',
        dueDate: futureDate2,
      }),
    }, managerCookie);
    const taskCId = tC.data.data._id;
    await makeRequest(`/tasks/${taskCId}`, { method: 'PUT', body: JSON.stringify({ status: 'in_progress' }) }, managerCookie);
    await makeRequest(`/tasks/${taskCId}`, { method: 'PUT', body: JSON.stringify({ status: 'in_review' }) }, managerCookie);

    // Task D: Inside Project 2, assigned to Bob
    const tD = await makeRequest(`/tasks/project/${proj2Id}`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Database Index Performance Optimization',
        description: 'Add compound indices for fast sorting and searching.',
        priority: 'high',
        dueDate: futureDate1,
        assignees: [member2User.id],
      }),
    }, managerCookie);

    console.log('✔ Created test projects and seeded tasks with varied statuses, priorities, assignees, and due dates.');

    // 3. Test Text Search across Title and Description
    console.log('\n[TEST 3] Testing Server-Side Text Search...');
    // Search for "Authentication" (matches Task A title)
    const s1 = await makeRequest('/tasks?search=Authentication', { method: 'GET' }, managerCookie);
    assert.strictEqual(s1.status, 200);
    assert.ok(s1.data.data.some(t => t._id === taskAId), 'Search by title failed');
    assert.strictEqual(s1.data.data.every(t => t.title.includes('Authentication') || t.description.includes('Authentication')), true);
    console.log('✔ Search by title ("Authentication") returned correct match.');

    // Search for "decisions.md" (matches Task C description)
    const s2 = await makeRequest('/tasks?search=decisions.md', { method: 'GET' }, managerCookie);
    assert.strictEqual(s2.status, 200);
    assert.ok(s2.data.data.some(t => t._id === taskCId), 'Search by description failed');
    console.log('✔ Search by description ("decisions.md") returned correct match.');

    // Case-insensitive search
    const s3 = await makeRequest('/tasks?search=critical bug', { method: 'GET' }, managerCookie);
    assert.strictEqual(s3.status, 200);
    assert.ok(s3.data.data.some(t => t._id === taskAId), 'Case-insensitive search failed');
    console.log('✔ Case-insensitive search succeeded.');

    // 4. Test Single & Combined Filters
    console.log('\n[TEST 4] Testing Server-Side Filters...');
    // Filter by Project
    const fProj = await makeRequest(`/tasks?projectId=${proj1Id}`, { method: 'GET' }, managerCookie);
    assert.strictEqual(fProj.status, 200);
    assert.strictEqual(fProj.data.data.every(t => t.projectId._id === proj1Id), true);
    console.log('✔ Filter by projectId returned only Project 1 tasks.');

    // Filter by Status
    const fStatus = await makeRequest('/tasks?status=in_progress', { method: 'GET' }, managerCookie);
    assert.strictEqual(fStatus.status, 200);
    assert.strictEqual(fStatus.data.data.every(t => t.status === 'in_progress'), true);
    console.log('✔ Filter by status=in_progress returned only In Progress tasks.');

    // Filter by Priority
    const fPriority = await makeRequest('/tasks?priority=high', { method: 'GET' }, managerCookie);
    assert.strictEqual(fPriority.status, 200);
    assert.strictEqual(fPriority.data.data.every(t => t.priority === 'high'), true);
    console.log('✔ Filter by priority=high returned only high priority tasks.');

    // Filter by Assignee
    const fAssignee = await makeRequest(`/tasks?assigneeId=${member1User.id}`, { method: 'GET' }, managerCookie);
    assert.strictEqual(fAssignee.status, 200);
    assert.strictEqual(fAssignee.data.data.every(t => t.assignees.some(a => a._id === member1User.id)), true);
    console.log('✔ Filter by assigneeId returned only tasks assigned to Alice.');

    // Filter by Overdue
    const fOverdue = await makeRequest('/tasks?overdue=true', { method: 'GET' }, managerCookie);
    assert.strictEqual(fOverdue.status, 200);
    assert.ok(fOverdue.data.data.some(t => t._id === taskAId), 'Overdue task not returned');
    assert.strictEqual(fOverdue.data.data.every(t => new Date(t.dueDate) < new Date() && t.status !== 'done'), true);
    console.log('✔ Filter by overdue=true returned only past-due, unfinished tasks.');

    // Combined: projectId + status + priority
    const fCombined = await makeRequest(`/tasks?projectId=${proj1Id}&status=in_progress&priority=medium`, { method: 'GET' }, managerCookie);
    assert.strictEqual(fCombined.status, 200);
    assert.strictEqual(fCombined.data.data.length, 1);
    assert.strictEqual(fCombined.data.data[0]._id, taskBId);
    console.log('✔ Combined multi-criteria filter (project + status + priority) returned exact match.');

    // 5. Test Server-Side Pagination
    console.log('\n[TEST 5] Testing Server-Side Pagination & Total Counts...');
    const pPage1 = await makeRequest(`/tasks?projectId=${proj1Id}&limit=2&page=1`, { method: 'GET' }, managerCookie);
    assert.strictEqual(pPage1.status, 200);
    assert.strictEqual(pPage1.data.data.length, 2);
    assert.strictEqual(pPage1.data.pagination.page, 1);
    assert.strictEqual(pPage1.data.pagination.limit, 2);
    assert.strictEqual(pPage1.data.pagination.total, 3);
    assert.strictEqual(pPage1.data.pagination.totalPages, 2);
    assert.strictEqual(pPage1.data.pagination.hasNextPage, true);
    assert.strictEqual(pPage1.data.pagination.hasPrevPage, false);

    const pPage2 = await makeRequest(`/tasks?projectId=${proj1Id}&limit=2&page=2`, { method: 'GET' }, managerCookie);
    assert.strictEqual(pPage2.status, 200);
    assert.strictEqual(pPage2.data.data.length, 1);
    assert.strictEqual(pPage2.data.pagination.page, 2);
    assert.strictEqual(pPage2.data.pagination.hasNextPage, false);
    assert.strictEqual(pPage2.data.pagination.hasPrevPage, true);
    console.log('✔ Server-side pagination (limit, page, totalPages, prev/next) verified.');

    // 6. Test Sorting
    console.log('\n[TEST 6] Testing Server-Side Sorting...');
    // Sort by dueDate asc
    const sDueAsc = await makeRequest(`/tasks?projectId=${proj1Id}&sortBy=dueDate&order=asc`, { method: 'GET' }, managerCookie);
    assert.strictEqual(sDueAsc.status, 200);
    assert.strictEqual(sDueAsc.data.data[0]._id, taskAId, 'Earliest due date task was not first');

    // Sort by dueDate desc
    const sDueDesc = await makeRequest(`/tasks?projectId=${proj1Id}&sortBy=dueDate&order=desc`, { method: 'GET' }, managerCookie);
    assert.strictEqual(sDueDesc.status, 200);
    assert.strictEqual(sDueDesc.data.data[0]._id, taskCId, 'Latest due date task was not first');
    console.log('✔ Server-side sorting by Due Date (asc/desc) verified.');

    // 7. Test Permission Scoping & Boundaries
    console.log('\n[TEST 7] Testing Permission Boundaries & Member Isolation...');
    // Alice requests all tasks -> should only see Project 1 tasks (not Project 2)
    const aliceTasks = await makeRequest('/tasks', { method: 'GET' }, member1Cookie);
    assert.strictEqual(aliceTasks.status, 200);
    const aliceHasProj2 = aliceTasks.data.data.some(t => t.projectId._id === proj2Id);
    assert.strictEqual(aliceHasProj2, false, 'Member was able to see tasks from an unauthorized project');
    console.log('✔ Member 1 is restricted to tasks from their assigned projects.');

    // Alice explicitly queries Project 2 by ID -> Server must return 403 Forbidden
    const aliceProj2Access = await makeRequest(`/tasks?projectId=${proj2Id}`, { method: 'GET' }, member1Cookie);
    assert.strictEqual(aliceProj2Access.status, 403, 'Server allowed member to query unauthorized projectId');
    console.log('✔ Server rejected unauthorized projectId query with 403 Forbidden.');

    // 8. Test "My Tasks" Personal Scope
    console.log('\n[TEST 8] Testing "My Tasks" Personal View...');
    // Alice queries My Tasks -> should only return tasks assigned to Alice
    const myTasksAlice = await makeRequest('/tasks?myTasks=true', { method: 'GET' }, member1Cookie);
    assert.strictEqual(myTasksAlice.status, 200);
    assert.ok(myTasksAlice.data.data.some(t => t._id === taskAId));
    assert.ok(myTasksAlice.data.data.some(t => t._id === taskBId));
    assert.strictEqual(myTasksAlice.data.data.some(t => t._id === taskCId), false, 'Unassigned task appeared in My Tasks');
    assert.strictEqual(myTasksAlice.data.data.every(t => t.assignees.some(a => a._id === member1User.id)), true);
    console.log('✔ My Tasks returns only tasks specifically assigned to the logged-in user.');

    // Clean up test projects
    await makeRequest(`/projects/${proj1Id}`, { method: 'DELETE' }, managerCookie);
    await makeRequest(`/projects/${proj2Id}`, { method: 'DELETE' }, managerCookie);
    console.log('✔ Cleaned up search test projects.');

    console.log('\n✔✔✔ ALL SEARCH, FILTER & PAGINATION TESTS PASSED SUCCESSFULLY! ✔✔✔\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ SEARCH & FILTER TEST FAILED:');
    console.error(err);
    process.exit(1);
  }
};

runSearchFilterTests();
