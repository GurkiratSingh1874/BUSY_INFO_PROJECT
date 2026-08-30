# Schema Documentation

## Table by Table: Collections and Field Types

### 1. `users` (User Collection)
* `_id`: `ObjectId` (Primary Key)
* `email`: `String` (Required, unique, lowercase, trimmed) - The email address used for login.
* `password`: `String` (Required, select: false) - Hashed password string.
* `name`: `String` (Required) - Display name of the user.
* `role`: `String` (Required, enum: `['manager', 'member']`, default: `'member'`) - User roles determining permissions.
* `createdAt`: `Date` (Auto-managed by Mongoose)
* `updatedAt`: `Date` (Auto-managed by Mongoose)

### 2. `projects` (Project Collection)
* `_id`: `ObjectId` (Primary Key)
* `key`: `String` (Required, unique, uppercase, trimmed, length: 2-10) - Short project key identifier (e.g. "BUSY").
* `name`: `String` (Required, trimmed) - Full project title.
* `description`: `String` (Optional, trimmed) - Detailed project description.
* `owner`: `ObjectId` (Required, ref: `users`) - The manager who created/owns the project.
* `members`: `[ObjectId]` (ref: `users`) - List of users assigned to collaborate on the project.
* `isArchived`: `Boolean` (Default: `false`) - Archive flag.
* `createdAt`: `Date`
* `updatedAt`: `Date`

### 3. `tasks` (Task Collection)
* `_id`: `ObjectId` (Primary Key)
* `projectId`: `ObjectId` (Required, ref: `projects`, Indexed) - The project this task belongs to.
* `title`: `String` (Required, trimmed) - Task header.
* `description`: `String` (Optional, trimmed) - Main body details.
* `priority`: `String` (Required, enum: `['low', 'medium', 'high']`, default: `'medium'`)
* `status`: `String` (Required, enum: `['backlog', 'in_progress', 'in_review', 'done', 'blocked']`, default: `'backlog'`)
* `preBlockedStatus`: `String` (Optional, enum: `['in_progress', 'in_review', null]`, default: `null`) - Tracks the state before transition to "blocked".
* `dueDate`: `Date` (Optional, default: `null`) - Task completion deadline.
* `blockers`: `[ObjectId]` (ref: `tasks`) - Array of task IDs in the same project that block this task.
* `assignees`: `[ObjectId]` (ref: `users`, Indexed) - People assigned to work on the task.
* `createdAt`: `Date`
* `updatedAt`: `Date`

### 4. `tasktimelines` (Append-Only Task History & Comments Collection)
* `_id`: `ObjectId` (Primary Key)
* `taskId`: `ObjectId` (Required, ref: `tasks`, Indexed) - The task this history entry belongs to.
* `type`: `String` (Required, enum: `['create', 'field_change', 'assign', 'unassign', 'comment']`) - Event type.
* `userId`: `ObjectId` (Required, ref: `users`) - The user who performed the operation.
* `fieldName`: `String` (Optional, default: `null`) - Field modified (e.g. 'status', 'dueDate').
* `oldValue`: `Mixed` (Optional, default: `null`) - The value prior to modification.
* `newValue`: `Mixed` (Optional, default: `null`) - The value after modification.
* `commentText`: `String` (Optional, default: `null`) - The text of the user comment (used if type is `'comment'`).
* `createdAt`: `Date` (Default: `Date.now`, Immutable) - Set on save.

### 5. `alertdismissals` (Overdue Alert Dismissals Collection)
* `_id`: `ObjectId` (Primary Key)
* `userId`: `ObjectId` (Required, ref: `users`, Indexed) - User who dismissed the alert.
* `taskId`: `ObjectId` (Required, ref: `tasks`, Indexed) - Task alert dismissed.
* `associatedDueDate`: `Date` (Required) - Stores the task's due date at the time of dismissal. Used to verify reset on due date modification.
* `createdAt`: `Date`
* `updatedAt`: `Date`

