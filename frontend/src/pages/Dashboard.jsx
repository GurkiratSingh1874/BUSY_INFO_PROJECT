import React, { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  AlertTriangle,
  Calendar,
  CheckCircle2,
  RefreshCw,
  TrendingUp,
  Users,
  PieChart,
  FolderKanban,
  ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const STATUS_CONFIG = {
  backlog: { label: 'Backlog', color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' },
  in_progress: { label: 'In Progress', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' },
  in_review: { label: 'In Review', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  done: { label: 'Done', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  blocked: { label: 'Blocked', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
};

function Dashboard({ currentUser, onNavigateToTasks, onNavigateToProjects, onNavigateToAlerts }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');

  // Fetch accessible projects for the filter dropdown
  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects');
      if (res.ok) {
        const result = await res.json();
        setProjects(result.data || []);
      }
    } catch (err) {
      console.error('Failed to load projects dropdown:', err);
    }
  };

  // Fetch dashboard metrics from the API
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = selectedProjectId
        ? `/api/dashboard?projectId=${selectedProjectId}`
        : '/api/dashboard';
      const res = await fetch(url);
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || 'Failed to load dashboard metrics');
      }
      setData(json.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const summary = data?.summary || {
    openTasks: 0,
    overdueTasks: 0,
    dueThisWeek: 0,
    completedThisWeek: 0,
  };

  const totalTasks = data?.totalTasks || 0;
  const byStatus = data?.byStatus || [];
  const byAssignee = data?.byAssignee || [];
  const completionsByWeek = data?.completionsByWeek || [];

  // Total 8-week completions
  const total8WeekCompletions = completionsByWeek.reduce((sum, w) => sum + (w.completed || 0), 0);

  return (
    <div className="dashboard-container">
      {/* Top Header */}
      <div className="dashboard-header-row">
        <div>
          <h1 className="page-title">Executive Dashboard</h1>
          <p className="page-subtitle">
            Real-time operational metrics, workload distribution, and delivery velocity.
          </p>
        </div>

        <div className="dashboard-actions-group">
          {/* Project Scope Filter */}
          <div className="project-scope-wrapper">
            <FolderKanban size={16} className="scope-icon" />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="dashboard-project-select"
            >
              <option value="">All Accessible Projects ({projects.length})</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  [{p.key}] {p.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchDashboardData}
            className="btn-icon-only"
            title="Refresh Metrics"
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {error && (
        <div className="error-alert">
          <AlertTriangle className="error-icon" />
          <span>{error}</span>
        </div>
      )}

      {/* 4 Headline Metrics Cards */}
      <div className="headline-metrics-grid">
        {/* 1. Open Tasks */}
        <div className="metric-card metric-open glass-card">
          <div className="metric-card-header">
            <span className="metric-label">Open Tasks</span>
            <div className="metric-icon-badge icon-blue">
              <Layers size={20} />
            </div>
          </div>
          <div className="metric-card-body">
            <div className="metric-number">{summary.openTasks}</div>
            <p className="metric-caption">Active workload in flight</p>
          </div>
        </div>

        {/* 2. Overdue Tasks */}
        <div
          className={`metric-card metric-overdue glass-card ${
            summary.overdueTasks > 0 ? 'border-danger metric-card-interactive' : ''
          }`}
          onClick={() => {
            if (summary.overdueTasks > 0 && onNavigateToAlerts) {
              onNavigateToAlerts();
            }
          }}
          title={summary.overdueTasks > 0 ? 'Click to view overdue alerts' : 'No overdue tasks'}
        >
          <div className="metric-card-header">
            <span className="metric-label">Overdue Tasks</span>
            <div className="metric-icon-badge icon-rose">
              <AlertTriangle size={20} />
            </div>
          </div>
          <div className="metric-card-body">
            <div className={`metric-number ${summary.overdueTasks > 0 ? 'text-rose' : ''}`}>
              {summary.overdueTasks}
            </div>
            <p className="metric-caption">
              {summary.overdueTasks > 0 ? 'Requires urgent attention' : 'No overdue tasks'}
            </p>
            {summary.overdueTasks > 0 && onNavigateToAlerts && (
              <div className="metric-interactive-hint">
                <span>View Alerts</span>
                <ArrowUpRight size={12} />
              </div>
            )}
          </div>
        </div>

        {/* 3. Due This Week */}
        <div className="metric-card metric-due glass-card">
          <div className="metric-card-header">
            <span className="metric-label">Due This Week</span>
            <div className="metric-icon-badge icon-amber">
              <Calendar size={20} />
            </div>
          </div>
          <div className="metric-card-body">
            <div className="metric-number">{summary.dueThisWeek}</div>
            <p className="metric-caption">Targeting completion this week</p>
          </div>
        </div>

        {/* 4. Completed This Week */}
        <div className="metric-card metric-completed glass-card">
          <div className="metric-card-header">
            <span className="metric-label">Completed This Week</span>
            <div className="metric-icon-badge icon-emerald">
              <CheckCircle2 size={20} />
            </div>
          </div>
          <div className="metric-card-body">
            <div className="metric-number text-emerald">{summary.completedThisWeek}</div>
            <p className="metric-caption">Delivered in the current cycle</p>
          </div>
        </div>
      </div>

      {/* Main Analytics Layout: Two Columns */}
      <div className="dashboard-grid-content">
        {/* Left Column: Breakdowns (Status & Assignee) */}
        <div className="dashboard-column flex-column-gap">
          {/* Status Breakdown Card */}
          <div className="dashboard-panel-card glass-card">
            <div className="panel-card-header">
              <div className="panel-title-wrap">
                <PieChart size={18} className="text-cyan" />
                <h3>Task Breakdown by Status</h3>
              </div>
              <span className="total-badge">{totalTasks} Total Tasks</span>
            </div>

            {/* Composite Progress Bar */}
            <div className="status-progress-composite">
              {byStatus.map((item) => {
                const pct = totalTasks > 0 ? (item.count / totalTasks) * 100 : 0;
                if (pct === 0) return null;
                const cfg = STATUS_CONFIG[item.status] || { color: '#94a3b8' };
                return (
                  <div
                    key={item.status}
                    className="status-progress-segment"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: cfg.color,
                    }}
                    title={`${item.label}: ${item.count} (${pct.toFixed(1)}%)`}
                  />
                );
              })}
            </div>

            {/* Status Rows List */}
            <div className="status-items-list">
              {byStatus.map((item) => {
                const cfg = STATUS_CONFIG[item.status] || {
                  label: item.label,
                  color: '#94a3b8',
                  bg: 'rgba(148, 163, 184, 0.1)',
                };
                const pct = totalTasks > 0 ? Math.round((item.count / totalTasks) * 100) : 0;
                return (
                  <div key={item.status} className="status-item-row">
                    <div className="status-item-left">
                      <span
                        className="status-dot"
                        style={{ backgroundColor: cfg.color }}
                      />
                      <span className="status-name">{item.label}</span>
                    </div>
                    <div className="status-item-right">
                      <span className="status-count">{item.count}</span>
                      <span className="status-pct">{pct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Assignee Breakdown Card */}
          <div className="dashboard-panel-card glass-card">
            <div className="panel-card-header">
              <div className="panel-title-wrap">
                <Users size={18} className="text-cyan" />
                <h3>Workload by Assignee</h3>
              </div>
              <span className="total-badge">{byAssignee.length} Contributors</span>
            </div>

            {byAssignee.length === 0 ? (
              <div className="empty-panel-text">No assigned tasks found.</div>
            ) : (
              <div className="assignee-workload-list">
                {byAssignee.map((item) => {
                  const pct = totalTasks > 0 ? Math.round((item.count / totalTasks) * 100) : 0;
                  const isUnassigned = item.userId === 'unassigned';
                  const avgTasks = totalTasks / Math.max(byAssignee.length, 1);
                  const isHeavyLoad = !isUnassigned && item.count >= Math.max(Math.ceil(avgTasks * 1.35), 4);
                  return (
                    <div key={item.userId} className="assignee-row">
                      <div className="assignee-info">
                        <div className={`assignee-avatar ${isUnassigned ? 'avatar-unassigned' : ''}`}>
                          {isUnassigned
                            ? '?'
                            : item.name
                                .split(' ')
                                .map((w) => w[0])
                                .join('')
                                .substring(0, 2)
                                .toUpperCase()}
                        </div>
                        <div className="assignee-text">
                          <div className="flex-align-gap">
                            <span className="assignee-name">{item.name}</span>
                            {isHeavyLoad && (
                              <span className="workload-tag-heavy" title="Above average active task load">
                                Heavy Load
                              </span>
                            )}
                          </div>
                          {item.email && <span className="assignee-email">{item.email}</span>}
                        </div>
                      </div>

                      <div className="assignee-stat">
                        <div className="assignee-bar-wrap">
                          <div
                            className="assignee-bar-fill"
                            style={{ width: `${Math.min(pct, 100)}%` }}
                          />
                        </div>
                        <span className="assignee-count">
                          {item.count} <span className="text-muted">({pct}%)</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: 8-Week Completion Velocity Chart */}
        <div className="dashboard-column">
          <div className="dashboard-panel-card glass-card h-full">
            <div className="panel-card-header">
              <div className="panel-title-wrap">
                <TrendingUp size={18} className="text-cyan" />
                <div>
                  <h3>Task Completions (Last 8 Weeks)</h3>
                  <p className="panel-subtitle">Weekly delivery velocity and trend</p>
                </div>
              </div>
              <div className="velocity-badge">
                <span className="velocity-number">{total8WeekCompletions}</span>
                <span className="velocity-label">Total Closed</span>
              </div>
            </div>

            <div className="chart-container-box">
              {completionsByWeek.length === 0 ? (
                <div className="empty-panel-text">No velocity data available.</div>
              ) : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart
                    data={completionsByWeek}
                    margin={{ top: 20, right: 20, left: -10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
                    <XAxis
                      dataKey="week"
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={45}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      fontSize={11}
                      tickLine={false}
                      allowDecimals={false}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const item = payload[0].payload;
                          return (
                            <div className="chart-custom-tooltip">
                              <p className="tooltip-week">{item.week}</p>
                              <p className="tooltip-dates">
                                {item.startDate} to {item.endDate}
                              </p>
                              <p className="tooltip-value">
                                <strong>{item.completed}</strong> {item.completed === 1 ? 'task' : 'tasks'} completed
                              </p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar
                      dataKey="completed"
                      fill="#38bdf8"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={45}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Velocity Summary Footer */}
            <div className="chart-footer-summary">
              <div className="footer-metric">
                <span className="footer-metric-label">8-Week Average</span>
                <span className="footer-metric-value">
                  {(total8WeekCompletions / 8).toFixed(1)} tasks/wk
                </span>
              </div>
              <div className="footer-metric">
                <span className="footer-metric-label">Current Velocity</span>
                <span className="footer-metric-value text-emerald">
                  {summary.completedThisWeek} this week
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
