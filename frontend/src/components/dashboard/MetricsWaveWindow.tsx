import React, { useState, useEffect } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer 
} from 'recharts';
import { Activity, HelpCircle } from 'lucide-react';
import { getCodeMetrics } from '../../services/api';
import { useCode } from '../../contexts/CodeContext';
import './MetricsWaveWindow.css';

const metricsWaveData = [
  { day: 'Sun', executions: 42, submissions: 25, activity: 30 },
  { day: 'Mon', executions: 68, submissions: 48, activity: 55 },
  { day: 'Tue', executions: 85, submissions: 60, activity: 72 },
  { day: 'Wed', executions: 75, submissions: 52, activity: 68 },
  { day: 'Thu', executions: 110, submissions: 85, activity: 98 },
  { day: 'Fri', executions: 95, submissions: 70, activity: 84 },
  { day: 'Sat', executions: 125, submissions: 92, activity: 108 },
  { day: 'Sun', executions: 88, submissions: 64, activity: 75 }
];

export default function MetricsWaveWindow() {
  const [showCrosshairCard, setShowCrosshairCard] = useState(false);
  const { code, language } = useCode();
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    let active = true;
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
  }, [code, language]);

  return (
    <div className="clay-panel metrics-wave-window-panel">
      {/* Header */}
      <div className="metrics-window-header">
        <div className="metrics-header-left">
          <Activity size={14} className="text-terracotta" />
          <span className="metrics-window-title">Code Metrics & Activity</span>
        </div>

        <div className="metrics-legends-row">
          <span className="legend-item"><span className="leg-dot exec" /> Executions</span>
          <span className="legend-item"><span className="leg-dot sub" /> Submissions</span>
          <span className="legend-item"><span className="leg-dot act" /> Activity</span>
          
          <button 
            className={`btn-crosshair-toggle ${showCrosshairCard ? 'active' : ''}`}
            onClick={() => setShowCrosshairCard(!showCrosshairCard)}
            title="Toggle Live Metrics"
          >
            <HelpCircle size={12} />
          </button>
        </div>
      </div>

      {/* Chart Canvas Area */}
      <div className="metrics-chart-body">
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={metricsWaveData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
            <defs>
              <linearGradient id="gradTerracotta" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#C85A32" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#C85A32" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="gradAmber" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#E08A3C" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#E08A3C" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="gradBrown" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#8B5A2B" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#8B5A2B" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#E4D9CE" vertical={false} />
            <XAxis dataKey="day" stroke="#A3968C" fontSize={10} tickLine={false} axisLine={{ stroke: '#E4D9CE' }} />
            <YAxis stroke="#A3968C" fontSize={10} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{
                backgroundColor: '#FAF4EE',
                border: '1px solid #C8B6A6',
                borderRadius: '6px',
                color: '#2D231E',
                fontSize: '11px',
                padding: '6px 8px'
              }}
            />
            <Area type="monotone" dataKey="executions" stroke="#C85A32" strokeWidth={2} fillOpacity={1} fill="url(#gradTerracotta)" />
            <Area type="monotone" dataKey="submissions" stroke="#E08A3C" strokeWidth={1.8} fillOpacity={1} fill="url(#gradAmber)" />
            <Area type="monotone" dataKey="activity" stroke="#8B5A2B" strokeWidth={1.5} fillOpacity={1} fill="url(#gradBrown)" />
          </AreaChart>
        </ResponsiveContainer>

        {/* Floating Crosshair Card */}
        {showCrosshairCard && (
          <div className="metrics-floating-crosshair-card">
            <div className="crosshair-header">
              <span className="ch-title">Current Code Metrics</span>
              <button className="ch-close" onClick={() => setShowCrosshairCard(false)}>x</button>
            </div>
            <div className="crosshair-list">
              <div className="ch-row"><span>Complexity (CC)</span> <strong>{metrics ? (metrics.complexityData?.cyclomaticComplexity ?? metrics.cyclomaticComplexity ?? '...') : '...'}</strong></div>
              <div className="ch-row"><span>Maintainability</span> <strong>{metrics ? (metrics.complexityData?.maintainabilityIndex?.toFixed(1) ?? metrics.maintainabilityIndex?.toFixed(1) ?? '...') : '...'}</strong></div>
              <div className="ch-row"><span>Quality Score</span> <strong>{metrics ? (metrics.complexityData?.codeQualityScore?.toFixed(1) ?? metrics.codeQualityScore?.toFixed(1) ?? '...') : '...'}</strong></div>
              <div className="ch-row"><span>Total Tokens</span> <strong>{metrics ? (metrics.tokenData?.totalTokens ?? metrics.halstead?.volume?.toFixed(1) ?? '...') : '...'}</strong></div>
              <div className="ch-row"><span>Issues Found</span> <strong>{metrics ? (metrics.complexityData?.issues?.length ?? 0) : '...'}</strong></div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
