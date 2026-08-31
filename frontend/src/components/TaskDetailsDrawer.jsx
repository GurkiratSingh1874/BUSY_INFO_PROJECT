import React, { useState, useEffect, useRef } from 'react';
import { X, Calendar, AlertCircle, MessageSquare, Trash2, Send, Clock, UserCheck, ShieldAlert, Loader2, ArrowRight } from 'lucide-react';

function TaskDetailsDrawer({ isOpen, taskId, onClose, projectMembers, currentUser, onTaskUpdated, onTaskDeleted }) {
  const [task, setTask] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState(null);

  // Edit fields state
  const [editMode, setEditMode] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [dueDate, setDueDate] = useState('');
  const [selectedAssignees, setSelectedAssignees] = useState([]);
  const [selectedBlockers, setSelectedBlockers] = useState([]);
  const [allTasksInProject, setAllTasksInProject] = useState([]);

  // Comment state
  const [commentText, setCommentText] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  const timelineEndRef = useRef(null);

  const fetchTaskDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch task details');

      setTask(data.data);
      setTimeline(data.timeline || []);

      // Populate edit states
      setTitle(data.data.title);
      setDescription(data.data.description || '');
      setPriority(data.data.priority);
      setDueDate(data.data.dueDate ? data.data.dueDate.substring(0, 10) : '');
      setSelectedAssignees(data.data.assignees.map(a => a._id));
      setSelectedBlockers(data.data.blockers.map(b => b._id));

      // Fetch other tasks in the same project for blockers edit
      const otherRes = await fetch(`/api/tasks?projectId=${data.data.projectId._id}`);
      const otherData = await otherRes.json();
      if (otherData.success) {
        // Exclude the current task itself from the choices
        setAllTasksInProject(otherData.data.filter(t => t._id !== data.data._id));
      }
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && taskId) {
      setEditMode(false);
      setCommentText('');
      fetchTaskDetails();
    }
  }, [isOpen, taskId]);

  // Scroll to bottom of timeline when timeline updates
  useEffect(() => {
    if (timelineEndRef.current) {
      timelineEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [timeline]);

  if (!isOpen) return null;

  const handlePostComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    setPostingComment(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${task._id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ commentText }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to add comment');

      setTimeline(prev => [...prev, data.data]);
      setCommentText('');
    } catch (err) {
      setError(err.message);
    } finally {
      setPostingComment(false);
    }
  };

  const handleUpdateStatus = async (targetStatus) => {
    setUpdating(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: targetStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update status');

      // Refresh task and trigger callback
      await fetchTaskDetails();
      onTaskUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleSaveChanges = async (e) => {
    e.preventDefault();
    setUpdating(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: 'PUT',
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
      if (!res.ok) throw new Error(data.error || 'Failed to save changes');

      setEditMode(false);
      await fetchTaskDetails();
      onTaskUpdated();
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!window.confirm('Are you absolutely sure you want to delete this task? This action is permanent and cannot be undone.')) {
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${task._id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete task');

      onTaskDeleted();
      onClose();
    } catch (err) {
      setError(err.message);
      setDeleting(false);
    }
  };

  const handleAssigneeToggleInEdit = (userId) => {
    setSelectedAssignees(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleBlockerToggleInEdit = (taskId) => {
    setSelectedBlockers(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  // Helper to format event values nicely
  const renderValueName = (field, val) => {
    if (!val) return 'None';
    if (field === 'assignees' || field === 'userId') {
      const u = projectMembers.find(m => m._id === val);
      return u ? u.name : val;
    }
    if (field === 'status') {
      return val.toUpperCase().replace('_', ' ');
    }
    if (field === 'dueDate') {
      return new Date(val).toLocaleDateString();
    }
    if (field === 'blockers') {
      return 'dependency change';
    }
    return String(val);
  };

  const isManager = currentUser?.role === 'manager';

  // Render transition button choices based on state machine rules
  const renderTransitionButtons = () => {
    if (!task) return null;
    const s = task.status;

    return (
      <div className="status-transition-actions">
        <span className="transition-label">Workflow Actions:</span>
        <div className="btn-transition-group">
          {s === 'backlog' && (
            <button onClick={() => handleUpdateStatus('in_progress')} className="btn-transition btn-progress" disabled={updating}>
              Start Progress <ArrowRight size={14} />
            </button>
          )}
          {s === 'in_progress' && (
            <>
              <button onClick={() => handleUpdateStatus('in_review')} className="btn-transition btn-review" disabled={updating}>
                Submit Review <ArrowRight size={14} />
              </button>
              <button onClick={() => handleUpdateStatus('blocked')} className="btn-transition btn-block" disabled={updating}>
                Mark Blocked
              </button>
            </>
          )}
          {s === 'in_review' && (
            <>
              <button onClick={() => handleUpdateStatus('done')} className="btn-transition btn-done" disabled={updating}>
                Complete Task <ArrowRight size={14} />
              </button>
              <button onClick={() => handleUpdateStatus('blocked')} className="btn-transition btn-block" disabled={updating}>
                Mark Blocked
              </button>
            </>
          )}
          {s === 'blocked' && (
            <button
              onClick={() => handleUpdateStatus(task.preBlockedStatus)}
              className="btn-transition btn-unblock"
              disabled={updating}
            >
              Unblock Task <small>({task.preBlockedStatus?.replace('_', ' ').toUpperCase()})</small>
            </button>
          )}
          {s === 'done' && (
            <>
              <button onClick={() => handleUpdateStatus('backlog')} className="btn-transition btn-reopen" disabled={updating}>
                Reopen to Backlog
              </button>
              <button onClick={() => handleUpdateStatus('in_progress')} className="btn-transition btn-reopen" disabled={updating}>
                Reopen to In Progress
              </button>
              <button onClick={() => handleUpdateStatus('in_review')} className="btn-transition btn-reopen" disabled={updating}>
                Reopen to In Review
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className={`drawer-overlay ${isOpen ? 'drawer-open' : ''}`} onClick={onClose}>
      <div className="drawer-container glass-card" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <div className="drawer-title-section">
            <span className={`status-badge-inline status-${task?.status}`}>
              {task?.status?.replace('_', ' ')}
            </span>
            <span className="drawer-project-key">{task?.projectId?.key}</span>
          </div>
          <button onClick={onClose} className="btn-close-drawer">
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="loader-box flex-grow">
            <Loader2 className="spinner" size={32} />
            <p>Loading task details...</p>
          </div>
        ) : error && !task ? (
          <div className="error-box flex-grow">
            <AlertCircle size={32} className="text-red" />
            <p>{error}</p>
          </div>
        ) : (
          task && (
            <div className="drawer-body">
              {/* Alert notifications area */}
              {error && (
                <div className="error-alert">
                  <AlertCircle className="error-icon" />
                  <span>{error}</span>
                </div>
              )}

              {/* Status transition action row */}
              {!editMode && renderTransitionButtons()}

              {/* Edit Mode Toggle */}
              <div className="drawer-action-row">
                <button
                  type="button"
                  onClick={() => setEditMode(!editMode)}
                  className="btn-secondary btn-small"
                  disabled={updating || deleting}
                >
                  {editMode ? 'Cancel Edit' : 'Edit Details'}
                </button>

                {isManager && !editMode && (
                  <button
                    type="button"
                    onClick={handleDeleteTask}
                    className="btn-danger btn-small"
                    disabled={deleting}
                  >
                    <Trash2 size={14} />
                    Delete Task
                  </button>
                )}
              </div>

              {editMode ? (
                /* Edit Fields Form */
                <form onSubmit={handleSaveChanges} className="drawer-edit-form">
                  <div className="form-group">
                    <label htmlFor="edit-title">Task Title *</label>
                    <input
                      type="text"
                      id="edit-title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="edit-desc">Description</label>
                    <textarea
                      id="edit-desc"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group percent-50">
                      <label htmlFor="edit-priority">Priority</label>
                      <select id="edit-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                      </select>
                    </div>
                    <div className="form-group percent-50">
                      <label htmlFor="edit-due">Due Date</label>
                      <input
                        type="date"
                        id="edit-due"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    {/* Assignees */}
                    <div className="form-group percent-50">
                      <label>Task Assignees</label>
                      <div className="checkbox-scrollbox">
                        {projectMembers.map(member => (
                          <label key={member._id} className="checkbox-label">
                            <input
                              type="checkbox"
                              checked={selectedAssignees.includes(member._id)}
                              onChange={() => handleAssigneeToggleInEdit(member._id)}
                            />
                            <span>{member.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Blockers */}
                    <div className="form-group percent-50">
                      <label>Blocking Tasks</label>
                      <div className="checkbox-scrollbox">
                        {allTasksInProject.length > 0 ? (
                          allTasksInProject.map(t => (
                            <label key={t._id} className="checkbox-label">
                              <input
                                type="checkbox"
                                checked={selectedBlockers.includes(t._id)}
                                onChange={() => handleBlockerToggleInEdit(t._id)}
                              />
                              <span className="truncate-text">[{t.status.toUpperCase()}] {t.title}</span>
                            </label>
                          ))
                        ) : (
                          <p className="no-items-text">No other tasks to block this.</p>
                        )}
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="btn-primary" disabled={updating}>
                    {updating ? <Loader2 className="spinner" size={16} /> : 'Save Changes'}
                  </button>
                </form>
              ) : (
                /* View Fields Display */
                <div className="drawer-details-display">
                  <div className="task-title-display">
                    <h2>{task.title}</h2>
                    <span className={`priority-tag priority-${task.priority}`}>{task.priority} Priority</span>
                  </div>

                  <div className="task-desc-display">
                    <p>{task.description || <em className="text-muted">No description provided.</em>}</p>
                  </div>

                  <div className="details-metadata-grid">
                    <div className="meta-item">
                      <Calendar size={16} />
                      <div className="meta-info">
                        <span className="meta-title">Due Date</span>
                        <span className="meta-value">
                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No deadline'}
                        </span>
                      </div>
                    </div>

                    <div className="meta-item">
                      <UserCheck size={16} />
                      <div className="meta-info">
                        <span className="meta-title">Assignees</span>
                        <span className="meta-value">
                          {task.assignees.length > 0
                            ? task.assignees.map(a => a.name).join(', ')
                            : 'Unassigned'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {task.blockers.length > 0 && (
                    <div className="task-dependencies-display">
                      <span className="meta-title flex-align-gap">
                        <ShieldAlert size={14} className="text-yellow" />
                        Blocked By Tasks:
                      </span>
                      <ul className="blockers-list">
                        {task.blockers.map(b => (
                          <li key={b._id} className="blocker-li">
                            <span className={`status-badge-mini status-${b.status}`}>{b.status}</span>
                            <span className="blocker-title">{b.title}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Chronological Timeline History */}
                  <div className="timeline-section">
                    <span className="meta-title flex-align-gap">
                      <Clock size={16} />
                      Activity Timeline & Comments
                    </span>

                    <div className="timeline-scroller">
                      {timeline.map((event) => (
                        <div key={event._id} className="timeline-item">
                          <div className="timeline-icon-line">
                            <span className={`timeline-dot dot-${event.type}`}></span>
                          </div>
                          <div className="timeline-content-card">
                            <div className="timeline-meta">
                              <span className="actor-name">{event.userId?.name || 'Unknown'}</span>
                              <span className="timestamp">
                                {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}{' '}
                                ({new Date(event.createdAt).toLocaleDateString()})
                              </span>
                            </div>

                            {event.type === 'create' && (
                              <p className="event-description">Created this task.</p>
                            )}

                            {event.type === 'comment' && (
                              <div className="comment-bubble">
                                <MessageSquare size={12} className="comment-icon-bubble" />
                                <p className="comment-text">{event.commentText}</p>
                              </div>
                            )}

                            {event.type === 'assign' && (
                              <p className="event-description">
                                Assigned to <strong>{renderValueName('assignees', event.newValue)}</strong>.
                              </p>
                            )}

                            {event.type === 'unassign' && (
                              <p className="event-description">
                                Unassigned <strong>{renderValueName('assignees', event.newValue)}</strong>.
                              </p>
                            )}

                            {event.type === 'field_change' && (
                              <p className="event-description">
                                Updated <strong>{event.fieldName}</strong> from{' '}
                                <del className="old-val">{renderValueName(event.fieldName, event.oldValue)}</del> to{' '}
                                <ins className="new-val">{renderValueName(event.fieldName, event.newValue)}</ins>.
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                      <div ref={timelineEndRef} />
                    </div>

                    {/* Add Comment Input form */}
                    <form onSubmit={handlePostComment} className="comment-input-form">
                      <input
                        type="text"
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        placeholder="Ask a question or post an update..."
                        required
                        disabled={postingComment}
                      />
                      <button type="submit" className="btn-send-comment" disabled={postingComment}>
                        {postingComment ? <Loader2 className="spinner" size={14} /> : <Send size={14} />}
                      </button>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
}

export default TaskDetailsDrawer;
