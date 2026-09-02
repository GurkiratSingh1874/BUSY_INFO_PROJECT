# Technical Decisions & Architectural Trade-offs

This document records the actual technical decisions made during development, the rejected alternatives, the engineering rationale, and the associated trade-offs.

---

## Decision 1: Cookie-Based JWT Authentication vs. Authorization Headers

* **What we chose**: Issuing JSON Web Tokens (JWT) stored inside signed, `httpOnly`, `sameSite: 'lax'` browser cookies.
* **Alternatives considered**: Storing JWTs in browser `localStorage` or `sessionStorage` and transmitting them via `Authorization: Bearer <token>` headers.
* **Why**:
  1. **XSS Protection**: Tokens stored in `localStorage` are vulnerable to exfiltration by any injected third-party script. HTTP-only cookies cannot be accessed or read by client-side JavaScript.
  2. **Zero Client Header Plumbing**: The browser automatically attaches cookies to every fetch request (`credentials: 'include'`), eliminating the need for complex Axios request interceptors or token refresh wrappers in React.
* **Trade-offs**:
  * Requires explicit CSRF awareness (`sameSite: 'lax'`) and credentials configuration in development proxies.

---

## Decision 2: Strict Finite State Machine in Domain Service vs. Model Hooks

* **What we chose**: Centralizing lifecycle transition validation (`backlog ➔ in_progress ➔ in_review ➔ done`, `blocked`, and reopening) inside a dedicated domain engine (`backend/utils/lifecycle.js`) called explicitly by task routers.
* **Alternatives considered**: Embedding state transition rules inside Mongoose `pre('save')` hooks on the `Task` schema.
* **Why**:
  1. **Clear Explanations on Rejection**: README Goal 4 requires that invalid jumps be rejected with an explanation of *why* the jump was illegal and what transitions are legal. Mongoose schema hooks produce generic validation errors that are difficult to customize for HTTP responses.
  2. **Multi-Model Dependency Context**: Verifying that all blocker tasks are `done` requires querying sibling tasks. Mongoose document middleware executing cross-collection queries introduces hidden side effects and complicates unit testing.
* **Trade-offs**:
  * Bulk operations and individual update endpoints must both explicitly invoke `validateTransition()` and `checkBlockerDependencies()`.

---

## Decision 3: Application Cascade Hook vs. MongoDB Database Triggers for Member Removal

* **What we chose**: Executing an explicit Mongoose update (`Task.updateMany({ projectId }, { $pull: { assignees: userId } })`) within the project membership removal controller (`backend/routes/projects.js`).
* **Alternatives considered**: Using MongoDB Database Triggers (Atlas App Services) or relying on manual frontend unassignment.
* **Why**:
  1. **Local Testability & Portability**: Database triggers depend on proprietary cloud configurations that cannot run inside local automated test environments (`npm test`). Application-layer cascade hooks run identically across local MongoDB instances and Atlas production clusters.
  2. **Immediate Timeline Audit Logging**: Removing a member also generates `unassign` events in the immutable task history log. Doing this in the controller ensures timeline events are logged within the same request lifecycle.
* **Trade-offs**:
  * If a developer writes a raw MongoDB script bypassing the Express API, the cascade unassignment logic will not execute.

---

## Decision 4: Server-Side Query Engine vs. Client-Side In-Memory Filtering

* **What we chose**: Executing text search, multi-criteria filtering, custom sorting, and pagination entirely on the server using MongoDB query operators (`$regex`, `$in`, `$gte`, `$sort`, `$skip`, `$limit`).
* **Alternatives considered**: Fetching the entire task portfolio to the browser and filtering with JavaScript array methods (`.filter()`, `.sort()`).
* **Why**:
  1. **Strict Permission Scoping**: Members must only see tasks from projects they belong to. Fetching everything to the client and filtering locally risks leaking confidential client project data in network payloads.
  2. **Scalability**: While in-memory filtering feels snappy on 20 tasks, it collapses as the company grows to thousands of tasks across dozens of client engagements.
* **Trade-offs**:
  * Every filter toggle or pagination click requires a lightweight network round-trip.

---

## Decision 5: Multi-Layer Immutability for Task History and Comments

* **What we chose**: Enforcing history immutability at both the database schema level (Mongoose pre-middleware rejecting `save` on existing records, `updateOne`, `updateMany`, `replaceOne`, `findOneAndUpdate`, `deleteOne`, `deleteMany`, `findOneAndDelete`, `remove`) and the Express HTTP layer (`403 Forbidden` guards on timeline/comment routes for all roles, including managers).
* **Alternatives considered**: Simply hiding the "Edit" and "Delete" buttons in the React UI.
* **Why**:
  1. **True Non-Repudiation**: Hiding buttons in the interface offers zero protection against direct HTTP requests (`curl`, Postman, browser DevTools). A real business tool requires that audit records cannot be tampered with by anyone, including managers.
  2. **Unified Append-Only Model**: Modeling comments as typed events (`type: 'comment'`) within the same append-only collection guarantees that conversational context cannot be retroactively altered.
* **Trade-offs**:
  * Users cannot correct typographical errors in comments once posted.

---

## Decision 6: Dual-Layer State Invalidation for Overdue Alert Dismissals

* **What we chose**: Storing `associatedDueDate` on `AlertDismissal` documents combined with proactive `AlertDismissal.deleteMany({ taskId })` cleanup on task due date changes.
* **Alternatives considered**: Running a background cron job to periodically evaluate dismissed alerts, or using a Redis message queue.
* **Why**:
  1. **Zero State Drift**: Overdue status is an intrinsic derived property of task state (`dueDate < now && status !== 'done'`). Querying the database directly ensures alerts cannot become desynchronized or stale across browser tabs.
  2. **Guaranteed Reappearance**: If a task's due date shifts, the stored `associatedDueDate` immediately mismatches the new date, causing the alert to reappear even if the proactive deletion failed.
* **Trade-offs**:
  * Requires an additional lightweight lookup in `alertdismissals` when rendering the alerts area.

---

## Decision 7: REVERSED DECISION — Ambient System Status Badges in the Header

* **Initial Decision**: Added an ambient `.system-status-indicator` ("Live Atlas Connected") badge with a green pulsing dot to the top header in `DashboardShell.jsx` to communicate real-time database connectivity to the user.
* **Why it was Reversed**:
  * During application review and testing, the user explicitly provided feedback: *"at right top corner of website is showing live atlas connected can't it be hidden??"*.
  * Upon reflection, showing database infrastructure details is developer noise that clutters the UI and distracts from core task management. Internal business users expect database connectivity to be an invisible baseline, not a decorative dashboard ornament.
* **What we did**: Completely stripped the status indicator from `DashboardShell.jsx` and CSS, keeping the header clean, uncluttered, and focused purely on navigation and the Overdue Alerts bell badge.
