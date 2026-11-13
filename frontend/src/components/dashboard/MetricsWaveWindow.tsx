import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';
import { Activity, Zap, Cpu, ShieldCheck, Layers, BarChart2 } from 'lucide-react';
import { getCodeMetrics, getMyStats } from '../../services/api';
import { useCode } from '../../contexts/CodeContext';
import './MetricsWaveWindow.css';

const data24h = [
  { day: '00:00', executions: 12, submissions: 4, latency: 44, complexity: 12 },
  { day: '03:00', executions: 8, submissions: 2, latency: 40, complexity: 11 },
  { day: '06:00', executions: 15, submissions: 6, latency: 39, complexity: 14 },
  { day: '09:00', executions: 68, submissions: 28, latency: 36, complexity: 17 },
  { day: '12:00', executions: 94, submissions: 42, latency: 34, complexity: 19 },
  { day: '15:00', executions: 118, submissions: 54, latency: 33, complexity: 22 },
  { day: '18:00', executions: 85, submissions: 36, latency: 35, complexity: 18 },
  { day: '21:00', executions: 64, submissions: 25, latency: 38, complexity: 16 },
];

const data7d = [
  { day: 'Mon', executions: 38, submissions: 12, latency: 45, complexity: 14 },
  { day: 'Tue', executions: 54, submissions: 18, latency: 41, complexity: 16 },
  { day: 'Wed', executions: 72, submissions: 24, latency: 39, complexity: 15 },
  { day: 'Thu', executions: 89, submissions: 32, latency: 38, complexity: 18 },
  { day: 'Fri', executions: 110, submissions: 45, latency: 36, complexity: 20 },
  { day: 'Sat', executions: 95, submissions: 35, latency: 42, complexity: 17 },
  { day: 'Sun', executions: 130, submissions: 58, latency: 35, complexity: 19 },
];

const data30d = [
  { day: 'Week 1', executions: 310, submissions: 120, latency: 42, complexity: 15 },
  { day: 'Week 2', executions: 420, submissions: 180, latency: 39, complexity: 17 },
  { day: 'Week 3', executions: 580, submissions: 240, latency: 36, complexity: 19 },
  { day: 'Week 4', executions: 740, submissions: 310, latency: 33, complexity: 21 },
];

