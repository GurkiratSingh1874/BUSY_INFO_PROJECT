# AI Prompts

This document logs the exact prompts used to direct the AI assistant during development, following the assignment requirements.

---

## 1. Initial Analysis & Architecture Setup

### Prompt
> preseeded accounts , frontend , backend folders , yes recharts
> 
> Before writing application code:
> 
> 2. Explain briefly why this stack is appropriate for a 12-hour assignment.
> 3. Do not introduce technologies just because they are popular.
> 4. Avoid microservices, unnecessary abstractions, complicated state-management libraries, event buses, queues, Redis, Kubernetes, etc.
> 5. Keep the architecture easy for me to explain in an interview.
> 
> Create a practical implementation plan divided into small milestones.
> The plan should prioritize the 10 mandatory goals in the README.
> 
> Use this general order unless you have a strong reason to change it:
> 
> Milestone 1 - project setup
> Milestone 2 - database/schema
> Milestone 3 - authentication and roles
> Milestone 4 - projects
> Milestone 5 - tasks and lifecycle rules
> Milestone 6 - assignments and dependencies
> Milestone 7 - search/filter/pagination
> Milestone 8 - bulk operations and CSV
> Milestone 9 - dashboard
> Milestone 10 - immutable history and comments
> Milestone 11 - overdue alerts
> Milestone 12 - testing, polish and deployment
> 
> For each milestone provide:
> - what we build
> - which README goals it satisfies
> - expected files/components/APIs
> - approximate time
> - what should be tested
> - suggested Git commit message
> 
> Also update docs/plan.md with this plan.
> 
> Do not implement the application yet.
> 
> If any requirement is ambiguous, ask me rather than inventing a complicated solution.

### What you got
* An explanation of why React (Vite) + Vanilla CSS + Express + Mongoose/MongoDB fits the 12-hour timeline and keeps the architecture clean.
* A detailed 12-milestone breakdown including files, APIs, test cases, and commits.
* A list of clarifying questions regarding backward transitions, alert dismissals, and bulk assignee changes.
* Structured plans saved to `docs/plan.md` and `implementation_plan.md`.

### What you corrected
* Refined the tool use: realized file creation for repository documentation like `docs/plan.md` must not include conversation artifact metadata to avoid target path validation errors.

---

## 2. Implementing Milestone 1 (Project Setup)

### Prompt
> no backware transitions , alert dismissal to personal only to whom project is assigned , bulk assignee i don't understand at this point will discuss it later when we implement it what we want u should implemnt buslk assignee as u understand and easy and complie with our goal.
> Now begin implementation with Milestone 1 only.
> 
> Tasks:
> 
> 1. Initialize the project using the agreed stack.
> 2. Create a clean folder structure.
> 3. Configure TypeScript if we selected it.
> 4. Configure frontend and backend according to the agreed architecture.
> 5. Configure basic environment-variable handling.
> 6. Make sure secrets will never be committed.
> 7. Configure the existing .gitignore appropriately.
> 8. Do not build business features yet.
> 9. Add a very simple initial application shell so we know frontend and backend run.
> 10. Add a health-check endpoint if appropriate.
> 
> IMPORTANT:
> Keep everything minimal.
> 
> Do not add:
> - unnecessary libraries
> - unnecessary abstractions
> - fake features
> - placeholder architecture that we won't actually use.
> 
> After implementation:
> - run the project
> - verify frontend works
> - verify backend works
> - fix obvious issues
> - explain what you created and why
> 
> Then update docs/architecture.md with the actual architecture.
> 
> Update docs/ai-prompts.md with the prompt I just gave you and briefly record what was produced.
> 
> Before making the Git commit, show me:
> - files changed
> - tests/checks performed
> - proposed commit message
> 
> Then ask me for confirmation before the first commit/push if GitHub credentials or repository information are not configured.

### What you got
* Initial backend project directory setup: `backend/package.json`, `backend/server.js`, and `.env` configs.
* Initial frontend project directory setup: `frontend/package.json`, `frontend/vite.config.js`, `frontend/index.html`, and React app assets (`src/App.jsx`, `src/index.css`, `src/main.jsx`).
* Standard packages installed (`express`, `mongoose`, `jsonwebtoken`, `bcryptjs`, `cookie-parser`, `dotenv`, `cors` for backend; `react`, `react-dom`, `lucide-react`, `recharts` for frontend).
* Configured local environment configs and validated `.gitignore` safety.
* Built React client code and booted backend Node server.
* Verified backend `/api/health` API response and confirmed root `/` serves built index.html page.
* Created documentation summaries in `docs/architecture.md` and `docs/ai-prompts.md`.

### What you corrected
* Encountered Windows PowerShell Execution Policy issue when installing packages; corrected workflow by executing installations through `cmd.exe /c "npm install"`.
* Addressed loopback address routing: loopback API fetches defaulted to IPv6 `[::1]`, which Node.js did not bind to, and resolved this by fetching via IPv4 loopback `127.0.0.1`.

---

## 3. Implementing Milestones 2 & 3 (Database Schema & Authentication)

### Prompt
> Implement Milestones 2 and 3 only.
> 
> DATABASE:
> Create the minimum database schema required by the README.
> 
> Before coding, verify that the schema supports:
> - users
> - manager/member roles
> - projects
> - project membership
> - tasks
> - task assignments
> - task dependencies
> - immutable task history
> - comments/timeline
> - overdue alert dismissal state
> 
> Use the simplest sensible relational/document design based on our chosen database.
> 
> Do not create excess tables/collections for hypothetical future features.
> and we have to connect mongo atlas database with this project tell me steps and take connection string from me and connect that 
> 
> AUTHENTICATION:
> Implement:
> - email/password login
> - secure password handling
> - session/token authentication appropriate for our stack
> - manager/member roles
> 
> AUTHORIZATION:
> This is critical.
> 
> Permissions must be enforced on the SERVER.
> 
> A member must not be able to bypass the UI and call an API to:
> - create/archive projects
> - change project membership
> - delete tasks
> - access projects they do not belong to
> 
> Do not rely on frontend hiding buttons.
> 
> Create simple reusable authorization checks on the backend rather than duplicating permission logic everywhere.
> 
> Create demo users eventually, but do not expose passwords in source code.
> 
> Add/update:
> - docs/schema.md
> - docs/architecture.md
> - docs/decisions.md
> - docs/ai-prompts.md
> 
> Test authentication and authorization manually and with automated tests where practical.
> 
> Then:
> 1. show me what was implemented
> 2. explain the important security decisions
> 3. run checks/tests
> 4. prepare a meaningful Git commit
> 5. push after confirmation if needed
> 
> implement only tilll login where admin , worker have different credentials to login in and can open different webpage after login and user can't bypass login and we can seed the user also . Today tilll this is enough . But main thing is to connect mongodb

### What you got
* MongoDB Mongoose Models: User, Project, Task, TaskTimeline, and AlertDismissal (with pre-hooks enforcing timeline immutability).
* JWT auth system: Cookie signature and verification middlewares in `backend/middleware/auth.js`.
* Backend auth endpoints: `/login`, `/logout`, `/me` with secure HTTP-only cookies in `backend/routes/auth.js`.
* Pre-seeded default users script in `backend/utils/seed.js` executing on server boot.
* Frontend React login layout and session logic routing to a role-based Dashboard Workspace card panel.
* Updated architectural logs in `docs/schema.md`, `docs/decisions.md`, and `docs/ai-prompts.md`.

### What you corrected
* Configured JWT secrets and database credentials to load securely from `.env` variables to align with zero repository exposure guidelines.
