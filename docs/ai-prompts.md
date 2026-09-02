# AI Prompts

This document logs the exact prompts used to direct the AI assistant during development, following the assignment requirements.

---

## 1. Initial Analysis & Architecture Setup

### Prompt
> preseeded accounts , frontend , backend folders , yes recharts
> 
> Before writing application code:
> 
> 2. Explain briefly why this stack is appropriate for a 12-hour assignment.
> 3. Do not introduce technologies just because they are popular.
> 4. Avoid microservices, unnecessary abstractions, complicated state-management libraries, event buses, queues, Redis, Kubernetes, etc.
> 5. Keep the architecture easy for me to explain in an interview.
> 
> Create a practical implementation plan divided into small milestones.
> The plan should prioritize the 10 mandatory goals in the README.
> 
> Use this general order unless you have a strong reason to change it:
> 
> Milestone 1 - project setup
> Milestone 2 - database/schema
> Milestone 3 - authentication and roles
> Milestone 4 - projects
> Milestone 5 - tasks and lifecycle rules
> Milestone 6 - assignments and dependencies
> Milestone 7 - search/filter/pagination
> Milestone 8 - bulk operations and CSV
> Milestone 9 - dashboard
> Milestone 10 - immutable history and comments
> Milestone 11 - overdue alerts
> Milestone 12 - testing, polish and deployment
> 
> For each milestone provide:
> - what we build
> - which README goals it satisfies
> - expected files/components/APIs
> - approximate time
> - what should be tested
> - suggested Git commit message
> 
> Also update docs/plan.md with this plan.
> 
> Do not implement the application yet.
> 
> If any requirement is ambiguous, ask me rather than inventing a complicated solution.

### What you got
* An explanation of why React (Vite) + Vanilla CSS + Express + Mongoose/MongoDB fits the 12-hour timeline and keeps the architecture clean.
* A detailed 12-milestone breakdown including files, APIs, test cases, and commits.
* A list of clarifying questions regarding backward transitions, alert dismissals, and bulk assignee changes.
* Structured plans saved to `docs/plan.md` and `implementation_plan.md`.

### What you corrected
* Refined the tool use: realized file creation for repository documentation like `docs/plan.md` must not include conversation artifact metadata to avoid target path validation errors.

---

## 2. Implementing Milestone 1 (Project Setup)

### Prompt
> no backware transitions , alert dismissal to personal only to whom project is assigned , bulk assignee i don't understand at this point will discuss it later when we implement it what we want u should implemnt buslk assignee as u understand and easy and complie with our goal.
> Now begin implementation with Milestone 1 only.
> 
> Tasks:
> 
> 1. Initialize the project using the agreed stack.
> 2. Create a clean folder structure.
> 3. Configure TypeScript if we selected it.
> 4. Configure frontend and backend according to the agreed architecture.
> 5. Configure basic environment-variable handling.
> 6. Make sure secrets will never be committed.
> 7. Configure the existing .gitignore appropriately.
> 8. Do not build business features yet.
> 9. Add a very simple initial application shell so we know frontend and backend run.
> 10. Add a health-check endpoint if appropriate.
> 
> IMPORTANT:
> Keep everything minimal.
> 
> Do not add:
> - unnecessary libraries
> - unnecessary abstractions
> - fake features
> - placeholder architecture that we won't actually use.
> 
> After implementation:
> - run the project
> - verify frontend works
> - verify backend works
> - fix obvious issues
> - explain what you created and why
> 
> Then update docs/architecture.md with the actual architecture.
> 
> Update docs/ai-prompts.md with the prompt I just gave you and briefly record what was produced.
> 
> Before making the Git commit, show me:
> - files changed
> - tests/checks performed
> - proposed commit message
> 
> Then ask me for confirmation before the first commit/push if GitHub credentials or repository information are not configured.

### What you got
* Initial backend project directory setup: `backend/package.json`, `backend/server.js`, and `.env` configs.
* Initial frontend project directory setup: `frontend/package.json`, `frontend/vite.config.js`, `frontend/index.html`, and React app assets (`src/App.jsx`, `src/index.css`, `src/main.jsx`).
* Standard packages installed (`express`, `mongoose`, `jsonwebtoken`, `bcryptjs`, `cookie-parser`, `dotenv`, `cors` for backend; `react`, `react-dom`, `lucide-react`, `recharts` for frontend).
* Configured local environment configs and validated `.gitignore` safety.
* Built React client code and booted backend Node server.
* Verified backend `/api/health` API response and confirmed root `/` serves built index.html page.
* Created documentation summaries in `docs/architecture.md` and `docs/ai-prompts.md`.