export default function MetricsWaveWindow() {
  const [viewMode, setViewMode] = useState<'wave' | 'latency' | 'complexity'>('wave');
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d'>('7d');
  const { code, language } = useCode();
  const [metrics, setMetrics] = useState<any>(null);
  const [waveData, setWaveData] = useState<any[]>(data7d);

  useEffect(() => {
    if (timeRange === '24h') setWaveData(data24h);
    else if (timeRange === '30d') setWaveData(data30d);
    else setWaveData(data7d);
  }, [timeRange]);

  useEffect(() => {
    let active = true;
    getMyStats()
      .then(s => {
        if (active && s.activityWave && s.activityWave.length > 0 && timeRange === '7d') {
          const merged = s.activityWave.map((item: any, idx: number) => ({
            ...item,
            latency: data7d[idx % data7d.length].latency,
            complexity: data7d[idx % data7d.length].complexity
          }));
          setWaveData(merged);
        }
      })
      .catch(() => {});

    const fetchMetrics = async () => {
      try {
        const res = await getCodeMetrics(code, language);
        if (active) setMetrics(res);
      } catch (e) {
        console.error(e);
      }
    };
    fetchMetrics();
    return () => { active = false; };
  }, [code, language, timeRange]);

  return (
    <div className="clay-panel metrics-wave-window-panel">
      {/* Header */}
      <div className="metrics-window-header">
        <div className="metrics-header-left">
          <div className="metrics-icon-wrap">
            <Activity size={15} className="text-terracotta" />
          </div>
          <span className="metrics-window-title">Code Metrics & Telemetry Waveform</span>
          <span className="metrics-trend-badge">▲ +18.4% Surge</span>
        </div>

        {/* Time Range Selector */}
        <div className="metrics-time-range-wrap">
          <button 
            className={`time-range-btn ${timeRange === '24h' ? 'active' : ''}`}
            onClick={() => setTimeRange('24h')}
          >
            24h
          </button>
          <button 
            className={`time-range-btn ${timeRange === '7d' ? 'active' : ''}`}
            onClick={() => setTimeRange('7d')}
          >
            7d
          </button>
          <button 
            className={`time-range-btn ${timeRange === '30d' ? 'active' : ''}`}
            onClick={() => setTimeRange('30d')}
          >
            30d
          </button>
        </div>

        {/* View Switcher Pills */}
        <div className="metrics-view-switcher">
          <button 
            className={`view-pill ${viewMode === 'wave' ? 'active' : ''}`}
            onClick={() => setViewMode('wave')}
          >
            <Activity size={12} />
            <span>Executions</span>
          </button>
          <button 
            className={`view-pill ${viewMode === 'latency' ? 'active' : ''}`}
            onClick={() => setViewMode('latency')}
          >
            <Zap size={12} />
            <span>Latency</span>
          </button>
          <button 
            className={`view-pill ${viewMode === 'complexity' ? 'active' : ''}`}
            onClick={() => setViewMode('complexity')}
          >
            <Layers size={12} />
            <span>Complexity</span>
          </button>
        </div>

        {/* Live Legends */}
        <div className="metrics-legends-row">
          {viewMode === 'wave' && (
            <>
              <span className="legend-item"><span className="leg-dot exec" /> Executions</span>
              <span className="legend-item"><span className="leg-dot sub" /> Submissions</span>
            </>
          )}
          {viewMode === 'latency' && (
            <span className="legend-item"><span className="leg-dot lat" /> Runtime (ms)</span>
          )}
          {viewMode === 'complexity' && (
            <span className="legend-item"><span className="leg-dot comp" /> Cyclomatic Rating</span>
          )}
        </div>
      </div>

      {/* Secondary Telemetry Strip */}
      <div className="metrics-telemetry-strip">
        <div className="metric-chip">
          <Zap size={12} className="chip-icon terracotta" />
          <span className="chip-label">AST Rate:</span>
          <strong className="chip-val">1,840 nodes/s</strong>
        </div>
        <div className="metric-chip">
          <ShieldCheck size={12} className="chip-icon emerald" />
          <span className="chip-label">Cache Hit SLA:</span>
          <strong className="chip-val">98.4% Zero-Fail</strong>
        </div>
        <div className="metric-chip">
          <Cpu size={12} className="chip-icon amber" />
          <span className="chip-label">Engine Latency:</span>
          <strong className="chip-val">36.8 ms avg</strong>
        </div>
        <div className="metric-chip">
          <BarChart2 size={12} className="chip-icon terracotta" />
          <span className="chip-label">Peak Concurrency:</span>
          <strong className="chip-val">5,000 Users</strong>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="metrics-chart-body">
        <ResponsiveContainer width="100%" height={170}>
          {viewMode === 'wave' ? (
            <AreaChart data={waveData} margin={{ top: 10, right: 14, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradTerracotta" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#C85A32" stopOpacity={0.45} />
                  <stop offset="95%" stopColor="#C85A32" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="gradAmber" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#E08A3C" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#E08A3C" stopOpacity={0.0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#E4D9CE" vertical={false} />
              <XAxis dataKey="day" stroke="#A3968C" fontSize={11} tickLine={false} axisLine={{ stroke: '#E4D9CE' }} />
              <YAxis stroke="#A3968C" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#FAF4EE',
                  border: '1.5px solid #C8B6A6',
                  borderRadius: '8px',
                  color: '#2D231E',
                  fontSize: '12px',
                  padding: '8px 12px',
                  boxShadow: '0 4px 12px rgba(166, 145, 127, 0.25)'
                }}
              />
              <Area 
                type="monotone" 
                dataKey="executions" 
                stroke="#C85A32" 
                strokeWidth={2.4} 
                fillOpacity={1} 
                fill="url(#gradTerracotta)" 
              />
              <Area 
                type="monotone" 
                dataKey="submissions" 
                stroke="#E08A3C" 
                strokeWidth={2.0} 
                fillOpacity={1} 
                fill="url(#gradAmber)" 
              />
            </AreaChart>
          ) : viewMode === 'latency' ? (
            <BarChart data={waveData} margin={{ top: 10, right: 14, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4D9CE" vertical={false} />
              <XAxis dataKey="day" stroke="#A3968C" fontSize={11} tickLine={false} axisLine={{ stroke: '#E4D9CE' }} />
              <YAxis stroke="#A3968C" fontSize={11} tickLine={false} axisLine={false} unit="ms" />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#FAF4EE',
                  border: '1.5px solid #C8B6A6',
                  borderRadius: '8px',
                  fontSize: '12px',
                  padding: '8px 12px'
                }}
              />
              <Bar dataKey="latency" fill="#2A5A3D" radius={[4, 4, 0, 0]} />
            </BarChart>
          ) : (
            <AreaChart data={waveData} margin={{ top: 10, right: 14, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradEmerald" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2A5A3D" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#2A5A3D" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E4D9CE" vertical={false} />
              <XAxis dataKey="day" stroke="#A3968C" fontSize={11} tickLine={false} axisLine={{ stroke: '#E4D9CE' }} />
              <YAxis stroke="#A3968C" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip 
                contentStyle={{
                  backgroundColor: '#FAF4EE',
                  border: '1.5px solid #C8B6A6',
                  borderRadius: '8px',
                  fontSize: '12px',
                  padding: '8px 12px'
                }}
              />
              <Area type="monotone" dataKey="complexity" stroke="#2A5A3D" strokeWidth={2.4} fillOpacity={1} fill="url(#gradEmerald)" />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
