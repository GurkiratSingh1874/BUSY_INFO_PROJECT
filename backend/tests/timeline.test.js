const assert = require('assert');
const path = require('path');
const mongoose = require('mongoose');
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

const runTimelineTests = async () => {
  console.log('\n=== RUNNING IMMUTABLE TIMELINE & AUDIT HISTORY TESTS (GOAL 9) ===');

  try {
    // 1. Authenticate users
    console.log('\n[TEST 1] Authenticating Manager and Alice (Member)...');
    const mgrRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'manager@example.com', password: 'manager123' }),
    });
    assert.strictEqual(mgrRes.status, 200);
    const managerCookie = getCookie(mgrRes);
    const managerUser = (await makeRequest('/auth/me', { method: 'GET' }, managerCookie)).data.user;

    const mbrRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'member1@example.com', password: 'member123' }),
    });
    assert.strictEqual(mbrRes.status, 200);
    const memberCookie = getCookie(mbrRes);
    const memberUser = (await makeRequest('/auth/me', { method: 'GET' }, memberCookie)).data.user;

    console.log('✔ Authenticated Manager and Alice successfully.');

    // 2. Set up a test project
    console.log('\n[TEST 2] Setting up Test Project...');
    const pKey = 'PTIME' + Math.floor(Math.random() * 1000);
    const pRes = await makeRequest('/projects', {
      method: 'POST',
      body: JSON.stringify({
        key: pKey,
        name: 'Timeline Audit Project',
        ownerId: managerUser.id,
        members: [managerUser.id, memberUser.id],
      }),
    }, managerCookie);
    assert.strictEqual(pRes.status, 201);
    const projectId = pRes.data.data._id;
    console.log(`✔ Created project: ${pKey} (${projectId})`);

    // 3. Test Task Creation History
    console.log('\n[TEST 3] Testing Task Creation History Entry...');
    const createRes = await makeRequest(`/tasks/project/${projectId}`, {
      method: 'POST',
      body: JSON.stringify({
        title: 'Initial Task for Timeline Testing',
        description: 'Testing immutable audit history',
        priority: 'medium',
      }),
    }, managerCookie);
    assert.strictEqual(createRes.status, 201);
    const taskId = createRes.data.data._id;

    // Fetch task details including timeline
    let taskDetails = await makeRequest(`/tasks/${taskId}`, { method: 'GET' }, managerCookie);
    assert.strictEqual(taskDetails.status, 200);
    let timeline = taskDetails.data.timeline;
    assert.ok(Array.isArray(timeline), 'Timeline must be an array');
    assert.strictEqual(timeline.length, 1, 'Should have exactly 1 timeline event (create)');
    assert.strictEqual(timeline[0].type, 'create');
    assert.strictEqual(timeline[0].userId._id, managerUser.id);
    assert.ok(timeline[0].createdAt, 'Event must have createdAt timestamp');
    console.log('✔ Task creation event recorded with actor ID, timestamp, and type="create".');

    // 4. Test Status Change History
    console.log('\n[TEST 4] Testing Status Change History Entry...');
    const statusRes = await makeRequest(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ status: 'in_progress' }),
    }, memberCookie);
    assert.strictEqual(statusRes.status, 200);

    taskDetails = await makeRequest(`/tasks/${taskId}`, { method: 'GET' }, managerCookie);
    timeline = taskDetails.data.timeline;
    assert.strictEqual(timeline.length, 2, 'Should have 2 timeline events');
    const statusEvent = timeline[1];
    assert.strictEqual(statusEvent.type, 'field_change');
    assert.strictEqual(statusEvent.fieldName, 'status');
    assert.strictEqual(statusEvent.oldValue, 'backlog');
    assert.strictEqual(statusEvent.newValue, 'in_progress');
    assert.strictEqual(statusEvent.userId._id, memberUser.id);
    console.log('✔ Status change event recorded: backlog ➔ in_progress by Member Alice.');

    // 5. Test Priority Change History
    console.log('\n[TEST 5] Testing Priority Change History Entry...');
    const prioRes = await makeRequest(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ priority: 'high' }),
    }, memberCookie);
    assert.strictEqual(prioRes.status, 200);

    taskDetails = await makeRequest(`/tasks/${taskId}`, { method: 'GET' }, managerCookie);
    timeline = taskDetails.data.timeline;
    assert.strictEqual(timeline.length, 3, 'Should have 3 timeline events');
    const prioEvent = timeline[2];
    assert.strictEqual(prioEvent.type, 'field_change');
    assert.strictEqual(prioEvent.fieldName, 'priority');
    assert.strictEqual(prioEvent.oldValue, 'medium');
    assert.strictEqual(prioEvent.newValue, 'high');
    assert.strictEqual(prioEvent.userId._id, memberUser.id);
    console.log('✔ Priority change event recorded: medium ➔ high by Member Alice.');

    // 6. Test Due-Date Change History
    console.log('\n[TEST 6] Testing Due-Date Change History Entry...');
    const targetDueDate = new Date('2026-10-15T12:00:00.000Z');
    const dueRes = await makeRequest(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ dueDate: targetDueDate.toISOString() }),
    }, managerCookie);
    assert.strictEqual(dueRes.status, 200);

    taskDetails = await makeRequest(`/tasks/${taskId}`, { method: 'GET' }, managerCookie);
    timeline = taskDetails.data.timeline;
    assert.strictEqual(timeline.length, 4, 'Should have 4 timeline events');
    const dueEvent = timeline[3];
    assert.strictEqual(dueEvent.type, 'field_change');
    assert.strictEqual(dueEvent.fieldName, 'dueDate');
    assert.strictEqual(dueEvent.oldValue, null);
    assert.strictEqual(new Date(dueEvent.newValue).toISOString(), targetDueDate.toISOString());
    console.log('✔ Due date change event recorded: null ➔ 2026-10-15.');

    // 7. Test Assignment and Unassignment History
    console.log('\n[TEST 7] Testing Assignment & Unassignment History...');
    // Assign Alice
    const assignRes = await makeRequest(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ assignees: [memberUser.id] }),
    }, managerCookie);
    assert.strictEqual(assignRes.status, 200);

    taskDetails = await makeRequest(`/tasks/${taskId}`, { method: 'GET' }, managerCookie);
    timeline = taskDetails.data.timeline;
    assert.strictEqual(timeline.length, 5, 'Should have 5 timeline events');
    const assignEvent = timeline[4];
    assert.strictEqual(assignEvent.type, 'assign');
    assert.strictEqual(assignEvent.newValue, memberUser.id);
    console.log('✔ Assignment event recorded for Member Alice.');

    // Unassign Alice
    const unassignRes = await makeRequest(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify({ assignees: [] }),
    }, managerCookie);
    assert.strictEqual(unassignRes.status, 200);

    taskDetails = await makeRequest(`/tasks/${taskId}`, { method: 'GET' }, managerCookie);
    timeline = taskDetails.data.timeline;
    assert.strictEqual(timeline.length, 6, 'Should have 6 timeline events');
    const unassignEvent = timeline[5];
    assert.strictEqual(unassignEvent.type, 'unassign');
    assert.strictEqual(unassignEvent.oldValue, memberUser.id);
    console.log('✔ Unassignment event recorded.');

    // 8. Test Comments in Timeline
    console.log('\n[TEST 8] Testing Comments Added to Timeline...');
    const commentRes = await makeRequest(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ commentText: 'This is a formal immutable comment update.' }),
    }, memberCookie);
    assert.strictEqual(commentRes.status, 201);
    const createdComment = commentRes.data.data;
    assert.strictEqual(createdComment.type, 'comment');
    assert.strictEqual(createdComment.commentText, 'This is a formal immutable comment update.');

    taskDetails = await makeRequest(`/tasks/${taskId}`, { method: 'GET' }, managerCookie);
    timeline = taskDetails.data.timeline;
    assert.strictEqual(timeline.length, 7, 'Should have 7 timeline events');
    const commentTimelineEvent = timeline[6];
    assert.strictEqual(commentTimelineEvent.type, 'comment');
    assert.strictEqual(commentTimelineEvent.commentText, 'This is a formal immutable comment update.');
    console.log('✔ Comment successfully incorporated into unified chronological timeline.');

    // 9. Test Attempted History Modification via HTTP (Managers & Members)
    console.log('\n[TEST 9] Testing HTTP Rejection of Attempted History Modification...');
    const timelineEventId = timeline[0]._id;

    // Manager attempts PUT on timeline event
    const editTimelineRes = await makeRequest(`/tasks/${taskId}/timeline/${timelineEventId}`, {
      method: 'PUT',
      body: JSON.stringify({ newValue: 'hacked_value' }),
    }, managerCookie);
    assert.strictEqual(editTimelineRes.status, 403, 'Manager should be forbidden from editing timeline');
    assert.ok(editTimelineRes.data.error.includes('immutable'));

    // Manager attempts DELETE on timeline event
    const deleteTimelineRes = await makeRequest(`/tasks/${taskId}/timeline/${timelineEventId}`, {
      method: 'DELETE',
    }, managerCookie);
    assert.strictEqual(deleteTimelineRes.status, 403, 'Manager should be forbidden from deleting timeline');
    assert.ok(deleteTimelineRes.data.error.includes('immutable'));

    // Member attempts PUT on comment
    const editCommentRes = await makeRequest(`/tasks/${taskId}/comments/${createdComment._id}`, {
      method: 'PUT',
      body: JSON.stringify({ commentText: 'Rewritten comment' }),
    }, memberCookie);
    assert.strictEqual(editCommentRes.status, 403, 'Member should be forbidden from editing comments');

    // Member attempts DELETE on comment
    const deleteCommentRes = await makeRequest(`/tasks/${taskId}/comments/${createdComment._id}`, {
      method: 'DELETE',
    }, memberCookie);
    assert.strictEqual(deleteCommentRes.status, 403, 'Member should be forbidden from deleting comments');

    console.log('✔ All HTTP modification attempts on timeline and comments rejected with 403 Forbidden.');

    // 10. Test Database-Level Immutability Enforcement (Mongoose Hooks)
    console.log('\n[TEST 10] Testing Database-Level Immutability (Mongoose Middleware)...');
    // Connect directly via mongoose to test model hooks
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/busy_info');
    }
    const TaskTimeline = require('../models/TaskTimeline');

    // Attempt 1: doc.save() on an existing timeline document
    const existingDoc = await TaskTimeline.findById(timelineEventId);
    existingDoc.commentText = 'Attempted direct mutation';
    let docSaveError = null;
    try {
      await existingDoc.save();
    } catch (err) {
      docSaveError = err;
    }
    assert.ok(docSaveError, 'existingDoc.save() must throw an error');
    assert.ok(docSaveError.message.includes('immutable'), 'Error message must specify immutability');
    console.log('✔ doc.save() mutation on existing timeline document blocked by Mongoose hook.');

    // Attempt 2: TaskTimeline.updateOne()
    let updateOneError = null;
    try {
      await TaskTimeline.updateOne({ _id: timelineEventId }, { commentText: 'Hacked updateOne' });
    } catch (err) {
      updateOneError = err;
    }
    assert.ok(updateOneError, 'TaskTimeline.updateOne() must throw');
    console.log('✔ TaskTimeline.updateOne() blocked by Mongoose hook.');

    // Attempt 3: TaskTimeline.findOneAndUpdate()
    let findOneAndUpdateError = null;
    try {
      await TaskTimeline.findOneAndUpdate({ _id: timelineEventId }, { commentText: 'Hacked findOneAndUpdate' });
    } catch (err) {
      findOneAndUpdateError = err;
    }
    assert.ok(findOneAndUpdateError, 'TaskTimeline.findOneAndUpdate() must throw');
    console.log('✔ TaskTimeline.findOneAndUpdate() blocked by Mongoose hook.');

    // Attempt 4: TaskTimeline.deleteOne()
    let deleteOneError = null;
    try {
      await TaskTimeline.deleteOne({ _id: timelineEventId });
    } catch (err) {
      deleteOneError = err;
    }
    assert.ok(deleteOneError, 'TaskTimeline.deleteOne() must throw');
    console.log('✔ TaskTimeline.deleteOne() blocked by Mongoose hook.');

    // Attempt 5: TaskTimeline.deleteMany() without bypass flag
    let deleteManyError = null;
    try {
      await TaskTimeline.deleteMany({ _id: timelineEventId });
    } catch (err) {
      deleteManyError = err;
    }
    assert.ok(deleteManyError, 'TaskTimeline.deleteMany() must throw');
    console.log('✔ TaskTimeline.deleteMany() blocked by Mongoose hook.');

    // Clean up project
    await makeRequest(`/projects/${projectId}`, { method: 'DELETE' }, managerCookie);
    console.log('✔ Cleaned up timeline test project.');

    console.log('\n✔✔✔ ALL IMMUTABLE TIMELINE & AUDIT HISTORY TESTS PASSED SUCCESSFULLY! ✔✔✔\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ TIMELINE TEST FAILED:\n', error);
    process.exit(1);
  }
};

runTimelineTests();
