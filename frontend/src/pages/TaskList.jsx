import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Download,
  CheckSquare,
  Square,
  CheckCircle,
  XCircle,
  Users,
  Layers,
  Sparkles,
} from 'lucide-react';
import TaskDetailsDrawer from '../components/TaskDetailsDrawer';

function TaskList({ currentUser }) {
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 1,
    hasPrevPage: false,
    hasNextPage: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filter options state
  const [projectsList, setProjectsList] = useState([]);
  const [usersList, setUsersList] = useState([]);

  // Active filters & search
  const [search, setSearch] = useState('');
  const [projectId, setProjectId] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [overdue, setOverdue] = useState(false);
  const [sortBy, setSortBy] = useState('updatedAt');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // Multi-selection state for Bulk Operations (README Goal 7)
  const [selectedTaskIds, setSelectedTaskIds] = useState([]);
  const [bulkAction, setBulkAction] = useState('status'); // 'status' | 'assignees' | 'dueDate'
  const [bulkStatus, setBulkStatus] = useState('in_progress');
  const [bulkAssignees, setBulkAssignees] = useState([]);
  const [bulkDueDate, setBulkDueDate] = useState('');
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);
  const [isBulkResultsModalOpen, setIsBulkResultsModalOpen] = useState(false);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedTaskProjectMembers, setSelectedTaskProjectMembers] = useState([]);

  // Fetch filter options (projects and users) on mount
  useEffect(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProjectsList(data.data);
        }
      })
      .catch((err) => console.error('Failed to load projects list:', err));

    fetch('/api/auth/users')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setUsersList(data.data);
        }
      })
      .catch((err) => console.error('Failed to load users list:', err));
  }, []);

  // Fetch tasks with all server-side parameters
  const fetchTasks = async () => {
    setLoading(true);
    setError(null);

    const queryParams = new URLSearchParams();
    if (search.trim()) queryParams.set('search', search.trim());
    if (projectId) queryParams.set('projectId', projectId);
    if (status) queryParams.set('status', status);
    if (priority) queryParams.set('priority', priority);
    if (assigneeId) queryParams.set('assigneeId', assigneeId);
    if (overdue) queryParams.set('overdue', 'true');
    queryParams.set('sortBy', sortBy);
    queryParams.set('order', order);
    queryParams.set('page', String(page));
    queryParams.set('limit', String(limit));

    try {
      const res = await fetch(`/api/tasks?${queryParams.toString()}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to query tasks');
      }

      setTasks(data.data || []);
      if (data.pagination) {
        setPagination(data.pagination);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [projectId, status, priority, assigneeId, overdue, sortBy, order, page, limit]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchTasks();
  };

  const handleClearFilters = () => {
    setSearch('');
    setProjectId('');
    setStatus('');
    setPriority('');
    setAssigneeId('');
    setOverdue(false);
    setSortBy('updatedAt');
    setOrder('desc');
    setPage(1);
    setSelectedTaskIds([]);
  };

  // CSV Export for Currently Filtered Task List
  const handleExportCsv = () => {
    const queryParams = new URLSearchParams();
    if (search.trim()) queryParams.set('search', search.trim());
    if (projectId) queryParams.set('projectId', projectId);
    if (status) queryParams.set('status', status);
    if (priority) queryParams.set('priority', priority);
    if (assigneeId) queryParams.set('assigneeId', assigneeId);
    if (overdue) queryParams.set('overdue', 'true');
    queryParams.set('sortBy', sortBy);
    queryParams.set('order', order);

    window.location.href = `/api/tasks/export/csv?${queryParams.toString()}`;
  };

  // Selection handlers
  const handleToggleSelectAll = () => {
    if (selectedTaskIds.length === tasks.length && tasks.length > 0) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(tasks.map((t) => t._id));
    }
  };

  const handleToggleSelectRow = (taskId, e) => {
    e.stopPropagation();
    if (selectedTaskIds.includes(taskId)) {
      setSelectedTaskIds(selectedTaskIds.filter((id) => id !== taskId));
    } else {
      setSelectedTaskIds([...selectedTaskIds, taskId]);
    }
  };

  // Bulk operation execution
  const handleApplyBulkAction = async () => {
    if (selectedTaskIds.length === 0) return;
    setBulkLoading(true);
    setError(null);

    let payload = {};
    if (bulkAction === 'status') {
      payload = { status: bulkStatus };
    } else if (bulkAction === 'assignees') {
      payload = { assignees: bulkAssignees };
    } else if (bulkAction === 'dueDate') {
      payload = { dueDate: bulkDueDate || null };
    }

    try {
      const res = await fetch('/api/tasks/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          taskIds: selectedTaskIds,
          action: bulkAction,
          payload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Bulk operation failed');
      }

      setBulkResults(data);
      setIsBulkResultsModalOpen(true);
      setSelectedTaskIds([]);
      fetchTasks();
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleTaskClick = async (task) => {
    setSelectedTaskId(task._id);
    try {
      const pId = task.projectId?._id || task.projectId;
      if (pId) {
        const res = await fetch(`/api/projects/${pId}`);
        const data = await res.json();
        if (data.success) {
          setSelectedTaskProjectMembers(data.data.members || []);
        }
      }
    } catch (err) {
      console.error('Error fetching project members:', err);
      setSelectedTaskProjectMembers([]);
    }
    setIsDrawerOpen(true);
  };

  const handleTaskUpdated = () => {
    fetchTasks();
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    projectId !== '' ||
    status !== '' ||
    priority !== '' ||
    assigneeId !== '' ||
    overdue ||
    sortBy !== 'updatedAt' ||
    order !== 'desc';

  const isAllSelected = tasks.length > 0 && selectedTaskIds.length === tasks.length;

  return (
    <div className="task-list-page fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>All Tasks</h2>
          <p className="subtitle">
            Server-side search, filtering, and bulk operations across projects you have access to.
          </p>
        </div>

        <div className="header-actions-row">
          <button
            onClick={handleExportCsv}
            className="btn-secondary flex-align-gap"
            title="Export currently filtered tasks to CSV"
          >
            <Download size={16} />
            <span>Export CSV</span>
          </button>

          <button onClick={fetchTasks} className="btn-icon-only" title="Refresh List">
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {error && (
        <div className="error-alert">
          <AlertTriangle className="error-icon" />
          <span>{error}</span>
        </div>
      )}

      {/* Filter and Search Bar Controls */}
      <div className="filter-controls-card glass-card">
        {/* Row 1: Search Form */}
        <form onSubmit={handleSearchSubmit} className="search-form-row">
          <div className="input-wrapper flex-grow">
            <Search className="input-icon" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks by title or description... (Press Enter)"
            />
          </div>
          <button type="submit" className="btn-secondary">
            Search
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn-secondary flex-align-gap"
              title="Reset all filters"
            >
              <X size={14} /> Clear
            </button>
          )}
        </form>

        {/* Row 2: Filter Selectors */}
        <div className="filter-selectors-grid">
          {/* Project Filter */}
          <div className="filter-item">
            <label>Project</label>
            <select
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Projects</option>
              {projectsList.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.key} - {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="filter-item">
            <label>Status</label>
            <select
              value={status}
              onChange={(e) => {
                setStatus(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              <option value="backlog">Backlog</option>
              <option value="in_progress">In Progress</option>
              <option value="in_review">In Review</option>
              <option value="done">Done</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="filter-item">
            <label>Priority</label>
            <select
              value={priority}
              onChange={(e) => {
                setPriority(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          {/* Assignee Filter */}
          <div className="filter-item">
            <label>Assignee</label>
            <select
              value={assigneeId}
              onChange={(e) => {
                setAssigneeId(e.target.value);
                setPage(1);
              }}
            >
              <option value="">All Assignees</option>
              {usersList.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {/* Sort By */}
          <div className="filter-item">
            <label>Sort By</label>
            <select
              value={`${sortBy}_${order}`}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'updatedAt_desc') {
                  setSortBy('updatedAt');
                  setOrder('desc');
                } else if (val === 'updatedAt_asc') {
                  setSortBy('updatedAt');
                  setOrder('asc');
                } else if (val === 'dueDate_asc') {
                  setSortBy('dueDate');
                  setOrder('asc');
                } else if (val === 'dueDate_desc') {
                  setSortBy('dueDate');
                  setOrder('desc');
                } else if (val === 'priority_desc') {
                  setSortBy('priority');
                  setOrder('desc');
                } else if (val === 'priority_asc') {
                  setSortBy('priority');
                  setOrder('asc');
                }
                setPage(1);
              }}
            >
              <option value="updatedAt_desc">Last Updated (Newest)</option>
              <option value="updatedAt_asc">Last Updated (Oldest)</option>
              <option value="dueDate_asc">Due Date (Earliest)</option>
              <option value="dueDate_desc">Due Date (Latest)</option>
              <option value="priority_desc">Priority (High to Low)</option>
              <option value="priority_asc">Priority (Low to High)</option>
            </select>
          </div>

          {/* Overdue Checkbox */}
          <div className="filter-item-checkbox">
            <label className="checkbox-toggle-label">
              <input
                type="checkbox"
                checked={overdue}
                onChange={(e) => {
                  setOverdue(e.target.checked);
                  setPage(1);
                }}
              />
              <span className="overdue-text">Show Only Overdue</span>
            </label>
          </div>
        </div>
      </div>

      {/* Bulk Action Toolbar (appears when 1 or more tasks are selected) */}
      {selectedTaskIds.length > 0 && (
        <div className="bulk-actions-toolbar glass-card fade-in">
          <div className="bulk-toolbar-info">
            <CheckSquare size={18} className="text-cyan" />
            <span>
              <strong>{selectedTaskIds.length}</strong> {selectedTaskIds.length === 1 ? 'task' : 'tasks'} selected
            </span>
          </div>

          <div className="bulk-toolbar-controls">
            <label className="bulk-label">Apply Action:</label>
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="bulk-select"
            >
              <option value="status">Change Status</option>
              <option value="assignees">Change Assignees</option>
              <option value="dueDate">Change Due Date</option>
            </select>

            {/* Action Specific Inputs */}
            {bulkAction === 'status' && (
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value)}
                className="bulk-select"
              >
                <option value="backlog">Backlog</option>
                <option value="in_progress">In Progress</option>
                <option value="in_review">In Review</option>
                <option value="done">Done</option>
                <option value="blocked">Blocked</option>
              </select>
            )}

            {bulkAction === 'assignees' && (
              <select
                value={bulkAssignees[0] || ''}
                onChange={(e) => {
                  const val = e.target.value;
                  setBulkAssignees(val ? [val] : []);
                }}
                className="bulk-select"
              >
                <option value="">Unassign All</option>
                {usersList.map((u) => (
                  <option key={u._id} value={u._id}>
                    Assign to: {u.name}
                  </option>
                ))}
              </select>
            )}

            {bulkAction === 'dueDate' && (
              <input
                type="date"
                value={bulkDueDate}
                onChange={(e) => setBulkDueDate(e.target.value)}
                className="bulk-date-input"
              />
            )}

            <button
              onClick={handleApplyBulkAction}
              disabled={bulkLoading}
              className="btn-primary"
            >
              {bulkLoading ? <Loader2 size={16} className="spinner" /> : <CheckSquare size={16} />}
              <span>Apply to Selected</span>
            </button>

            <button
              onClick={() => setSelectedTaskIds([])}
              className="btn-secondary"
              title="Clear selection"
            >
              Deselect
            </button>
          </div>
        </div>
      )}

      {/* Results Meta Bar */}
      <div className="results-meta-bar">
        <span className="results-count-text">
          Showing <strong>{tasks.length}</strong> of <strong>{pagination.total}</strong> matching tasks
        </span>

        <div className="page-size-selector">
          <label>Per page:</label>
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
          >
            <option value="10">10</option>
            <option value="25">25</option>
            <option value="50">50</option>
          </select>
        </div>
      </div>

      {/* Tasks Table / Cards */}
      {loading ? (
        <div className="loader-box card-dark">
          <Loader2 className="spinner" size={32} />
          <p>Querying matching tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state-box card-dark">
          <Filter size={32} className="text-muted" />
          <h3>No Matching Tasks</h3>
          <p>No tasks matched your search query and filter criteria.</p>
          {hasActiveFilters && (
            <button onClick={handleClearFilters} className="btn-secondary mt-12">
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="task-table-wrapper card-dark">
          <table className="tasks-data-table">
            <thead>
              <tr>
                <th className="cell-checkbox">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    title="Select all on this page"
                  />
                </th>
                <th>Project</th>
                <th>Title & Description</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assignees</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => {
                const projectKey = task.projectId?.key || 'PROJ';
                const isOverdue =
                  task.dueDate &&
                  new Date(task.dueDate) < new Date() &&
                  task.status !== 'done';
                const isSelected = selectedTaskIds.includes(task._id);

                return (
                  <tr
                    key={task._id}
                    onClick={() => handleTaskClick(task)}
                    className={`task-row-clickable ${isSelected ? 'row-selected' : ''}`}
                  >
                    {/* Row selection checkbox */}
                    <td className="cell-checkbox" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => handleToggleSelectRow(task._id, e)}
                      />
                    </td>

                    {/* Project Key */}
                    <td>
                      <span className="project-key-tag">{projectKey}</span>
                    </td>

                    {/* Title and Snippet */}
                    <td className="cell-task-info">
                      <span className="table-task-title">{task.title}</span>
                      {task.description && (
                        <span className="table-task-desc truncate-text">
                          {task.description}
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td>
                      <span className={`status-badge-inline status-${task.status}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Priority */}
                    <td>
                      <span className={`priority-pill pill-${task.priority}`}>
                        {task.priority}
                      </span>
                    </td>

                    {/* Assignees */}
                    <td>
                      {task.assignees && task.assignees.length > 0 ? (
                        <div className="task-card-assignees-avatars">
                          {task.assignees.map((a) => {
                            const initials = a.name
                              ?.split(' ')
                              .map((w) => w[0])
                              .join('')
                              .substring(0, 2)
                              .toUpperCase();
                            return (
                              <div
                                key={a._id}
                                className="avatar-circle"
                                title={`${a.name} (${a.role})`}
                              >
                                {initials}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="text-muted text-xs">Unassigned</span>
                      )}
                    </td>

                    {/* Due Date & Overdue Tag */}
                    <td>
                      {task.dueDate ? (
                        <div className="due-date-cell">
                          <span
                            className={`due-date-text ${
                              isOverdue ? 'text-red font-bold' : 'text-secondary'
                            }`}
                          >
                            {new Date(task.dueDate).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          {isOverdue && (
                            <span className="overdue-badge-pill">Overdue</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted text-xs">No due date</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Footer Controls */}
      {pagination.totalPages > 1 && (
        <div className="pagination-bar">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!pagination.hasPrevPage || loading}
            className="btn-pagination"
          >
            <ChevronLeft size={16} /> Previous
          </button>

          <div className="page-numbers-group">
            {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map(
              (pageNum) => {
                if (
                  pageNum === 1 ||
                  pageNum === pagination.totalPages ||
                  (pageNum >= page - 1 && pageNum <= page + 1)
                ) {
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`btn-page-number ${
                        page === pageNum ? 'btn-page-active' : ''
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                }
                if (pageNum === page - 2 || pageNum === page + 2) {
                  return (
                    <span key={pageNum} className="pagination-ellipsis">
                      ...
                    </span>
                  );
                }
                return null;
              }
            )}
          </div>

          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={!pagination.hasNextPage || loading}
            className="btn-pagination"
          >
            Next <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* Bulk Results Reporting Modal (README Goal 7) */}
      {isBulkResultsModalOpen && bulkResults && (
        <div className="modal-backdrop fade-in">
          <div className="modal-content glass-card bulk-results-modal">
            <div className="modal-header">
              <div className="modal-title-with-icon">
                <Layers size={22} className="text-cyan" />
                <h3>Bulk Operation Report</h3>
              </div>
              <button
                onClick={() => setIsBulkResultsModalOpen(false)}
                className="btn-close-modal"
              >
                <X size={20} />
              </button>
            </div>

            {/* Summary headline */}
            <div className="bulk-report-summary">
              <div className="bulk-summary-stat">
                <span className="stat-label">Total Processed</span>
                <span className="stat-value">{bulkResults.summary.total}</span>
              </div>
              <div className="bulk-summary-stat stat-success">
                <span className="stat-label">Succeeded</span>
                <span className="stat-value">{bulkResults.summary.succeeded}</span>
              </div>
              <div className="bulk-summary-stat stat-failed">
                <span className="stat-label">Rejected</span>
                <span className="stat-value">{bulkResults.summary.failed}</span>
              </div>
            </div>

            {/* Itemized Results List */}
            <div className="bulk-results-list">
              {bulkResults.results.map((item, idx) => (
                <div
                  key={idx}
                  className={`bulk-result-item ${
                    item.status === 'SUCCESS' ? 'item-success' : 'item-failed'
                  }`}
                >
                  <div className="bulk-item-main">
                    {item.status === 'SUCCESS' ? (
                      <CheckCircle size={18} className="text-emerald flex-shrink-0" />
                    ) : (
                      <XCircle size={18} className="text-red flex-shrink-0" />
                    )}
                    <div className="bulk-item-details">
                      <span className="bulk-item-title">{item.title}</span>
                      {item.reason && (
                        <p className="bulk-item-reason">{item.reason}</p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`bulk-item-badge ${
                      item.status === 'SUCCESS' ? 'badge-success' : 'badge-rejected'
                    }`}
                  >
                    {item.status}
                  </span>
                </div>
              ))}
            </div>

            <div className="modal-actions-right mt-20">
              <button
                onClick={() => setIsBulkResultsModalOpen(false)}
                className="btn-primary"
              >
                Close & Refresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Details Drawer */}
      <TaskDetailsDrawer
        isOpen={isDrawerOpen}
        taskId={selectedTaskId}
        onClose={() => setIsDrawerOpen(false)}
        projectMembers={selectedTaskProjectMembers}
        currentUser={currentUser}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskUpdated}
      />
    </div>
  );
}

export default TaskList;
