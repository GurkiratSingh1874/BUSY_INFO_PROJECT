# Technical Decisions & Architectural Trade-offs

This document outlines the real technical decisions made while building this project, what alternatives were considered, why each choice was made, and the trade-offs accepted.

---

## Decision 1: HTTP-Only Cookies for JWT vs. Browser LocalStorage

* **What I chose**: Storing user JWT tokens inside signed, `httpOnly`, `sameSite: 'lax'` browser cookies sent from the backend on login.
* **Alternatives considered**: Storing JWT tokens in the browser's `localStorage` and attaching them manually via an `Authorization: Bearer <token>` header on every request.
* **Why I chose this**:
  1. **Protection against XSS**: If any malicious script runs in the browser, it can easily access `localStorage.getItem('token')` and steal credentials. Client-side JavaScript cannot read `httpOnly` cookies at all.
  2. **Cleaner frontend code**: The browser automatically sends cookies with every API call when using `credentials: 'include'`. I did not need to write complex request interceptors or token refresh wrappers in React.
* **Trade-offs accepted**:
  * Cross-origin requests require explicit cookie and CORS configuration, which requires careful handling between development and production.

---

## Decision 2: State Machine Logic in a Dedicated Helper vs. Database Schema Hooks

* **What I chose**: Writing the task status progression (`Backlog ➔ In Progress ➔ In Review ➔ Done`) inside a standalone helper file (`backend/utils/lifecycle.js`) that my route handlers call directly.
* **Alternatives considered**: Putting the transition checks inside Mongoose `pre('save')` hooks on the Task schema.
* **Why I chose this**:
  1. **Clear error feedback**: The requirement states that illegal status moves must explain *why* they failed and what moves are allowed. Mongoose schema hooks produce generic validation errors that are clunky to turn into friendly HTTP error messages.
  2. **Checking blocker tasks**: Moving a task to `Done` requires checking if other blocker tasks are already completed. Doing database queries for other tasks inside a Mongoose schema hook creates hidden side effects and makes unit testing difficult.
* **Trade-offs accepted**:
  * Any route that updates task status (single update or bulk update) must remember to explicitly call `validateTransition()` and `checkBlockerDependencies()`.

---

## Decision 3: Application-Level Cascade Updates vs. MongoDB Cloud Triggers

* **What I chose**: When a member is removed from a project, my Express route immediately runs an update query (`Task.updateMany`) to remove their ID from all tasks in that project, and writes an unassignment event to the task timeline.
* **Alternatives considered**: Using MongoDB Atlas Database Triggers or Atlas Cloud Functions to watch for changes and clean up tasks automatically.
* **Why I chose this**:
  1. **Works anywhere without cloud setup**: Cloud triggers depend on proprietary MongoDB Atlas settings. Writing the logic in Express means the app can be cloned and run locally by any reviewer without needing special cloud configurations.
  2. **Instant audit logs**: Running the update in the controller ensures timeline events are logged at the exact same moment the member is removed from the project.
* **Trade-offs accepted**:
  * If someone modifies the database directly using a raw script outside of the Express API, the automatic unassignment won't trigger.

---

## Decision 4: Multi-Layer Immutability for Audit History and Comments

* **What I chose**: Protecting history and comments in two separate layers: in the Express API routes (returning `403 Forbidden` if anyone tries to edit or delete a timeline record) AND in Mongoose schema hooks (rejecting any `update` or `delete` query at the database level).
* **Alternatives considered**: Simply hiding the "Edit" and "Delete" buttons in the React UI.
* **Why I chose this**:
  1. **Real security**: Hiding UI buttons does not prevent someone from using Postman or browser DevTools to send a direct `DELETE` or `PUT` request to `/api/tasks/:id/timeline/:timelineId`.
  2. **Even managers cannot change history**: The specification explicitly requires that history cannot be edited, even by managers. Database-level hooks ensure that even accidental code or cascade operations cannot delete audit records.
* **Trade-offs accepted**:
  * If a user makes a typo in a comment, they cannot edit it—they have to write a new comment to clarify.

---

## Decision 5: REVERSED DECISION — Native CSS Flexbox Bar Chart vs. Heavy External Chart Library

* **Initial Decision**: When building the 8-week completion chart on the dashboard, I initially installed an external charting library (`recharts`).
* **Why I reversed it**:
  * When inspecting the production build, `recharts` added over 400 KB of heavy JavaScript dependencies just to render 8 simple vertical bars.
  * On free-tier cloud hosting and slower connections, this caused unnecessary bundle bloat and slower page loads.
* **What I chose instead**: I reversed the decision, removed the external library, and built a custom responsive bar chart using standard HTML and CSS flexbox in `Dashboard.jsx`. Each bar's height is calculated cleanly as a percentage (`height: ${percentage}%`) with semantic tooltips.
* **Trade-offs accepted**:
  * I had to write the flexbox styling and tooltip positioning manually instead of using pre-built library components, but saved 400 KB of bundle size.

---

## Decision 6: REVERSED DECISION — Explicit Action Buttons & Drawer Stepper vs. Freeform Drag-and-Drop

* **Initial Decision**: On the project Kanban board, I originally planned to let users drag cards between columns using a drag-and-drop library.
* **Why I reversed it**:
  * With strict lifecycle rules (`Backlog ➔ In Progress ➔ In Review ➔ Done`) and blocker dependencies, drag-and-drop creates a frustrating experience: if a user drags a card from Backlog directly to Done, or drags a blocked task, the card snaps back across the screen with an error.
  * Drag-and-drop on mobile or trackpads is also clumsy and prone to accidental drops.
* **What I chose instead**: I reversed the decision and built a sliding **Task Details Drawer** with an interactive visual stepper and explicit workflow action buttons (`Start Progress`, `Submit Review`, `Mark Done`, `Mark Blocked`). The drawer only illuminates and enables the exact legal transitions available from the current state.
* **Trade-offs accepted**:
  * Changing a task's state requires clicking to open the drawer instead of a quick freeform drag, but it completely eliminates confusing card snap-backs and accidental illegal moves.
