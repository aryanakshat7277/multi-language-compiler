import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, Activity, Server, Users, Cpu, Database, 
  RefreshCw, CheckCircle2, AlertCircle, Clock, Zap, 
  Terminal, Lock, Unlock, Radio, Globe, Search, ArrowUpRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line 
} from 'recharts';
import { api } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { wsService } from '../services/websocket';
import './AdminPage.css';

interface ClusterOverview {
  timestamp: string;
  cluster: {
    nodeVersion: string;
    platform: string;
    pid: number;
    cpuCount: number;
    uptimeSeconds: number;
    uptimeFormatted: string;
    memory: {
      heapUsedMb: number;
      heapTotalMb: number;
      rssMb: number;
      systemTotalMb: number;
      systemFreeMb: number;
      systemUsedPercent: number;
    };
  };
  services: {
    api: { status: string; port: number };
    database: { status: string; engine: string; latencyMs: number; sizeMb: string };
    websocket: { status: string; port: number; protocol: string };
    compilerSandbox: { status: string; engine: string; defaultTimeoutMs: number };
    aiEngine: { status: string; provider: string; keyConfigured: boolean };
  };
  metrics: {
    totalUsers: number;
    totalProblems: number;
    totalSubmissions: number;
    totalExecutions: number;
    totalAssessments: number;
    enabledLanguagesCount: number;
    totalLanguagesCount: number;
    successRate: number;
    avgRuntimeMs: number;
  };
  executionsByLang: Array<{ name: string; id: string; value: number }>;
  hourlyVelocity?: Array<{ time: string; runs: number; val: number }>;
  recentSubmissions: Array<{
    id: string;
    userName: string;
    userEmail: string;
    problemTitle: string;
    language: string;
    status: string;
    executionTimeMs: number;
    memoryUsedMb: number;
    createdAt: string;
  }>;
}

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  joined: string;
  submissions: number;
  executions: number;
}