### What you corrected
* Encountered Windows PowerShell Execution Policy issue when installing packages; corrected workflow by executing installations through `cmd.exe /c "npm install"`.
* Addressed loopback address routing: loopback API fetches defaulted to IPv6 `[::1]`, which Node.js did not bind to, and resolved this by fetching via IPv4 loopback `127.0.0.1`.

---

## 3. Implementing Milestones 2 & 3 (Database Schema & Authentication)

### Prompt
> Implement Milestones 2 and 3 only.
> 
> DATABASE:
> Create the minimum database schema required by the README.
> 
> Before coding, verify that the schema supports:
> - users
> - manager/member roles
> - projects
> - project membership
> - tasks
> - task assignments
> - task dependencies
> - immutable task history
> - comments/timeline
> - overdue alert dismissal state
> 
> Use the simplest sensible relational/document design based on our chosen database.
> 
> Do not create excess tables/collections for hypothetical future features.
> and we have to connect mongo atlas database with this project tell me steps and take connection string from me and connect that 
> 
> AUTHENTICATION:
> Implement:
> - email/password login
> - secure password handling
> - session/token authentication appropriate for our stack
> - manager/member roles
> 
> AUTHORIZATION:
> This is critical.
> 
> Permissions must be enforced on the SERVER.
> 
> A member must not be able to bypass the UI and call an API to:
> - create/archive projects
> - change project membership
> - delete tasks
> - access projects they do not belong to
> 
> Do not rely on frontend hiding buttons.
> 
> Create simple reusable authorization checks on the backend rather than duplicating permission logic everywhere.
> 
> Create demo users eventually, but do not expose passwords in source code.
> 
> Add/update:
> - docs/schema.md
> - docs/architecture.md
> - docs/decisions.md
> - docs/ai-prompts.md
> 
> Test authentication and authorization manually and with automated tests where practical.
> 
> Then:
> 1. show me what was implemented
> 2. explain the important security decisions
> 3. run checks/tests
> 4. prepare a meaningful Git commit
> 5. push after confirmation if needed
> 
> implement only tilll login where admin , worker have different credentials to login in and can open different webpage after login and user can't bypass login and we can seed the user also . Today tilll this is enough . But main thing is to connect mongodb

### What you got
* MongoDB Mongoose Models: User, Project, Task, TaskTimeline, and AlertDismissal (with pre-hooks enforcing timeline immutability).
* JWT auth system: Cookie signature and verification middlewares in `backend/middleware/auth.js`.
* Backend auth endpoints: `/login`, `/logout`, `/me` with secure HTTP-only cookies in `backend/routes/auth.js`.
* Pre-seeded default users script in `backend/utils/seed.js` executing on server boot.
* Frontend React login layout and session logic routing to a role-based Dashboard Workspace card panel.
* Updated architectural logs in `docs/schema.md`, `docs/decisions.md`, and `docs/ai-prompts.md`.

### What you corrected
* Configured JWT secrets and database credentials to load securely from `.env` variables to align with zero repository exposure guidelines.

---

## 4. Implementing Projects and Tasks (Milestones 4, 5, and 6)

### Prompt
> Implement the project and task functionality now.
> 
> Follow the README exactly.
> 
> PROJECTS:
> Managers can:
> - create projects
> - edit projects
> - archive projects
> - restore projects
> - manage project members
> 
> Projects need:
> - short key
> - name
> - description
> - owner
> 
> ARCHIVING:
> Archiving must hide the project from default views without deleting its data or tasks.
> 
> TASKS:
> Implement:
> - title
> - description
> - priority
> - optional due date
> - project relationship
> - dependencies/blocking tasks
> - multiple assignees
> 
> Only project members can be assigned to project tasks.
> 
> If a person is removed from a project:
> - automatically unassign them from that project's tasks.
> 
> Members must only see projects they belong to.
> 
> Managers can delete tasks.
> Members cannot.
> 
> Keep the UI simple and clean.
> 
> Do not build the dashboard, bulk actions, alerts or advanced filtering yet.
> 
> Focus on making projects and tasks solid.
> 
> IMPORTANT:
> All important authorization and validation must happen on the backend.
> 
> After implementation:
> - test the important permission cases
> - test project archive/restore
> - test assignment restrictions
> - update documentation
> - update ai-prompts.md
> 
> create a meaningful Git commit
> - push it if GitHub is already configured

