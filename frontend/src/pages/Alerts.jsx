import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, CheckCircle, Clock, User, ShieldAlert, Check, RotateCcw, Loader2, RefreshCw } from 'lucide-react';
import TaskDetailsDrawer from '../components/TaskDetailsDrawer';

function Alerts({ currentUser, onAlertCountChange }) {
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [showDismissed, setShowDismissed] = useState(false);

  // Task Drawer state
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [projectMembers, setProjectMembers] = useState([]);

  const fetchAlerts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch overdue alerts');

      setActiveAlerts(data.activeAlerts || []);
      setDismissedAlerts(data.dismissedAlerts || []);
      if (onAlertCountChange) {
        onAlertCountChange(data.count || 0);
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleDismiss = async (e, taskId) => {
    e.stopPropagation();
    setActionLoadingId(taskId);
    try {
      const res = await fetch(`/api/alerts/${taskId}/dismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dismiss alert');

      // Refresh alerts list
      await fetchAlerts();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleUndismiss = async (e, taskId) => {
    e.stopPropagation();
    setActionLoadingId(taskId);
    try {
      const res = await fetch(`/api/alerts/${taskId}/undismiss`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to restore alert');

      // Refresh alerts list
      await fetchAlerts();
    } catch (err) {
      alert(err.message);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenTask = async (task) => {
    setSelectedTaskId(task._id);
    setIsDrawerOpen(true);
    // Fetch project members for drawer
    try {
      const res = await fetch(`/api/projects/${task.projectId._id || task.projectId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setProjectMembers(data.data.members || []);
      }
    } catch (e) {
      setProjectMembers([]);
    }
  };

  const getDaysOverdue = (dueDateStr) => {
    if (!dueDateStr) return 0;
    const diffMs = Date.now() - new Date(dueDateStr).getTime();
    const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 1;
  };

  return (
    <div className="alerts-page-container">
      {/* Header */}
      <div className="alerts-page-header">
        <div className="alerts-title-wrap">
          <div className="alerts-icon-box">
            <Bell size={24} className="text-rose" />
          </div>
          <div>
            <h2>Overdue Alerts</h2>
            <p className="alerts-subtitle">
              Tasks past their scheduled deadline that require immediate completion or rescheduling.
            </p>
          </div>
        </div>

        <button
          onClick={fetchAlerts}
          className="btn-icon-only"
          title="Refresh Overdue Alerts"
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'spinner' : ''} />
        </button>
      </div>

      {error && (
        <div className="error-banner">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Alert Content */}
      {loading ? (
        <div className="loader-box">
          <Loader2 className="spinner" size={32} />
          <p>Loading overdue alerts...</p>
        </div>
      ) : activeAlerts.length === 0 ? (
        <div className="empty-alerts-card glass-card">
          <div className="empty-alerts-icon">
            <CheckCircle size={48} className="text-emerald" />
          </div>
          <h3>All Deadlines In Good Shape</h3>
          <p>You have no active overdue tasks in your accessible projects.</p>
        </div>
      ) : (
        <div className="active-alerts-list">
          <div className="alerts-count-strip">
            <span className="alerts-count-tag">
              {activeAlerts.length} {activeAlerts.length === 1 ? 'Task Overdue' : 'Tasks Overdue'}
            </span>
            <span className="alerts-info-hint">
              Assignees can dismiss alerts. Changing a task's due date will automatically revive the alert.
            </span>
          </div>

          <div className="alerts-cards-grid">
            {activeAlerts.map((task) => {
              const daysOverdue = getDaysOverdue(task.dueDate);
              const isAssigned = task.isAssignedToCurrentUser;

              return (
                <div
                  key={task._id}
                  className="alert-task-card glass-card"
                  onClick={() => handleOpenTask(task)}
                >
                  <div className="alert-card-top">
                    <div className="alert-card-project">
                      <span className="project-key-tag">{task.projectId?.key}</span>
                      <span className="project-name-label">{task.projectId?.name}</span>
                    </div>

                    <div className="alert-overdue-pill">
                      <Clock size={12} />
                      <span>{daysOverdue} {daysOverdue === 1 ? 'day' : 'days'} overdue</span>
                    </div>
                  </div>

                  <h4 className="alert-task-title">{task.title}</h4>

                  <div className="alert-task-meta">
                    <div className="meta-badge-row">
                      <span className={`status-badge-mini status-${task.status}`}>
                        {task.status?.replace('_', ' ')}
                      </span>
                      <span className={`priority-badge priority-${task.priority}`}>
                        {task.priority}
                      </span>
                    </div>

                    <div className="alert-due-date">
                      <span>Due: {new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="alert-card-footer">
                    <div className="alert-assignees">
                      <User size={14} className="text-muted" />
                      <span>
                        {task.assignees?.length > 0
                          ? task.assignees.map(a => a.name).join(', ')
                          : 'Unassigned'}
                      </span>
                    </div>

                    <div className="alert-action-wrap">
                      {isAssigned ? (
                        <button
                          onClick={(e) => handleDismiss(e, task._id)}
                          className="btn-dismiss-alert"
                          disabled={actionLoadingId === task._id}
                          title="Dismiss this overdue alert"
                        >
                          {actionLoadingId === task._id ? (
                            <Loader2 size={13} className="spinner" />
                          ) : (
                            <>
                              <Check size={13} />
                              <span>Dismiss Alert</span>
                            </>
                          )}
                        </button>
                      ) : (
                        <span className="badge-not-assigned">
                          Only assignees can dismiss
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Dismissed Alerts Collapsible Section */}
      {dismissedAlerts.length > 0 && (
        <div className="dismissed-alerts-section">
          <button
            onClick={() => setShowDismissed(!showDismissed)}
            className="btn-toggle-dismissed"
          >
            <span>{showDismissed ? 'Hide' : 'Show'} Previously Dismissed Alerts ({dismissedAlerts.length})</span>
          </button>

          {showDismissed && (
            <div className="dismissed-cards-list">
              <p className="dismissed-hint-text">
                These alerts were dismissed by you. If any task's due date is changed, its alert will automatically reappear in the active list above.
              </p>
              {dismissedAlerts.map((task) => (
                <div
                  key={task._id}
                  className="dismissed-alert-row glass-card"
                  onClick={() => handleOpenTask(task)}
                >
                  <div className="dismissed-info">
                    <span className="project-key-tag">{task.projectId?.key}</span>
                    <span className="dismissed-title">{task.title}</span>
                    <span className="dismissed-due">
                      Due: {new Date(task.dueDate).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="dismissed-actions">
                    {task.isAssignedToCurrentUser && (
                      <button
                        onClick={(e) => handleUndismiss(e, task._id)}
                        className="btn-undismiss-alert"
                        disabled={actionLoadingId === task._id}
                        title="Restore this alert to the active list"
                      >
                        {actionLoadingId === task._id ? (
                          <Loader2 size={12} className="spinner" />
                        ) : (
                          <>
                            <RotateCcw size={12} />
                            <span>Restore Alert</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Task Details Drawer */}
      <TaskDetailsDrawer
        isOpen={isDrawerOpen}
        taskId={selectedTaskId}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedTaskId(null);
        }}
        projectMembers={projectMembers}
        currentUser={currentUser}
        onTaskUpdated={fetchAlerts}
        onTaskDeleted={fetchAlerts}
      />
    </div>
  );
}

export default Alerts;
