import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Code2, Clock, CheckCircle, ArrowRight, Zap, Flame } from 'lucide-react';
import './DailyChallengeWidget.css';

export default function DailyChallengeWidget() {
  const navigate = useNavigate();
  const [timeLeft, setTimeLeft] = useState('05h 42m 19s');

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      const midnight = new Date();
      midnight.setHours(24, 0, 0, 0);
      const diffMs = midnight.getTime() - now.getTime();

      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      const pad = (n: number) => n.toString().padStart(2, '0');
      setTimeLeft(`${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="daily-challenge-card">
      <div className="daily-header">
        <div className="daily-title-group">
          <div className="daily-icon-box">
            <Code2 size={16} />
          </div>
          <div>
            <h3 className="daily-title">Daily Algorithmic Crucible</h3>
            <span className="daily-subtext">Verified Multi-case Automated Evaluation</span>
          </div>
        </div>

        <div className="daily-countdown-pill" title="Resets at 00:00 UTC">
          <Clock size={12} />
          <span>{timeLeft}</span>
        </div>
      </div>

      <div className="daily-problem-meta">
        <h4 className="daily-problem-title">
          <span>LRU Cache Memory Optimization</span>
          <span className="difficulty-badge medium">Medium</span>
        </h4>
        <span className="daily-category-tag">Data Structures • Hash & Doubly Linked List</span>
      </div>

      {/* Code Snippet Preview */}
      <div className="daily-code-box">
        <div><span className="code-keyword">class</span> LRUCache:</div>
        <div>&nbsp;&nbsp;<span className="code-keyword">def</span> <span className="code-func">__init__</span>(self, capacity: <span className="code-keyword">int</span>):</div>
        <div>&nbsp;&nbsp;&nbsp;&nbsp;self.cap = capacity <span className="code-comment"># O(1) get & put target</span></div>
        <div>&nbsp;&nbsp;<span className="code-keyword">def</span> <span className="code-func">get</span>(self, key: <span className="code-keyword">int</span>) -&gt; <span className="code-keyword">int</span>: ...</div>
      </div>

      <div className="daily-footer">
        <div className="daily-cases-hint">
          <CheckCircle size={13} />
          <span>4 Hidden Stress Tests • 100 XP</span>
        </div>

        <button 
          className="solve-challenge-btn"
          onClick={() => navigate('/compiler')}
        >
          <span>Solve in IDE</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
}
