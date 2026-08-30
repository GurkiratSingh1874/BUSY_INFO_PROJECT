# Plan

## How did you break the work into sessions?

We have structured the work into 12 distinct, incremental milestones that can be completed over approximately 12 hours of total development time (about 2 hours a day for 6 sessions):

* **Session 1 (2 hours)**: Setup & Database Schema (Milestones 1 & 2)
* **Session 2 (2 hours)**: Auth, Roles, and Projects (Milestones 3 & 4)
* **Session 3 (2.5 hours)**: Tasks, Lifecycle Rules, and Assignments (Milestones 5 & 6)
* **Session 4 (2 hours)**: Search, Filter, Bulk Actions & CSV Export (Milestones 7 & 8)
* **Session 5 (2 hours)**: Dashboard & Immutable History (Milestones 9 & 10)
* **Session 6 (1.5 hours)**: Overdue Alerts, Testing, & Deployment (Milestones 11 & 12)

---

## What order did you build in, and why that order?

We follow the standard dependency-first building order:
1. **Foundation & Data Models (Milestones 1 & 2)**: Set up the folders and database schemas so that we have a solid data layer.
2. **Access Control (Milestone 3)**: Authentication and roles ensure that project and task API access rules can be validated securely from the start.
3. **Core Entities (Milestones 4 & 5)**: Create projects, then tasks. Enforce the core task state machine rules.
4. **Relations & Complex Rules (Milestone 6)**: Handle task assignments and dependency rules, which build directly on projects and tasks.
5. **Data Search & Editing (Milestones 7 & 8)**: Build search, pagination, bulk operations, and CSV export.
6. **Analytics & Metadata (Milestones 9, 10 & 11)**: Add the dashboard, read-only timelines/comments, and overdue alerts.
7. **Verification & Launch (Milestone 12)**: End with comprehensive API testing, final visual polish, and cloud deployment.

---

## What did you estimate versus what it actually took?

*(To be updated dynamically as we complete each session)*

| Milestone | Description | Estimated Time | Actual Time |
|-----------|-------------|----------------|-------------|
| MS 1 | Project Setup | 45m | |
| MS 2 | Database Schema | 45m | |
| MS 3 | Auth & Roles (Goal 1) | 1h 15m | |
| MS 4 | Projects (Goal 2) | 1h 15m | |
| MS 5 | Tasks & Lifecycle (Goals 3 & 4) | 1h 30m | |
| MS 6 | Assignments & Dependencies (Goal 5) | 1h | |
| MS 7 | Search/Filter/Page (Goal 6) | 1h 15m | |
| MS 8 | Bulk Actions & CSV (Goal 7) | 1h 15m | |
| MS 9 | Dashboard (Goal 8) | 1h | |
| MS 10 | Immutable History & Comments (Goal 9) | 1h | |
| MS 11 | Overdue Alerts (Goal 10) | 1h | |
| MS 12 | Test, Polish & Deploy | 1h | |
| **Total** | | **12h 40m** | |

---

## What did you cut when you ran short?

*(To be updated at the end of the project with details of any deferred features or scope adjustments)*

---

## Detailed Milestone Plan

### Milestone 1 — Project Setup
* **What we build**: Init backend (`package.json`, Express template, config) and frontend (Vite React app, proxy setting, CSS template).
* **Satisfies Goals**: Foundation.
* **Expected Files**:
  * `backend/package.json`, `backend/server.js`, `backend/.env.example`
  * `frontend/package.json`, `frontend/vite.config.js`, `frontend/src/index.css`
* **Approximate Time**: 45 minutes
* **What to test**: Server starts successfully, Vite dev server launches and proxies API requests.
* **Suggested Commit Message**: `feat(setup): initialize backend express server and frontend react vite project`

### Milestone 2 — Database & Schema
* **What we build**: Connect to MongoDB. Create Mongoose schemas for User, Project, Task, TaskTimeline, and AlertDismissal.
* **Satisfies Goals**: Core data modeling.
* **Expected Files**:
  * `backend/config/db.js`
  * `backend/models/User.js`, `backend/models/Project.js`, `backend/models/Task.js`, `backend/models/TaskTimeline.js`, `backend/models/AlertDismissal.js`
