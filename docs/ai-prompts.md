# AI Prompts & Engineering Collaboration Log

## How I Directed and Verified AI Output

Throughout this project, I used an AI assistant as an interactive pair-programming partner to help scaffold initial code, speed up repetitive setup, and draft test cases. 

All system architecture, data models, state machine rules, and security checks were designed and directed by me. Below is the flowing record of prompts used across the project, including where the AI gave incomplete or flawed output and how I guided it to the correct solution using plain English.

---

## 1. Setting Up Database Models & Schemas

### Prompt
> "I am building a full-stack project and task tracking application using Node.js, Express, MongoDB, and React with Vite.
> Help me draft the initial database schemas for our main entities:
> - Users: Email, hashed password, name, and role (Manager or Member).
> - Projects: Short unique uppercase key, name, description, owner, list of members, and an archive flag.
> - Tasks: Project link, title, description, priority (low, medium, high), status (backlog, in progress, in review, done, blocked), previous status before blocking, due date, list of blocker tasks, and list of assigned users.
> - Timeline History: Task link, user link, event type (creation, field change, assignment, unassignment, comment), field name, previous value, new value, comment text, and timestamp.
> - Alert Dismissals: User link, task link, and the snapshot of the due date when dismissed.
> Make sure to add appropriate indexes for fast queries and unique constraints."

### AI Output Assessment & My Correction
* **What the AI produced**: A good starting set of schemas with basic fields and references.
* **The issue I caught**: The AI forgot to index key search fields like the project archive flag, task due dates, and task assignees. It also forgot to make the timeline timestamp immutable.
* **What I changed**: I asked the AI to add indexes on all foreign keys and search filters, and added a compound unique index so a user cannot have duplicate dismissal records for the same task.

---

## 2. Authentication & User Roles

### Prompt
> "I want to implement cookie-based JSON Web Token authentication for our Express backend.
> Write two middleware helpers:
> 1. An authentication guard that reads the token from an HTTP-Only cookie, verifies it, fetches the user from the database without the password, and attaches it to the request. If missing or invalid, return an unauthorized response.
> 2. A role authorization guard that checks whether the user is a manager or member. If they lack permission, return a clear 403 Forbidden response.
> Also create the login logic that sets the cookie with HTTP-Only enabled and appropriate security flags."

### AI Output Assessment & My Correction
* **What the AI produced**: Basic authentication middleware and login logic.
* **The issue I caught**: The AI initially set strict cookie options that caused the browser to drop cookies when testing locally across different ports (React running on one port and Express on another).
* **What I changed**: I adjusted the cookie options to work smoothly in local development and configured CORS to allow credentials with explicit origin matching.

---

## 3. Project Creation & Archiving

### Prompt
> "Write the controller routes for project management:
> - Creating a project: Only managers can create projects. A unique key of 2 to 6 uppercase letters, name, and owner are required. The creator must automatically be added to the project members.
> - Listing projects: Managers see all active projects. Regular members must only see projects where they are listed as members. Include an optional filter to view archived projects.
> - Archiving projects: Only managers can archive or restore a project. When archived, do not delete the project from the database—simply flip the archive flag so historical data is preserved."

### AI Output Assessment & Verification
* **What the AI produced**: Clean controller methods enforcing manager role checks on creation and archiving, and filtering project visibility for regular members.
* **My Verification**: I tested with both roles: confirmed that a regular member trying to create a project receives Forbidden (403), and confirmed that members only see projects they are assigned to.

---

## 4. Task State Machine & Blocker Dependencies

### Prompt
> "I need a domain validation helper to enforce our task lifecycle rules.
> The rules are:
> - Standard flow: Backlog moves to In Progress, then to In Review, then to Done.
> - Blocking: A task in In Progress or In Review can be marked as Blocked. When unblocked, it must return to the exact status it had before blocking.
> - Reopening: A completed task can be reopened, moving it back to In Review.
> - Direct jumps (such as Backlog straight to Done, or In Progress straight to Done) are strictly prohibited.
> Write a validation function that checks the current status against the requested status and returns whether the move is legal, along with a clear error message explaining why an illegal jump was rejected and listing what moves are allowed."

### Flawed AI Output & How I Corrected It
* **The Flaw**: The AI returned generic error messages like 'Invalid transition' and completely forgot to check whether blocker tasks were finished before allowing a task to move to Done.
* **My Correction**: I guided the AI to separate the logic into two steps:
  1. A state progression check that clearly lists which next steps are allowed in plain English.
  2. A dependency check that queries the database for all tasks blocking this one, verifying that every single blocker is already completed. If any blocker is unfinished, the move is rejected, naming the exact task that is blocking it.

---

## 5. Member Removal & Automatic Task Unassignment

### Prompt
> "When a manager removes a user from a project's members list, our rules require that the user is automatically unassigned from all tasks inside that project.
> Write the controller logic to:
> 1. Remove the user from the project's member list.
> 2. Update all tasks in that project to remove that user from the assignees list.
> 3. Create an unassignment event in the task timeline for every task they were removed from, noting who made the change."

### AI Output Assessment & Verification
* **What the AI produced**: Controller code that removed the member from the project, updated the matching tasks, and added unassignment history entries.
* **My Verification**: I assigned a member to several tasks in a project, removed the member from that project, and verified that their name was cleared from all task assignees and recorded in the audit history.

---

## 6. Server-Side Search, Custom Priority Sorting & Pagination

