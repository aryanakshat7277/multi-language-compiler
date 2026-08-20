import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';
import { BarChart2, ShieldCheck, Sparkles, Sliders } from 'lucide-react';
import './CodeComplexityGraphWindow.css';

const RADAR_METRICS = [
  { subject: 'Maintainability', value: 94, fullMark: 100 },
  { subject: 'Cyclomatic', value: 88, fullMark: 100 },
  { subject: 'Security Index', value: 98, fullMark: 100 },
  { subject: 'Modularity', value: 92, fullMark: 100 },
  { subject: 'Quality Score', value: 96, fullMark: 100 },
  { subject: 'Density', value: 85, fullMark: 100 },
];

const HISTORICAL_TRENDS = [
  { time: '10:00', quality: 82, complexity: 12 },
  { time: '10:05', quality: 88, complexity: 9 },
  { time: '10:10', quality: 92, complexity: 7 },
  { time: '10:15', quality: 90, complexity: 8 },
  { time: '10:20', quality: 96, complexity: 4 },
  { time: '10:25', quality: 98, complexity: 3 },
];

export default function CodeComplexityGraphWindow() {
  const [viewMode, setViewMode] = useState<'radar' | 'trend'>('radar');

  return (
    <div className="complexity-graph-card">
      <div className="complexity-header">
        <div className="title-with-icon">
          <BarChart2 size={18} style={{ color: '#C85A32' }} />
          <div>
            <h3 className="card-title">Real-Time AST Complexity & Quality</h3>
            <span className="card-subtext">Static Inspection & Security Health Gauge</span>
          </div>
        </div>

        <div className="segmented-toggle">
          <button className={`toggle-btn ${viewMode === 'radar' ? 'active' : ''}`} onClick={() => setViewMode('radar')}>
            Radar Map
          </button>
          <button className={`toggle-btn ${viewMode === 'trend' ? 'active' : ''}`} onClick={() => setViewMode('trend')}>
            Quality Trend
          </button>
        </div>
      </div>

      <div className="chart-body-container">
        {viewMode === 'radar' ? (
          <ResponsiveContainer width="100%" height={210}>
            <RadarChart cx="50%" cy="50%" outerRadius="75%" data={RADAR_METRICS}>
              <PolarGrid stroke="#E4D9CE" />
              <PolarAngleAxis dataKey="subject" tick={{ fill: '#8B5A2B', fontSize: 11, fontWeight: 700 }} />
              <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#E4D9CE" />
              <Radar name="Code Quality" dataKey="value" stroke="#C85A32" fill="#C85A32" fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <AreaChart data={HISTORICAL_TRENDS} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorQuality" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2A5A3D" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#2A5A3D" stopOpacity={0.0}/>
                </linearGradient>
              </defs>
              <XAxis dataKey="time" stroke="#8B5A2B" tick={{ fontSize: 11, fontWeight: 600 }} />
              <YAxis stroke="#8B5A2B" tick={{ fontSize: 11, fontWeight: 600 }} domain={[60, 100]} />
              <Tooltip contentStyle={{ backgroundColor: '#FAF4EE', borderColor: '#C8B6A6', borderRadius: 6, color: '#2D231E', fontSize: 12, fontWeight: 700 }} />
              <Area type="monotone" dataKey="quality" stroke="#2A5A3D" strokeWidth={2.5} fillOpacity={1} fill="url(#colorQuality)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Footer Pill Stats */}
      <div className="complexity-footer-stats">
        <div className="stat-pill">
          <span className="stat-num text-emerald">96.4</span>
          <span className="stat-tag">Overall Quality</span>
        </div>
        <div className="stat-pill">
          <span className="stat-num text-terracotta">O(1)</span>
          <span className="stat-tag">Cyclomatic Grade</span>
        </div>
        <div className="stat-pill">
          <span className="stat-num text-sky">100%</span>
          <span className="stat-tag">AST Security</span>
        </div>
      </div>
    </div>
  );
}
