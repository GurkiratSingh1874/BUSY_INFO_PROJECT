# Engineering Plan & Execution Record

## How Did You Break the Work Into Sessions?

The work was divided into 6 focused execution sessions designed to build bottom-up from database infrastructure to user workflows:

* **Session 1: Infrastructure & Data Modeling (Goals 1 & 2 Setup)**
  * Repository initialization, directory structure, Vite frontend scaffold, Express server, MongoDB Atlas connection, Mongoose schemas, and basic auth seeding.
* **Session 2: Identity, Access Control & Project Domain (Goals 1 & 2)**
  * JWT HTTP-Only authentication, role-based authorization (`manager` vs `member`), project CRUD, archiving/restoration, and membership isolation.
* **Session 3: Tasks, State Machine & Dependencies (Goals 3, 4 & 5)**
  * Task CRUD, lifecycle transition state machine (`Backlog ➔ In Progress ➔ In Review ➔ Done`), blocker dependency resolution, member assignment constraints, cascade unassignment hook, and the Kanban board.
* **Session 4: Server-Side Query Engine & Bulk Processing (Goals 6 & 7)**
  * Server-side text search over titles/descriptions, multi-criteria filtering, pagination, sorting (custom priority ordering), atomic per-task bulk actions reporting, and streaming CSV export.
* **Session 5: Operations Dashboard & Immutable Audit Trail (Goals 8 & 9)**
  * Scoped executive dashboard (headline KPIs, status breakdown, assignee workloads, 8-week completion chart), append-only timeline architecture, database-level and API-level immutability enforcement.
* **Session 6: Overdue Alerts, UI Polish & Strict Verification (Goal 10 & Review)**
  * Overdue alerts area with nav badges, assignee dismissal with dual-layer due-date invalidation, design system polish (typography, tabular numbers, status pills, stepper), and master 10-goal strict verification test suite.

---

## Build Order & Architectural Rationale

We followed a strict **dependency-first order**:

```
[1. Database Schemas & Mongoose Models]
              │
[2. Auth & RBAC Middleware] ─── (Secures all future endpoints)
              │
[3. Project Boundaries & Membership] ─── (Defines authorization scope)
              │
[4. Tasks & State Machine Engine] ─── (Enforces lifecycle & blocker rules)
              │
[5. Assignments & Cascade Cleanup] ─── (Ties users to tasks safely)
              │
[6. Search, Filter & Bulk APIs] ─── (Optimizes data discovery & mass updates)
              │
[7. Metrics & Dashboard Aggregations] ─── (Rolls up scoped task data)
              │
[8. Immutable History Log] ─── (Instruments event capture across all operations)
              │
[9. Overdue Alerts Engine] ─── (Calculates time-sensitive operational warnings)
              │
[10. Verification, UI Polish & Documentation]
```

---

## Estimated vs. Actual Time

| Milestone / Task | Description | Estimated Time | Actual Time | Variance & Notes |
| :--- | :--- | :--- | :--- | :--- |
| **MS 1 & 2** | Setup & Schemas | 1h 30m | 1h 15m | Faster due to pre-established project structure. |
| **MS 3** | Auth & RBAC (Goal 1) | 1h 15m | 1h 00m | Cookie-based JWT pattern worked cleanly. |
| **MS 4** | Projects (Goal 2) | 1h 15m | 1h 15m | On estimate; archiving logic and membership checks. |
| **MS 5 & 6** | Tasks, Lifecycle & Assignment (Goals 3, 4, 5) | 2h 30m | 2h 45m | Slightly longer to ensure strict blocker resolution and cascade unassignment hooks. |
| **MS 7** | Search, Filters, Pagination (Goal 6) | 1h 15m | 1h 30m | Needed extra time for custom priority ordering (Medium first, then Low, then High) requested by user. |
| **MS 8** | Bulk Operations & CSV (Goal 7) | 1h 15m | 1h 15m | RFC 4180 CSV streaming and atomic per-task reporting. |
| **MS 9** | Dashboard & Metrics (Goal 8) | 1h 00m | 1h 15m | Aggregating 8-week completion trends strictly through immutable history events took careful querying. |
| **MS 10** | Immutable History (Goal 9) | 1h 00m | 1h 15m | Multi-layer Mongoose middleware and route-level 403 guards required thorough verification. |
| **MS 11** | Overdue Alerts (Goal 10) | 1h 00m | 1h 10m | Dual-layer invalidation (proactive deleteMany + reactive date check) required edge case testing. |
| **MS 12** | Polish, Strict Audit & Docs | 1h 00m | 1h 30m | Replaced generic SaaS styling with disciplined design system; built and passed master 10-goal automated test suite. |
| **Total** | | **12h 40m** | **13h 40m** | **+1h total variance** due to rigorous testing and visual craftsmanship polish. |

---

## What We Deliberately Cut When Scoping

To maintain production-grade reliability across all 10 mandatory goals within our 12-hour budget, we intentionally cut the following non-essential features:

1. **User Self-Registration & Password Reset Flows**:
   * Cut in favor of secure, deterministic credential seeding (`manager@example.com`, `member1@example.com`, `member2@example.com`). This prevented spending hours configuring SMTP email delivery services.
2. **WebSocket / Real-Time Collaboration**:
   * Cut to avoid WebSocket connection management, socket reconnection state, and memory leaks on free-tier hosting. Replaced with targeted refetches upon user actions.
3. **Heavy Charting Dependencies (Recharts/Chart.js)**:
   * Cut 500KB+ of external dependencies by rendering the 8-week completion chart and dashboard metrics using clean, accessible CSS flex bars and SVGs.
4. **Drag-and-Drop Kanban Movement**:
   * Replaced with structured, click-to-transition buttons in the Task Details Drawer and Kanban cards. This guaranteed that users cannot drag cards into illegal states that the server would reject.
5. **Custom Avatar Image Uploads**:
   * Cut file upload pipelines (AWS S3/Multer) in favor of initials-based colored avatar circles.
