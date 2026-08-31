const assert = require('assert');

const BASE_URL = 'http://127.0.0.1:5000/api';
let managerCookie = '';
let memberCookie = '';
let member2Cookie = '';

// Helper to extract cookie from response headers
const getCookie = (res) => {
  const setCookie = res.headers.get('set-cookie');
  if (setCookie) {
    // Return the token cookie part
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

const runTests = async () => {
  console.log('--- STARTING AUTH & ACCESS INTEGRATION TESTS ---');

  try {
    // 1. Authenticate users
    console.log('\n[TEST 1] Logging in Manager and Members...');
    
    const mgrLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'manager@example.com', password: 'manager123' }),
    });
    assert.strictEqual(mgrLogin.status, 200, 'Manager login failed');
    managerCookie = getCookie(mgrLogin.responseRaw || { headers: { get: () => mgrLogin.cookie } });
    // In node fetch, headers can be read directly
    console.log('✔ Manager login successful');

    const mbrLogin = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'member1@example.com', password: 'member123' }),
    });
    assert.strictEqual(mbrLogin.status, 200, 'Member 1 login failed');
    
    const mbr2Login = await makeRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'member2@example.com', password: 'member123' }),
    });
    assert.strictEqual(mbr2Login.status, 200, 'Member 2 login failed');

    // Need raw headers for cookie extracting
    // Since fetch in makeRequest hides raw headers, let's perform login manually to get cookies
    const res1 = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@example.com', password: 'manager123' }),
    });
    managerCookie = getCookie(res1);

    const res2 = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'member1@example.com', password: 'member123' }),
    });
    memberCookie = getCookie(res2);

    const res3 = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'member2@example.com', password: 'member123' }),
    });
    member2Cookie = getCookie(res3);

    assert.ok(managerCookie, 'Manager cookie empty');
    assert.ok(memberCookie, 'Member cookie empty');
    console.log('✔ Cookies successfully extracted');

    // 2. Test Project Creation Permissions (Manager vs Member)
    console.log('\n[TEST 2] Testing Project Creation Permissions...');
    
    // Member tries to create project -> should fail (403)
    const failProj = await makeRequest('/projects', {
      method: 'POST',
      body: JSON.stringify({
        key: 'TESTFAIL',
        name: 'Failure Project',
        ownerId: 'some-id',
      }),
    }, memberCookie);
    assert.strictEqual(failProj.status, 403, 'Member was allowed to create a project');
    console.log('✔ Member project creation blocked (403 Forbidden) as expected');

    // Manager creates project -> should succeed (201)
    // Get Manager user ID from profile session
    const profile = await makeRequest('/auth/me', { method: 'GET' }, managerCookie);
    const managerId = profile.data.user.id;
    const member1Id = (await makeRequest('/auth/me', { method: 'GET' }, memberCookie)).data.user.id;
    const member2Id = (await makeRequest('/auth/me', { method: 'GET' }, member2Cookie)).data.user.id;

    const projectKey = 'TESTKEY' + Math.floor(Math.random() * 1000);
    const successProj = await makeRequest('/projects', {
      method: 'POST',
      body: JSON.stringify({
        key: projectKey,
        name: 'Integration Test Project',
        ownerId: managerId,
        members: [managerId, member1Id], // Only include manager and member1 initially
      }),
    }, managerCookie);
    assert.strictEqual(successProj.status, 201, 'Manager project creation failed: ' + JSON.stringify(successProj.data));
    const projectId = successProj.data.data._id;
    console.log(`✔ Manager created project with ID: ${projectId}`);

    // 3. Test Project Scoped Access for Members
    console.log('\n[TEST 3] Testing Project Access Isolation...');
    
    // Member 1 (in project) should see it
    const member1Projects = await makeRequest('/projects', { method: 'GET' }, memberCookie);
    const hasProj1 = member1Projects.data.data.some(p => p._id === projectId);
    assert.strictEqual(hasProj1, true, 'Member 1 could not view project they belong to');
    console.log('✔ Member 1 (Project Team) successfully views the project');

    // Member 2 (not in project) should NOT see it
    const member2Projects = await makeRequest('/projects', { method: 'GET' }, member2Cookie);
    const hasProj2 = member2Projects.data.data.some(p => p._id === projectId);
    assert.strictEqual(hasProj2, false, 'Member 2 was able to view project they do not belong to');
    console.log('✔ Member 2 (Non-team) is blocked from viewing the project');

    // 4. Test Task Assignments Restrictions
    console.log('\n[TEST 4] Testing Task Assignment Member Boundaries...');
    
    // Create task assigning Member 1 (allowed)
    const taskSuccess = await makeRequest(`/tasks/project/${projectId}`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Task for Member 1',
        assignees: [member1Id],
      }),
    }, managerCookie);
    assert.strictEqual(taskSuccess.status, 201, 'Failed to assign project member to task');
    const taskId = taskSuccess.data.data._id;
    console.log('✔ Successfully created task assigned to project member');

    // Attempt to assign Member 2 (should fail because Member 2 is not in the project)
    const taskFail = await makeRequest(`/tasks/project/${projectId}`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Task for Member 2',
        assignees: [member2Id],
      }),
    }, managerCookie);
    assert.strictEqual(taskFail.status, 400, 'Allowed to assign non-member to project task');
    console.log('✔ Server blocked assigning non-member to task as expected');

    // 5. Test State Transitions Sequence Rules
    console.log('\n[TEST 5] Testing Lifecycle Transition Rules...');
    
    // Backlog -> Done (Illegal direct jump) -> should fail (400)
    const jumpDone = await makeRequest(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'done' }),
    }, memberCookie);
    assert.strictEqual(jumpDone.status, 400, 'Allowed to jump directly to Done');
    console.log('✔ Backlog ➔ Done direct transition blocked as expected');

    // Backlog -> In Progress (Allowed)
    const toProgress = await makeRequest(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'in_progress' }),
    }, memberCookie);
    assert.strictEqual(toProgress.status, 200, 'Backlog ➔ In Progress failed');
    console.log('✔ Backlog ➔ In Progress transition successful');

    // In Progress -> Done (Illegal sequential jump) -> should fail (400)
    const jumpProgressToDone = await makeRequest(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'done' }),
    }, memberCookie);
    assert.strictEqual(jumpProgressToDone.status, 400, 'Allowed to bypass In Review');
    console.log('✔ In Progress ➔ Done transition blocked as expected');

    // In Progress -> In Review (Allowed)
    const toReview = await makeRequest(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'in_review' }),
    }, memberCookie);
    assert.strictEqual(toReview.status, 200, 'In Progress ➔ In Review failed');
    console.log('✔ In Progress ➔ In Review transition successful');

    // 6. Test Task Blocker Rules
    console.log('\n[TEST 6] Testing Blocker Dependencies...');

    // Create a blocker task (Task B) which is in 'backlog'
    const blockerTaskRes = await makeRequest(`/tasks/project/${projectId}`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Blocker Task B',
      }),
    }, managerCookie);
    const blockerTaskId = blockerTaskRes.data.data._id;
    console.log(`✔ Created dependency task: ${blockerTaskId}`);

    // Link Task B as blocker to Task A (our original task)
    const linkBlocker = await makeRequest(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ blockers: [blockerTaskId] }),
    }, memberCookie);
    assert.strictEqual(linkBlocker.status, 200, 'Failed to link blocker dependency');
    console.log('✔ Dependency link saved to original task');

    // Attempt to transition Task A to 'done' -> should fail because blocker is in 'backlog'
    const completeBlocked = await makeRequest(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'done' }),
    }, memberCookie);
    assert.strictEqual(completeBlocked.status, 400, 'Allowed to complete a blocked task');
    assert.ok(completeBlocked.data.error.includes('blocked'), 'Did not return blocker info');
    console.log('✔ Blocked task Done transition successfully blocked by server');

    // Resolve blocker Task B: backlog -> in_progress -> in_review -> done
    await makeRequest(`/tasks/${blockerTaskId}`, { method: 'PUT', body: JSON.stringify({ status: 'in_progress' }) }, memberCookie);
    await makeRequest(`/tasks/${blockerTaskId}`, { method: 'PUT', body: JSON.stringify({ status: 'in_review' }) }, memberCookie);
    const resolveBlocker = await makeRequest(`/tasks/${blockerTaskId}`, { method: 'PUT', body: JSON.stringify({ status: 'done' }) }, memberCookie);
    assert.strictEqual(resolveBlocker.status, 200, 'Failed to resolve blocker task');
    console.log('✔ Blocker task completed');

    // Now transition Task A to 'done' -> should succeed
    const completeTask = await makeRequest(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'done' }),
    }, memberCookie);
    assert.strictEqual(completeTask.status, 200, 'Failed to complete task after resolving blocker');
    console.log('✔ Task successfully transitioned to Done after dependency resolution');

    // 7. Test Cascade Unassignment on Project Member Removal
    console.log('\n[TEST 7] Testing Cascade Unassignment on Member Removal...');
    
    // Create new task, assign Member 1
    const unassignTask = await makeRequest(`/tasks/project/${projectId}`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Cascade Unassignment Task',
        assignees: [member1Id],
      }),
    }, managerCookie);
    const cascadeTaskId = unassignTask.data.data._id;
    
    // Verify member1 is assigned
    let tDetails = await makeRequest(`/tasks/${cascadeTaskId}`, { method: 'GET' }, managerCookie);
    assert.strictEqual(tDetails.data.data.assignees.some(a => a._id === member1Id), true, 'Member 1 was not assigned initially');
    console.log('✔ Member 1 assigned to cascade check task');

    // Remove Member 1 from project members list
    const removeMbr = await makeRequest(`/projects/${projectId}/members/${member1Id}`, {
      method: 'DELETE',
    }, managerCookie);
    assert.strictEqual(removeMbr.status, 200, 'Failed to remove project member');
    console.log('✔ Manager removed Member 1 from the project');

    // Retrieve task details and verify Member 1 has been pulled from assignees
    tDetails = await makeRequest(`/tasks/${cascadeTaskId}`, { method: 'GET' }, managerCookie);
    const isStillAssigned = tDetails.data.data.assignees.some(a => a._id === member1Id);
    assert.strictEqual(isStillAssigned, false, 'Member 1 was not automatically unassigned from the task');
    console.log('✔ Cascade hook successfully unassigned Member 1 from the task');

    // 8. Test Task Deletion Scopes (Manager vs Member)
    console.log('\n[TEST 8] Testing Task Deletion Permissions...');
    
    // Member tries to delete task -> should fail (403)
    const failDel = await makeRequest(`/tasks/${cascadeTaskId}`, { method: 'DELETE' }, memberCookie);
    assert.strictEqual(failDel.status, 403, 'Member was allowed to delete task');
    console.log('✔ Member task deletion request blocked (403 Forbidden) as expected');

    // Manager deletes task -> should succeed (200)
    const successDel = await makeRequest(`/tasks/${cascadeTaskId}`, { method: 'DELETE' }, managerCookie);
    assert.strictEqual(successDel.status, 200, 'Manager failed to delete task');
    console.log('✔ Manager successfully deleted the task');

    console.log('\n✔✔✔ ALL INTEGRATION TESTS PASSED SUCCESSFULLY! ✔✔✔');
  } catch (error) {
    console.error('\n✖✖✖ INTEGRATION TEST FAILED! ✖✖✖');
    console.error(error);
    process.exit(1);
  }
};

runTests();