### What you got
* **Backend Routers**:
  * `backend/routes/projects.js` exposing project CRUD, toggling `isArchived`, adding members, and removing members. On member removal, updates tasks in Mongoose to pull the worker ID.
  * `backend/routes/tasks.js` implementing task CRUD, status transitions sequential checker, blocker check constraint, and appending timeline changes.
* **Server Utilities**:
  * `backend/utils/lifecycle.js` evaluating allowed states (`Backlog` ➔ `In Progress` ➔ `In Review` ➔ `Done` or `Blocked`).
  * `backend/utils/timeline.js` compiling task activity logging records.
* **Frontend Pages & Components**:
  * `Projects.jsx` (Client Projects directory).
  * `ProjectBoard.jsx` (Kanban Board showing columns Backlog, In Progress, In Review, Done, Blocked).
  * `MyTasks.jsx` (List of active tickets assigned to the current user).
  * `CreateProjectModal.jsx`, `ManageMembersModal.jsx`, `CreateTaskModal.jsx`, `TaskDetailsDrawer.jsx`.
* **Automated Integration Tests**:
  * `backend/tests/api.test.js` verifying authentication, role access blocks, project scoping, blocker dependencies, transition validation, unassignment cascades, and deletion restrictions.
* Updated architectural documentations in `docs/architecture.md` and `docs/ai-prompts.md`.

### What you corrected
* Implemented raw header extraction for Node fetch cookie reading inside our custom test runner.
* Handled port cleanup: noticed diagnostic scripts grab port 5000 and throw `EADDRINUSE` if the server is started multiple times in the background; resolved by managing active background processes.

---

## 5. Implementing Task Lifecycle State Machine (README Goal 4)

### Prompt
> Now implement the task lifecycle rules from README goal 4.
> 
> The allowed lifecycle is:
> 
> Backlog → In Progress → In Review → Done
> 
> A task can also become Blocked from:
> - In Progress
> - In Review
> 
> When unblocked, it returns to the state it was blocked from.
> 
> A completed task can be reopened.
> 
> A task cannot move to Done if it has an unfinished blocking task.
> 
> Illegal transitions must be rejected by the SERVER with a useful explanation.
> 
> Examples:
> 
> Backlog → Done = reject
> Backlog → In Review = reject
> In Progress → Done = reject
> In Review → Done = allowed only if blocking dependencies are finished
> In Progress → Blocked = allowed
> In Review → Blocked = allowed
> 
> Do not assume the frontend is trustworthy.
> 
> Create one clear backend/service-level function responsible for validating task transitions rather than scattering transition logic across controllers.
> 
> The frontend should only display currently legal transitions, but the backend remains the source of truth.
> 
> Add tests for:
> - valid transitions
> - invalid transitions
> - blocking/unblocking
> - reopening Done tasks
> - dependency preventing Done
> - dependency completed allowing Done
> 
> Keep the implementation simple enough that I can explain it in an interview.
> 
> Update docs/decisions.md with the reasoning behind the lifecycle implementation.
> 
> Update docs/ai-prompts.md.
> 
> Commit this milestone with a meaningful commit message and push it.

### What you got
* **Centralized Lifecycle Service** (`backend/utils/lifecycle.js`):
  * `ALLOWED_TRANSITIONS` state table defining `Backlog ➔ In Progress ➔ In Review ➔ Done`.
  * `validateTransition(currentStatus, targetStatus, preBlockedStatus)` enforcing sequential forward flow, blocking only from `in_progress` or `in_review`, strict restoration to `preBlockedStatus` upon unblocking, reopening of `done` tasks to `backlog`/`in_progress`/`in_review`, and rejecting all illegal skips and backward transitions with human-readable error messages.
  * `checkBlockerDependencies(taskId)` inspecting blocking tasks and rejecting transition to `done` if any blocker is unfinished (`status !== 'done'`).
