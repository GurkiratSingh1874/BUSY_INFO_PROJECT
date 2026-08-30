# Architecture

## What are the moving pieces, and how do they talk to each other?

The system is composed of three primary layers communicating over standard protocols:

1. **Frontend Presentation Layer (Single Page Application)**:
   * Built with **React** and styled using **Vanilla CSS** with HSL variables. It runs entirely in the user's web browser.
   * Talk to the backend by making asynchronous HTTP requests (`fetch` API) to JSON REST endpoints prefixed with `/api`.
   * Sessions are authenticated using **JSON Web Tokens (JWT)** sent securely via HTTP-Only cookies.

2. **Backend Application Layer (REST API Server)**:
   * Built using **Node.js** and **Express.js**.
   * Exposes RESTful API endpoints for authentication, project administration, task operations, bulk actions, and dashboard analytics.
   * Serves compiled static frontend production files (`frontend/dist/`) under the root route.
   * Middleware intercepts `/api` routes to decode JWT cookies, verify roles (Manager vs. Member), and enforce project boundary limits.

3. **Database Layer (Document Store)**:
   * Powered by **MongoDB** and integrated via the **Mongoose ORM**.
   * Stores five collections: `users`, `projects`, `tasks`, `tasktimelines` (append-only history), and `alertdismissals`.
   * Enforces structural constraints (unique emails, project keys) and indexes common search pathways (project ID, task status, due dates).

---

## Where does each piece run?

* **Local Development Environment**:
  * **Frontend**: Runs locally on `http://localhost:5173`, served by the Vite dev server. It includes a dev proxy that forwards `/api` requests to the backend server.
  * **Backend**: Runs on `http://localhost:5000`, started by Node.js.
  * **Database**: Runs locally via MongoDB (port 27017) or connects to a remote MongoDB Atlas sandbox cluster.

* **Production Deployed Environment**:
  * **Frontend & Backend (Unified Service)**: Build output from the React Vite client (`frontend/dist`) is copied to the backend root directory. A single Web Service instance on **Render** runs the Node/Express backend on port 5000, serving the static frontend resources and the REST API from the same process.
  * **Database**: A managed cloud cluster on **MongoDB Atlas** (Free Tier).

---

## What is the request path for one representative user action, end to end?

Let's trace **"Retrieving My Tasks"** for a logged-in Member:

1. **User Action**: The member clicks on the "My Tasks" link in the navigation sidebar.
2. **Browser (React)**: The routing component renders the `MyTasks` view. It triggers a `useEffect` hook that fires a `GET /api/tasks?assignee=current_user_id` query to the Express server.
3. **Backend Network (Express)**: The Express router captures the request and passes it to the `protect` authentication middleware.
4. **Backend Authentication (JWT Middleware)**: The middleware reads the HTTP-Only cookie `token`, verifies it using `JWT_SECRET`, decodes the payload, queries the `User` database model, and attaches the user model to `req.user`.
5. **Backend Authorization (Task Router)**: The task router handler checks the client role. Because the user is a `member`, the router queries the `Project` model to retrieve all project IDs where `req.user._id` is in the `members` array.
6. **Database Query (MongoDB)**: Express queries Mongoose:
   `Task.find({ assignees: req.user._id, projectId: { $in: userProjectIds } })`
   MongoDB filters the indexed task collection and returns the documents.
7. **Response Serialization**: The backend formats the list of tasks as a JSON array and sends a `200 OK` response with headers.
8. **Browser Render (React)**: The React component receives the JSON array, sets it in local state via `useState`, and maps it into a grid of clean task detail cards.

---

## What did you decide *not* to build, and why?

1. **Public Self-Registration / Signup Screen**: We opted to seed standard roles (`manager@example.com` and `member1@example.com`) directly on server start. This keeps authentication simple, fits the internal tracker scope, and saves about 1 hour of setup time.
2. **Global State Manager (Redux/Zustand)**: We decided to manage state with local React state and standard fetch triggers. Avoiding boilerplate state libraries keeps the codebase easy to read, maintain, and explain in an interview.
3. **Microservices / Split Hosting**: Placing frontend and backend in separate hosting accounts (e.g. Vercel + Render) was rejected. Serving built frontend assets directly from Express as a single unit eliminates CORS config friction, speeds up development, and prevents multiple free-tier servers from sleeping independently.