### Prompt
> "Write the controller to handle listing tasks with server-side query filtering:
> - Search across task titles and descriptions using case-insensitive text matching.
> - Filter by project, status, priority, assignee, and overdue status.
> - If the user is a regular member, restrict results to projects they belong to.
> - Support pagination with limit and page number, returning total count and total pages.
> - Support sorting by due date, last updated, and priority."

### Flawed AI Output & How I Corrected It
* **The Flaw**: The AI used standard alphabetical sorting on the priority field. Because priorities are stored as words ('high', 'medium', 'low'), alphabetical sorting placed 'low' before 'medium', which is completely wrong for task tracking!
* **My Correction**: I directed the AI to map priority levels to numbers (High = 3, Medium = 2, Low = 1) so that descending sort accurately shows High priority first, then Medium, then Low.

---

## 7. Bulk Operations & Filtered CSV Export

### Prompt
> "Write an endpoint for bulk task updates:
> - Accept a list of task IDs and an update action (updating status, changing assignees, or setting a due date).
> - Process each task individually and check permissions and lifecycle rules.
> - If one task fails validation, do not cancel the whole batch. Instead, return a list showing which tasks succeeded and which were rejected, along with the specific reason.
> Also write a helper to export the currently filtered task list as a clean, standard CSV file without importing heavy external libraries."

### AI Output Assessment & Verification
* **What the AI produced**: A loop that validated each task independently, returned per-task success or rejection receipts, and a clean CSV formatter handling quotes and commas.
* **My Verification**: I tested selecting multiple tasks where one was blocked and others were valid. The valid tasks updated successfully while the blocked task returned a clear explanation without aborting the batch.

---

## 8. Dashboard Analytics & Historical Trends

### Prompt
> "Write the dashboard aggregation logic:
> - Scope all numbers to projects the user has permission to see.
> - Calculate headline numbers: open tasks, overdue tasks, tasks due this week, and tasks completed this week.
> - Break down task counts by status and by assignee, flagging team members with heavy workloads.
> - Calculate completed tasks per week over the last 8 weeks, grouped from Monday to Sunday."

### Flawed AI Output & How I Corrected It
* **The Flaw**: The AI tried to calculate past weekly completions using the task's last-updated timestamp. If an old completed task had its description edited today, its last-updated date changed to today, which corrupted historical charts!
* **My Correction**: I instructed the AI to query the immutable timeline history for events where the status changed to Done. Using the permanent event creation timestamp ensured past weekly completion numbers never change when tasks are later edited.

---

## 9. Making History and Comments Strictly Immutable

### Prompt
> "I need to ensure that task history and comments can never be edited or deleted after creation, even by managers.
> Implement this in two layers:
> 1. In the API routes, add handlers for edit and delete requests on history items that immediately reject with 403 Forbidden.
> 2. In the database model, add pre-hooks that reject any update or delete operation at the database level."

### Flawed AI Output & How I Corrected It
* **The Flaw**: The AI only blocked edits when saving individual documents, but forgot to block database-level update and delete queries (such as find and update or bulk delete queries).
* **My Correction**: I directed the AI to add database query middleware that intercepts all update and delete queries and throws an error, ensuring history cannot be modified by any script or cascade operation.

---

## 10. Overdue Alerts & Automatic Reappearance

### Prompt
> "Help me design the overdue alerts dismissal logic without using background worker servers:
> - When an assigned user dismisses an alert, store their user ID, the task ID, and the task's current due date.
> - When showing active alerts, check if the task's current due date matches the dismissed date.
> - If someone later changes the due date to a new date, the stored date will no longer match, so the alert should automatically come back.
> Write the routes for listing alerts and dismissing an alert."

### AI Output Assessment & Verification
* **What the AI produced**: A simple, reliable date-comparison design where alert visibility is calculated on-the-fly.
* **My Verification**: I tested dismissing an overdue alert, then updated the task's due date to a new date, and confirmed the alert immediately reappeared in the navigation badge.

---

## 11. Production Deployment on Cloud Free Tier

### Prompt
> "I am deploying our application as a unified full-stack service on Render:
> - The Express backend must serve the compiled React frontend from the static build folder under the root URL, while handling API routes under /api.
> - The server must bind properly to 0.0.0.0 and use the port provided by the environment.
> - Ensure MongoDB connection settings handle cloud wake-up delays without crashing the container on startup."

### Flawed AI Output & How I Corrected It
* **The Flaw**: The AI wrote connection code that immediately shut down the server if the database took more than 5 seconds to connect on initial boot. On cloud free tiers during wake-up, MongoDB Atlas can take 8 to 10 seconds to respond, which caused the server to crash repeatedly.
* **My Correction**: I removed the immediate shutdown call, increased the connection timeout to 10 seconds, and added a health check endpoint to report connection status cleanly.

---

## 12. Automated Integration Verification Suite

### Prompt
> "Write a standalone Node.js integration script using native fetch to test all 10 project requirements against our live deployed URL:
> 1. Verify health check and database connectivity.
> 2. Test manager and member logins, verifying HTTP-Only cookies.
> 3. Verify project access isolation between different members.
> 4. Verify that members are blocked from creating projects.
> 5. Test task creation, illegal state jumps (Backlog to Done), blocker dependency enforcement, and completion once blockers are resolved.
> 6. Verify server-side search, filtering, and pagination metadata.
> 7. Verify dashboard metric calculations.
> 8. Test history immutability by verifying that direct edit attempts are rejected.
> 9. Verify overdue alert retrieval.
> 10. Clean up temporary test data."

### Result
The script ran directly against our live production deployment and verified that all 10 requirements passed cleanly.
