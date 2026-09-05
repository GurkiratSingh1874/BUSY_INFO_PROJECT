# Engineering Plan & Execution Record

## 1. How I Broke the Work into Sessions

I divided the build into 6 focused sessions, moving bottom-up from database infrastructure to the user interface:

* **Session 1: Infrastructure & Data Modeling (Setup)**
  * Initialized the repository, set up the Vite React frontend and Express backend, connected to MongoDB Atlas, defined Mongoose schemas, and seeded initial data.
* **Session 2: Authentication, Roles & Projects (Goals 1 & 2)**
  * Built JWT cookie authentication, role checks (`manager` vs `member`), project CRUD, archiving/restoring projects, and project access boundaries.
* **Session 3: Tasks, Lifecycle Rules & Assignments (Goals 3, 4 & 5)**
  * Built task CRUD, the lifecycle state machine (`Backlog ➔ In Progress ➔ In Review ➔ Done`), blocker dependency checks, member assignments, cascade unassignment on member removal, and the Kanban board.
* **Session 4: Server Search, Filtering & Bulk Actions (Goals 6 & 7)**
  * Implemented server-side text search over titles and descriptions, multi-field filters, pagination, custom priority sorting, atomic per-task bulk updates, and filtered CSV export.
* **Session 5: Operations Dashboard & Immutable History (Goals 8 & 9)**
  * Built the scoped executive dashboard (headline KPIs, status breakdown, assignee workloads, 8-week completion chart), and enforced multi-layer history immutability at both the API and database levels.
* **Session 6: Overdue Alerts, UI Polish & Final Testing (Goal 10 & Review)**
  * Added the overdue alerts area with navigation badges, dismissal with automatic due-date invalidation, polished the dark-theme UI, and ran end-to-end verification tests.

---

## 2. Build Order & Rationale

I followed a strict **dependency-first order**:

```
[1. Database Schemas]
          │
[2. Authentication & Role Middleware] ─── (Secures all future endpoints)
          │
[3. Project Boundaries & Membership] ─── (Defines authorization scope)
          │
[4. Tasks & State Machine Engine] ─── (Enforces lifecycle & blocker rules)
          │
[5. Assignments & Cascade Cleanup] ─── (Ties users to tasks safely)
          │
[6. Server-Side Search, Filter & Bulk APIs] ─── (Handles data discovery & mass updates)
          │
[7. Metrics & Dashboard Aggregations] ─── (Rolls up scoped task data)
          │
[8. Immutable History Log] ─── (Instruments event capture across all operations)
          │
[9. Overdue Alerts Engine] ─── (Calculates time-sensitive operational warnings)
          │
[10. Verification, UI Polish & Documentation]
```

**Why this build order?**  
Every step builds on the previous foundation: you cannot protect projects without auth, you cannot create tasks without projects, and you cannot build the dashboard or audit logs without tasks.

---

## 3. Estimated vs. Actual Time

| Milestone / Area | Description | Estimated | Actual | Variance & Notes |
| :--- | :--- | :--- | :--- | :--- |
| **MS 1 & 2** | Setup & Schemas | 1h 30m | 1h 15m | Faster due to straightforward project structure. |
| **MS 3** | Auth & Roles (Goal 1) | 1h 15m | 1h 00m | Cookie-based JWT pattern worked cleanly. |
| **MS 4** | Projects (Goal 2) | 1h 15m | 1h 15m | On estimate; archiving logic and membership scoping. |
| **MS 5 & 6** | Tasks, Lifecycle & Assignment (Goals 3, 4, 5) | 2h 30m | 2h 45m | Took slightly longer to ensure strict blocker dependency checks and cascade unassignment hooks. |
| **MS 7** | Search, Filters, Pagination (Goal 6) | 1h 15m | 1h 30m | Needed extra time to map numeric priority weights so high-to-low and low-to-high sorting worked accurately in MongoDB. |
| **MS 8** | Bulk Operations & CSV (Goal 7) | 1h 15m | 1h 15m | RFC 4180 CSV streaming and atomic per-task reporting. |
| **MS 9** | Dashboard & Metrics (Goal 8) | 1h 00m | 1h 15m | Aggregating 8-week completion trends strictly through immutable history events required careful date range queries. |
| **MS 10** | Immutable History (Goal 9) | 1h 00m | 1h 15m | Multi-layer Mongoose schema hooks and route-level 403 guards required thorough testing. |
| **MS 11** | Overdue Alerts (Goal 10) | 1h 00m | 1h 10m | Due-date invalidation logic required testing multiple edge cases. |
| **MS 12** | Polish, Strict Audit & Docs | 1h 00m | 1h 30m | Polished UI craftsmanship and built automated end-to-end test suite. |
| **Total** | | **12h 40m** | **13h 40m** | **+1h total variance** due to thorough edge-case testing and UI refinement. |

---

## 4. What I Deliberately Cut When Scoping

To maintain high reliability across all 10 mandatory goals within my 12-hour budget, I intentionally left out these non-essential features:

1. **User Self-Registration & Password Reset**:
   * Cut in favor of secure, deterministic demo accounts (`manager@example.com`, `member1@example.com`, etc.). This avoided spending hours configuring external email delivery services.
2. **WebSocket Real-Time Collaboration**:
   * Cut to avoid WebSocket connection drops and memory leaks on free-tier hosting that sleeps when idle. Replaced with targeted refetches upon user actions.
3. **Heavy Charting Dependencies (Recharts / Chart.js)**:
   * Cut 500 KB+ of external dependencies by rendering the 8-week completion chart using clean, lightweight CSS flexbox bars.
4. **Drag-and-Drop Kanban Movement**:
   * Replaced with a sliding Task Details Drawer and explicit workflow action buttons. This guaranteed users cannot drag cards into illegal states that the server would reject.