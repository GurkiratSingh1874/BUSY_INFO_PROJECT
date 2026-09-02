# Decisions

Log of major technical and architectural decisions made during development.

---

## Decision 1: Single-Unit Server Deployment (Unified Hosting)

* **Chose**: Compiling React assets and serving them statically from the Express backend on a single Render instance.
* **Rejected**: Deploying the frontend client separately on Vercel and the backend API on Render.
* **Why**: Separate hosting requires configuring Cross-Origin Resource Sharing (CORS) security headers and managing two configuration dashboards. More importantly, free hosting tiers sleep when idle. If hosted separately, a user loading the website would have to wait for the Vercel app to boot, which would then trigger the Render API, forcing a double cold-start latency of up to 2 minutes. A unified server solves this and simplifies configuration.
* **Later reversed**: We initially set up separate `frontend/` and `backend/` scripts expecting to run them on separate platforms, but reversed this choice for deployment once we weighed the cold-start latencies and CORS friction.

---

## Decision 2: Preseeded Database Accounts

* **Chose**: Seeding a preset group of accounts (1 Manager, 2 Members) automatically on database startup.
* **Rejected**: Building a public signup/registration screen.
* **Why**: The tracker is designed as a private, internal services company tool; arbitrary public registration is not realistic for this scenario. Limiting access to pre-seeded credentials satisfies the security constraints, simplifies user management, and avoids spending 1.5 hours building registration forms, verification, and security rules.

---

## Decision 3: HTTP-Only Cookies for Session Tokens

* **Chose**: Storing JWT authentication tokens inside secure, HTTP-Only, SameSite cookies.
* **Rejected**: Storing JWT tokens in the browser's `localStorage` and attaching them to the HTTP `Authorization` request header.
* **Why**: Storing tokens in `localStorage` exposes them to Cross-Site Scripting (XSS) attacks—any rogue script injected into the client page can read the token and hijack the user session. HTTP-Only cookies are protected by the browser and cannot be read by JavaScript, offering a much more secure and professional authentication layout.

---

## Decision 4: Audit History via a Separate Collection

* **Chose**: Saving audit timeline events in a separate, dedicated `tasktimelines` collection with Mongoose hooks blocking updates/deletions.
* **Rejected**: Nesting the timeline events as a sub-document array inside each Task document.
* **Why**: While embedding is easier, task audit histories grow continuously with comments and updates. MongoDB documents have a hard size limit of 16MB. A task with many comments or modifications could push the document size limit or slow down index operations. A separate timeline collection keeps the main `tasks` documents compact and search indexing fast.

---

## Decision 5: Native CSS variables over Tailwind CSS

* **Chose**: Custom utility styling classes and CSS custom properties (variables) defined in a clean `index.css` file.
* **Rejected**: Tailwind CSS framework.
* **Why**: Introducing Tailwind adds compilation dependencies, configuration files (`tailwind.config.js`), and bloated HTML utility strings that are harder to audit in a simple workspace review. Vanilla CSS is lightweight, has zero compilation overhead, and allows us to build a custom responsive layout with high-quality aesthetics.

---

## Decision 6: Centralized State Machine for Task Lifecycle and Blocker Dependency Validation

* **Chose**: Enforcing task lifecycle transitions and blocker dependencies through a centralized backend service (`backend/utils/lifecycle.js`).
* **Rejected**: Scattering transition logic across route handlers or relying exclusively on frontend UI buttons to restrict transitions.
* **Why**:
  1. **Security & Data Integrity**: Client interfaces are fundamentally untrusted; users or malicious actors can issue direct `PUT /api/tasks/:id` HTTP calls attempting to bypass the sequential workflow (e.g., jumping directly from Backlog to Done).
  2. **Single Source of Truth**: Isolating the transition map (`ALLOWED_TRANSITIONS`), unblocking restoration logic (`preBlockedStatus`), and dependency resolution checks into a standalone service makes the lifecycle rules easy to test in isolation (via both unit tests and integration tests) and straightforward to explain in an interview.
  3. **Explicit Error Feedback**: Rather than returning a generic 400 Bad Request error, the validator returns human-readable explanations detailing why a specific transition was rejected (e.g., distinguishing between skipped transitions, illegal backward steps, invalid unblocking targets, and unfinished blocking dependencies with exact blocker titles).

---

## Decision 7: Server-Side Query Execution for Search, Filtering, and Pagination

* **Chose**: Executing all text search, multi-criteria filtering, sorting, and pagination strictly on the server within MongoDB queries.
* **Rejected**: Loading the entire task dataset into the client and performing filtering/sorting in JavaScript memory.
* **Why**:
  1. **Scalability & Performance**: Client-side filtering fails as datasets grow beyond a few hundred records, causing high memory usage, sluggish UI re-renders, and excessive network bandwidth consumption.
  2. **Security & Data Scoping**: Client-side filtering requires sending all tasks over the wire, which risks leaking confidential tasks from unauthorized projects. Performing filtering and scoping on the server ensures members only receive tasks they have explicit permission to view.
  3. **Accurate Pagination**: By combining `Task.countDocuments(query)` with `.skip().limit()`, the client receives accurate match totals and page counts without over-fetching.

---

## Decision 8: Independent Per-Task Processing in Bulk Operations