* **API Controller Enforcement** (`backend/routes/tasks.js`):
  * Integrated validator directly into `PUT /api/tasks/:id`.
  * Dynamic tracking of `preBlockedStatus` on task documents and audit logging of state changes in `tasktimelines`.
* **Frontend Workflow UI** (`frontend/src/components/TaskDetailsDrawer.jsx`):
  * Conditionally renders only valid next actions based on the current state.
* **Automated Unit & Integration Test Suite** (`backend/tests/lifecycle.test.js`):
  * 6 comprehensive unit test suites for all transition combinations.
  * 11 live HTTP API integration tests verifying real database operations, blocker dependency checks, unblocking constraints, and reopening.
* Updated documentation in `docs/decisions.md` (Decision 6) and `docs/ai-prompts.md`.

### What you corrected
* Refined `validateTransition` to return distinct, context-specific error messages for every type of illegal transition (e.g. forward skips, backward regressions, unblocking target mismatches, and blocked-from-backlog rejections).

---

## 6. Implementing Finding Things — Server-Side Search, Filter & Pagination (README Goal 6 & 5)

### Prompt
> Implement README goal 6 and complete the "My Tasks" functionality from goal 5.
> 
> Create a task list where users can see all tasks they are allowed to see.
> 
> Support:
> - text search across title and description
> - project filter
> - status filter
> - assignee filter
> - priority filter
> - overdue filter
> - sorting by due date
> - sorting by priority
> - sorting by last update
> - pagination
> - total result count
> 
> CRITICAL:
> Filtering, searching, sorting and pagination MUST happen on the SERVER.
> 
> Do not fetch every task into the browser and filter it with JavaScript.
> 
> Design the API with query parameters or an equivalent clean approach.
> 
> Also create a simple "My Tasks" view showing the logged-in user's assigned tasks across projects.
> 
> Keep the UI straightforward. Do not build an overly complicated data-grid system.
> 
> Test:
> - combinations of filters
> - pagination
> - search
> - sorting
> - permission boundaries
> - My Tasks
> 
> Update relevant documentation.
> 
> Commit and push this milestone.

### What you got
* **Server-Side Query Pipeline** (`backend/routes/tasks.js` `GET /api/tasks`):
  * Regex search matching `title` or `description`.
  * Scoped project filtering with `403 Forbidden` checks on unauthorized project queries.
  * Multi-attribute filtering on `status`, `priority`, `assigneeId`, `overdue`, and `myTasks`.
  * Server-side sorting by `dueDate`, `priority`, `updatedAt`, and `createdAt`.
  * Server-side pagination with `skip`, `limit`, and parallel `countDocuments(query)` execution.
* **Frontend All-Tasks View** (`frontend/src/pages/TaskList.jsx`):
  * Filter toolbar with live search, dropdown selects, overdue checkbox, and clear button.
  * Responsive dark data table rendering project tags, descriptions, status badges, priority pills, and overdue indicators.
  * Full pagination bar showing match totals and page selectors.
* **Enhanced My Tasks View** (`frontend/src/pages/MyTasks.jsx`):
  * Connected directly to personal server queries with search, status/priority filtering, and due date sorting.
* **Automated Integration Test Suite** (`backend/tests/search.test.js`):
  * 8 automated tests covering text search, single/combined filters, pagination boundaries, sorting orders, project access isolation, and personal task scoping.
* Updated architectural documentations in `docs/decisions.md` (Decision 7) and `docs/ai-prompts.md`.

### What you corrected
* Used escaped regex patterns to prevent regex injection crashes on text searches containing special symbols.

---

## 7. Implementing Bulk Operations & Filtered CSV Export (README Goal 7)

### Prompt
> Implement README goal 7.
> 
> Users should be able to select multiple tasks from the task list and perform ONE bulk action:
> 
> 1. status change
> 2. assignee change
> 3. due-date change
> 
> The backend must process each selected task independently.
> 
> The response must report per task:
> 
> SUCCESS
> or
> REJECTED + reason
> 
> Do NOT make the entire batch fail because one task is invalid.
> 
> For example:
> 
> Task A → SUCCESS
> Task B → SUCCESS
> Task C → REJECTED: dependency is unfinished
> Task D → SUCCESS
> 
> All normal business rules and permissions must still apply to each task.
> 
> Also implement CSV export of the CURRENTLY FILTERED task list.
> 
> Do not export unrelated tasks.
> 
> Keep the implementation simple and readable.
> 
> Add tests for:
> - mixed successful/failed bulk operations
> - invalid status transitions
> - invalid assignee
> - permission failures
> - filtered CSV export
> 
> Update documentation and ai-prompts.md.
> 
> Commit and push.

