import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Loader2, Users } from 'lucide-react';

function ManageMembersModal({ isOpen, onClose, project, onSuccess }) {
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [submittingId, setSubmittingId] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && project) {
      setLoadingUsers(true);
      setError(null);
      fetch('/api/auth/users')
        .then(res => res.json())
        .then(data => {
          if (data.success) {
            setUsers(data.data);
          } else {
            throw new Error(data.error);
          }
        })
        .catch(err => {
          console.error(err);
          setError('Failed to fetch users list');
        })
        .finally(() => setLoadingUsers(false));
    }
  }, [isOpen, project]);

  if (!isOpen || !project) return null;

  const currentMembers = project.members.map(m => m._id.toString());
  const ownerId = project.owner ? (project.owner._id ? project.owner._id.toString() : project.owner.toString()) : '';

  const handleToggleMember = async (userId) => {
    setSubmittingId(userId);
    setError(null);

    const isMember = currentMembers.includes(userId);
    const url = isMember
      ? `/api/projects/${project._id}/members/${userId}`
      : `/api/projects/${project._id}/members`;
    const method = isMember ? 'DELETE' : 'POST';

    try {
      const res = await fetch(url, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: !isMember ? JSON.stringify({ userId }) : undefined,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to update project membership');
      }

      onSuccess(data.data); // Update project details in parent view
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content glass-card fade-in">
        <div className="modal-header">
          <div className="modal-title-with-icon">
            <Users size={22} className="text-cyan" />
            <h3>Manage Project Team</h3>
          </div>
          <button onClick={onClose} className="btn-close-modal">
            <X size={20} />
          </button>
        </div>

        <div className="project-badge-details">
          <strong>{project.name}</strong>
          <span className="project-key-badge">{project.key}</span>
        </div>

        {error && (
          <div className="error-alert">
            <AlertTriangle className="error-icon" />
            <span>{error}</span>
          </div>
        )}

        <div className="membership-warning">
          <AlertTriangle size={16} className="text-yellow" />
          <p>
            <strong>Warning:</strong> Removing a member from the project will automatically unassign them from all tasks assigned to them within this project.
          </p>
        </div>

        {loadingUsers ? (
          <div className="loader-box">
            <Loader2 className="spinner" size={24} />
            <p>Loading users...</p>
          </div>
        ) : (
          <div className="members-list-wrapper">
            <div className="members-scrollable">
              {users.map(u => {
                const isMember = currentMembers.includes(u._id.toString());
                const isOwner = u._id.toString() === ownerId;
                const isUpdating = submittingId === u._id;

                return (
                  <div key={u._id} className="member-item-row">
                    <div className="member-info">
                      <span className="member-name">{u.name}</span>
                      <span className="member-email">{u.email}</span>
                      <span className="member-role">({u.role})</span>
                    </div>

                    <div className="member-action-trigger">
                      {isOwner ? (
                        <span className="owner-badge">Owner</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleMember(u._id)}
                          className={`btn-member-action ${isMember ? 'btn-member-remove' : 'btn-member-add'}`}
                          disabled={isUpdating}
                        >
                          {isUpdating ? (
                            <Loader2 className="spinner" size={14} />
                          ) : isMember ? (
                            'Remove'
                          ) : (
                            'Add Member'
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="modal-actions">
          <button type="button" onClick={onClose} className="btn-secondary">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default ManageMembersModal;
