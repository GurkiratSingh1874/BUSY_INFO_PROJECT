import React, { useState, useEffect } from 'react';
import { ChevronLeft, Plus, RefreshCw, AlertTriangle, ShieldCheck, HelpCircle, Loader2 } from 'lucide-react';
import CreateTaskModal from '../components/CreateTaskModal';
import TaskDetailsDrawer from '../components/TaskDetailsDrawer';

const COLUMNS = [
  { id: 'backlog', name: 'Backlog', color: 'border-backlog' },
  { id: 'in_progress', name: 'In Progress', color: 'border-progress' },
  { id: 'in_review', name: 'In Review', color: 'border-review' },
  { id: 'done', name: 'Done', color: 'border-done' },
  { id: 'blocked', name: 'Blocked', color: 'border-blocked' }
];

function ProjectBoard({ project, onBack, currentUser }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modals / Drawers state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/project/${project._id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch task list');
      setTasks(data.data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (project) {
      fetchTasks();
    }
  }, [project]);

  const handleTaskClick = (taskId) => {
    setSelectedTaskId(taskId);
    setIsDrawerOpen(true);
  };

  const handleCreateTaskSuccess = (newTask) => {
    setTasks(prev => [newTask, ...prev]);
  };

  const handleTaskUpdated = () => {
    fetchTasks();
  };

  const handleTaskDeleted = () => {
    fetchTasks();
  };

  // Group tasks by status
  const tasksByStatus = COLUMNS.reduce((acc, col) => {
    acc[col.id] = tasks.filter(task => task.status === col.id);
    return acc;
  }, {});

  return (
    <div className="project-board-page fade-in">
      {/* Board Header */}
      <div className="board-header">
        <button onClick={onBack} className="btn-back-link">
          <ChevronLeft size={16} />
          <span>Back to Projects</span>
        </button>

        <div className="board-project-details">
          <div className="board-project-title">
            <span className="project-key-tag large-key">{project.key}</span>
            <h2>{project.name}</h2>
          </div>
          <p className="subtitle">{project.description || 'No description'}</p>
        </div>

        <div className="board-actions">
          <button onClick={fetchTasks} className="btn-icon-only" title="Refresh Board">
            <RefreshCw size={16} />
          </button>
          <button onClick={() => setIsCreateOpen(true)} className="btn-primary flex-align-gap">
            <Plus size={16} />
            Create Task
          </button>
        </div>
      </div>

      {error && (
        <div className="error-alert">
          <AlertTriangle className="error-icon" />
          <span>{error}</span>
        </div>
      )}

      {/* Board Layout */}
      {loading && tasks.length === 0 ? (
        <div className="loader-box">
          <Loader2 className="spinner" size={32} />
          <p>Loading board tasks...</p>
        </div>
      ) : (
        <div className="board-columns-grid">
          {COLUMNS.map(col => {
            const colTasks = tasksByStatus[col.id] || [];
            return (
              <div key={col.id} className="board-column">
                <div className={`column-header-stripe ${col.color}`}>
                  <h4>{col.name}</h4>
                  <span className="column-count-badge">{colTasks.length}</span>
                </div>

                <div className="column-cards-list">
                  {colTasks.length === 0 ? (
                    <div className="empty-column-card">
                      <p>No tasks here</p>
                    </div>
                  ) : (
                    colTasks.map(task => {
                      const hasBlockers = task.blockers?.length > 0;
                      const hasDueDate = !!task.dueDate;
                      const isOverdue =
                        hasDueDate &&
                        new Date(task.dueDate) < new Date() &&
                        task.status !== 'done';

                      return (
                        <div
                          key={task._id}
                          onClick={() => handleTaskClick(task._id)}
                          className={`task-card-item card-dark priority-border-${task.priority} ${
                            isOverdue ? 'card-has-overdue' : ''
                          }`}
                        >
                          <h5 className="task-card-title">{task.title}</h5>

                          {task.description && (
                            <p className="task-card-desc-snippet">
                              {task.description.length > 80
                                ? `${task.description.substring(0, 80)}...`
                                : task.description}
                            </p>
                          )}

                          <div className="task-card-footer">
                            <div className="card-indicators">
                              <span className={`priority-pill pill-${task.priority}`}>
                                {task.priority}
                              </span>

                              {hasBlockers && (
                                <span className="blockers-count-badge" title="Has blocking dependencies">
                                  Blocked ({task.blockers.length})
                                </span>
                              )}
                            </div>

                            {hasDueDate && (
                              <span
                                className={`task-card-due-tag ${isOverdue ? 'tag-overdue' : ''}`}
                                title={isOverdue ? 'Task is past due' : 'Scheduled due date'}
                              >
                                {isOverdue ? '! ' : ''}
                                {new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                              </span>
                            )}
                          </div>

                          {task.assignees?.length > 0 && (
                            <div className="task-card-assignees-avatars">
                              {task.assignees.map(a => {
                                const initials = a.name
                                  ?.split(' ')
                                  .map(w => w[0])
                                  .join('')
                                  .substring(0, 2)
                                  .toUpperCase();
                                return (
                                  <div key={a._id} className="avatar-circle" title={a.name}>
                                    {initials}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Task Creation Modal */}
      <CreateTaskModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        project={project}
        onSuccess={handleCreateTaskSuccess}
      />

      {/* Task Details Drawer */}
      <TaskDetailsDrawer
        isOpen={isDrawerOpen}
        taskId={selectedTaskId}
        onClose={() => setIsDrawerOpen(false)}
        projectMembers={project.members || []}
        currentUser={currentUser}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
      />
    </div>
  );
}

export default ProjectBoard;
