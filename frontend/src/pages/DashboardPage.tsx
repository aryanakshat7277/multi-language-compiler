import React from 'react';
import { motion, Variants } from 'framer-motion';
import CompilerTelemetryWindow from '../components/dashboard/CompilerTelemetryWindow';
import ProfileStatsWindow from '../components/dashboard/ProfileStatsWindow';
import CodeComplexityGraphWindow from '../components/dashboard/CodeComplexityGraphWindow';
import MetricsWaveWindow from '../components/dashboard/MetricsWaveWindow';
import LiveLeaderboardTickerWindow from '../components/dashboard/LiveLeaderboardTickerWindow';
import './DashboardPage.css';

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.04
    }
  }
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 22, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 240,
      damping: 24
    }
  }
};

export default function DashboardPage() {
  return (
    <div className="clay-dashboard-page-container">
      <motion.div 
        className="dashboard-modular-wall-grid" 
        variants={containerVariants} 
        initial="hidden" 
        animate="visible"
      >
        {/* Top Row: Telemetry, Developer Profile, AST Complexity */}
        <motion.div 
          className="grid-cell cell-telemetry" 
          variants={itemVariants}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <CompilerTelemetryWindow />
        </motion.div>

        <motion.div 
          className="grid-cell cell-profile" 
          variants={itemVariants}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <ProfileStatsWindow />
        </motion.div>

        <motion.div 
          className="grid-cell cell-complexity" 
          variants={itemVariants}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <CodeComplexityGraphWindow />
        </motion.div>

        {/* Middle Row: Wide Metrics Waveform Graph */}
        <motion.div 
          className="grid-cell cell-metrics-wide" 
          variants={itemVariants}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <MetricsWaveWindow />
        </motion.div>

        {/* Bottom Row: Team Leaderboard & Developer Activity Ticker */}
        <motion.div 
          className="grid-cell cell-leaderboard-wide" 
          variants={itemVariants}
          whileHover={{ y: -4, transition: { duration: 0.2 } }}
        >
          <LiveLeaderboardTickerWindow />
        </motion.div>
      </motion.div>
    </div>
  );
}
