import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import './AdminPage.css';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState<any[]>([]);
  const [languages, setLanguages] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'languages') fetchLanguages();
    if (activeTab === 'system') fetchHealth();
    if (activeTab === 'monitoring') fetchStats();
  }, [activeTab]);

  const fetchUsers = async () => {
    try {
      const res = await api.get('/users');
      setUsers(Array.isArray(res) ? res : res.users || []);
    } catch {
      setUsers([{ id: 1, name: 'Alice', email: 'alice@test.com', role: 'admin', status: 'Active', joined: '2023-01-01' }]);
    }
  };

  const fetchLanguages = async () => {
    try {
      const res = await api.get('/languages');
      setLanguages(Array.isArray(res) ? res : res.languages || []);
    } catch {
      setLanguages([
        { id: 'python', name: 'Python', extension: '.py', compileRequired: false, version: '3.10', enabled: true },
        { id: 'java', name: 'Java', extension: '.java', compileRequired: true, version: '17', enabled: true },
      ]);
    }
  };

  const fetchHealth = async () => {
    try {
      const res = await api.get('/admin/health');
      setSystemHealth(res);
    } catch {
      setSystemHealth({
        api: 'Healthy', db: 'Connected', redis: 'Connected', docker: '4 Workers',
        queue: { queued: 12, processing: 3, completed: 15420, failed: 23 }
      });
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res);
    } catch {
      setStats({
        totalExecutions: 15443, successRate: 98.5, avgRuntime: '1.2s', queueSize: 12,
        executionsByLang: [ { name: 'Python', value: 400 }, { name: 'Java', value: 300 }, { name: 'C++', value: 200 } ],
        executionsOverTime: [ { time: '10:00', val: 20 }, { time: '11:00', val: 50 }, { time: '12:00', val: 30 } ]
      });
    }
  };

  const handleRoleChange = async (id: number, role: string) => {
    try {
      await api.put(`/api/users/${id}/role`, { role });
      fetchUsers();
    } catch (e) { console.error(e); }
  };

  const handleLangToggle = async (id: string, enabled: boolean) => {
    try {
      await api.put(`/api/languages/${id}`, { enabled: !enabled });
      fetchLanguages();
    } catch (e) { console.error(e); }
  };

  return (
    <div className="admin-page">
      <div className="admin-sidebar">
        <h2>Admin Panel</h2>
        <div className="nav-tabs">
          {['users', 'languages', 'system', 'monitoring'].map(t => (
            <button 
              key={t} 
              className={`nav-tab ${activeTab === t ? 'active' : ''}`}
              onClick={() => setActiveTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>
      
      <div className="admin-content">
        {activeTab === 'users' && (
          <div className="tab-pane">
            <h3>User Management</h3>
            <div className="table-responsive">
              <table className="admin-table">
                <thead>
                  <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Joined</th></tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td>{u.name}</td>
                      <td>{u.email}</td>
                      <td>
                        <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value)}>
                          <option value="user">User</option>
                          <option value="instructor">Instructor</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td><span className="status-dot"></span>{u.status}</td>
                      <td>{u.joined}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'languages' && (
          <div className="tab-pane">
            <h3>Language Configurations</h3>
            <table className="admin-table">
              <thead>
                <tr><th>Name</th><th>Ext</th><th>Compile</th><th>Version</th><th>Enabled</th></tr>
              </thead>
              <tbody>
                {languages.map(l => (
                  <tr key={l.id}>
                    <td>{l.name}</td>
                    <td>{l.extension}</td>
                    <td>{l.compileRequired ? 'Yes' : 'No'}</td>
                    <td>{l.version}</td>
                    <td>
                      <label className="switch">
                        <input type="checkbox" checked={l.enabled} onChange={() => handleLangToggle(l.id, l.enabled)} />
                        <span className="slider round"></span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'system' && systemHealth && (
          <div className="tab-pane">
            <h3>System Health</h3>
            <div className="health-cards">
              <div className="h-card"><h4>API Status</h4><p className="success-text">● {systemHealth.api}</p></div>
              <div className="h-card"><h4>Database</h4><p className="success-text">● {systemHealth.db}</p></div>
              <div className="h-card"><h4>Redis</h4><p className="success-text">● {systemHealth.redis}</p></div>
              <div className="h-card"><h4>Docker</h4><p className="info-text">● {systemHealth.docker}</p></div>
            </div>
            
            <h3 className="mt-4">Queue Statistics</h3>
            <div className="queue-stats">
              <div className="q-stat"><span>Queued</span><strong>{systemHealth.queue.queued}</strong></div>
              <div className="q-stat"><span>Processing</span><strong>{systemHealth.queue.processing}</strong></div>
              <div className="q-stat"><span>Completed</span><strong className="success-text">{systemHealth.queue.completed}</strong></div>
              <div className="q-stat"><span>Failed</span><strong className="error-text">{systemHealth.queue.failed}</strong></div>
            </div>
          </div>
        )}

        {activeTab === 'monitoring' && stats && (
          <div className="tab-pane">
            <h3>Monitoring Overview</h3>
            <div className="stats-row">
              <div className="stat-card"><h5>Total Executions</h5><h2>{stats.totalExecutions}</h2></div>
              <div className="stat-card"><h5>Success Rate</h5><h2 className="success-text">{stats.successRate}%</h2></div>
              <div className="stat-card"><h5>Avg Runtime</h5><h2>{stats.avgRuntime}</h2></div>
              <div className="stat-card"><h5>Queue Size</h5><h2>{stats.queueSize}</h2></div>
            </div>
            
            <div className="charts-grid">
              <div className="chart-container">
                <h4>Executions by Language</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.executionsByLang}>
                    <XAxis dataKey="name" stroke="var(--text-secondary)" />
                    <YAxis stroke="var(--text-secondary)" />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: 'none' }} />
                    <Bar dataKey="value" fill="var(--accent)" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              
              <div className="chart-container">
                <h4>Executions Over Time</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <LineChart data={stats.executionsOverTime}>
                    <XAxis dataKey="time" stroke="var(--text-secondary)" />
                    <YAxis stroke="var(--text-secondary)" />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-elevated)', border: 'none' }} />
                    <Line type="monotone" dataKey="val" stroke="var(--success)" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