* **Chose**: Processing bulk actions per-task independently with an itemized result report (`SUCCESS` or `REJECTED + reason`).
* **Rejected**: Atomic all-or-nothing transactions that fail the whole batch if a single task is invalid.
* **Why**:
  1. **User Experience & Productivity**: In practical project management, users frequently apply a bulk action (such as marking multiple tickets Done or assigning a teammate) across a mixed batch. If one task has an unresolved blocker or cannot move backwards, failing the entire batch frustrates users and leaves them guessing which task caused the failure.
  2. **Transparent Feedback**: An itemized report clearly communicates what succeeded and why specific items were rejected, allowing users to address the blocker dependencies without re-doing the rest of their work.
  3. **Strict Policy Compliance**: Each individual task is subjected to the full suite of state machine validation, blocker checks, assignee project membership rules, and immutable timeline logging, preventing any bulk backdoor around business logic.

---

## Decision 9: Scoped Server-Side Aggregation for Operational Dashboard

* **Chose**: Performing headline metrics computation, weekly completion bucketing, status breakdowns, and assignee workloads directly on the backend (`/api/dashboard`) using role-based project scoping.
* **Rejected**: Fetching raw task lists to the client and computing analytics in React state.
* **Why**:
  1. **Strict Access Isolation**: Members must only see data from projects they are assigned to. Computing metrics on the server guarantees that non-member project data is never transmitted over the network or exposed in memory.
  2. **Precision in Weekly Trend**: Using immutable audit timeline events (`TaskTimeline`) to determine exact completion timestamps instead of relying exclusively on `task.updatedAt` (which can change when descriptions or tags are edited post-completion).
  3. **Performance & Lightweight Payloads**: Pre-computing headline metrics and 8 weekly buckets reduces network payloads to a few kilobytes, ensuring instant dashboard rendering without client-side lag.

---

## Decision 10: Multi-Layer Immutability and Append-Only Event Log for Task History

* **Chose**: Enforcing timeline immutability at both the database/schema level (Mongoose pre-middleware blocking `save` on existing records, `updateOne`, `updateMany`, `replaceOne`, `findOneAndUpdate`, `deleteOne`, `deleteMany`, `findOneAndDelete`, `remove`) and the Express HTTP layer (`403 Forbidden` guards on timeline and comment edit/delete routes for all roles, including managers).
* **Rejected**: Merely hiding the "Edit" and "Delete" buttons in the browser interface.
* **Why**:
  1. **Audit & Compliance Rigor**: Real internal business tools must satisfy non-repudiation and auditability requirements. Relying on frontend visibility toggles leaves APIs vulnerable to direct HTTP manipulation via curl, Postman, or script execution.
  2. **Zero Manager Exceptions**: Managers possess administrative rights to create/archive projects and remove tasks, but must never be permitted to alter or expunge audit records. Enforcing this at the database and API level ensures managers cannot rewrite who broke a build or missed a milestone.
  3. **Unified Append-Only Feed**: Treating comments as typed timeline events (`type: 'comment'`) within the same append-only collection guarantees that discussions can never be retroactively revised or removed, preserving the exact conversational context alongside status transitions and assignments.

---

## Decision 11: Dual-Layer State Invalidation for Overdue Alert Dismissals

* **Chose**: Embedding `associatedDueDate` in `AlertDismissal` documents alongside proactive `deleteMany` cleanup whenever a task's `dueDate` changes.
* **Rejected**: Building a complex event-driven notification queue or messaging bus.
* **Why**:
  1. **Zero State Drift**: Overdue status is an intrinsic derived property of task state (`dueDate < now && status !== 'done'`). By querying the database directly rather than generating transient notification events, alerts can never become stale, duplicated, or desynchronized across browser tabs.
  2. **Guaranteed Reappearance on Date Edits**: Storing `associatedDueDate` ensures that if a task's due date shifts, the old dismissal date immediately mismatches the new date, reviving the alert automatically even if proactive database cleanup failed.
  3. **Strict Assignee Isolation**: Scoping dismissals per `{ userId, taskId }` gives assignees individual control over their alerts without silencing notifications for other teammates on multi-assigned tasks. Non-assigned users and unassigned managers are strictly blocked from dismissing tasks they are not responsible for.

---

## Decision 12: Robust API Input Normalization and HTTP Method Symmetry

* **Chose**: Implementing dual payload normalization (`bulkPayload = payload || { [action]: value }`, `commentText = req.body.commentText || req.body.text`) and supporting symmetric HTTP verbs (`PUT` and `PATCH` for project archiving).
* **Rejected**: Strict single-shape schemas that reject standard client integration formats with 400 Bad Request.
* **Why**:
  1. **Integration Resilience**: Different API clients, test harnesses, and UI components naturally send either flat payload formats (`{ action: 'status', value: 'done' }`) or nested structures (`{ action: 'status', payload: { status: 'done' } }`). Normalizing on the server eliminates brittle friction without compromising data validation.
  2. **HTTP Verb Conventions**: REST clients frequently use `PATCH` for partial state updates (like archiving a project) and `PUT` for complete state replacement. Allowing both verbs on `/api/projects/:id/archive` ensures standard compliance.
  3. **Explicit State vs Toggle**: Allowing both an explicit boolean flag (`{ isArchived: true/false }`) and toggle behavior (if omitted) ensures idempotent updates in automated workflows while maintaining convenience for UI toggle buttons.
