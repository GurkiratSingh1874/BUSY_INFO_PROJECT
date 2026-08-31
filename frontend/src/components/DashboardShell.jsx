import React, { useState } from 'react';
import { LogOut, User, Folder, CheckSquare } from 'lucide-react';
import Projects from '../pages/Projects';
import ProjectBoard from '../pages/ProjectBoard';
import MyTasks from '../pages/MyTasks';

function DashboardShell({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('projects'); // 'projects' | 'my-tasks' | 'board'
  const [selectedProject, setSelectedProject] = useState(null);
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

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setActiveTab('board');
  };

  const handleBackToProjects = () => {
    setSelectedProject(null);
    setActiveTab('projects');
  };

  const isManager = user.role === 'manager';

  return (
    <div className="app-shell-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar-nav">
        <div className="sidebar-brand">
          <span className="logo-emoji">🎯</span>
          <h2>Tracker Pro</h2>
        </div>

        {/* User Card */}
        <div className="sidebar-user-card">
          <div className="user-avatar-circle">
            {user.name
              ?.split(' ')
              .map(w => w[0])
              .join('')
              .substring(0, 2)
              .toUpperCase()}
          </div>
          <div className="user-info-text">
            <span className="profile-name">{user.name}</span>
            <span className={`role-badge ${isManager ? 'role-manager' : 'role-member'}`}>
              {isManager ? 'Manager' : 'Member'}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="nav-tabs-list">
          <button
            onClick={() => {
              setActiveTab('projects');
              setSelectedProject(null);
            }}
            className={`nav-tab-btn ${activeTab === 'projects' || activeTab === 'board' ? 'tab-active' : ''}`}
          >
            <Folder size={18} />
            <span>Projects</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('my-tasks');
              setSelectedProject(null);
            }}
            className={`nav-tab-btn ${activeTab === 'my-tasks' ? 'tab-active' : ''}`}
          >
            <CheckSquare size={18} />
            <span>My Tasks</span>
          </button>
        </nav>

        {/* Sidebar Footer Logout */}
        <div className="sidebar-footer">
          <button
            onClick={handleLogoutClick}
            className="btn-sidebar-logout"
            disabled={logoutLoading}
          >
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Panel Content Area */}
      <div className="main-panel">
        <header className="main-panel-header">
          <div className="system-status-indicator">
            <span className="dot dot-active"></span>
            <span className="status-label">Live Atlas Connected</span>
          </div>
        </header>

        <div className="main-panel-content">
          {activeTab === 'projects' && (
            <Projects
              currentUser={user}
              onSelectProject={handleSelectProject}
              activeProjectId={selectedProject?._id}
            />
          )}

          {activeTab === 'board' && selectedProject && (
            <ProjectBoard
              project={selectedProject}
              onBack={handleBackToProjects}
              currentUser={user}
            />
          )}

          {activeTab === 'my-tasks' && (
            <MyTasks currentUser={user} />
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardShell;