### What you got
* **Bulk Operations API** (`POST /api/tasks/bulk`):
  * Processes `status`, `assignees`, and `dueDate` updates across an array of task IDs.
  * Processes tasks independently: does not abort the entire batch when an individual task transition is invalid or blocked.
  * Evaluates sequential state machine rules (`validateTransition`) and blocker dependency checks (`checkBlockerDependencies`), returning human-readable rejection reasons with blocker task names.
  * Enforces project boundary checks (only members of a task's project can edit the task or be assigned to it).
  * Automatically creates immutable audit log entries in `TaskTimeline` for every successful field change or assignment/unassignment.
  * Returns an itemized report containing total, succeeded, and failed counts along with per-task status (`SUCCESS` or `REJECTED + reason`).
* **Filtered CSV Export API** (`GET /api/tasks/export/csv`):
  * Reuses server-side search and multi-criteria filter query parameters (`search`, `projectId`, `status`, `priority`, `assigneeId`, `overdue`, `sortBy`, `order`).
  * Scoped to user access permissions (rejects unauthorized project queries with `403 Forbidden`).
  * Streams correctly formatted and quote-escaped CSV files containing only currently matching tasks.
* **Frontend Multi-Select & Bulk UI** (`frontend/src/pages/TaskList.jsx`):
  * Row checkboxes and header select-all control.
  * Bulk action toolbar displaying selected count, action selector (Status, Assignees, Due Date), dynamic input controls, and apply/deselect buttons.
  * "Export CSV" button triggering instant download of the filtered dataset.
  * Detailed Bulk Operation Report modal summarizing successes and listing itemized rejection reasons.
* **Automated Integration Test Suite** (`backend/tests/bulk.test.js`):
  * 7 automated tests covering mixed partial-success batches, invalid transitions, unfinished blocker rejections, non-member assignee rejections, permission boundaries, and scoped CSV streaming.
* Updated `docs/decisions.md` (Decision 8) and `docs/ai-prompts.md`.

### What you corrected
* Fixed `checkBlockerDependencies` property inspection in the bulk controller: updated check to inspect `blockerCheck.isBlocked` and format blocker titles instead of looking for an absent `canComplete` flag.
* Refactored timeline logging in `/bulk` to use `logTimelineEvent` with the required `userId` field to satisfy Mongoose schema constraints.

---

## 8. Implementing Executive Dashboard & Visualizations (README Goal 8)

### Prompt
> Implement README goal 8.
> 
> Create a useful but simple dashboard.
> 
> It must show:
> - open tasks
> - overdue tasks
> - tasks due this week
> - tasks completed this week
> 
> Also show task breakdown:
> - by status
> - by assignee
> 
> And a completion chart for the last 8 weeks.
> 
> The dashboard should respect the user's permissions:
> - managers can see the portfolio they manage/access
> - members should only see information from projects they are allowed to see
> 
> Prefer simple queries and simple charts.
> 
> Do not add fancy analytics that are not required.
> 
> Make the dashboard visually polished enough to look like a real internal business tool, but don't spend excessive time on animations or decorative UI.
> 
> Verify all numbers against database data.
> 
> Update documentation.
> 
> Commit and push.

### What you got
* **Dashboard Aggregation Endpoint** (`GET /api/dashboard` in `backend/routes/dashboard.js`):
  * Scoped to user permissions: Managers see active projects; members are strictly scoped to their assigned project memberships (and receive `403 Forbidden` if querying unassigned project dashboards).
  * Calculates headline numbers: Open Tasks, Overdue Tasks, Tasks Due This Week, and Tasks Completed This Week.
  * Calculates Status Breakdown with counts and labels for all 5 lifecycle states.
  * Calculates Assignee Workload Distribution including unassigned task counts.
  * Computes 8-week completion trends using exact completion timestamps from immutable `TaskTimeline` records (falling back to `updatedAt`).
* **Interactive Frontend Dashboard** (`frontend/src/pages/Dashboard.jsx`):
  * Primary landing view in `DashboardShell.jsx`.
  * 4 headline stat cards (Open, Overdue with red alert badge, Due This Week, and Completed This Week).
  * Project portfolio scope selector to toggle between all accessible projects or specific project views.
  * Composite status progress bar and itemized status rows with percentages.
  * Contributor workload list with user avatars, task counts, and proportion bars.
  * Recharts 8-week bar chart with custom dark theme tooltips showing weekly delivery velocity.
* **Automated Test Suite** (`backend/tests/dashboard.test.js`):
  * Verifies headline numbers, status breakdown counts, assignee workloads, 8-week completion grouping, and member permission isolation.
* Updated `docs/decisions.md` (Decision 9) and `docs/ai-prompts.md`.

### What you corrected
* Implemented Monday-to-Sunday rolling week bucketing to cleanly calculate "Due This Week", "Completed This Week", and the 8-week completion bar chart.
* Used audit timeline timestamps (`TaskTimeline`) to isolate true task completion dates from subsequent metadata edits.

---

## 9. Immutable Timeline & Audit History (README Goal 9)

### Prompt
> Now implement README goal 9.
> 
> Every task needs an immutable timeline.
> 
> Record:
> - task creation
> - every relevant field change
> - old value
> - new value
> - who made the change
> - assignment
> - unassignment
> - comments
> 
> Comments are part of the timeline.
> 
> The history must NOT be editable or deletable after creation.
> 
> This includes managers.
> 
> IMPORTANT:
> Do not simply make an "edit history" button unavailable.
> 
> The backend/database design must prevent normal application operations from modifying or deleting historical records.
> 
> Keep the implementation simple.
> 
> When a task changes, create the appropriate history entry as part of the same operation where practical.
> 
> Test:
> - task creation history
> - status change
> - priority change
> - due-date change
> - assignment/unassignment
> - comments
> - attempted history modification
> 
> Update docs/schema.md and docs/decisions.md to explain why history is modeled this way.
> 
> Update ai-prompts.md.
> 
> Commit and push.

### What you got
* **Unified Append-Only Schema** (`backend/models/TaskTimeline.js`):
  * Typed audit events: `create`, `field_change` (with `fieldName`, `oldValue`, `newValue`), `assign`, `unassign`, and `comment` (with `commentText`).
  * Actor tracking on every event (`userId` populated with user name, email, and role).
  * Strict database-level immutability enforced by Mongoose middleware:
    * `pre('save')`: Throws error on any modification to existing timeline documents.
    * `pre('updateOne')`, `pre('updateMany')`, `pre('findOneAndUpdate')`, `pre('replaceOne')`: Throws `Error('Timeline events are immutable and cannot be updated.')`.
    * `pre('deleteOne')`, `pre('deleteMany')`, `pre('findOneAndDelete')`, `pre('remove')`: Throws `Error('Timeline events are immutable and cannot be deleted.')`.
* **API Layer Route Protection** (`backend/routes/tasks.js`):
  * Added explicit HTTP handlers rejecting `PUT` and `DELETE` requests on `/api/tasks/:id/timeline/:timelineId` and `/api/tasks/:id/comments/:commentId` with `403 Forbidden` for all users, including managers.
  * Preserved timeline audit records indefinitely upon task deletion (removed cascade deletion of historical records).
* **Automatic Timeline Event Capture**:
  * Task creation (`POST /api/tasks/project/:projectId`).
  * Status changes, priority changes, due-date changes, title/description edits (`PUT /api/tasks/:id` and `POST /api/tasks/bulk`).
  * Assignment and unassignment during updates and project member removal cascade (`DELETE /api/projects/:id/members/:userId`).
  * Immutable comment creation (`POST /api/tasks/:id/comments`).
* **Frontend Unified Timeline View** (`frontend/src/components/TaskDetailsDrawer.jsx`):
  * Chronological feed displaying actor name, exact timestamp, human-readable status/priority/date diffs, assignment changes, and immutable comment bubbles.
* **Automated Test Suite** (`backend/tests/timeline.test.js`):
  * 10 thorough test cases validating task creation history, status transition audit, priority changes, due dates, assignments, unassignments, comments, HTTP 403 route rejections, and Mongoose schema mutation rejection hooks.
* Updated `docs/schema.md`, `docs/decisions.md` (Decision 10), and `backend/package.json`.

### What you corrected
* Fixed unassignment event logging in `backend/routes/tasks.js`: updated payload to store `oldValue: userId` (representing the removed user) instead of `newValue: userId`.
* Added audit logging for cascade unassignments when a member is removed from a project in `backend/routes/projects.js`.
* Enhanced `TaskDetailsDrawer.jsx` to render both `oldValue` and `newValue` for unassignment events.

---

## 10. Overdue Alerts & Invalidation (README Goal 10)

### Prompt
> Implement README goal 10 exactly.
> 
> Tasks that:
> - are past their due date
> - and are not finished
> 
> should appear in an alerts area.
> 
> Show an alert count badge in navigation.
> 
> A person can dismiss an alert for a task they are assigned to.
> 
> IMPORTANT RULE:
> 
> If the task's due date later changes, the alert must become visible again.
> 
> Design the simplest reliable way to represent this.
> 
> Do not create a complicated notification system.
> 
> Make sure:
> - unfinished overdue task → alert
> - Done task → no overdue alert
> - assigned user can dismiss
> - unassigned user cannot dismiss
> - changing the due date causes the dismissed alert to reappear
> 
> Test all of these cases.
> 
> Update documentation.
> 
> Commit and push.

### What you got
* **Overdue Alerts API** (`backend/routes/alerts.js`):
  * `GET /api/alerts`: Scopes tasks to projects the user can access (`members: req.user._id` for members; active projects for managers). Filters for overdue unfinished tasks (`dueDate < now && status !== 'done'`). Maps user dismissals with exact `associatedDueDate` checks to classify tasks as `activeAlerts` vs `dismissedAlerts`.
  * `GET /api/alerts/count`: Fast lightweight count endpoint powering the navigation badge.
  * `POST /api/alerts/:taskId/dismiss`: Enforces that only users assigned to the task can dismiss alerts. Non-assigned members and unassigned managers receive `403 Forbidden`. Upserts `AlertDismissal` recording the current `associatedDueDate`.
  * `POST /api/alerts/:taskId/undismiss`: Enables assigned users to manually restore a previously dismissed alert.
* **Dual-Layer Due-Date Invalidation**:
  * In `backend/routes/tasks.js`: Whenever a task's `dueDate` changes (via single task update or bulk operation), `AlertDismissal.deleteMany({ taskId: task._id })` proactively cleans up dismissals.
  * In `backend/routes/alerts.js`: Matching `new Date(alertDismissal.associatedDueDate).getTime() === new Date(task.dueDate).getTime()` guarantees that any due date change immediately revives the alert even before cleanup runs.
* **Frontend Overdue Alerts Area** (`frontend/src/pages/Alerts.jsx`):
  * Displays active overdue cards with project key, task title, days overdue pill, priority, and assignees.
  * "Dismiss Alert" button for assigned contributors with instant state refresh.
  * "Only assignees can dismiss" indicator for unassigned viewers.
  * Collapsible section for previously dismissed alerts with "Restore Alert" option.
  * Task drawer integration to view details/timeline upon clicking any alert card.
* **Navigation Badges** (`frontend/src/components/DashboardShell.jsx`):
  * "Overdue Alerts" navigation item in the sidebar with red count badge.
  * Header bell button with notification badge showing active overdue count in real time.
* **Automated Test Suite** (`backend/tests/alerts.test.js`):
  * 8 integration tests covering overdue generation, completed task exclusion, assigned user dismissal, unassigned user 403 rejection, due date change alert revival, and task reopening restoration.
* Updated `docs/schema.md`, `docs/decisions.md` (Decision 11), and `backend/package.json`.

### What you corrected
* Added dual-layer invalidation (proactive `deleteMany` on update + reactive `associatedDueDate` matching in query) so alert reactivation on due date change has zero reliance on fragile background message queues.
* Enforced assignee check on dismiss route to prevent unassigned managers or teammates from dismissing tickets they do not own.

---

## 11. Strict Review and Comprehensive Audit of All 10 Mandatory Goals

### Prompt given
> Now stop adding features.
> 
> Act as a strict reviewer evaluating this project against the ORIGINAL README.md.
> 
> Go through all 10 mandatory goals ONE BY ONE.
> 
> Create a checklist:
> 
> Goal 1:
> Requirement → PASS/FAIL
> Evidence → ...
> Test → ...
> 
> Goal 2:
> Requirement → PASS/FAIL
> ...
> 
> Do not give me a vague "everything works."
> Actually test the application.
> 
> Pay special attention to:
> - server-side authorization
> - member project visibility
> - illegal task transitions
> - dependency blocking
> - reopening completed tasks
> - project-member assignment restrictions
> - removing project member unassigning tasks
> - server-side filtering/pagination
> - bulk actions returning per-task results
> - filtered CSV export
> - dashboard calculations
> - immutable history
> - overdue alert dismissal/reappearance
> 
> Find and fix failures.
> If a requirement is genuinely incomplete, tell me rather than pretending it works.
> 
> After fixing issues:
> - rerun the checklist
> - update documentation
> - commit fixes
> - push

### What was produced
* **Master Verification Test Suite** (`backend/tests/strict_review.js`):
  * Comprehensive end-to-end evaluation script directly interrogating the live API and MongoDB Atlas across all 10 mandatory requirements.
  * Verified server-side authorization, member isolation, illegal transitions, blocker dependencies, cascade unassignment, server-side search/filters/pagination, per-task bulk results, CSV export, dashboard calculations, immutable history hooks, and overdue alert dismissal/reactivation.
* **API Flexibility & Symmetry Refinements**:
  * Added `PATCH` support alongside `PUT` on `/api/projects/:id/archive`, and enabled explicit `{ isArchived: boolean }` parameter support.
  * Normalized bulk payload handling in `POST /api/tasks/bulk` to seamlessly accept both `{ action, payload: { ... } }` and `{ action, value: ... }`.
  * Normalized comment payload handling in `POST /api/tasks/:id/comments` to accept both `{ commentText }` and `{ text }`.
* **All 10 Mandatory Goals Passed**:
  * Ran `strict_review.js` with 10/10 PASS result.
  * All 7 existing test suites (`npm test`) continue to pass 100%.

### What you corrected
* Discovered that `/api/projects/:id/archive` only listened for `PUT`; added `PATCH` to support REST client conventions.
* Added fallback parameter parsing in bulk actions and comments to handle different client payload formats gracefully.

---

## 12. UI Aesthetics, Login Refinements & Brand Simplification

### Prompts given
> this is login page make it appearance right its not looking right u can see text its not looking good

> everthing is ok just remove quick demo accouts from login page

> in overdue alerts on top right there is refresh written don't looking good remove that or do somethign else and don't push this change on github

> on top left of website where written tracker pro remove icon and write only project tracker name

### What was produced
* **Login Form Typography & Spacing Fix**:
  * Root cause identified: global CSS reset `margin: 0` caused the lock icon, "Sign In" title, "Project & Task Tracker" subtitle, and "Email Address" label to collapse directly against each other with zero vertical margin.
  * Added distinct `.login-header` container (`margin-bottom: 28px`), styled `.login-logo-badge` (`48px x 48px`), bold `.login-title` (`1.65rem`), and muted `.login-subtitle`.
  * Form inputs styled with comfortable padding and smooth focus rings.
* **Removal of Demo Accounts Scaffolding**:
  * Removed the quick-fill demo accounts panel (`login-demo-panel`) based on user feedback to keep the interface realistic and free from synthetic demo scaffolding.
* **Overdue Alerts Header Polish**:
  * Replaced the plain `"Refresh"` text button in `Alerts.jsx` with a subtle, icon-only button (`<RefreshCw size={16} />`) matching the dashboard headers.
* **Brand Simplification**:
  * Removed the target emoji (`🎯`) and renamed `"Tracker Pro"` to clean `"Project Tracker"` in `DashboardShell.jsx`.

### What you corrected
* Fixed collapsed vertical margins on the login page by creating explicit container hierarchy and spacing classes rather than relying on browser default margins.
* Removed artificial demo helpers (quick demo accounts) and distracting decorative text buttons upon user direction.

