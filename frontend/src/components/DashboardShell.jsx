import React, { useState, useEffect } from 'react';
import { LogOut, Folder, ListTodo, CheckSquare, LayoutDashboard, Bell } from 'lucide-react';
import Dashboard from '../pages/Dashboard';
import Projects from '../pages/Projects';
import ProjectBoard from '../pages/ProjectBoard';
import TaskList from '../pages/TaskList';
import MyTasks from '../pages/MyTasks';
import Alerts from '../pages/Alerts';

function DashboardShell({ user, onLogout }) {
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'projects' | 'all-tasks' | 'my-tasks' | 'board' | 'alerts'
  const [selectedProject, setSelectedProject] = useState(null);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [alertCount, setAlertCount] = useState(0);

  const fetchAlertCount = async () => {
    try {
      const res = await fetch('/api/alerts/count');
      const data = await res.json();
      if (data.success) {
        setAlertCount(data.count || 0);
      }
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    fetchAlertCount();
    const interval = setInterval(fetchAlertCount, 20000);
    return () => clearInterval(interval);
  }, []);

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
          <h2>Project Tracker</h2>
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
              setActiveTab('dashboard');
              setSelectedProject(null);
            }}
            className={`nav-tab-btn ${activeTab === 'dashboard' ? 'tab-active' : ''}`}
          >
            <LayoutDashboard size={18} />
            <span>Dashboard</span>
          </button>

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
              setActiveTab('all-tasks');
              setSelectedProject(null);
            }}
            className={`nav-tab-btn ${activeTab === 'all-tasks' ? 'tab-active' : ''}`}
          >
            <ListTodo size={18} />
            <span>All Tasks</span>
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

          <button
            onClick={() => {
              setActiveTab('alerts');
              setSelectedProject(null);
            }}
            className={`nav-tab-btn nav-tab-alerts ${activeTab === 'alerts' ? 'tab-active' : ''}`}
          >
            <div className="tab-label-with-icon">
              <Bell size={18} />
              <span>Overdue Alerts</span>
            </div>
            {alertCount > 0 && (
              <span className="nav-alerts-badge">{alertCount}</span>
            )}
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
          <div className="header-right-actions">
            <button
              onClick={() => {
                setActiveTab('alerts');
                setSelectedProject(null);
              }}
              className={`header-bell-btn ${alertCount > 0 ? 'bell-has-alerts' : ''}`}
              title="Overdue Alerts"
            >
              <Bell size={18} />
              {alertCount > 0 && (
                <span className="header-bell-badge">{alertCount}</span>
              )}
            </button>
          </div>
        </header>

        <div className="main-panel-content">
          {activeTab === 'dashboard' && (
            <Dashboard
              currentUser={user}
              onNavigateToTasks={() => setActiveTab('all-tasks')}
              onNavigateToProjects={() => setActiveTab('projects')}
              onNavigateToAlerts={() => setActiveTab('alerts')}
            />
          )}

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

          {activeTab === 'all-tasks' && (
            <TaskList currentUser={user} />
          )}

          {activeTab === 'my-tasks' && (
            <MyTasks currentUser={user} />
          )}

          {activeTab === 'alerts' && (
            <Alerts
              currentUser={user}
              onAlertCountChange={setAlertCount}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default DashboardShell;