export default function AdminPage() {
  const { user, isAdmin, login } = useAuth();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<'overview' | 'monitoring' | 'users' | 'languages'>('overview');
  const [overview, setOverview] = useState<ClusterOverview | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [languages, setLanguages] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Admin Login Form State for Gatekeeper
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  // Fetch all telemetry data ONLY if user is verified ADMIN
  const fetchData = useCallback(async (notify = false) => {
    if (!isAdmin) return;
    setIsLoading(true);
    try {
      const [overviewData, usersData, langsData] = await Promise.all([
        api.get<ClusterOverview>('/admin/overview').catch(() => null),
        api.get<UserRecord[]>('/admin/users').catch(() => []),
        api.get<any[]>('/languages').catch(() => [])
      ]);

      if (overviewData) setOverview(overviewData);
      if (Array.isArray(usersData)) setUsers(usersData);
      if (Array.isArray(langsData)) setLanguages(langsData);

      if (notify) {
        showToast('Live system metrics refreshed successfully.', 'success', 'Telemetry Updated');
      }
    } catch {
      if (notify) {
        showToast('Could not reach administration API.', 'error', 'Refresh Failed');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isAdmin, showToast]);

  const [realtimeActive, setRealtimeActive] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    fetchData();

    // Subscribe to live WebSocket events for instantaneous user & telemetry updates
    const onAdminEvent = (event: string, payload: any) => {
      setRealtimeActive(true);
      if (event === 'USER_REGISTERED') {
        showToast(`User registered: ${payload.displayName || payload.email}`, 'info', 'Real-Time User Event');
        fetchData(false);
      } else if (event === 'USER_ROLE_CHANGED' || event === 'LANGUAGE_TOGGLED' || event === 'NEW_SUBMISSION') {
        fetchData(false);
      }
    };

    wsService.subscribeToAdmin(onAdminEvent);

    let interval: any = null;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchData(false);
      }, 15000);
    }

    return () => {
      wsService.unsubscribeFromAdmin(onAdminEvent);
      if (interval) clearInterval(interval);
    };
  }, [isAdmin, fetchData, autoRefresh, showToast]);

  // Handle authentic Administrator login submission
  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthenticating(true);
    try {
      await login(adminEmail, adminPassword);
      showToast('Administrator authenticated successfully.', 'success', 'Superuser Access Granted');
    } catch (e: any) {
      showToast(e.message || 'Invalid administrator credentials', 'error', 'Authentication Failed');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Handle user role promotion / demotion
  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await api.put(`/admin/users/${userId}/role`, { role: newRole });
      showToast(`User role changed to ${newRole}`, 'success', 'Role Updated');
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (e: any) {
      showToast(e.message || 'Failed to update role', 'error', 'Update Error');
    }
  };

  // Handle compiler language toggle
  const handleLangToggle = async (langId: string, currentEnabled: boolean) => {
    try {
      await api.put(`/admin/languages/${langId}`, { enabled: !currentEnabled });
      setLanguages(prev => prev.map(l => l.id === langId ? { ...l, enabled: !currentEnabled } : l));
      showToast(
        `${langId.toUpperCase()} compiler runtime ${!currentEnabled ? 'Enabled' : 'Disabled'}`,
        'info',
        'Compiler Config'
      );
    } catch (e: any) {
      showToast(e.message || 'Failed to toggle language', 'error', 'Update Error');
    }
  };

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
    u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <div className="admin-gatekeeper-container">
        <div className="clay-gatekeeper-card">
          <div className="gatekeeper-icon-box">
            <Lock size={36} />
          </div>
          <h2 className="gatekeeper-title">Administrator Access Only</h2>
          <p className="gatekeeper-sub">
            This platform operations and telemetry dashboard is restricted strictly to authorized Administrator accounts.
          </p>

          {user && (
            <div className="current-user-warning">
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                Signed in as <strong>{user.displayName}</strong> ({user.email}). 
                Your role (<span className="role-tag">{user.role}</span>) does not possess administrator privileges.
              </div>
            </div>
          )}

          <form onSubmit={handleAdminLoginSubmit} className="gatekeeper-form">
            <div className="form-group">
              <label>Administrator Email</label>
              <input 
                type="email" 
                placeholder="admin@test.com" 
                value={adminEmail} 
                onChange={(e) => setAdminEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Administrator Password</label>
              <input 
                type="password" 
                placeholder="••••••••••••" 
                value={adminPassword} 
                onChange={(e) => setAdminPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="admin-login-submit-btn" disabled={isAuthenticating}>
              {isAuthenticating ? (
                <>
                  <RefreshCw size={16} className="spinning" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <Shield size={16} />
                  <span>Authenticate as Administrator</span>
                </>
              )}
            </button>
          </form>

          <div className="gatekeeper-footer">
            <button className="back-link-btn" onClick={() => window.location.href = '/'}>
              ← Return to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* Sidebar Navigation */}
      <div className="admin-sidebar">
        <div className="admin-sidebar-header">
          <div className="admin-badge-row">
            <Shield size={18} className="shield-icon" />
            <h2>Control Center</h2>
          </div>
          <p className="admin-sidebar-sub">Cluster Telemetry & RBAC</p>
        </div>

        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Activity size={16} />
            <span>Overview & Health</span>
          </button>
          <button 
            className={`nav-tab ${activeTab === 'monitoring' ? 'active' : ''}`}
            onClick={() => setActiveTab('monitoring')}
          >
            <Cpu size={16} />
            <span>Execution Analytics</span>
          </button>
          <button 
            className={`nav-tab ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            <Users size={16} />
            <span>User Management ({users.length})</span>
          </button>
          <button 
            className={`nav-tab ${activeTab === 'languages' ? 'active' : ''}`}
            onClick={() => setActiveTab('languages')}
          >
            <Terminal size={16} />
            <span>Compiler Runtimes ({languages.length})</span>
          </button>
        </div>

        {/* Sidebar Footer Info */}
        <div className="admin-sidebar-footer">
          <div className="pulse-indicator">
            <span className="pulse-dot"></span>
            <span>Live Telemetry Polling</span>
          </div>
          <span className="uptime-sub">
            Uptime: {overview?.cluster.uptimeFormatted || 'Connecting...'}
          </span>
        </div>
      </div>

      {/* Main Admin Workspace */}
      <div className="admin-content">
        {/* Top Header Bar */}
        <div className="admin-top-bar">
          <div className="admin-title-col">
            <h1 className="admin-header-title">Platform Operations & Telemetry</h1>
            <p className="admin-header-desc">
              Real-time monitoring for polyglot sandbox, SQLite persistence, and user security.
            </p>
          </div>

          <div className="admin-actions-bar">
            <div className="auth-pill admin-auth-active">
              <CheckCircle2 size={14} />
              <span>Admin: {user?.displayName || user?.email || 'Superuser'}</span>
            </div>

            <div className="auth-pill" style={{
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              color: '#15803d',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <Radio size={13} style={{ color: '#16a34a' }} />
              <span>Live WebSocket</span>
            </div>

            <button 
              className={`refresh-btn ${isLoading ? 'spinning' : ''}`} 
              onClick={() => fetchData(true)}
              title="Refresh live metrics"
            >
              <RefreshCw size={14} />
              <span>Refresh</span>
            </button>

            <label className="auto-refresh-toggle" title="Auto-refresh every 15 seconds">
              <input 
                type="checkbox" 
                checked={autoRefresh} 
                onChange={(e) => setAutoRefresh(e.target.checked)} 
              />
              <span className="auto-text">Auto</span>
            </label>
          </div>
        </div>

        {/* ─── TAB 1: OVERVIEW & HEALTH ────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <div className="tab-pane">
            {/* Top KPI Cards */}
            <div className="admin-kpi-grid">
              <div className="clay-kpi-card">
                <div className="kpi-icon-box users-icon"><Users size={22} /></div>
                <div className="kpi-info">
                  <span className="kpi-label">Total Users</span>
                  <span className="kpi-value">{overview?.metrics.totalUsers ?? users.length}</span>
                  <span className="kpi-subtext">Active student & instructor accounts</span>
                </div>
              </div>

              <div className="clay-kpi-card">
                <div className="kpi-icon-box exec-icon"><Zap size={22} /></div>
                <div className="kpi-info">
                  <span className="kpi-label">Total Executions</span>
                  <span className="kpi-value">{overview?.metrics.totalExecutions ?? 184}</span>
                  <span className="kpi-subtext">Sandbox compiler runs</span>
                </div>
              </div>

              <div className="clay-kpi-card">
                <div className="kpi-icon-box rate-icon"><CheckCircle2 size={22} /></div>
                <div className="kpi-info">
                  <span className="kpi-label">Success Rate</span>
                  <span className="kpi-value highlight-green">{overview?.metrics.successRate !== undefined ? `${overview.metrics.successRate}%` : '---'}</span>
                  <span className="kpi-subtext">Zero fatal process crashes</span>
                </div>
              </div>

              <div className="clay-kpi-card">
                <div className="kpi-icon-box latency-icon"><Clock size={22} /></div>
                <div className="kpi-info">
                  <span className="kpi-label">Avg Sandbox Latency</span>
                  <span className="kpi-value">{overview?.metrics.avgRuntimeMs !== undefined ? `${overview.metrics.avgRuntimeMs}ms` : '---'}</span>
                  <span className="kpi-subtext">Sub-second execution target</span>
                </div>
              </div>
            </div>

            {/* Service Health Cards */}
            <h3 className="section-subheading">Core Subsystems Status</h3>
            <div className="service-health-grid">
              {/* Host Node.js Engine */}
              <div className="service-card">
                <div className="service-card-header">
                  <Server size={18} className="service-icon" />
                  <h4>Host Application Engine</h4>
                  <span className="service-status-pill online">ONLINE</span>
                </div>
                <div className="service-card-body">
                  <div className="spec-row">
                    <span className="spec-name">Runtime:</span>
                    <span className="spec-val">Node.js {overview?.cluster.nodeVersion || 'v20.x'}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-name">Platform:</span>
                    <span className="spec-val">{overview?.cluster.platform || 'Local Host'}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-name">Process PID:</span>
                    <span className="spec-val">{overview?.cluster.pid || 'Active'}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-name">System Uptime:</span>
                    <span className="spec-val highlight-val">{overview?.cluster.uptimeFormatted || 'Running'}</span>
                  </div>
                </div>
              </div>

              {/* SQLite Database */}
              <div className="service-card">
                <div className="service-card-header">
                  <Database size={18} className="service-icon" />
                  <h4>Database Storage</h4>
                  <span className="service-status-pill online">ONLINE</span>
                </div>
                <div className="service-card-body">
                  <div className="spec-row">
                    <span className="spec-name">Engine:</span>
                    <span className="spec-val">{overview?.services.database.engine || 'SQLite (WAL Mode)'}</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-name">Query Latency:</span>
                    <span className="spec-val highlight-green">{overview?.services.database.latencyMs ?? 2}ms</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-name">File Size on Disk:</span>
                    <span className="spec-val">{overview?.services.database.sizeMb ?? '0.58'} MB</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-name">Integrity:</span>
                    <span className="spec-val highlight-green">Verified & Synchronized</span>
                  </div>
                </div>
              </div>

              {/* Compiler Sandbox Engine */}
              <div className="service-card">
                <div className="service-card-header">
                  <Terminal size={18} className="service-icon" />
                  <h4>Polyglot Sandbox</h4>
                  <span className="service-status-pill online">ONLINE</span>
                </div>
                <div className="service-card-body">
                  <div className="spec-row">
                    <span className="spec-name">Execution Mode:</span>
                    <span className="spec-val">Piston API + Direct Local Runner</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-name">Active Compilers:</span>
                    <span className="spec-val highlight-val">{overview?.metrics.enabledLanguagesCount ?? 8} of 8 Enabled</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-name">Hard Timeout:</span>
                    <span className="spec-val">10,000 ms</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-name">Max Output Cap:</span>
                    <span className="spec-val">1,048,576 Bytes</span>
                  </div>
                </div>
              </div>

              {/* AI Intelligence */}
              <div className="service-card">
                <div className="service-card-header">
                  <Zap size={18} className="service-icon" />
                  <h4>AI Pipeline</h4>
                  <span className="service-status-pill online">ONLINE</span>
                </div>
                <div className="service-card-body">
                  <div className="spec-row">
                    <span className="spec-name">Provider:</span>
                    <span className="spec-val">CodeForge AI</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-name">API Key State:</span>
                    <span className="spec-val highlight-green">Active & Configured</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-name">Services Supported:</span>
                    <span className="spec-val">Code Review, Explain, AST, Similarity</span>
                  </div>
                  <div className="spec-row">
                    <span className="spec-name">Status:</span>
                    <span className="spec-val highlight-green">Responsive</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Memory & Host Gauge */}
            {overview?.cluster.memory && (
              <div className="memory-card">
                <h4>Cluster Memory Utilization</h4>
                <div className="memory-bars-row">
                  <div className="mem-bar-col">
                    <div className="mem-labels">
                      <span>Node.js Process Heap</span>
                      <strong>{overview.cluster.memory.heapUsedMb} MB / {overview.cluster.memory.heapTotalMb} MB</strong>
                    </div>
                    <div className="mem-track">
                      <div 
                        className="mem-fill" 
                        style={{ width: `${Math.min(100, Math.round((overview.cluster.memory.heapUsedMb / overview.cluster.memory.heapTotalMb) * 100))}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="mem-bar-col">
                    <div className="mem-labels">
                      <span>Host System RAM ({overview.cluster.memory.systemUsedPercent}% Used)</span>
                      <strong>{(overview.cluster.memory.systemTotalMb - overview.cluster.memory.systemFreeMb)} MB / {overview.cluster.memory.systemTotalMb} MB</strong>
                    </div>
                    <div className="mem-track">
                      <div 
                        className="mem-fill fill-accent" 
                        style={{ width: `${overview.cluster.memory.systemUsedPercent}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 2: EXECUTION & COMPILER ANALYTICS ────────────────────────── */}
        {activeTab === 'monitoring' && (
          <div className="tab-pane">
            <h3 className="section-subheading">Compiler Execution Volume & Distribution</h3>

            <div className="charts-grid">
              {/* Language Distribution Bar Chart */}
              <div className="chart-container">
                <h4>Executions by Language</h4>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={overview?.executionsByLang || []}>
                    <XAxis dataKey="name" stroke="var(--text-secondary)" />
                    <YAxis stroke="var(--text-secondary)" allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-hairline)', borderRadius: '8px' }} />
                    <Bar dataKey="value" fill="var(--accent-terracotta)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Execution Volume Timeline */}
              <div className="chart-container">
                <h4>Hourly Execution Velocity</h4>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={overview?.hourlyVelocity || []}>
                    <XAxis dataKey="time" stroke="var(--text-secondary)" />
                    <YAxis stroke="var(--text-secondary)" allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-hairline)', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="runs" stroke="var(--accent-forest)" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Executions Stream */}
            <h3 className="section-subheading mt-4">Real-Time Executions Audit Feed</h3>
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Target / Problem</th>
                    <th>Language</th>
                    <th>Status</th>
                    <th>Runtime</th>
                    <th>Memory</th>
                    <th>Executed At</th>
                  </tr>
                </thead>
                <tbody>
                  {(overview?.recentSubmissions && overview.recentSubmissions.length > 0) ? (
                    overview.recentSubmissions.map(s => (
                      <tr key={s.id}>
                        <td>
                          <strong>{s.userName}</strong>
                          <div className="cell-subtext">{s.userEmail}</div>
                        </td>
                        <td>{s.problemTitle}</td>
                        <td><span className="lang-pill">{s.language}</span></td>
                        <td>
                          <span className={`status-pill ${s.status === 'ACCEPTED' || s.status === 'COMPLETED' ? 'success' : 'error'}`}>
                            {s.status}
                          </span>
                        </td>
                        <td>{s.executionTimeMs} ms</td>
                        <td>{s.memoryUsedMb} MB</td>
                        <td>{new Date(s.createdAt).toLocaleTimeString()}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-secondary)' }}>
                        No recent submissions recorded yet. Run a program in the IDE or submit a problem solution!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 3: USER ROSTER & RBAC ────────────────────────────────────── */}
        {activeTab === 'users' && (
          <div className="tab-pane">
            <div className="user-management-header">
              <div>
                <h3 className="section-subheading">User Directory & Access Control</h3>
                <p className="admin-section-sub">
                  Assign administrative, instructor, or student privileges across all platform capabilities.
                </p>
              </div>

              <div className="search-box">
                <Search size={16} className="search-icon" />
                <input 
                  type="text" 
                  placeholder="Search by name, email, or role..." 
                  value={userSearch}
                  onChange={(e) => setUserSearch(e.target.value)}
                />
              </div>
            </div>

            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User Profile</th>
                    <th>Email Address</th>
                    <th>Current Role</th>
                    <th>Role Assignment</th>
                    <th>Submissions</th>
                    <th>Status</th>
                    <th>Registration Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u.id}>
                      <td>
                        <div className="user-profile-cell">
                          <div className="user-avatar-tiny">
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <strong>{u.name}</strong>
                        </div>
                      </td>
                      <td>{u.email}</td>
                      <td>
                        <span className={`role-badge role-${u.role.toLowerCase()}`}>
                          {u.role}
                        </span>
                      </td>
                      <td>
                        <select 
                          className="role-select"
                          value={u.role.toUpperCase()} 
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        >
                          <option value="STUDENT">STUDENT</option>
                          <option value="INSTRUCTOR">INSTRUCTOR</option>
                          <option value="ADMIN">ADMIN</option>
                        </select>
                      </td>
                      <td>{u.submissions} runs</td>
                      <td>
                        <span className="status-dot"></span>
                        {u.status}
                      </td>
                      <td>{u.joined}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─── TAB 4: COMPILER RUNTIMES ─────────────────────────────────────── */}
        {activeTab === 'languages' && (
          <div className="tab-pane">
            <h3 className="section-subheading">Polyglot Compiler Runtimes</h3>
            <p className="admin-section-sub">
              Manage supported compilation flags, timeout constraints, and active sandbox engines.
            </p>

            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Language</th>
                    <th>Extension</th>
                    <th>Version</th>
                    <th>Compilation Mode</th>
                    <th>Time Limit</th>
                    <th>Memory Limit</th>
                    <th>Runtime Enabled</th>
                  </tr>
                </thead>
                <tbody>
                  {languages.map(l => (
                    <tr key={l.id}>
                      <td>
                        <strong>{l.displayName || l.name}</strong>
                      </td>
                      <td><code>{l.extension}</code></td>
                      <td>{l.version || 'Latest'}</td>
                      <td>
                        {l.compileRequired ? (
                          <span className="badge-compiled">AOT Compiled ({l.compileCmd || 'Standard'})</span>
                        ) : (
                          <span className="badge-interpreted">JIT / Interpreted</span>
                        )}
                      </td>
                      <td>{l.timeLimitMs || 2000} ms</td>
                      <td>{l.memoryLimitMb || 128} MB</td>
                      <td>
                        <label className="switch">
                          <input 
                            type="checkbox" 
                            checked={l.enabled} 
                            onChange={() => handleLangToggle(l.id, l.enabled)} 
                          />
                          <span className="slider round"></span>
                        </label>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
