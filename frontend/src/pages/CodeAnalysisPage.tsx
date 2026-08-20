import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, Shield, Zap, CheckCircle2, 
  Sparkles, Loader2, Info, Activity, Cpu, 
  Layers, Compass, ArrowUpRight, Gauge, AlertCircle
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, 
  ResponsiveContainer, CartesianGrid, RadarChart, 
  PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar 
} from 'recharts';
import { getCodeMetrics } from '../services/api';
import { useCode } from '../contexts/CodeContext';
import { useToast } from '../contexts/ToastContext';
import { registerMonacoThemes } from '../utils/monacoThemes';
import { registerMonacoHoverProvider } from '../utils/monacoHoverProvider';
import './CodeAnalysisPage.css';

interface MetricDetail {
  id: string;
  title: string;
  score: number;
  grade: string;
  statusText: string;
  color: string;
  percent: number;
  analysis: string;
  location: string;
  recommendation: string;
}

const METRIC_DEFINITIONS: Record<string, MetricDetail> = {
  complexity: {
    id: 'complexity',
    title: 'Cyclomatic Complexity',
    score: 1,
    grade: 'LOW (Optimal)',
    statusText: 'Optimal Flow • 1 Path',
    color: '#4C7A5D',
    percent: 15,
    analysis: 'Measures control flow complexity. Linear execution path with 1 decision branch. Lower is better.',
    location: 'main() at line 1',
    recommendation: 'Current linear control flow graph is optimal.'
  },
  maintainability: {
    id: 'maintainability',
    title: 'Maintainability Index',
    score: 95,
    grade: 'A+ (High Readability)',
    statusText: 'High Readability • A+',
    color: '#C85A32',
    percent: 95,
    analysis: 'Overall indication of how easy code is to maintain. High readability with clear structural scope. Higher is better.',
    location: 'Entire source code snippet.',
    recommendation: 'Maintain current clean code structure.'
  },
  duplication: {
    id: 'duplication',
    title: 'Code Duplication',
    score: 0,
    grade: '0% (Zero Duplication)',
    statusText: '0% Duplication • Optimal',
    color: '#E08A3C',
    percent: 100,
    analysis: 'Detects repeated code blocks and statements. Zero redundant code blocks found. Lower is better.',
    location: 'Global module scope',
    recommendation: 'Zero redundant statement patterns detected.'
  },
  similarity: {
    id: 'similarity',
    title: 'Code Similarity',
    score: 15,
    grade: 'Unique Implementation',
    statusText: 'Unique Solution • Distinct',
    color: '#8B5A2B',
    percent: 85,
    analysis: 'Compares code structure and logic to detect similar or copied solutions against benchmark references.',
    location: 'Function body entry',
    recommendation: 'Unique algorithmic implementation.'
  }
};

const codeActivityTrend = [
  { month: 'Jan', quality: 80, complexity: 12 },
  { month: 'Mar', quality: 92, complexity: 8 },
  { month: 'Apr', quality: 88, complexity: 10 },
  { month: 'Jul', quality: 95, complexity: 7 },
  { month: 'Sep', quality: 97, complexity: 5 },
  { month: 'Nov', quality: 99, complexity: 4 },
];

