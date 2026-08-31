import React, { useState, useEffect } from 'react';
import { Plus, Users, Archive, RotateCcw, Lock, ArrowRight, Loader2, RefreshCw, Trash2 } from 'lucide-react';
import CreateProjectModal from '../components/CreateProjectModal';
import ManageMembersModal from '../components/ManageMembersModal';

function Projects({ currentUser, onSelectProject, activeProjectId }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [includeArchived, setIncludeArchived] = useState(false);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isManageMembersOpen, setIsManageMembersOpen] = useState(false);
  const [selectedProjectForMembers, setSelectedProjectForMembers] = useState(null);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects?includeArchived=${includeArchived}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch projects');
      setProjects(data.data);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [includeArchived]);

  const handleArchiveToggle = async (projectId) => {
    try {
      const res = await fetch(`/api/projects/${projectId}/archive`, {
        method: 'PUT',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to toggle archive');

      // Refresh list
      fetchProjects();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteProject = async (projectId) => {
    if (!window.confirm('Are you absolutely sure you want to permanently delete this project? This will delete all associated tasks, timelines, and comments.')) {
      return;
    }
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete project');

      // Refresh list
      fetchProjects();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleCreateSuccess = (newProject) => {
    setProjects(prev => [newProject, ...prev]);
  };

  const handleMembershipSuccess = (updatedProject) => {
    setProjects(prev =>
      prev.map(p => (p._id === updatedProject._id ? updatedProject : p))
    );
    setSelectedProjectForMembers(updatedProject);
  };

  const handleManageMembersClick = (project, e) => {
    e.stopPropagation();
    setSelectedProjectForMembers(project);
    setIsManageMembersOpen(true);
  };

  const isManager = currentUser?.role === 'manager';

  return (
    <div className="projects-page fade-in">
      <div className="page-header">
        <div>
          <h2>Client Projects</h2>
          <p className="subtitle">
            {isManager
              ? 'Manage portfolio scope, project memberships, and task assignments.'
              : 'Collaborative projects you are currently assigned to.'}
          </p>
        </div>

        <div className="header-actions-row">
          {isManager && (
            <label className="checkbox-toggle-label">
              <input
                type="checkbox"
                checked={includeArchived}
                onChange={(e) => setIncludeArchived(e.target.checked)}
              />
              <span>Show Archived Projects</span>
            </label>
          )}

          <button onClick={fetchProjects} className="btn-icon-only" title="Refresh List">
            <RefreshCw size={16} />
          </button>

          {isManager && (
            <button onClick={() => setIsCreateOpen(true)} className="btn-primary flex-align-gap">
              <Plus size={16} />
              New Project
            </button>
          )}
        </div>
      </div>

      {loading && projects.length === 0 ? (
        <div className="loader-box">
          <Loader2 className="spinner" size={32} />
          <p>Loading projects list...</p>
        </div>
      ) : error ? (
        <div className="error-box">
          <p className="text-red">Error: {error}</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="empty-state-box card-dark">
          <Lock size={32} className="text-muted" />
          <h3>No Projects Found</h3>
          <p>
            {isManager
              ? 'Click the "New Project" button to set up your first workspace.'
              : 'You are not assigned to any projects. Please contact your manager.'}
          </p>
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((project) => {
            const isOwner = project.owner?._id === currentUser?.id;
            return (
              <div
                key={project._id}
                onClick={() => onSelectProject(project)}
                className={`project-card glass-card ${project.isArchived ? 'project-archived' : ''} ${
                  activeProjectId === project._id ? 'project-active-border' : ''
                }`}
              >
                <div className="project-card-header">
                  <span className="project-key-tag">{project.key}</span>
                  <span className="project-member-count">
                    <Users size={12} />
                    {project.members?.length || 0} Team
                  </span>
                </div>

                <div className="project-card-body">
                  <h3>{project.name}</h3>
                  <p>{project.description || <em className="text-muted">No description provided.</em>}</p>
                </div>

                <div className="project-card-footer">
                  <div className="owner-profile-slug">
                    <span className="label">Owner:</span>
                    <span className="value">{project.owner?.name || 'Unowned'}</span>
                  </div>

                  <div className="project-card-actions">
                    {isManager && (
                      <>
                        <button
                          onClick={(e) => handleManageMembersClick(project, e)}
                          className="btn-card-action"
                          title="Manage Members"
                        >
                          <Users size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleArchiveToggle(project._id);
                          }}
                          className={`btn-card-action ${project.isArchived ? 'text-cyan' : 'text-muted'}`}
                          title={project.isArchived ? 'Restore Project' : 'Archive Project'}
                        >
                          {project.isArchived ? <RotateCcw size={14} /> : <Archive size={14} />}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(project._id);
                          }}
                          className="btn-card-action text-red"
                          title="Delete Project"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                    <span className="card-arrow-go">
                      <ArrowRight size={14} />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={handleCreateSuccess}
        currentUser={currentUser}
      />

      <ManageMembersModal
        isOpen={isManageMembersOpen}
        onClose={() => setIsManageMembersOpen(false)}
        project={selectedProjectForMembers}
        onSuccess={handleMembershipSuccess}
      />
    </div>
  );
}

export default Projects;
