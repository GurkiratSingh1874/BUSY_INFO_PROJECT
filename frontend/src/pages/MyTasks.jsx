import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Calendar,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import TaskDetailsDrawer from '../components/TaskDetailsDrawer';

function MyTasks({ currentUser }) {
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

  // Filters for My Tasks
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [sortBy, setSortBy] = useState('dueDate');
  const [order, setOrder] = useState('asc');
  const [page, setPage] = useState(1);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedTaskProjectMembers, setSelectedTaskProjectMembers] = useState([]);

  const fetchMyTasks = async () => {
    setLoading(true);
    setError(null);

    const queryParams = new URLSearchParams();
    queryParams.set('myTasks', 'true');
    if (search.trim()) queryParams.set('search', search.trim());
    if (status) queryParams.set('status', status);
    if (priority) queryParams.set('priority', priority);
    queryParams.set('sortBy', sortBy);
    queryParams.set('order', order);
    queryParams.set('page', String(page));
    queryParams.set('limit', '10');

    try {
      const res = await fetch(`/api/tasks?${queryParams.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch personal tasks');

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
    fetchMyTasks();
  }, [status, priority, sortBy, order, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchMyTasks();
  };

  const handleClearFilters = () => {
    setSearch('');
    setStatus('');
    setPriority('');
    setSortBy('dueDate');
    setOrder('asc');
    setPage(1);
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
      console.error('Error fetching project members for drawer:', err);
      setSelectedTaskProjectMembers([]);
    }
    setIsDrawerOpen(true);
  };

  const handleTaskUpdated = () => {
    fetchMyTasks();
  };

  const hasActiveFilters =
    search.trim() !== '' ||
    status !== '' ||
    priority !== '' ||
    sortBy !== 'dueDate' ||
    order !== 'asc';

  return (
    <div className="my-tasks-page fade-in">
      <div className="page-header">
        <div>
          <h2>My Assigned Tasks</h2>
          <p className="subtitle">
            Personal task list across all active project memberships.
          </p>
        </div>

        <div className="header-actions-row">
          <button onClick={fetchMyTasks} className="btn-icon-only" title="Refresh List">
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

      {/* Quick Search & Filter Toolbar */}
      <div className="filter-controls-card glass-card mb-20">
        <form onSubmit={handleSearchSubmit} className="search-form-row">
          <div className="input-wrapper flex-grow">
            <Search className="input-icon" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search your assigned tasks... (Press Enter)"
            />
          </div>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="filter-select-inline"
          >
            <option value="">Open Tasks (Default)</option>
            <option value="backlog">Backlog</option>
            <option value="in_progress">In Progress</option>
            <option value="in_review">In Review</option>
            <option value="done">Completed (Done)</option>
            <option value="blocked">Blocked</option>
          </select>

          <select
            value={priority}
            onChange={(e) => {
              setPriority(e.target.value);
              setPage(1);
            }}
            className="filter-select-inline"
          >
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <select
            value={`${sortBy}_${order}`}
            onChange={(e) => {
              const val = e.target.value;
              if (val === 'dueDate_asc') {
                setSortBy('dueDate');
                setOrder('asc');
              } else if (val === 'dueDate_desc') {
                setSortBy('dueDate');
                setOrder('desc');
              } else if (val === 'priority_desc') {
                setSortBy('priority');
                setOrder('desc');
              } else if (val === 'updatedAt_desc') {
                setSortBy('updatedAt');
                setOrder('desc');
              }
              setPage(1);
            }}
            className="filter-select-inline"
          >
            <option value="dueDate_asc">Due Date (Earliest)</option>
            <option value="dueDate_desc">Due Date (Latest)</option>
            <option value="priority_desc">Priority (High to Low)</option>
            <option value="updatedAt_desc">Last Updated</option>
          </select>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleClearFilters}
              className="btn-secondary flex-align-gap"
            >
              <X size={14} /> Clear
            </button>
          )}
        </form>
      </div>

      {/* Meta Bar */}
      <div className="results-meta-bar">
        <span className="results-count-text">
          Showing <strong>{tasks.length}</strong> of <strong>{pagination.total}</strong> assigned tasks
        </span>
      </div>

      {loading ? (
        <div className="loader-box card-dark">
          <Loader2 className="spinner" size={32} />
          <p>Loading your tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state-box card-dark">
          <ShieldCheck size={32} className="text-emerald" />
          <h3>All Cleared!</h3>
          <p>
            {hasActiveFilters
              ? 'No assigned tasks matched your active filter settings.'
              : 'You have no open tasks assigned to you right now. Great job!'}
          </p>
          {hasActiveFilters && (
            <button onClick={handleClearFilters} className="btn-secondary mt-12">
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <div className="my-tasks-list">
          {tasks.map((task) => {
            const projectKey = task.projectId?.key || 'PROJ';
            const projectName = task.projectId?.name || 'Unknown Project';
            const isOverdue =
              task.dueDate &&
              new Date(task.dueDate) < new Date() &&
              task.status !== 'done';

            return (
              <div
                key={task._id}
                onClick={() => handleTaskClick(task)}
                className={`my-task-row card-dark priority-border-${task.priority}`}
              >
                <div className="task-row-project-info">
                  <span className="project-key-tag">{projectKey}</span>
                  <span className="project-name-hint truncate-text">{projectName}</span>
                </div>

                <div className="task-row-main">
                  <h4 className="task-row-title">{task.title}</h4>
                  {task.description && (
                    <p className="task-row-desc truncate-text">{task.description}</p>
                  )}
                </div>

                <div className="task-row-meta">
                  <span className={`status-badge-mini status-${task.status}`}>
                    {task.status.replace('_', ' ')}
                  </span>

                  <span className={`priority-pill pill-${task.priority}`}>
                    {task.priority}
                  </span>

                  <span className="task-row-due">
                    <Calendar size={12} />
                    <span className={isOverdue ? 'text-red font-bold' : ''}>
                      {task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString([], {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })
                        : 'No Due Date'}
                    </span>
                    {isOverdue && (
                      <span className="overdue-badge-pill-mini">Overdue</span>
                    )}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {pagination.totalPages > 1 && (
        <div className="pagination-bar mt-20">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={!pagination.hasPrevPage || loading}
            className="btn-pagination"
          >
            <ChevronLeft size={16} /> Previous
          </button>

          <span className="results-count-text">
            Page {pagination.page} of {pagination.totalPages}
          </span>

          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={!pagination.hasNextPage || loading}
            className="btn-pagination"
          >
            Next <ChevronRight size={16} />
          </button>
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

export default MyTasks;
