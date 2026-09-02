const assert = require('assert');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

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

const runAlertTests = async () => {
  console.log('\n=== RUNNING OVERDUE ALERTS & DISMISSALS TESTS (GOAL 10) ===');

  try {
    // 1. Authenticate Manager, Alice (Member 1), and Bob (Member 2)
    console.log('\n[TEST 1] Authenticating Manager, Alice (Member 1), and Bob (Member 2)...');
    const mgrRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@example.com', password: 'manager123' }),
    });
    assert.strictEqual(mgrRes.status, 200);
    const managerCookie = getCookie(mgrRes);
    const managerUser = (await makeRequest('/auth/me', { method: 'GET' }, managerCookie)).data.user;

    const aliceRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'member1@example.com', password: 'member123' }),
    });
    assert.strictEqual(aliceRes.status, 200);
    const aliceCookie = getCookie(aliceRes);
    const aliceUser = (await makeRequest('/auth/me', { method: 'GET' }, aliceCookie)).data.user;

    const bobRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'member2@example.com', password: 'member123' }),
    });
    assert.strictEqual(bobRes.status, 200);
    const bobCookie = getCookie(bobRes);
    const bobUser = (await makeRequest('/auth/me', { method: 'GET' }, bobCookie)).data.user;

    console.log('✔ Authenticated Manager, Alice, and Bob successfully.');

    // 2. Set up test project with Alice and Bob
    console.log('\n[TEST 2] Setting up Test Project with Alice and Bob...');
    const pKey = 'PALRT' + Math.floor(Math.random() * 1000);
    const pRes = await makeRequest('/projects', {
      method: 'POST',
      body: JSON.stringify({
        key: pKey,
        name: 'Overdue Alert Test Project',
        ownerId: managerUser.id,
        members: [managerUser.id, aliceUser.id, bobUser.id],
      }),
    }, managerCookie);
    assert.strictEqual(pRes.status, 201);
    const projectId = pRes.data.data._id;
    console.log(`✔ Created project: ${pKey} (${projectId})`);

    // 3. Create Overdue Task assigned to Alice
    console.log('\n[TEST 3] Testing Unfinished Overdue Task ➔ Generates Alert...');
    const pastDueDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000); // 3 days ago
    const taskRes = await makeRequest(`/tasks/project/${projectId}`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Task Assigned to Alice',
        priority: 'high',
        dueDate: pastDueDate.toISOString(),
        assignees: [aliceUser.id],
      }),
    }, managerCookie);
    assert.strictEqual(taskRes.status, 201);
    const taskId = taskRes.data.data._id;

    // Check Alice's alerts
    const aliceAlerts = await makeRequest('/alerts', { method: 'GET' }, aliceCookie);
    assert.strictEqual(aliceAlerts.status, 200);
    assert.ok(aliceAlerts.data.activeAlerts.some(a => a._id === taskId), 'Task must appear in Alice active alerts');
    assert.strictEqual(aliceAlerts.data.count >= 1, true);

    // Check Alice's alert count endpoint
    const aliceCount = await makeRequest('/alerts/count', { method: 'GET' }, aliceCookie);
    assert.strictEqual(aliceCount.status, 200);
    assert.strictEqual(aliceCount.data.count, aliceAlerts.data.count);
    console.log('✔ Unfinished overdue task successfully generated active alert with correct count badge.');

    // 4. Test Unassigned User Cannot Dismiss
    console.log('\n[TEST 4] Testing Unassigned User Cannot Dismiss Alert (403 Forbidden)...');
    // Bob is NOT assigned to this task -> attempt dismiss
    const bobDismiss = await makeRequest(`/alerts/${taskId}/dismiss`, { method: 'POST' }, bobCookie);
    assert.strictEqual(bobDismiss.status, 403, 'Unassigned user Bob was able to dismiss alert');
    assert.ok(bobDismiss.data.error.includes('assigned'), 'Error must specify only assigned users can dismiss');

    // Manager (also unassigned to this specific task) -> attempt dismiss
    const mgrDismiss = await makeRequest(`/alerts/${taskId}/dismiss`, { method: 'POST' }, managerCookie);
    assert.strictEqual(mgrDismiss.status, 403, 'Unassigned Manager was able to dismiss alert');
    console.log('✔ Server rejected unassigned user (and unassigned manager) dismissal with 403 Forbidden.');

    // 5. Test Assigned User CAN Dismiss Alert
    console.log('\n[TEST 5] Testing Assigned User Alice CAN Dismiss Alert...');
    const aliceDismiss = await makeRequest(`/alerts/${taskId}/dismiss`, { method: 'POST' }, aliceCookie);
    assert.strictEqual(aliceDismiss.status, 200);
    assert.strictEqual(aliceDismiss.data.success, true);

    // Verify task is now dismissed for Alice
    const aliceAlertsAfterDismiss = await makeRequest('/alerts', { method: 'GET' }, aliceCookie);
    assert.strictEqual(aliceAlertsAfterDismiss.status, 200);
    assert.ok(!aliceAlertsAfterDismiss.data.activeAlerts.some(a => a._id === taskId), 'Task must NOT appear in active alerts');
    assert.ok(aliceAlertsAfterDismiss.data.dismissedAlerts.some(a => a._id === taskId), 'Task must appear in dismissed alerts');

    const aliceCountAfterDismiss = await makeRequest('/alerts/count', { method: 'GET' }, aliceCookie);
    assert.strictEqual(aliceCountAfterDismiss.data.count, aliceAlertsAfterDismiss.data.count);
    console.log('✔ Assigned user Alice successfully dismissed alert; alert count decreased.');

    // 6. Test Changing Due Date Causes Alert to Reappear!
    console.log('\n[TEST 6] Testing Changing Due Date Causes Dismissed Alert to Reappear...');
    const newPastDueDate = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000); // 1 day ago (still overdue)
    const updateDueRes = await makeRequest(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ dueDate: newPastDueDate.toISOString() }),
    }, managerCookie);
    assert.strictEqual(updateDueRes.status, 200);

    // Verify alert is active again for Alice
    const aliceAlertsAfterDateChange = await makeRequest('/alerts', { method: 'GET' }, aliceCookie);
    assert.strictEqual(aliceAlertsAfterDateChange.status, 200);
    assert.ok(aliceAlertsAfterDateChange.data.activeAlerts.some(a => a._id === taskId), 'Alert must reappear in active alerts after due date changed');
    assert.ok(!aliceAlertsAfterDateChange.data.dismissedAlerts.some(a => a._id === taskId), 'Alert must no longer be dismissed');
    console.log('✔ Changing due date successfully caused the dismissed alert to automatically reappear!');

    // 7. Test Done Task ➔ No Overdue Alert
    console.log('\n[TEST 7] Testing Done Task ➔ No Overdue Alert...');
    // Move task: backlog -> in_progress -> in_review -> done
    await makeRequest(`/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify({ status: 'in_progress' }) }, aliceCookie);
    await makeRequest(`/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify({ status: 'in_review' }) }, aliceCookie);
    const markDone = await makeRequest(`/tasks/${taskId}`, { method: 'PUT', body: JSON.stringify({ status: 'done' }) }, aliceCookie);
    assert.strictEqual(markDone.status, 200);

    const aliceAlertsAfterDone = await makeRequest('/alerts', { method: 'GET' }, aliceCookie);
    assert.strictEqual(aliceAlertsAfterDone.status, 200);
    assert.ok(!aliceAlertsAfterDone.data.activeAlerts.some(a => a._id === taskId), 'Done task must NOT appear in active overdue alerts');
    assert.ok(!aliceAlertsAfterDone.data.dismissedAlerts.some(a => a._id === taskId), 'Done task must NOT appear in dismissed overdue alerts');
    console.log('✔ Completed (Done) task produces zero overdue alerts.');

    // 8. Test Reopening Completed Task Re-triggers Alert
    console.log('\n[TEST 8] Testing Reopening Task to Backlog Restores Overdue Alert...');
    const reopenTask = await makeRequest(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'backlog' }),
    }, aliceCookie);
    assert.strictEqual(reopenTask.status, 200);

    const aliceAlertsAfterReopen = await makeRequest('/alerts', { method: 'GET' }, aliceCookie);
    assert.ok(aliceAlertsAfterReopen.data.activeAlerts.some(a => a._id === taskId), 'Reopened task with past due date must trigger overdue alert');
    console.log('✔ Reopened task immediately restores its active overdue alert.');

    // Clean up project
    await makeRequest(`/projects/${projectId}`, { method: 'DELETE' }, managerCookie);
    console.log('✔ Cleaned up alert test project.');

    console.log('\n✔✔✔ ALL OVERDUE ALERTS & DISMISSALS TESTS PASSED SUCCESSFULLY! ✔✔✔\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ ALERT TEST FAILED:\n', error);
    process.exit(1);
  }
};

runAlertTests();
