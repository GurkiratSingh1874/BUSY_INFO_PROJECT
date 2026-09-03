# Submission

## Links

- **GitHub repository:** https://github.com/GurkiratSingh1874/BUSY_INFO_PROJECT
- **Live application:** https://project-tracker-pw16.onrender.com

## Notes for the reviewer

* The application is built as a unified full-stack service: the Node.js/Express server exposes the REST API on `/api/*` and serves the compiled React production bundle from `frontend/dist/` under the root URL.
* If testing on a cloud free-tier instance (e.g. Render), the server spins down when idle; the first cold-start request may take 30–50 seconds to initialize before subsequent requests respond in under 50ms.
* Default accounts and test workspaces are seeded automatically on database startup.

## Demo credentials

| Role | Name | Email | Password | Project Access & Scope |
| :--- | :--- | :--- | :--- | :--- |
| **Manager** | **Elena Rostova** | `manager@example.com` | `manager123` | Full portfolio view across all projects (`APOLLO`, `NEXUS`, `CYBER`, and archived `LEGACY`). Can create/archive projects, manage memberships, and delete tasks. |
| **Member 1** | **Alice Walker** | `member1@example.com` | `member123` | Assigned to `APOLLO` and `NEXUS`. Can view and update her tasks, comment, and dismiss her overdue alerts. Strictly blocked from `CYBER`. |
| **Member 2** | **Bob Chen** | `member2@example.com` | `member123` | Assigned to `APOLLO` and `CYBER`. Can view and update his tasks, comment, and dismiss his overdue alerts. Strictly blocked from `NEXUS`. |
| **Member 3** | **David Kim** | `member3@example.com` | `member123` | Assigned to `NEXUS` and `CYBER`. Can view and update his tasks, comment, and dismiss his overdue alerts. Strictly blocked from `APOLLO`. |

---

## Stack

| Layer | What you used | Why |
| :--- | :--- | :--- |
| **Frontend** | React 18 + Vite + Vanilla CSS | Fast rendering, modular components, zero heavy UI frameworks (no Tailwind or component libraries), bespoke CSS design tokens with tinted status pills, tabular numbers, and clean visual hierarchy. |
| **Backend** | Node.js + Express.js | Lightweight asynchronous I/O, straightforward middleware architecture for JWT cookie authentication and role-based access control, clean separation of domain validation. |
| **Database** | MongoDB Atlas + Mongoose | Schema-driven document model supporting embedded membership/assignee arrays, compound indexes, and database-level pre-middleware enforcing timeline immutability. |
| **Hosting** | Render Web Service + MongoDB Atlas | Single unified deployable container on free tier; zero CORS issues because API and frontend assets originate from the same host. |

---

## Goal Checklist

| # | Goal | Status | Notes |
| :-: | :--- | :---: | :--- |
| **1** | **Accounts and roles** | **Done** | Server-side enforcement using JWT cookies. Managers can create/archive projects and delete tasks; members are rejected with `403 Forbidden` and can only view projects they are assigned to. |
| **2** | **Projects** | **Done** | Projects carry short key, name, description, and owner. Supports editing, soft-delete archiving, and restoration. Archived projects hidden from default views without data destruction. |
| **3** | **Tasks inside projects** | **Done** | Every task belongs to exactly one project with title, description, priority, optional due date, and same-project blockers. Full scoped CRUD supported. |
| **4** | **Task lifecycle with rules** | **Done** | Strict state machine (`Backlog ➔ In Progress ➔ In Review ➔ Done`). Can be marked Blocked and unblocks back to prior state. Illegal jumps rejected with HTTP `400` explaining why. Blockers prevent completion. Reopening from Done supported. |
| **5** | **Assignment** | **Done** | Multiple assignees per task. Assignments strictly limited to project members. Removing a member from a project automatically unassigns them from all project tasks. Dedicated cross-project "My Tasks" view. |
| **6** | **Finding things** | **Done** | Server-side text search over title & description, multi-criteria filtering (project, status, priority, assignee, overdue), sorting (due date, priority, last updated), and server-side pagination with total matches count. |
| **7** | **Acting on many tasks at once** | **Done** | Bulk actions (status, assignee, due date) process items independently and report atomic `SUCCESS` or `REJECTED` per task with reasons without batch failure. Filtered RFC 4180 CSV export. |
| **8** | **A dashboard** | **Done** | Executive dashboard displaying headline KPIs (open, overdue, due this week, completed this week), status breakdown, assignee workloads with heavy-load flags, and 8-week completion chart. Strictly scoped by user permissions. |
| **9** | **History you cannot rewrite** | **Done** | Append-only audit timeline recording creation, field changes with old/new values, assignments, unassignments, and comments. Enforced via database pre-middleware and API route `403` guards for all roles, including managers. |
| **10** | **Overdue alerts** | **Done** | Past-due unfinished tasks appear in alerts area with nav badges. Assigned users can dismiss alerts (unassigned users blocked with `403`). Changing due date automatically revives dismissed alerts. Done tasks produce no alert. |

---

## How much time did you actually spend?

**Total Time: ~13 hours 40 minutes**
* Milestone 1–2 (Scaffolding, Mongoose Schemas): 1h 15m
* Milestone 3 (Auth & Roles): 1h 00m
* Milestone 4 (Projects & Archiving): 1h 15m
* Milestone 5–6 (Tasks, State Machine, Assignments, Cascade Hook): 2h 45m
* Milestone 7 (Server Search, Filtering & Pagination): 1h 30m
* Milestone 8 (Bulk Operations & CSV Streaming): 1h 15m
* Milestone 9 (Operational Dashboard & Analytics): 1h 15m
* Milestone 10 (Immutable Audit History & Comments): 1h 15m
* Milestone 11 (Overdue Alerts & Invalidation): 1h 10m
* Milestone 12 (UI Polish, Strict 10-Goal Audit Verification & Docs): 1h 30m

---

## What would you do next, with another 12 hours?

1. **Server-Sent Events (SSE) for Real-Time Updates**: Introduce lightweight SSE streams so that when a teammate transitions a task or dismisses an alert, other users' dashboards and boards update live without requiring manual refreshes.
2. **Multi-Hop Dependency Cycle Detection**: Extend blocker validation beyond single-pair dependencies with a recursive graph traversal (Tarjan's or DFS cycle check) to prevent circular dependency chains (e.g. A blocks B, B blocks C, C blocks A).
3. **Subtasks & Acceptance Checklists**: Allow tasks to contain checklist items that can be checked off during `In Progress` before transitioning to `In Review`.
4. **Automated GitHub PR Webhooks**: Link task IDs to git branches/commits so that opening a PR automatically moves a task to `In Review` and merging marks it `Done`.

---

## What are you least happy with in this codebase, and why?

While MongoDB document embedding works well for tasks and assignees, computing the **8-week completion trend** on the executive dashboard requires querying `tasktimelines` and bucketing events in Node.js memory. If the application scales to hundreds of thousands of tasks, this approach will cause high database I/O and memory pressure.

In a larger production system, I would replace this on-the-fly aggregation with a dedicated write-through summary table or an incremental pipeline (like MongoDB Materialized Views or Redis timeseries) updated during task completion events, ensuring the dashboard query remains \(O(1)\) regardless of database volume.
