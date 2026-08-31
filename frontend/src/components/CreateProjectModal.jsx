import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';

function CreateProjectModal({ isOpen, onClose, onSuccess, currentUser }) {
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [ownerId, setOwnerId] = useState(currentUser?.id || '');
  const [selectedMembers, setSelectedMembers] = useState([currentUser?.id || '']);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Fetch users list
      fetch('/api/auth/users')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setUsers(data.data);
          }
        })
        .catch(err => console.error('Error fetching users:', err));

      // Reset form
      setKey('');
      setName('');
      setDescription('');
      setOwnerId(currentUser?.id || '');
      setSelectedMembers([currentUser?.id || '']);
      setError(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen) return null;

  const handleMemberToggle = (userId) => {
    setSelectedMembers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleOwnerChange = (newOwnerId) => {
    setOwnerId(newOwnerId);
    // Auto-include owner in members
    if (newOwnerId && !selectedMembers.includes(newOwnerId)) {
      setSelectedMembers(prev => [...prev, newOwnerId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!key || !name || !ownerId) {
      setError('Please fill in all required fields.');
      return;
    }

    if (key.length < 2 || key.length > 10) {
      setError('Project key must be between 2 and 10 characters.');
      return;
    }

    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key,
          name,
          description,
          ownerId,
          members: selectedMembers,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create project');
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
      <div className="modal-content glass-card fade-in">
        <div className="modal-header">
          <h3>Create New Project</h3>
          <button onClick={onClose} className="btn-close-modal">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="error-alert">
            <AlertTriangle className="error-icon" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="modal-form">
          <div className="form-row">
            <div className="form-group percent-30">
              <label htmlFor="proj-key">Project Key *</label>
              <input
                type="text"
                id="proj-key"
                value={key}
                onChange={(e) => setKey(e.target.value.toUpperCase().trim())}
                placeholder="e.g. BUSY"
                maxLength={10}
                required
                disabled={submitting}
              />
            </div>
            <div className="form-group percent-70">
              <label htmlFor="proj-name">Project Name *</label>
              <input
                type="text"
                id="proj-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Company Task Tracking Portal"
                required
                disabled={submitting}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="proj-desc">Description</label>
            <textarea
              id="proj-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide a brief summary of the project scope..."
              rows={3}
              disabled={submitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="proj-owner">Project Owner *</label>
            <select
              id="proj-owner"
              value={ownerId}
              onChange={(e) => handleOwnerChange(e.target.value)}
              required
              disabled={submitting}
            >
              <option value="">-- Select Owner --</option>
              {users.map(u => (
                <option key={u._id} value={u._id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Project Members</label>
            <div className="members-checkbox-list">
              {users.map(u => {
                const isOwner = u._id === ownerId;
                return (
                  <label key={u._id} className={`checkbox-label ${isOwner ? 'disabled-label' : ''}`}>
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(u._id)}
                      onChange={() => handleMemberToggle(u._id)}
                      disabled={submitting || isOwner}
                    />
                    <span>{u.name} <small>({u.role === 'manager' ? 'Manager' : 'Member'})</small></span>
                    {isOwner && <span className="owner-badge-inline">Owner</span>}
                  </label>
                );
              })}
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
                'Create Project'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateProjectModal;
