import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Activity, Cpu, Zap, Server, ShieldCheck, Gauge, Flame } from 'lucide-react';
import './CompilerTelemetryWindow.css';

export default function CompilerTelemetryWindow() {
  const [throughput, setThroughput] = useState(1240);
  const [cpuUsage, setCpuUsage] = useState(14.8);
  const [latency, setLatency] = useState(18.2);

  useEffect(() => {
    const timer = setInterval(() => {
      setThroughput(prev => Math.floor(1200 + Math.random() * 95));
      setCpuUsage(prev => +(12 + Math.random() * 6).toFixed(1));
      setLatency(prev => +(16 + Math.random() * 4).toFixed(1));
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const runtimes = [
    { name: 'Node.js v24.1', lang: 'JavaScript', status: 'Healthy', load: '12%', color: '#2A5A3D' },
    { name: 'Python 3.12', lang: 'Python', status: 'Healthy', load: '18%', color: '#E08A3C' },
    { name: 'GCC 14.1 (C++)', lang: 'C++', status: 'Optimal', load: '8%', color: '#C85A32' },
    { name: 'OpenJDK 22', lang: 'Java', status: 'Healthy', load: '15%', color: '#B35E17' },
  ];

  return (
    <div className="telemetry-window-card">
      {/* Title Header */}
      <div className="telemetry-header">
        <div className="telemetry-title-wrap">
          <Activity size={18} className="telemetry-icon pulse-glow" />
          <div>
            <h3 className="telemetry-title">Compiler Engine Telemetry</h3>
            <span className="telemetry-subtext">Real-time Host Execution & AST Engine Metrics</span>
          </div>
        </div>
        <div className="live-pill">
          <span className="live-dot-pulse" />
          <span>Engine Active</span>
        </div>
      </div>

      {/* Animated Gauges Grid */}
      <div className="gauges-grid">
        {/* Throughput */}
        <div className="gauge-item">
          <div className="gauge-icon-circle terracotta">
            <Zap size={18} />
          </div>
          <div>
            <div className="gauge-val">{throughput.toLocaleString()}</div>
            <div className="gauge-lbl">Executions / Min</div>
          </div>
        </div>

        {/* Latency */}
        <div className="gauge-item">
          <div className="gauge-icon-circle emerald">
            <Gauge size={18} />
          </div>
          <div>
            <div className="gauge-val">{latency} ms</div>
            <div className="gauge-lbl">Avg Execution Time</div>
          </div>
        </div>

        {/* CPU */}
        <div className="gauge-item">
          <div className="gauge-icon-circle amber">
            <Cpu size={18} />
          </div>
          <div>
            <div className="gauge-val">{cpuUsage}%</div>
            <div className="gauge-lbl">Engine CPU Load</div>
          </div>
        </div>
      </div>

      {/* Host Runtimes Status List */}
      <div className="runtimes-section">
        <div className="runtimes-header">
          <Server size={13} style={{ color: '#C85A32' }} />
          <span>Active Host Language Runtimes</span>
        </div>

        <div className="runtimes-list">
          {runtimes.map(r => (
            <motion.div 
              key={r.name} 
              className="runtime-row"
              whileHover={{ scale: 1.01, x: 2 }}
            >
              <div className="runtime-info">
                <span className="runtime-dot" style={{ backgroundColor: r.color }} />
                <strong className="runtime-name">{r.name}</strong>
                <span className="runtime-lang">({r.lang})</span>
              </div>
              <div className="runtime-meta">
                <span className="runtime-badge">{r.status}</span>
                <span className="runtime-load">{r.load}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
