import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Loader2, ListTodo } from 'lucide-react';

function CreateTaskModal({ isOpen, onClose, project, onSuccess }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [selectedBlockers, setSelectedBlockers] = useState([]);
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [existingTasks, setExistingTasks] = useState([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && project) {
      // Reset form
      setTitle('');
      setDescription('');
      setPriority('medium');
      setDueDate('');
      setSelectedBlockers([]);
      setSelectedAssignees([]);
      setError(null);

      // Fetch existing tasks in project for blocker options
      setLoadingTasks(true);
      fetch(`/api/tasks?projectId=${project._id}`)
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setExistingTasks(data.data);
          }
        })
        .catch(err => console.error('Error fetching project tasks:', err))
        .finally(() => setLoadingTasks(false));
    }
  }, [isOpen, project]);

  if (!isOpen || !project) return null;

  const handleAssigneeToggle = (userId) => {
    setSelectedAssignees(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleBlockerToggle = (taskId) => {
    setSelectedBlockers(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title) {
      setError('Task title is required.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch(`/api/tasks/project/${project._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          priority,
          dueDate: dueDate ? new Date(dueDate).toISOString() : null,
          assignees: selectedAssignees,
          blockers: selectedBlockers,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create task');
      }

      onSuccess(data.data);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-card fade-in modal-large">
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <ListTodo size={22} className="text-cyan" />
            <h3>Create New Task</h3>
          </div>
          <button onClick={onClose} className="btn-close-modal">
            <X size={20} />
          </button>
        </div>

        <div className="project-badge-details">
          <span>Project:</span>
          <strong>{project.name}</strong>
          <span className="project-key-badge">{project.key}</span>
        </div>

        {error && (
          <div className="error-alert">
            <AlertTriangle className="error-icon" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-group">
            <label htmlFor="task-title">Task Title *</label>
            <input
              type="text"
              id="task-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement API route validation tests"
              required
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="task-desc">Description</label>
            <textarea
              id="task-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a detailed checklist or notes about this task..."
              rows={3}
              disabled={submitting}
            />
          </div>

          <div className="form-row">
            <div className="form-group percent-50">
              <label htmlFor="task-priority">Priority</label>
              <select
                id="task-priority"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                disabled={submitting}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
            <div className="form-group percent-50">
              <label htmlFor="task-due">Due Date</label>
              <input
                type="date"
                id="task-due"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="form-row">
            {/* Assignees column */}
            <div className="form-group percent-50">
              <label>Assign Team Members</label>
              <div className="checkbox-scrollbox">
                {project.members && project.members.length > 0 ? (
                  project.members.map(member => (
                    <label key={member._id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedAssignees.includes(member._id)}
                        onChange={() => handleAssigneeToggle(member._id)}
                        disabled={submitting}
                      />
                      <span>{member.name} <small>({member.role === 'manager' ? 'Mgr' : 'Mbr'})</small></span>
                    </label>
                  ))
                ) : (
                  <p className="no-items-text">No project members available.</p>
                )}
              </div>
            </div>

            {/* Blockers column */}
            <div className="form-group percent-50">
              <label>Blocking Task Dependencies</label>
              <div className="checkbox-scrollbox">
                {loadingTasks ? (
                  <div className="small-loader">
                    <Loader2 className="spinner" size={14} />
                    <span>Loading options...</span>
                  </div>
                ) : existingTasks.length > 0 ? (
                  existingTasks.map(task => (
                    <label key={task._id} className="checkbox-label">
                      <input
                        type="checkbox"
                        checked={selectedBlockers.includes(task._id)}
                        onChange={() => handleBlockerToggle(task._id)}
                        disabled={submitting}
                      />
                      <span className="truncate-text" title={task.title}>
                        [{task.status.toUpperCase()}] {task.title}
                      </span>
                    </label>
                  ))
                ) : (
                  <p className="no-items-text">No tasks inside project to block this one.</p>
                )}
              </div>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary" disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="spinner" size={16} />
                  Creating...
                </>
              ) : (
                'Create Task'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateTaskModal;
