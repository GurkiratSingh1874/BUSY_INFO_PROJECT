# Architecture Documentation

## 1. System Overview

The application is built using a clean 3-tier architecture:

```
┌─────────────────────────────────────────────────────────────┐
│             1. Frontend Presentation (Browser)              │
│  - React 18 single-page application built with Vite         │
│  - Views: Dashboard, Projects, Kanban Board, List, Alerts   │
│  - Clean CSS with bespoke design tokens & status pills      │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTPS / JSON REST (fetch)
                               │ Credentials: HTTP-Only JWT Cookie
┌──────────────────────────────▼──────────────────────────────┐
│             2. Backend Application (Node.js & Express)      │
│  - REST API routes (/api/auth, /api/projects, /api/tasks,   │
│    /api/dashboard, /api/alerts)                             │
│  - Security middleware (JWT cookie auth, role authorization)│
│  - Domain logic (state machine rules, blocker checks)       │
│  - Static asset server (serves the compiled React frontend) │
└──────────────────────────────┬──────────────────────────────┘
                               │ Mongoose ODM / TLS connection
┌──────────────────────────────▼──────────────────────────────┐
│             3. Database Layer (MongoDB Atlas)               │
│  - Collections: users, projects, tasks, tasktimelines,      │
│    alertdismissals                                          │
│  - Fast compound indexes on keys, assignees, and due dates  │
│  - Database-level pre-hooks enforcing append-only history   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Where Each Piece Runs

1. **Frontend (Browser)**:
   * **In Development**: Runs on `http://localhost:5173` via Vite with hot-module reload.
   * **In Production**: Compiled into static HTML, CSS, and JS bundles (`frontend/dist/`) and served directly by the Express server.
2. **Backend (Node.js & Express)**:
   * **In Development**: Runs on `http://localhost:5000`.
   * **In Production**: Hosted as a single web service on **Render**. Express handles both the API routes and serves the frontend user interface from the same host, which eliminates cross-origin cookie issues.
3. **Database (MongoDB)**:
   * Hosted on **MongoDB Atlas** (cloud cluster), connected securely over TLS using a standard connection string.

---

## 3. Step-by-Step Request Flow

Here is what happens when a team member finishes a task:

### Example: Moving a task from `In Review` to `Done`

1. **User Action**: The user clicks on a task card to open the **Task Details Drawer**, and clicks the **`Mark Done`** button.
2. **Frontend API Call**: React sends a `PUT /api/tasks/:id` request with `{ status: 'done' }` using `fetch()`. The browser automatically includes the user's authentication cookie (`credentials: 'include'`).
3. **Authentication Check**: Express `protect` middleware reads the HTTP-Only cookie, verifies the JWT token, and identifies the logged-in user.
4. **Project Membership Check**: The server checks if the user is a registered member of this task's project. If not, the request is immediately blocked with `403 Forbidden`.
5. **State Machine Rule Check**: The server checks if moving to `Done` is allowed from the current status (`In Review ➔ Done` is legal, but an illegal jump like `Backlog ➔ Done` is rejected with `400 Bad Request`).
6. **Blocker Dependency Check**: The server queries MongoDB to see if this task has any blocker tasks that are not yet finished. If any blocker is still incomplete, the server rejects the request with `400 Bad Request` and tells the user which task is blocking it.
7. **Database Save & Audit Log**:
   * If all checks pass, the task status is updated to `done`.
   * At the exact same time, the server writes an append-only event into `tasktimelines` recording who completed the task and when.
   * Mongoose schema pre-hooks ensure this timeline event is strictly new and cannot be updated or deleted.
8. **Client UI Update**: The server responds with `200 OK`. React updates the task on the board, closes the drawer, and removes the task from the Overdue Alerts list.

---

## 4. What We Deliberately Decided *Not* to Build, and Why

1. **Public Self-Registration**:
   * *Why*: This is an internal enterprise tool, not a public social network. Allowing anyone on the internet to sign up is a security risk. Instead, standard accounts (`manager@example.com`, `member1@example.com`, etc.) are seeded automatically.
2. **Heavy State Management (Redux / MobX)**:
   * *Why*: The application is divided into focused views (Dashboard, Projects, Board, List, Alerts). Standard React state and direct `fetch` calls keep the code readable and easy to trace without hundreds of lines of boilerplate.
3. **WebSockets (Socket.io)**:
   * *Why*: On free hosting services that sleep when idle, WebSockets drop connections and cause reconnect loops. Simple, targeted refetches on user actions give instant feedback without connection fragility.
4. **Third-Party Charting Bloat (Recharts / Chart.js)**:
   * *Why*: Heavy charting packages add ~500 KB of client JavaScript just to render 8 bars. Writing lightweight CSS flexbox bars with semantic HTML kept page loads fast and eliminated bundle bloat.
5. **Background Worker Queues (Redis / BullMQ)**:
   * *Why*: Running separate background worker servers is expensive and complex on free cloud hosting. Calculating overdue tasks live on request ensures 100% fresh data with zero background worker maintenance.
