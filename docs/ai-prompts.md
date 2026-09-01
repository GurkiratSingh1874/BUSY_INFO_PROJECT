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