---

## One-to-Many vs. Many-to-Many Relationships

* **One-to-Many (1:N)**:
  * **User to Project Ownership**: One user can own multiple projects (`Project.owner`).
  * **Project to Task**: One project holds multiple tasks (`Task.projectId`).
  * **Task to Timeline Events**: One task has a chronological chain of timeline events (`TaskTimeline.taskId`).
* **Many-to-Many (M:N)**:
  * **Projects to Members**: A project can have many users in its membership list, and a user can belong to multiple projects. Managed via an array of User IDs embedded in the Project document (`Project.members`).
  * **Tasks to Assignees**: A task can have multiple assignees, and a user can be assigned to multiple tasks. Managed via an array of User IDs inside the Task document (`Task.assignees`).
  * **Tasks to Blockers**: A task can be blocked by multiple other tasks, and a single task can block multiple others. Managed via an array of Task IDs inside the Task document (`Task.blockers`).

---

## Enforced Constraints: Database vs. Application

* **Database Level (Enforced via Mongoose/MongoDB)**:
  * **Unique Identifiers**: `User.email` and `Project.key` are backed by unique indexes in MongoDB, preventing accidental race-condition duplications.
  * **Required Fields**: Fields like `User.email`, `Project.key`, `Task.projectId`, and `Task.title` are strictly required by the Mongoose driver.
  * **Referential Constraints**: We use compound index `{ userId: 1, taskId: 1 }` on `AlertDismissal` to prevent duplicate dismissals.
  * **Timeline Immutability**: Enforced via Mongoose pre-save middleware rejecting updates, updates with find, or deletions on the `TaskTimeline` model.
* **Application Level (Enforced via Express API Middleware/Controllers)**:
  * **Task Dependency Blockers**: The system prevents a task from moving to `Done` if any `Task.blockers` are not in the `Done` status. This is handled dynamically on state change.
  * **Allowed State Transitions**: The strict lifecycle state machine paths (e.g. rejecting direct jumps from Backlog to Done) are checked in application controllers.
  * **Project Membership Integrity**: Asserts that only users listed in `Project.members` can be added to `Task.assignees`.
  * **Automatic Cascade Unassignment**: When a member is removed from a project, application logic automatically runs a query to pull their User ID from `Task.assignees` for all tasks under that project ID.

* **Why we drew the line here**:
  Structural validations and unique constraints are best enforced by the database to ensure raw data integrity. Dynamic, stateful workflow rules (like task blockers and cascade deletions) are highly dependent on business definitions that change over time; enforcing them in the application layer keeps the database layer fast and agnostic.

---

## What was deliberately denormalized?

* **`Task.preBlockedStatus`**: Rather than checking the entire `TaskTimeline` history to resolve what state a task was in before it was blocked, we store the state directly on the Task document. This removes the need to query and sort the history collection every time a task is unblocked.
* **`AlertDismissal.associatedDueDate`**: Embedding the due date directly inside the dismissal record allows us to evaluate alert states in a single database query, without performing expensive relational joins on `tasks` and `alertdismissals`.

---

## What would break first if this had 100x the data?

1. **Dashboard Metrics (Goal 8)**: The dashboard currently aggregates counts for all tasks and status groupings. With 100x data, running these aggregations dynamically on every dashboard page load will slow down. We would need to implement pre-aggregation tables, caching (e.g. Redis), or daily summaries.
2. **Text Search in Task List (Goal 6)**: The text search on titles/descriptions utilizes standard regex or basic Mongo text indexes. Under high volume, text queries will experience high disk I/O. We would need to migrate to a dedicated search indexing system (e.g. Atlas Search, Elasticsearch).
3. **Audit Trail Size (Goal 9)**: Because every update triggers an append-only timeline document, the `tasktimelines` collection will grow 5x-10x faster than the tasks collection. We would need a database sharding strategy or cold-storage archiving for completed tasks' history.
