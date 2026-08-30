import React, { useState } from 'react';
import { LogOut, User, FolderPlus, Trash2, CheckSquare, Layers, Shield, UserCheck } from 'lucide-react';

function DashboardShell({ user, onLogout }) {
  const [logoutLoading, setLogoutLoading] = useState(false);

  const handleLogoutClick = async () => {
    setLogoutLoading(true);
    try {
      const res = await fetch('/api/auth/logout', {
        method: 'POST',
      });
      if (res.ok) {
        onLogout();
      }
    } catch (err) {
      console.error('Logout failed:', err);
    } finally {
      setLogoutLoading(false);
    }
  };

  const isManager = user.role === 'manager';

  return (
    <div className="dashboard-layout">
      {/* Top Navigation Header */}
      <header className="dashboard-header">
        <div className="brand">
          <span className="brand-logo">🎯</span>
          <h2>Tracker Pro</h2>
        </div>
        <div className="header-actions">
          <div className="user-profile">
            <User className="profile-icon" />
            <div className="profile-details">
              <span className="user-name">{user.name}</span>
              <span className={`role-badge ${isManager ? 'role-manager' : 'role-member'}`}>
                {isManager ? 'Manager (Admin)' : 'Member (Worker)'}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogoutClick}
            className="btn-logout"
            disabled={logoutLoading}
            title="Log Out"
          >
            <LogOut className="logout-icon" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <main className="dashboard-content">
        {isManager ? (
          /* Manager / Admin View */
          <div className="role-view fade-in">
            <div className="welcome-banner manager-banner">
              <Shield className="banner-icon" />
              <div>
                <h3>Admin Manager Workspace</h3>
                <p>You have full company portfolio oversight. Access controls and deletions are enabled.</p>
              </div>
            </div>

            <div className="grid-cards">
              <div className="action-card">
                <div className="card-header">
                  <FolderPlus className="text-cyan" />
                  <h4>Project Management</h4>
                </div>
                <p>Create new client scopes, customize key identifiers, and toggle project archives.</p>
                <div className="tag-allowed">Allowed for Manager</div>
              </div>

              <div className="action-card">
                <div className="card-header">
                  <UserCheck className="text-cyan" />
                  <h4>Project Membership</h4>
                </div>
                <p>Add and remove workers from active projects. Automatically unassigns tasks on removal.</p>
                <div className="tag-allowed">Allowed for Manager</div>
              </div>

              <div className="action-card">
                <div className="card-header">
                  <Trash2 className="text-red" />
                  <h4>Task Deletion</h4>
                </div>
                <p>Purge stalled or redundant tasks permanently from project records.</p>
                <div className="tag-allowed text-red">Manager Override Action</div>
              </div>
            </div>
          </div>
        ) : (
          /* Member / Worker View */
          <div className="role-view fade-in">
            <div className="welcome-banner member-banner">
              <Layers className="banner-icon" />
              <div>
                <h3>Worker Task Portal</h3>
                <p>Accessing projects assigned to you. Track your load and update tasks.</p>
              </div>
            </div>

            <div className="grid-cards">
              <div className="action-card disabled-card">
                <div className="card-header">
                  <FolderPlus className="text-muted-icon" />
                  <h4>Project Management</h4>
                </div>
                <p>Create new client scopes, customize key identifiers, and toggle project archives.</p>
                <div className="tag-blocked">Blocked for Workers</div>
              </div>

              <div className="action-card disabled-card">
                <div className="card-header">
                  <UserCheck className="text-muted-icon" />
                  <h4>Project Membership</h4>
                </div>
                <p>Add and remove workers from active projects. Automatically unassigns tasks on removal.</p>
                <div className="tag-blocked">Blocked for Workers</div>
              </div>

              <div className="action-card">
                <div className="card-header">
                  <CheckSquare className="text-emerald" />
                  <h4>Task Execution</h4>
                </div>
                <p>View assigned tickets, post comments/blockers, and transition tasks through sequential states.</p>
                <div className="tag-allowed text-emerald">Allowed for Worker</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default DashboardShell;