* **Approximate Time**: 45 minutes
* **What to test**: Database connection succeeds locally. Schema validation constraints operate as expected.
* **Suggested Commit Message**: `feat(database): define mongoose models and schemas for users, projects, tasks, timeline, and dismissals`

### Milestone 3 — Authentication & Roles
* **What we build**: Preseeded credentials helper, user authentication (JWT + cookies), login endpoint, and login UI.
* **Satisfies Goals**: Goal 1 (Accounts and roles).
* **Expected Files**:
  * `backend/middleware/auth.js` (JWT & role validators)
  * `backend/routes/auth.js`
  * `backend/utils/seed.js` (seeds 1 Manager and 2 Members)
  * `frontend/src/components/Login.jsx`
* **Approximate Time**: 1 hour 15 minutes
* **What to test**:
  * Check that preseeded users can login.
  * Check that JWT is stored in an HTTP-only cookie.
  * Check that accessing routes without a token returns a `401 Unauthorized` response.
* **Suggested Commit Message**: `feat(auth): implement jwt auth, seeding helper, and frontend login form`

### Milestone 4 — Projects
* **What we build**: Backend project endpoints (CRUD + archive + members list changes) and React Project views (listing projects, creating/archiving projects for Managers).
* **Satisfies Goals**: Goal 2 (Projects).
* **Expected Files**:
  * `backend/routes/projects.js`
  * `frontend/src/pages/Projects.jsx`, `frontend/src/components/ProjectMembersModal.jsx`
* **Approximate Time**: 1 hour 15 minutes
* **What to test**:
  * Verify only Managers can create/edit/archive projects and add/remove members.
  * Verify Members can only view projects they belong to.
  * Verify archived projects are hidden by default.
* **Suggested Commit Message**: `feat(projects): create project management APIs, page views, and membership assignment`

### Milestone 5 — Tasks & Lifecycle Rules
* **What we build**: Task endpoints and strict state machine rules. React project task board showing tasks in columns (`Backlog`, `In Progress`, `In Review`, `Done`, `Blocked`). Task detail drawer with transition buttons showing only valid options.
* **Satisfies Goals**: Goal 3 (Tasks inside projects), Goal 4 (Lifecycle rules).
* **Expected Files**:
  * `backend/routes/tasks.js`
  * `backend/utils/lifecycle.js` (validates task state transitions)
  * `frontend/src/pages/ProjectBoard.jsx`, `frontend/src/components/TaskDetailsDrawer.jsx`
* **Approximate Time**: 1 hour 30 minutes
* **What to test**:
  * Verify legal transitions are allowed.
  * Verify invalid transitions (e.g. Backlog -> Done) are rejected by the server.
  * Verify blocker state rules (cannot move to Done if blocking tasks are not Done).
* **Suggested Commit Message**: `feat(tasks): implement task board and enforce strict state machine lifecycle transitions`

### Milestone 6 — Assignments & Dependencies
* **What we build**: Multi-assignee support, task blocker selector UI. Auto-unassignment logic when a member is removed from a project. "My Tasks" view.
* **Satisfies Goals**: Goal 5 (Assignment).
* **Expected Files**:
  * `backend/routes/projects.js` (updated with member unassignment hook)
  * `frontend/src/pages/MyTasks.jsx`
* **Approximate Time**: 1 hour
* **What to test**:
  * Verify user removal from a project unassigns them from all tasks in that project.
  * Verify "My Tasks" displays all tasks assigned to the user across projects.
  * Verify only project members can be assigned to tasks.
* **Suggested Commit Message**: `feat(assignments): enable multi-assignee task updates and automatic unassignment when user is removed from project`

### Milestone 7 — Search / Filter / Pagination
* **What we build**: Server-side search API (matching title/description) with filters (project, status, assignee, priority, overdue) and pagination. Build master search page with filters panel and paginated results table.
* **Satisfies Goals**: Goal 6 (Finding things).
* **Expected Files**:
  * `backend/routes/tasks.js` (extended for filter/search/sort query parameters)
  * `frontend/src/pages/SearchTasks.jsx`
