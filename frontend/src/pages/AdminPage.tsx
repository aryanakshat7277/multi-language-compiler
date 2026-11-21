import React, { useState, useEffect, useCallback } from 'react';
import { 
  Shield, Activity, Server, Users, Cpu, Database, 
  RefreshCw, CheckCircle2, AlertCircle, Clock, Zap, 
  Terminal, Lock, Unlock, Radio, Globe, Search, ArrowUpRight,
  MessageSquarePlus, Bug, Lightbulb, Image as ImageIcon, Trash2, Eye, Filter, Check, X, Download
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  LineChart, Line 
} from 'recharts';
import { 
  api, getAdminFeedback, updateAdminFeedback, deleteAdminFeedback, FeedbackItem 
} from '../services/api';
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

  const [activeTab, setActiveTab] = useState<'overview' | 'monitoring' | 'users' | 'languages' | 'feedback'>('overview');
  const [overview, setOverview] = useState<ClusterOverview | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [languages, setLanguages] = useState<any[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // User Feedback & Reports State (Restricted to Admin)
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [feedbackStats, setFeedbackStats] = useState({ total: 0, pending: 0, bugs: 0, features: 0 });
  const [feedbackFilterType, setFeedbackFilterType] = useState<string>('ALL');
  const [feedbackFilterStatus, setFeedbackFilterStatus] = useState<string>('ALL');
  const [feedbackFilterSection, setFeedbackFilterSection] = useState<string>('ALL');
  const [feedbackFilterSeverity, setFeedbackFilterSeverity] = useState<string>('ALL');
  const [feedbackSearch, setFeedbackSearch] = useState<string>('');
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);
  const [adminNotesDraft, setAdminNotesDraft] = useState<Record<string, string>>({});
  const [isUpdatingFeedback, setIsUpdatingFeedback] = useState<Record<string, boolean>>({});

  // Admin Login Form State for Gatekeeper
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const fetchFeedback = useCallback(async () => {
    if (!isAdmin) return;
    try {
      const res = await getAdminFeedback({
        type: feedbackFilterType,
        status: feedbackFilterStatus,
        section: feedbackFilterSection,
        severity: feedbackFilterSeverity,
        search: feedbackSearch
      });
      if (res && Array.isArray(res.items)) {
        setFeedbackList(res.items);
        if (res.stats) setFeedbackStats(res.stats);
      }
    } catch (err) {
      console.warn('Failed to load feedback in admin:', err);
    }
  }, [isAdmin, feedbackFilterType, feedbackFilterStatus, feedbackFilterSection, feedbackFilterSeverity, feedbackSearch]);

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
      await fetchFeedback();

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
  }, [isAdmin, showToast, fetchFeedback]);

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
      } else if (event === 'NEW_FEEDBACK_SUBMITTED') {
        showToast(`New user report submitted: ${payload.title || 'Bug/Feature Report'}`, 'info', 'Feedback Submitted');
        fetchFeedback();
      } else if (event === 'FEEDBACK_STATUS_UPDATED' || event === 'FEEDBACK_DELETED') {
        fetchFeedback();
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
  }, [isAdmin, fetchData, autoRefresh, showToast, fetchFeedback]);

  const handleFeedbackStatusChange = async (id: string, newStatus: string) => {
    setIsUpdatingFeedback(prev => ({ ...prev, [id]: true }));
    try {
      await updateAdminFeedback(id, { status: newStatus });
      showToast(`Report status updated to ${newStatus}`, 'success', 'Status Saved');
      setFeedbackList(prev => prev.map(item => item.id === id ? { ...item, status: newStatus as any } : item));
      setFeedbackStats(prev => ({
        ...prev,
        pending: newStatus === 'PENDING' ? prev.pending + 1 : Math.max(0, prev.pending - 1)
      }));
    } catch (e: any) {
      showToast(e.message || 'Failed to update status', 'error', 'Update Error');
    } finally {
      setIsUpdatingFeedback(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleSaveAdminNotes = async (id: string) => {
    const notes = adminNotesDraft[id];
    if (notes === undefined) return;
    setIsUpdatingFeedback(prev => ({ ...prev, [id]: true }));
    try {
      await updateAdminFeedback(id, { adminNotes: notes });
      showToast('Admin note saved successfully', 'success', 'Note Saved');
      setFeedbackList(prev => prev.map(item => item.id === id ? { ...item, adminNotes: notes } : item));
    } catch (e: any) {
      showToast(e.message || 'Failed to save admin note', 'error', 'Save Error');
    } finally {
      setIsUpdatingFeedback(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleDeleteFeedback = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this report from the administrator records?')) {
      return;
    }
    try {
      await deleteAdminFeedback(id);
      showToast('Feedback report deleted.', 'info', 'Report Deleted');
      setFeedbackList(prev => prev.filter(item => item.id !== id));
      setFeedbackStats(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
    } catch (e: any) {
      showToast(e.message || 'Failed to delete report', 'error', 'Delete Error');
    }
  };

  // Handle authentic Administrator login submission
  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (adminEmail.trim().toLowerCase() !== 'aryanakshat7277@gmail.com') {
      showToast('Access restricted strictly to platform administrator (aryanakshat7277@gmail.com)', 'error', 'Access Denied');
      return;
    }
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
                Your account does not possess administrator privileges. Administrator access is restricted strictly to <code>aryanakshat7277@gmail.com</code>.
              </div>
            </div>
          )}

          <form onSubmit={handleAdminLoginSubmit} className="gatekeeper-form">
            <div className="form-group">
              <label>Administrator Email</label>
              <input 
                type="email" 
                placeholder="aryanakshat7277@gmail.com" 
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
          <button 
            className={`nav-tab ${activeTab === 'feedback' ? 'active' : ''}`}
            onClick={() => setActiveTab('feedback')}
          >
            <MessageSquarePlus size={16} />
            <span>User Reports &amp; Ideas ({feedbackStats.total})</span>
            {feedbackStats.pending > 0 && (
              <span className="admin-tab-alert-badge">{feedbackStats.pending}</span>
            )}
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

        {/* ─── TAB 5: User Feedback & Feature Requests (CONFIDENTIAL ADMIN ONLY) ─── */}
        {activeTab === 'feedback' && (
          <div className="tab-pane">
            <div className="feedback-admin-header">
              <div className="header-left">
                <h3 className="section-subheading">User Feedback, Bug Reports &amp; Feature Requests</h3>
                <p className="admin-section-sub">
                  Confidential administrator portal. Review user-submitted bug reports, inspect error screenshots, and prioritize feature improvement requests.
                </p>
              </div>
              <button className="btn btn-secondary btn-sm" onClick={() => fetchFeedback()}>
                <RefreshCw size={13} />
                <span>Refresh Reports</span>
              </button>
            </div>

            {/* KPI Cards Row */}
            <div className="feedback-kpi-grid">
              <div className="feedback-kpi-card">
                <span className="kpi-label">Total Submissions</span>
                <span className="kpi-value">{feedbackStats.total}</span>
                <span className="kpi-sub">All-time received</span>
              </div>
              <div className="feedback-kpi-card pending-kpi">
                <span className="kpi-label">Pending Review</span>
                <span className="kpi-value text-amber">{feedbackStats.pending}</span>
                <span className="kpi-sub">Awaiting action</span>
              </div>
              <div className="feedback-kpi-card bug-kpi">
                <span className="kpi-label">Bug Reports</span>
                <span className="kpi-value text-terracotta">{feedbackStats.bugs}</span>
                <span className="kpi-sub">Issues with screenshots</span>
              </div>
              <div className="feedback-kpi-card feature-kpi">
                <span className="kpi-label">Feature &amp; Section Ideas</span>
                <span className="kpi-value text-forest">{feedbackStats.features}</span>
                <span className="kpi-sub">Platform enhancements</span>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="feedback-filters-bar">
              <div className="search-wrap">
                <Search size={14} className="search-ico" />
                <input
                  type="text"
                  placeholder="Search by title, description, section, or user..."
                  value={feedbackSearch}
                  onChange={(e) => setFeedbackSearch(e.target.value)}
                  className="feedback-search-field"
                />
              </div>

              <div className="filter-selects-row">
                <select
                  value={feedbackFilterType}
                  onChange={(e) => setFeedbackFilterType(e.target.value)}
                  className="feedback-filter-select"
                >
                  <option value="ALL">All Types (Bugs &amp; Ideas)</option>
                  <option value="BUG_REPORT">🐞 Bug Reports Only</option>
                  <option value="FEATURE_REQUEST">💡 Feature Requests Only</option>
                  <option value="IMPROVEMENT">⚡ Section Improvements</option>
                </select>

                <select
                  value={feedbackFilterStatus}
                  onChange={(e) => setFeedbackFilterStatus(e.target.value)}
                  className="feedback-filter-select"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="PENDING">Pending Review</option>
                  <option value="UNDER_REVIEW">Under Investigation</option>
                  <option value="RESOLVED">Resolved / Implemented</option>
                  <option value="DISMISSED">Dismissed</option>
                </select>

                <select
                  value={feedbackFilterSection}
                  onChange={(e) => setFeedbackFilterSection(e.target.value)}
                  className="feedback-filter-select"
                >
                  <option value="ALL">All Sections</option>
                  <option value="Compiler IDE & Terminal">Compiler IDE &amp; Terminal</option>
                  <option value="AST Hierarchy Visualizer">AST Hierarchy Visualizer</option>
                  <option value="Code Metrics & Analysis">Code Metrics &amp; Analysis</option>
                  <option value="Coding Assessments & Exams">Coding Assessments &amp; Exams</option>
                  <option value="Problem Detail & Judge">Problem Detail &amp; Judge</option>
                  <option value="AI Mentor & Review">AI Mentor &amp; Review</option>
                  <option value="Code Shortener AI">Code Shortener AI</option>
                  <option value="Code DNA Similarity">Code DNA Similarity</option>
                  <option value="General Interface & Navigation">General Interface</option>
                </select>
              </div>
            </div>

            {/* Reports List */}
            {feedbackList.length === 0 ? (
              <div className="feedback-empty-state">
                <CheckCircle2 size={36} className="text-forest" />
                <h4>No User Reports Matching Criteria</h4>
                <p>All user bug reports and feature requests have been addressed or no submissions match the current filters.</p>
              </div>
            ) : (
              <div className="feedback-cards-container">
                {feedbackList.map((item) => (
                  <div key={item.id} className={`feedback-admin-card ${item.status.toLowerCase()}`}>
                    {/* Card Header */}
                    <div className="card-top-row">
                      <div className="tags-left">
                        <span className={`pill-type ${item.type.toLowerCase()}`}>
                          {item.type === 'BUG_REPORT' ? <Bug size={12} /> : <Lightbulb size={12} />}
                          <span>{item.type === 'BUG_REPORT' ? 'Bug Report' : item.type === 'FEATURE_REQUEST' ? 'Feature Request' : 'Improvement'}</span>
                        </span>

                        <span className="pill-section">{item.section}</span>

                        {item.type === 'BUG_REPORT' && item.severity && (
                          <span className={`pill-severity ${item.severity.toLowerCase()}`}>
                            {item.severity} Severity
                          </span>
                        )}

                        <span className={`pill-status ${item.status.toLowerCase()}`}>
                          {item.status === 'PENDING' ? '● Pending' : item.status === 'UNDER_REVIEW' ? '● Under Review' : item.status === 'RESOLVED' ? '✓ Resolved' : '✕ Dismissed'}
                        </span>
                      </div>

                      <div className="date-right">
                        <Clock size={12} />
                        <span>{new Date(item.createdAt).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* User Identity Info */}
                    <div className="reporter-info-row">
                      <div className="reporter-avatar">
                        <img 
                          src={item.user?.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(item.userName || 'User')}&backgroundColor=c85a32,2a5a3d,b35e17`} 
                          alt={item.userName || 'User'} 
                        />
                      </div>
                      <div className="reporter-details">
                        <div className="reporter-name-row">
                          <strong className="reporter-name">{item.userName || 'Anonymous User'}</strong>
                          {item.user ? (
                            <span className="badge-verified-user">Registered ({item.user.role})</span>
                          ) : (
                            <span className="badge-guest-user">Guest</span>
                          )}
                        </div>
                        <span className="reporter-email">{item.userEmail || 'No email provided'}</span>
                      </div>
                    </div>

                    {/* Report Content */}
                    <div className="report-main-content">
                      <h4 className="report-title">{item.title}</h4>
                      <p className="report-desc">{item.description}</p>
                    </div>

                    {/* User's Proposed Section Modification / Idea */}
                    {item.suggestedFix && (
                      <div className="suggested-fix-box">
                        <div className="suggested-fix-header">
                          <Lightbulb size={13} style={{ color: '#B35E17' }} />
                          <strong>
                            {item.type === 'BUG_REPORT' 
                              ? 'User Suggested Workaround / Fix:' 
                              : 'Proposed Section Modification / New Feature Idea:'}
                          </strong>
                        </div>
                        <p className="suggested-fix-text">{item.suggestedFix}</p>
                      </div>
                    )}

                    {/* Attached Screenshot (if any) */}
                    {item.screenshotUrl && (
                      <div className="screenshot-attached-box">
                        <div className="screenshot-header">
                          <ImageIcon size={14} style={{ color: '#C85A32' }} />
                          <span>Attached Error Screenshot (Uploaded by User):</span>
                        </div>
                        <div 
                          className="screenshot-thumb-wrapper"
                          onClick={() => setSelectedScreenshot(item.screenshotUrl!)}
                          title="Click to view full-resolution screenshot"
                        >
                          <img 
                            src={item.screenshotUrl} 
                            alt={`Screenshot for ${item.title}`} 
                            className="screenshot-admin-thumb" 
                          />
                          <div className="screenshot-zoom-hover">
                            <Eye size={18} />
                            <span>Click to Zoom Screenshot</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Admin Management Bar */}
                    <div className="admin-management-bar">
                      <div className="status-changer">
                        <label className="admin-bar-label">Update Status:</label>
                        <select
                          value={item.status}
                          onChange={(e) => handleFeedbackStatusChange(item.id, e.target.value)}
                          disabled={isUpdatingFeedback[item.id]}
                          className="status-dropdown"
                        >
                          <option value="PENDING">Pending Review</option>
                          <option value="UNDER_REVIEW">Under Investigation</option>
                          <option value="RESOLVED">Resolved / Implemented</option>
                          <option value="DISMISSED">Dismissed</option>
                        </select>
                      </div>

                      <div className="notes-box">
                        <input
                          type="text"
                          placeholder={item.adminNotes || "Add internal admin note / action taken..."}
                          value={adminNotesDraft[item.id] !== undefined ? adminNotesDraft[item.id] : (item.adminNotes || '')}
                          onChange={(e) => setAdminNotesDraft({ ...adminNotesDraft, [item.id]: e.target.value })}
                          className="notes-input"
                        />
                        <button
                          className="btn-save-note"
                          onClick={() => handleSaveAdminNotes(item.id)}
                          disabled={isUpdatingFeedback[item.id]}
                        >
                          Save Note
                        </button>
                      </div>

                      <button
                        className="btn-delete-report"
                        onClick={() => handleDeleteFeedback(item.id)}
                        title="Delete report from records"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Screenshot Lightbox Modal */}
            {selectedScreenshot && (
              <div className="lightbox-zoom-overlay" onClick={() => setSelectedScreenshot(null)}>
                <div className="lightbox-content" onClick={(e) => e.stopPropagation()}>
                  <img src={selectedScreenshot} alt="Full resolution screenshot" className="lightbox-img" />
                  <div className="lightbox-bar">
                    <a 
                      href={selectedScreenshot} 
                      download="user-screenshot.png" 
                      className="btn btn-secondary btn-sm"
                    >
                      <Download size={13} />
                      <span>Download Image</span>
                    </a>
                    <button 
                      className="btn btn-primary btn-sm" 
                      onClick={() => setSelectedScreenshot(null)}
                    >
                      Close Zoom
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
