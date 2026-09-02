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
* `fieldName`: `String` (Optional, default: `null`) - Field modified (e.g. 'status', 'priority', 'dueDate', 'title', 'description').
* `oldValue`: `Mixed` (Optional, default: `null`) - The value prior to modification.
* `newValue`: `Mixed` (Optional, default: `null`) - The value after modification.
* `commentText`: `String` (Optional, default: `null`) - The text of the user comment (used when type is `'comment'`).
* `createdAt`: `Date` (Default: `Date.now`, Immutable) - Timestamp when the event was recorded.

#### Why History is Modeled This Way:
1. **Unified Event Sourcing / Append-Only Log Pattern**: Rather than creating separate tables for `comments`, `status_history`, and `assignment_logs`, all historical occurrences are modeled as an immutable stream of typed events. This eliminates expensive relational joins and provides a natural chronological activity feed (`.find({ taskId }).sort({ createdAt: 1 })`).
2. **First-Class Comments**: Treating comments as a specialized timeline event (`type: 'comment'`) guarantees that comments cannot be retroactively tampered with, deleted, or backdated. Discussion context remains permanently anchored alongside the state changes that occurred before and after it.
3. **Multi-Layer Immutability (Not Just UI Hiding)**:
   * **Database/Mongoose Layer**: `TaskTimelineSchema` defines strict pre-middleware preventing any mutation (`pre('save')` on existing docs, `pre('updateOne')`, `pre('updateMany')`, `pre('replaceOne')`, `pre('findOneAndUpdate')`, `pre('deleteOne')`, `pre('deleteMany')`, `pre('findOneAndDelete')`, and `pre('remove')`). Any attempt to alter or delete an existing history document throws an error.
   * **API Layer**: Explicit `PUT` and `DELETE` handlers on `/api/tasks/:id/timeline/:timelineId` and `/api/tasks/:id/comments/:commentId` return `403 Forbidden` for all roles, including managers.
   * **Audit Preservation on Task Deletion**: When a task document is deleted, timeline records are retained in the database as an indelible audit trail.

---

### 5. `alertdismissals` (Overdue Alert Dismissals Collection)
* `_id`: `ObjectId` (Primary Key)
* `userId`: `ObjectId` (Required, ref: `users`, Indexed) - User who dismissed the alert.
* `taskId`: `ObjectId` (Required, ref: `tasks`, Indexed) - Task alert dismissed.
* `associatedDueDate`: `Date` (Required) - Stores the task's exact due date at the moment of dismissal.
* `createdAt`: `Date` (Timestamp of dismissal)
* `updatedAt`: `Date`

#### Why Alert Dismissal is Modeled This Way:
1. **Per-Assignee State Isolation**: The requirement states that individual assigned users can dismiss alerts for their tasks. Storing dismissals in a dedicated junction collection (`userId` + `taskId`) allows one assigned team member to dismiss their alert notification without silencing alerts for other assignees on the same task.
2. **Compound Unique Index**: `AlertDismissalSchema.index({ userId: 1, taskId: 1 }, { unique: true })` prevents race condition duplicates while enabling sub-millisecond lookup times when loading user alert counts.
3. **Deterministic Due-Date Invalidation**: By embedding `associatedDueDate`, the query layer can evaluate alert validity with zero ambiguity: if `new Date(alertDismissal.associatedDueDate).getTime() !== new Date(task.dueDate).getTime()`, the dismissal is automatically considered stale/invalid. In addition, single and bulk due date update routes proactively run `AlertDismissal.deleteMany({ taskId: task._id })`, providing dual-layer reliability for alert reappearance.
4. **Strict Assignee Authorization**: Validated in `POST /api/alerts/:taskId/dismiss` to guarantee that only users whose IDs are present in `task.assignees` can silence alerts. Non-assigned members and unassigned managers receive `403 Forbidden`.

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
  * **Timeline Immutability**: Enforced via Mongoose pre-save and pre-query middleware rejecting document saves on existing records, updates (`updateOne`, `updateMany`, `findOneAndUpdate`, `replaceOne`), and deletions (`deleteOne`, `deleteMany`, `findOneAndDelete`, `remove`).
* **Application Level (Enforced via Express API Middleware/Controllers)**:
  * **Task Dependency Blockers**: The system prevents a task from moving to `Done` if any `Task.blockers` are not in the `Done` status. This is handled dynamically on state change.
  * **Allowed State Transitions**: The strict lifecycle state machine paths (e.g. rejecting direct jumps from Backlog to Done) are checked in application controllers.
  * **Project Membership Integrity**: Asserts that only users listed in `Project.members` can be added to `Task.assignees`.
  * **Automatic Cascade Unassignment**: When a member is removed from a project, application logic automatically runs a query to pull their User ID from `Task.assignees` for all tasks under that project ID and writes an `unassign` event to each task's timeline.
  * **API Immutability Route Guards**: Explicitly rejects any HTTP `PUT` or `DELETE` request targeted at timeline events or comments with `403 Forbidden`.

* **Why we drew the line here**:
  Structural validations, unique constraints, and immutability are best enforced at the database/schema level so that accidental code paths cannot circumvent core guarantees. Dynamic, stateful workflow rules (like task blockers and cascade unassignments) require contextual multi-model business logic that belongs in the application service layer.

---

## What was deliberately denormalized?

* **`Task.preBlockedStatus`**: Rather than checking the entire `TaskTimeline` history to resolve what state a task was in before it was blocked, we store the state directly on the Task document. This removes the need to query and sort the history collection every time a task is unblocked.
* **`AlertDismissal.associatedDueDate`**: Embedding the due date directly inside the dismissal record allows us to evaluate alert states in a single database query, without performing expensive relational joins on `tasks` and `alertdismissals`.

---

## What would break first if this had 100x the data?

1. **Dashboard Metrics (Goal 8)**: The dashboard currently aggregates counts for all tasks and status groupings. With 100x data, running these aggregations dynamically on every dashboard page load will slow down. We would need to implement pre-aggregation tables, caching (e.g. Redis), or daily summaries.
2. **Text Search in Task List (Goal 6)**: The text search on titles/descriptions utilizes standard regex or basic Mongo text indexes. Under high volume, text queries will experience high disk I/O. We would need to migrate to a dedicated search indexing system (e.g. Atlas Search, Elasticsearch).
3. **Audit Trail Size (Goal 9)**: Because every update triggers an append-only timeline document, the `tasktimelines` collection will grow 5x-10x faster than the tasks collection. We would need a database sharding strategy or cold-storage archiving for completed tasks' history.
