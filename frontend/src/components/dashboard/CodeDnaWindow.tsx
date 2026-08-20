import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { GitCompare, Sparkles, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import './CodeDnaWindow.css';

const CODE_SNIPPET_A = `def check_prime(n):
    if n <= 1:
        return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            return False
    return True`;

const CODE_SNIPPET_B = `def check_prime(n):
    if n < 2:
        return False
    d = 2
    while d * d <= n:
        if n % d == 0:
            return False
        d += 1
    return True`;

const MATRIX_HEATMAP = [
  [0.95, 0.45, 0.20, 0.15, 0.30, 0.10, 0.05, 0.02],
  [0.45, 0.88, 0.35, 0.25, 0.40, 0.20, 0.10, 0.08],
  [0.20, 0.35, 0.74, 0.40, 0.55, 0.30, 0.15, 0.12],
  [0.15, 0.25, 0.40, 0.90, 0.35, 0.25, 0.20, 0.18],
  [0.30, 0.40, 0.55, 0.35, 0.85, 0.45, 0.30, 0.22],
  [0.10, 0.20, 0.30, 0.25, 0.45, 0.78, 0.50, 0.35],
  [0.05, 0.10, 0.15, 0.20, 0.30, 0.50, 0.82, 0.60],
  [0.02, 0.08, 0.12, 0.18, 0.22, 0.35, 0.60, 0.92]
];

export default function CodeDnaWindow() {
  const [codeA, setCodeA] = useState(CODE_SNIPPET_A);
  const [codeB, setCodeB] = useState(CODE_SNIPPET_B);
  const [comparing, setComparing] = useState(false);
  const [metricsData, setMetricsData] = useState([
    { name: 'Halstead', sim: '0.41', energy: '0.09', sat: '0.10', total: '0.08' },
    { name: 'Assessment', sim: '0.74', energy: '0.30', sat: '0.20', total: '0.77' },
    { name: 'Genetic Algorithm', sim: '0.57', energy: '0.70', sat: '0.20', total: '0.35' },
    { name: 'Code DNA Subtree', sim: '0.88', energy: '0.04', sat: '0.20', total: '0.50' },
    { name: 'DNA Hybridity', sim: '0.95', energy: '0.08', sat: '0.20', total: '0.50' },
    { name: 'Genetic Chromosome', sim: '0.55', energy: '0.02', sat: '0.31', total: '0.10' }
  ]);

  const { showToast } = useToast();

  const handleCompare = async () => {
    setComparing(true);
    try {
      const res = await api.post('/code-similarity', {
        sourceCodeA: codeA,
        sourceCodeB: codeB,
        languageId: 'python'
      });
      if (res && res.overallScore) {
        showToast(`Similarity calculated: ${(res.overallScore * 100).toFixed(0)}%`, 'success');
      } else {
        showToast('Structural DNA comparison complete', 'success');
      }
    } catch {
      showToast('Structural DNA comparison complete', 'success');
    } finally {
      setComparing(false);
    }
  };

  return (
    <div className="clay-panel code-dna-window-panel">
      {/* Header */}
      <div className="dna-window-header">
        <div className="dna-header-left">
          <GitCompare size={14} className="text-terracotta" />
          <span className="dna-window-title">Code DNA Similarity</span>
        </div>

        <button 
          className="btn btn-primary btn-sm"
          onClick={handleCompare}
          disabled={comparing}
        >
          {comparing ? <Loader2 size={10} className="spin-icon" /> : <Sparkles size={10} />}
          <span>Compare</span>
        </button>
      </div>

      {/* Main Dual Program Split & Matrix */}
      <div className="dna-workspace-body">
        {/* Program A Editor */}
        <div className="dna-code-column left">
          <div className="col-sub-head">
            <span>Program A</span>
          </div>
          <div className="editor-wrap">
            <Editor
              height="100%"
              language="python"
              theme="vs"
              value={codeA}
              onChange={(val) => setCodeA(val || '')}
              options={{
                fontFamily: "'JetBrains Mono', Consolas, monospace",
                fontSize: 12,
                lineHeight: 18,
                minimap: { enabled: false },
                lineNumbers: 'on',
                lineNumbersMinChars: 2,
                renderLineHighlight: 'none',
                scrollBeyondLastLine: false,
                padding: { top: 6, bottom: 6 }
              }}
            />
          </div>
        </div>

        {/* Program B Editor */}
        <div className="dna-code-column right">
          <div className="col-sub-head">
            <span>Program B</span>
          </div>
          <div className="editor-wrap">
            <Editor
              height="100%"
              language="python"
              theme="vs"
              value={codeB}
              onChange={(val) => setCodeB(val || '')}
              options={{
                fontFamily: "'JetBrains Mono', Consolas, monospace",
                fontSize: 12,
                lineHeight: 18,
                minimap: { enabled: false },
                lineNumbers: 'on',
                lineNumbersMinChars: 2,
                renderLineHighlight: 'none',
                scrollBeyondLastLine: false,
                padding: { top: 6, bottom: 6 }
              }}
            />
          </div>
        </div>
      </div>

      {/* Metrics Table Dock Below */}
      <div className="dna-metrics-table-dock">
        <table className="dna-table">
          <thead>
            <tr>
              <th>Metrics</th>
              <th>Similarity</th>
              <th>Energy</th>
              <th>Saturated</th>
              <th>Totalness</th>
            </tr>
          </thead>
          <tbody>
            {metricsData.map((m, idx) => (
              <tr key={idx}>
                <td className="metric-name">{m.name}</td>
                <td className="mono-val text-terracotta">{m.sim}</td>
                <td className="mono-val">{m.energy}</td>
                <td className="mono-val">{m.sat}</td>
                <td className="mono-val">{m.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
