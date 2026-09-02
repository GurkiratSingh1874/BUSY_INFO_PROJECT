# Architecture Documentation

## System Components & Communication

The application is architected as a decoupled, full-stack client-server system organized into three core layers:

```
┌─────────────────────────────────────────────────────────────┐
│             Frontend Presentation Layer (Browser)           │
│  - React 18 SPA (Vite)                                      │
│  - Client Views: Dashboard, Projects, Board, List, Alerts   │
│  - CSS Custom Properties (Theme, Status Tints, Tabular Nums)│
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON REST (fetch)
                               │ Credentials: HTTP-Only JWT Cookie
┌──────────────────────────────▼──────────────────────────────┐
│             Backend Application Layer (Node.js/Express)     │
│  - REST API Routes (/api/auth, /api/projects, /api/tasks,   │
│    /api/dashboard, /api/alerts)                             │
│  - Middleware: JWT Authentication (`protect`),             │
│    Role-based Authorization (`authorize`),                 │
│    Project Access Boundaries (`verifyProjectAccess`)        │
│  - Business Domain Engines: Lifecycle State Machine,        │
│    Blocker Dependency Graph, Bulk Pipeline, Alert Resolver  │
│  - Static Asset Server (Serves frontend/dist in production) │
└──────────────────────────────┬──────────────────────────────┘
                               │ Mongoose ODM / TLS connection
┌──────────────────────────────▼──────────────────────────────┐
│             Persistence Layer (MongoDB Atlas Cluster)       │
│  - Collections: users, projects, tasks, tasktimelines,      │
│    alertdismissals                                          │
│  - Indexes: Unique (email, key), Compound (userId + taskId),│
│    Foreign keys (projectId, assignees, dueDate)             │
│  - Database Middleware: Pre-save/pre-query mutation hooks  │
│    enforcing append-only immutability on history records   │
└─────────────────────────────────────────────────────────────┘
```

---

## Where Each Piece Runs

1. **Client Tier (Browser)**:
   * **Local Development**: Runs on `http://localhost:5173` via Vite Dev Server with HMR and an API proxy rule forwarding `/api` calls to port 5000.
   * **Production**: Pre-compiled into static HTML, JS, and CSS bundles (`frontend/dist/`) via `npm run build` and served directly by Express.
2. **Server Tier (Node.js / Express)**:
   * **Local Development**: Runs on `http://localhost:5000` via Node.js runtime.
   * **Production**: Hosted as a single web service on Render, binding to `process.env.PORT`. Express serves both the REST API endpoints and static frontend assets from a single process.
3. **Database Tier (MongoDB)**:
   * **Local / Cloud**: Managed multi-tenant replica set hosted on **MongoDB Atlas** (Cluster `ac-56fntlt-shard-00-00.nm7cnhn.mongodb.net`) connected over TLS with SRV connection strings.

---

## Representative Request Flow End-to-End

### Flow: Transitioning a Task to `Done` with Dependency Validation

1. **User Action**: A team member drags or clicks to transition task `T-102` from `In Review` to `Done`.
2. **Frontend Dispatch**:
   * Component `TaskDetailsDrawer.jsx` dispatches `PUT /api/tasks/T-102` with payload `{ status: 'done' }` using `fetch()`, including credentials.
3. **Authentication Layer**:
   * Express intercepts the request via `protect` middleware (`middleware/auth.js`).
   * Reads `token` from signed HTTP-Only cookies, verifies signature via `jwt.verify()`, and attaches `req.user` (`_id`, `role`, `email`).
4. **Project Access & Membership Authorization**:
   * Task router retrieves task `T-102` from MongoDB and inspects its `projectId`.
   * For members, it verifies that `req.user._id` exists in `project.members`. If not, halts with `403 Forbidden`.
5. **State Machine Validation**:
   * Calls `validateTransition(task.status, 'done', task.preBlockedStatus)` (`utils/lifecycle.js`).
   * Verifies that `in_review -> done` is a valid lifecycle transition.
6. **Blocker Dependency Resolution**:
   * Calls `checkBlockerDependencies(task._id)`.
   * Queries MongoDB: `Task.find({ _id: { $in: task.blockers }, status: { $ne: 'done' } })`.
   * If any blocker is unfinished (`status !== 'done'`), halts execution and returns `400 Bad Request` with an explanation: `"Cannot complete task: It is blocked by unfinished tasks: 'Auth Gateway' (in_progress)"`.
7. **Database Persistence & Timeline Audit**:
   * If all blockers are done, updates `task.status = 'done'`.
   * Immediately writes an append-only timeline event into `tasktimelines`:
     `{ taskId: task._id, type: 'field_change', fieldName: 'status', oldValue: 'in_review', newValue: 'done', userId: req.user._id }`.
   * The Mongoose `TaskTimeline` schema executes its pre-save hook, confirming `this.isNew === true`.
8. **Response & Client Render**:
   * Returns `200 OK` with the updated task document and timeline event.
   * React component updates local state, plays the transition animation, removes the task from the Overdue Alerts list, and re-renders the Kanban column.

---

## What We Deliberately Decided *Not* to Build, and Why

1. **Public Self-Registration / Open Signup**:
   * *Why*: This is an internal enterprise task tracker. Open signup is a security risk in multi-tenant client systems. Instead, standard accounts (`manager@example.com`, `member1@example.com`, `member2@example.com`) are automatically seeded on startup with predictable roles.
2. **Heavy Global State Library (Redux, MobX)**:
   * *Why*: The application is organized around domain-driven tabs (Dashboard, Projects, Board, List, My Tasks, Alerts). Local React state combined with standard `fetch` triggers keeps code readable, easy to trace, and avoids unnecessary bundle bloat.
3. **WebSocket Real-Time Engine (Socket.io)**:
   * *Why*: WebSockets introduce connection state management, reconnection retry logic, and memory leaks on free-tier hosting that spins down when idle. Instead, focused event-driven refetches (e.g., updating alert count on dismiss or task completion) deliver immediate UI responsiveness without WebSocket fragility.
4. **Third-Party Charting Bloat (Recharts / Chart.js)**:
   * *Why*: Heavy charting packages add ~500KB of client-side JavaScript. We implemented the 8-week completion chart and dashboard metric bars using native, responsive CSS flexbox bars and SVG geometry with semantic markup.
5. **Background Redis Worker Queue for Overdue Alerts**:
   * *Why*: Running separate Redis worker processes (e.g., BullMQ) is cost-prohibitive on free hosting and prone to desynchronization. Overdue status is an intrinsic derived property of task state (`dueDate < now && status !== 'done'`). Querying the database directly ensures zero state drift.