* **Approximate Time**: 1 hour 15 minutes
* **What to test**:
  * Verify all filtering, search, sorting, and pagination are processed by MongoDB (not frontend).
  * Verify total count returns correct matches.
* **Suggested Commit Message**: `feat(search): implement server-side task search, filtering, sorting, and pagination`

### Milestone 8 — Bulk Operations & CSV Export
* **What we build**: Backend bulk-update API reporting successes/errors per task. Stream/download filtered tasks as CSV. Add bulk selector controls and CSV download buttons to master table.
* **Satisfies Goals**: Goal 7 (Acting on many tasks at once).
* **Expected Files**:
  * `backend/routes/tasks.js` (bulk endpoint & CSV download endpoint)
  * `frontend/src/components/BulkActionsBar.jsx`
* **Approximate Time**: 1 hour 15 minutes
* **What to test**:
  * Verify bulk updates perform actions individually and return a report.
  * Verify invalid items fail while valid items succeed.
  * Verify exported CSV matches the current search/filter parameters.
* **Suggested Commit Message**: `feat(bulk-csv): add bulk task updates with per-task reporting and search-synchronized CSV export`

### Milestone 9 — Dashboard
* **What we build**: Dashboard API collecting open, overdue, and weekly completions metrics, plus status and assignee breakdowns. React dashboard page with KPI cards and Recharts visualizations.
* **Satisfies Goals**: Goal 8 (Dashboard).
* **Expected Files**:
  * `backend/routes/dashboard.js`
  * `frontend/src/pages/Dashboard.jsx`
* **Approximate Time**: 1 hour
* **What to test**:
  * Verify metrics calculations are accurate.
  * Verify charts render correctly.
* **Suggested Commit Message**: `feat(dashboard): build analytics dashboard containing workload breakdowns and 8-week task completion charts`

### Milestone 10 — Immutable History & Comments
* **What we build**: Mongoose hooks/utilities to capture audit trail events (creation, field changes, assignments) and comment API. Display history timeline and comment form in task drawer.
* **Satisfies Goals**: Goal 9 (History you cannot rewrite).
* **Expected Files**:
  * `backend/utils/timeline.js`
  * `backend/routes/comments.js`
  * `frontend/src/components/TaskTimeline.jsx`
* **Approximate Time**: 1 hour
* **What to test**:
  * Verify history records cannot be modified or deleted via any endpoint.
  * Verify field changes correctly capture old vs new values.
* **Suggested Commit Message**: `feat(history): establish append-only task history timelines and comment streams`

### Milestone 11 — Overdue Alerts
* **What we build**: Dismissal mechanism for overdue alerts. Alert badge in sidebar navigation showing undismissed overdue counts. Alerts dropdown view. Due date update alert reactivation logic.
* **Satisfies Goals**: Goal 10 (Overdue alerts).
* **Expected Files**:
  * `backend/routes/alerts.js`
  * `frontend/src/components/AlertsBadge.jsx`
* **Approximate Time**: 1 hour
* **What to test**:
  * Verify alerts only display for overdue, unfinished tasks assigned to the user.
  * Verify dismissal hides the alert.
  * Verify modifying the task's due date cancels the dismissal and reactivates the alert.
* **Suggested Commit Message**: `feat(alerts): implement overdue alert badges, user dismissals, and due date reset reactivations`

### Milestone 12 — Testing, Polish & Deployment
* **What we build**: Setup automated integration tests in backend. Final visual styling check for consistent layouts and smooth transitions. Deployed builds to Render and database seeding. Update SUBMISSION.md.
* **Satisfies Goals**: Deployment, testing, documentation.
* **Expected Files**:
  * `backend/tests/api.test.js`
  * `SUBMISSION.md`
  * `docs/architecture.md`, `docs/schema.md`, `docs/decisions.md`, `docs/ai-prompts.md`
* **Approximate Time**: 1 hour
* **What to test**: Run all unit/integration tests; check that live URL works and demo credentials authenticate successfully.
* **Suggested Commit Message**: `chore(polish): write integration tests, polish theme aesthetics, and finalize documentation`
