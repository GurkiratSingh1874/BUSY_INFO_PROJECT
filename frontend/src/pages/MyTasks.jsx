import React, { useState, useEffect } from 'react';
import { ShieldCheck, Calendar, RefreshCw, AlertTriangle, Loader2 } from 'lucide-react';
import TaskDetailsDrawer from '../components/TaskDetailsDrawer';

function MyTasks({ currentUser }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedTaskProjectMembers, setSelectedTaskProjectMembers] = useState([]);

  const fetchMyTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tasks?myTasks=true');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch personal tasks');
      setTasks(data.data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTasks();
  }, []);

  const handleTaskClick = async (task) => {
    setSelectedTaskId(task._id);
    // Fetch project details to get project members for the drawer selector
    try {
      const res = await fetch(`/api/projects/${task.projectId._id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedTaskProjectMembers(data.data.members);
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

  return (
    <div className="my-tasks-page fade-in">
      <div className="page-header">
        <div>
          <h2>My Assigned Tasks</h2>
          <p className="subtitle">Track your individual workload across all active project memberships.</p>
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

      {loading && tasks.length === 0 ? (
        <div className="loader-box">
          <Loader2 className="spinner" size={32} />
          <p>Loading your tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="empty-state-box card-dark">
          <ShieldCheck size={32} className="text-emerald" />
          <h3>All Cleared!</h3>
          <p>You have no open tasks assigned to you right now. Great job!</p>
        </div>
      ) : (
        <div className="my-tasks-list">
          {tasks.map((task) => {
            const projectKey = task.projectId?.key || 'PROJ';
            const projectName = task.projectId?.name || 'Unknown Project';

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
                  {task.description && <p className="task-row-desc truncate-text">{task.description}</p>}
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
                    {task.dueDate
                      ? new Date(task.dueDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
                      : 'No Due Date'}
                  </span>
                </div>
              </div>
            );
          })}
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
