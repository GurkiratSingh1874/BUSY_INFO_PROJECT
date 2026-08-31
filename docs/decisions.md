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
