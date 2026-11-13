import React, { useState } from 'react';
import { 
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, 
  ResponsiveContainer, Tooltip 
} from 'recharts';
import { GitBranch, Sparkles, Award, ShieldCheck } from 'lucide-react';
import './CodeDnaRadarWindow.css';

interface MasteryMetric {
  subject: string;
  userScore: number;
  benchmark: number;
  fullMark: number;
}

const masteryData: MasteryMetric[] = [
  { subject: 'Algorithms', userScore: 92, benchmark: 85, fullMark: 100 },
  { subject: 'Data Structs', userScore: 88, benchmark: 90, fullMark: 100 },
  { subject: 'Speed (ms)', userScore: 96, benchmark: 80, fullMark: 100 },
  { subject: 'Memory Safe', userScore: 84, benchmark: 88, fullMark: 100 },
  { subject: 'Conciseness', userScore: 78, benchmark: 75, fullMark: 100 },
  { subject: 'AST Depth', userScore: 86, benchmark: 82, fullMark: 100 },
];

export default function CodeDnaRadarWindow() {
  const [showBenchmark, setShowBenchmark] = useState(true);

  return (
    <div className="radar-dna-card">
      <div className="radar-header">
        <div className="radar-title-group">
          <div className="radar-icon-box">
            <GitBranch size={16} />
          </div>
          <div>
            <h3 className="radar-title">Code DNA & Mastery Radar</h3>
            <span className="radar-subtext">Multi-dimensional Algorithmic Competency</span>
          </div>
        </div>

        <div className="radar-badge-rating">
          <Award size={13} />
          <span>Grandmaster • 2,450 ELO</span>
        </div>
      </div>

      <div className="radar-controls-row">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div className="radar-legend-item">
            <span className="radar-dot user" />
            <span>My Skills DNA</span>
          </div>
          {showBenchmark && (
            <div className="radar-legend-item">
              <span className="radar-dot benchmark" />
              <span>Staff Engineer Target</span>
            </div>
          )}
        </div>

        <button
          className={`radar-toggle-btn ${showBenchmark ? 'active' : ''}`}
          onClick={() => setShowBenchmark(!showBenchmark)}
        >
          {showBenchmark ? 'Hide Benchmark' : 'Compare Benchmark'}
        </button>
      </div>

      <div className="radar-chart-container">
        <ResponsiveContainer width="100%" height={210}>
          <RadarChart cx="50%" cy="50%" outerRadius="75%" data={masteryData}>
            <PolarGrid stroke="#E4D9CE" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: '#5C4E44', fontSize: 11, fontWeight: 600 }} 
            />
            <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#DFCFC0" tick={false} />
            
            <Tooltip
              contentStyle={{
                backgroundColor: '#FAF4EE',
                border: '1.5px solid #C8B6A6',
                borderRadius: '8px',
                fontSize: '12px',
                color: '#2D231E',
                boxShadow: '0 4px 12px rgba(166, 145, 127, 0.25)'
              }}
            />

            <Radar
              name="My Skills DNA"
              dataKey="userScore"
              stroke="#C85A32"
              fill="#C85A32"
              fillOpacity={0.45}
            />

            {showBenchmark && (
              <Radar
                name="Staff Engineer Target"
                dataKey="benchmark"
                stroke="#B35E17"
                fill="#B35E17"
                fillOpacity={0.2}
              />
            )}
          </RadarChart>
        </ResponsiveContainer>
      </div>

      <div className="radar-footer-grid">
        <div className="radar-stat-box">
          <span className="radar-stat-label">Peak Discipline</span>
          <span className="radar-stat-num">Speed (96%)</span>
        </div>
        <div className="radar-stat-box">
          <span className="radar-stat-label">Growth Area</span>
          <span className="radar-stat-num" style={{ color: '#B35E17' }}>Conciseness</span>
        </div>
        <div className="radar-stat-box">
          <span className="radar-stat-label">Percentile Rank</span>
          <span className="radar-stat-num" style={{ color: '#2A5A3D' }}>Top 2.8%</span>
        </div>
      </div>
    </div>
  );
}