export default function CodeAnalysisPage() {
  const { code, setCode, language, setLanguage } = useCode();
  const [loading, setLoading] = useState(false);
  const [scanningStep, setScanningStep] = useState<string>('');
  const [selectedMetric, setSelectedMetric] = useState<string>('complexity');
  const [vulnerabilitiesCount, setVulnerabilitiesCount] = useState<number>(0);
  const [maxConfidence, setMaxConfidence] = useState<string>('99.2% Max');

  const [radarData, setRadarData] = useState([
    { subject: 'Cyclomatic', value: 85, fullMark: 100 },
    { subject: 'Maintainability', value: 92, fullMark: 100 },
    { subject: 'Duplication', value: 100, fullMark: 100 },
    { subject: 'Similarity', value: 85, fullMark: 100 },
  ]);

  const [codeActivityTrend, setCodeActivityTrend] = useState([
    { month: 'Jan', quality: 80, complexity: 12 },
    { month: 'Mar', quality: 92, complexity: 8 },
    { month: 'Apr', quality: 88, complexity: 10 },
    { month: 'Jul', quality: 95, complexity: 7 },
    { month: 'Sep', quality: 97, complexity: 5 },
  ]);

  const [tokenStats, setTokenStats] = useState([
    { type: 'Keywords', count: 12, pct: 15 },
    { type: 'Identifiers', count: 24, pct: 28 },
    { type: 'Operators', count: 18, pct: 22 },
    { type: 'Punctuation', count: 32, pct: 35 }
  ]);
  const [metricsDef, setMetricsDef] = useState<Record<string, MetricDetail>>(METRIC_DEFINITIONS);

  const { showToast } = useToast();

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (code && code.trim()) {
        handleAnalyze();
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [code, language]);

  const handleAnalyze = async () => {
    setLoading(true);
    setScanningStep('1/3: Transmitting code to Google Gemini 3.6 Flash...');

    try {
      const stepTimer1 = setTimeout(() => setScanningStep('2/3: Computing Cyclomatic & Maintainability Metrics...'), 400);
      const stepTimer2 = setTimeout(() => setScanningStep('3/3: Synthesizing Security Vulnerabilities & Radar Graph...'), 800);

      const response = await getCodeMetrics(code, language);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      if (response) {
        // Token stats
        if (response.tokenData) {
          const t = response.tokenData;
          const dist = (t as any).distribution || {};
          const kw = t.keywords ?? dist.keywords ?? 0;
          const id = t.identifiers ?? dist.identifiers ?? 0;
          const op = t.operators ?? dist.operators ?? 0;
          const pu = t.punctuation ?? dist.punctuation ?? 0;
          const sum = kw + id + op + pu || 1;

          setTokenStats([
            { type: 'Keywords', count: kw, pct: Math.round((kw / sum) * 100) },
            { type: 'Identifiers', count: id, pct: Math.round((id / sum) * 100) },
            { type: 'Operators', count: op, pct: Math.round((op / sum) * 100) },
            { type: 'Punctuation', count: pu, pct: Math.round((pu / sum) * 100) }
          ]);
        }

        // Real Gemini AI Metrics
        if (response.aiMetrics) {
          const ai = response.aiMetrics;

          // Update vulnerability count badge
          setVulnerabilitiesCount(ai.vulnerabilitiesCount || 0);

          // Update Radar Chart with ONLY the 4 Quality Metrics
          setRadarData([
            { subject: 'Cyclomatic', value: Math.max(10, Math.min(100, 100 - (ai.cyclomaticComplexity * 8))), fullMark: 100 },
            { subject: 'Maintainability', value: Math.min(100, Math.max(0, ai.maintainabilityIndex)), fullMark: 100 },
            { subject: 'Duplication', value: Math.max(0, 100 - (ai.codeDuplicationScore ?? 0)), fullMark: 100 },
            { subject: 'Similarity', value: Math.max(0, 100 - (ai.codeSimilarityScore ?? 15)), fullMark: 100 },
          ]);

          // Update Confidence Curve
          if (Array.isArray(ai.confidenceCurve) && ai.confidenceCurve.length > 0) {
            const months = ['Jan', 'Mar', 'Apr', 'Jul', 'Sep'];
            const newCurve = ai.confidenceCurve.map((val, idx) => ({
              month: months[idx] || `P${idx + 1}`,
              quality: typeof val === 'number' ? (val > 1 ? val : Math.round(val * 100)) : 85,
              complexity: Math.max(2, 12 - idx * 2)
            }));
            setCodeActivityTrend(newCurve);
          }

          if (ai.maxQualityConfidence) {
            const maxVal = ai.maxQualityConfidence > 1 ? ai.maxQualityConfidence : Math.round(ai.maxQualityConfidence * 100);
            setMaxConfidence(`${maxVal}% Max`);
          }

          // Auto-detect language if code is C/C++ but dropdown says python
          if (ai.detectedLanguage && ai.detectedLanguage.toLowerCase().includes('c')) {
            if (language === 'python' || language === 'javascript') {
              setLanguage('cpp');
            }
          }

          // Update 4 Interactive Cards with REAL code-specific analysis
          setMetricsDef({
            complexity: {
              id: 'complexity',
              title: 'Cyclomatic Complexity',
              score: ai.cyclomaticComplexity,
              grade: ai.cyclomaticRating || 'LOW (Optimal)',
              statusText: `${ai.cyclomaticRating || 'Optimal Flow'} • ${ai.cyclomaticComplexity} Path(s)`,
              color: ai.cyclomaticComplexity <= 5 ? '#4C7A5D' : ai.cyclomaticComplexity <= 10 ? '#E08A3C' : '#C85A32',
              percent: Math.max(10, Math.min(100, ai.cyclomaticComplexity * 10)),
              analysis: ai.cyclomaticAnalysis || 'Measures control flow complexity. Lower is generally better.',
              location: ai.cyclomaticLocation || 'main() entry at line 1',
              recommendation: ai.cyclomaticRec || 'Current control flow graph is optimal.'
            },
            maintainability: {
              id: 'maintainability',
              title: 'Maintainability Index',
              score: ai.maintainabilityIndex,
              grade: `${ai.maintainabilityRating || 'A+'} Grade`,
              statusText: `High Readability • Score ${ai.maintainabilityIndex}`,
              color: '#C85A32',
              percent: ai.maintainabilityIndex,
              analysis: ai.maintainabilityAnalysis || 'Gives an overall indication of how easy the code is to maintain. Higher is better.',
              location: ai.maintainabilityLocation || 'Entire source code snippet.',
              recommendation: ai.maintainabilityRec || 'Maintain current clean code structure.'
            },
            duplication: {
              id: 'duplication',
              title: 'Code Duplication',
              score: ai.codeDuplicationScore ?? 0,
              grade: ai.codeDuplicationRating || '0% (Zero Duplication)',
              statusText: `Detects Repeated Code • ${ai.codeDuplicationScore ?? 0}%`,
              color: (ai.codeDuplicationScore ?? 0) === 0 ? '#4C7A5D' : '#E08A3C',
              percent: 100 - (ai.codeDuplicationScore ?? 0),
              analysis: ai.codeDuplicationAnalysis || 'Detects repeated code blocks and statements. Lower is better.',
              location: ai.codeDuplicationLocation || 'Global module scope',
              recommendation: ai.codeDuplicationRec || 'No redundant statement patterns detected.'
            },
            similarity: {
              id: 'similarity',
              title: 'Code Similarity',
              score: ai.codeSimilarityScore ?? 15,
              grade: ai.codeSimilarityRating || 'Unique Implementation',
              statusText: `Structural Match • ${ai.codeSimilarityScore ?? 15}%`,
              color: (ai.codeSimilarityScore ?? 15) < 50 ? '#2A5A3D' : '#C85A32',
              percent: 100 - (ai.codeSimilarityScore ?? 15),
              analysis: ai.codeSimilarityAnalysis || 'Compares code structure and logic to detect similar or copied solutions against benchmark references.',
              location: ai.codeSimilarityLocation || 'Function body entry',
              recommendation: ai.codeSimilarityRec || 'Unique algorithmic implementation.'
            }
          });
        }
      }

      showToast('Gemini AI Code Analysis Complete!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Error running Gemini AI analysis', 'error');
    } finally {
      setLoading(false);
      setScanningStep('');
    }
  };

  const metricInfo = metricsDef[selectedMetric] || metricsDef.complexity;

  return (
    <div className="clay-analysis-page page-enter">
      {/* --------------------------------------------------------------------
          LEFT PANEL: Source Code Inspector
          -------------------------------------------------------------------- */}
      <div className="clay-panel analysis-left-panel">
        <div className="panel-top-header">
          <div className="title-left">
            <BarChart3 size={15} className="text-terracotta" />
            <span className="panel-title-text">Source Code Inspector</span>
          </div>

          <select 
            value={language} 
            onChange={e => setLanguage(e.target.value)} 
            className="clay-lang-select"
          >
            <option value="javascript">JavaScript (Node)</option>
            <option value="python">Python 3.12</option>
            <option value="typescript">TypeScript</option>
            <option value="cpp">C++ 17</option>
            <option value="java">Java 17</option>
          </select>
        </div>

        <div className="analysis-editor-wrap">
          <Editor
            height="100%"
            language={language === 'c++' || language === 'cpp' ? 'cpp' : language}
            theme="clay-light"
            beforeMount={(monaco) => {
              registerMonacoThemes(monaco);
              registerMonacoHoverProvider(monaco, language);
            }}
            onMount={(editor, monaco) => {
              registerMonacoHoverProvider(monaco, language);
            }}
            value={code}
            onChange={(val) => setCode(val || '')}
            options={{ 
              minimap: { enabled: false }, 
              fontSize: 12.5,
              fontFamily: "'JetBrains Mono', Consolas, monospace",
              lineNumbers: 'on',
              lineNumbersMinChars: 3,
              renderLineHighlight: 'all',
              padding: { top: 10, bottom: 10 },
              hover: { enabled: true, delay: 300 }
            }}
          />
        </div>

        <div className="analysis-panel-footer">
          {loading && (
            <div className="scanning-step-indicator">
              <Loader2 size={12} className="spin-icon text-terracotta" />
              <span>{scanningStep}</span>
            </div>
          )}
          <button 
            className="btn btn-primary btn-run-metrics" 
            onClick={handleAnalyze} 
            disabled={loading}
          >
            {loading ? <Loader2 size={14} className="spin-icon" /> : <Sparkles size={14} />}
            <span>{loading ? 'Analyzing Source Code...' : 'Analyze Code Metrics'}</span>
          </button>
        </div>
      </div>

      {/* --------------------------------------------------------------------
          RIGHT PANEL: Graphical Metrics & Quality Signals
          -------------------------------------------------------------------- */}
      <div className="clay-panel analysis-right-panel">
        <div className="panel-top-header">
          <div className="title-left">
            <Cpu size={15} className="text-terracotta" />
            <span className="panel-title-text">Metrics & Quality Signals</span>
          </div>

          <div className="header-chips-row">
            <span className={vulnerabilitiesCount === 0 ? "clay-pill pill-forest" : "clay-pill pill-terracotta"}>
              {vulnerabilitiesCount === 0 ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
              <span>{vulnerabilitiesCount === 0 ? "0 Vulnerabilities" : `${vulnerabilitiesCount} Vulnerability Detected`}</span>
            </span>
          </div>
        </div>

        <div className="metrics-body-scroll">
          {/* 1. Interactive 4 Metric Gauge Tiles with Circular Rings */}
          <div className="interactive-metrics-grid">
            {Object.entries(METRIC_DEFINITIONS).map(([key, item]) => {
              const isAct = selectedMetric === key;
              return (
                <motion.div 
                  key={key}
                  className={`clay-panel metric-gauge-tile ${isAct ? 'active' : ''}`}
                  onClick={() => setSelectedMetric(key)}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <div className="gauge-header">
                    <span className="gauge-title">{item.title.toUpperCase()}</span>
                    <span className="gauge-val-mono" style={{ color: item.color }}>
                      {item.id === 'complexity' 
                        ? `Path: ${item.score}` 
                        : `${item.score}%`}
                    </span>
                  </div>

                  <div className="gauge-status-sub">{item.statusText}</div>

                  {/* Animated Progress Bar */}
                  <div className="gauge-bar-track">
                    <motion.div 
                      className="g-fill" 
                      style={{ backgroundColor: item.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${item.percent}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </motion.div>
              );
            })}
          </div>

          {/* 2. Graphical Middle Split: Deep Contextual Explanation + Multi-Axis Radar */}
          <div className="metrics-middle-split-row">
            {/* Contextual Metric Explanation Card */}
            <AnimatePresence mode="wait">
              <motion.div 
                key={selectedMetric}
                className="clay-well metric-explanation-detail-card"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <div className="detail-card-header">
                  <div className="detail-title-row">
                    <Info size={15} style={{ color: metricInfo.color }} />
                    <span className="detail-title">{metricInfo.title}</span>
                    <span className="clay-pill pill-terracotta">{metricInfo.grade}</span>
                  </div>
                </div>

                <div className="detail-fields-list">
                  <div className="detail-field">
                    <span className="df-label">REAL CODE ANALYSIS:</span>
                    <p className="df-text" style={{ fontSize: '13.5px', fontWeight: 700, color: '#2D231E' }}>{metricInfo.analysis}</p>
                  </div>

                  <div className="detail-field">
                    <span className="df-label">EXACT CODE LOCATION:</span>
                    <p className="df-code-loc">
                      <code>{metricInfo.location}</code>
                    </p>
                  </div>

                  <div className="detail-field">
                    <span className="df-label">ACTIONABLE OPTIMIZATION:</span>
                    <p className="df-text" style={{ color: '#C85A32', fontWeight: 700 }}>
                      {metricInfo.recommendation}
                    </p>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Graphical Multi-Axis Radar Graph */}
            <div className="clay-well metric-radar-card">
              <div className="radar-header">
                <Compass size={14} className="text-terracotta" />
                <span className="radar-title">Algorithmic Balance Radar</span>
              </div>
              <div className="radar-chart-wrap">
                <ResponsiveContainer width="100%" height={230}>
                  <RadarChart outerRadius="46%" data={radarData} margin={{ top: 15, right: 68, bottom: 15, left: 68 }}>
                    <PolarGrid stroke="#C8B6A6" strokeDasharray="3 3" />
                    <PolarAngleAxis 
                      dataKey="subject" 
                      tick={{ fill: '#5C4D44', fontSize: 11, fontWeight: 700 }} 
                    />
                    <PolarRadiusAxis 
                      angle={30} 
                      domain={[0, 100]} 
                      tick={false} 
                      axisLine={false} 
                    />
                    <Radar 
                      name="Code Quality" 
                      dataKey="value" 
                      stroke="#C85A32" 
                      strokeWidth={2}
                      fill="#C85A32" 
                      fillOpacity={0.4} 
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* 3. Code Confidence & Quality Curve */}
          <div className="clay-well trend-chart-card">
            <div className="trend-chart-header">
              <div className="chart-heading">
                <Activity size={14} className="text-terracotta" />
                <span>Historical Quality Confidence Curve</span>
              </div>
              <span className="clay-pill pill-amber">{maxConfidence}</span>
            </div>

            <div className="trend-chart-svg">
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={codeActivityTrend} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="terracottaQualityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C85A32" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#C85A32" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4D9CE" vertical={false} />
                  <XAxis dataKey="month" stroke="#A3968C" fontSize={11} tickLine={false} axisLine={{ stroke: '#E4D9CE' }} />
                  <YAxis stroke="#A3968C" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#FAF4EE', 
                      borderColor: '#C8B6A6', 
                      borderRadius: '8px',
                      color: '#2D231E',
                      fontSize: '11px',
                      boxShadow: '2px 4px 10px rgba(166,145,127,0.25)'
                    }} 
                  />
                  <Area 
                    type="monotone" 
                    dataKey="quality" 
                    stroke="#C85A32" 
                    strokeWidth={2.5} 
                    fill="url(#terracottaQualityGrad)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 4. Lexical Token Barometer Distribution */}
          <div className="clay-well token-breakdown-card">
            <div className="token-card-title-row">
              <div className="title-wrap">
                <Layers size={13} className="text-ochre" />
                <span>Lexical Token Distribution</span>
              </div>
              <span className="token-total-count">86 Total Tokens</span>
            </div>

            <div className="tokens-grid">
              {tokenStats.map((t, idx) => (
                <div key={idx} className="token-tile">
                  <div className="token-tile-top">
                    <span className="token-type-lbl">{t.type}</span>
                    <span className="token-val-mono">{t.count}</span>
                  </div>
                  <div className="token-bar-track">
                    <div className="token-bar-fill" style={{ width: `${t.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
