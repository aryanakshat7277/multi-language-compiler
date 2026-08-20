import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Folder, FolderOpen, FileCode, Play, CheckCircle2, 
  ChevronRight, ChevronDown, Terminal, Plus, HelpCircle
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
import { useCode } from '../../contexts/CodeContext';
import { registerMonacoThemes } from '../../utils/monacoThemes';
import { registerMonacoHoverProvider } from '../../utils/monacoHoverProvider';
import './IdeWindow.css';

export default function IdeWindow() {
  const [activeTab, setActiveTab] = useState<'python' | 'java' | 'js'>('python');
  const { code, setCode, language, setLanguage } = useCode();
  const [showTooltip, setShowTooltip] = useState(false);
  const [activeConsoleTab, setActiveConsoleTab] = useState<'output' | 'terminal'>('output');
  const [running, setRunning] = useState(false);
  const [consoleOutput, setConsoleOutput] = useState('➜ $ python main.py\n✓ Process finished successfully (Execution time: 24ms, Memory: 12.4MB)\nGenetic Result: Optimized Candidate');

  const { showToast } = useToast();

  const getFileName = (lang: string) => {
    if (lang === 'python' || lang === 'python3') return 'main.py';
    if (lang === 'java') return 'Main.java';
    if (lang === 'cpp' || lang === 'c++') return 'main.cpp';
    if (lang === 'typescript' || lang === 'ts') return 'main.ts';
    return 'main.js';
  };

  const handleRunCode = async () => {
    setRunning(true);
    setConsoleOutput(`➜ Executing ${language} code via Compiler Host Engine...\n`);
    try {
      const fileName = getFileName(language);
      const res = await api.post('/compiler/execute', {
        language: language,
        files: [{ name: fileName, content: code }]
      });

      if (res && (res.run || res.compile)) {
        const out = res.run?.stdout || res.compile?.stdout || '';
        const err = res.run?.stderr || res.compile?.stderr || '';
        setConsoleOutput(`➜ Process finished (Status: ${res.status || 'COMPLETED'}, Time: ${res.executionTimeMs || 0}ms)\n${out}${err ? '\nErrors/Warnings:\n' + err : ''}`);
        showToast(`Execution finished: ${res.status || 'COMPLETED'}`, 'success');
      } else {
        setConsoleOutput(`➜ Process finished (Status: COMPLETED, Time: 24ms)\nCode executed successfully.`);
        showToast('Code executed successfully', 'success');
      }
    } catch (e: any) {
      setConsoleOutput(`➜ Execution Error:\n${e.message || 'Server error during execution'}`);
      showToast(e.message || 'Execution error', 'error');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="clay-panel ide-window-panel">
      {/* Window Header Toolbar */}
      <div className="ide-window-header">
        <div className="header-left-title">
          <Terminal size={14} className="text-ochre" />
          <span className="window-title-text">Compiler IDE</span>
        </div>

        <div className="header-actions-row">
          <select 
            value={language} 
            onChange={(e) => setLanguage(e.target.value)}
            className="clay-lang-select"
          >
            <option value="python">Python 3.12</option>
            <option value="java">Java 17</option>
            <option value="javascript">JavaScript</option>
            <option value="cpp">C++ 17</option>
          </select>

          <button 
            className="btn btn-primary btn-sm"
            onClick={handleRunCode}
            disabled={running}
          >
            <Play size={11} fill="currentColor" />
            <span>{running ? 'Running...' : 'Run Code'}</span>
          </button>

          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => showToast('Submission queued for evaluation', 'info')}
          >
            <CheckCircle2 size={11} />
            <span>Submit</span>
          </button>

          <button 
            className={`btn-tooltip-toggle ${showTooltip ? 'active' : ''}`}
            onClick={() => setShowTooltip(!showTooltip)}
            title="Toggle code annotation helper"
          >
            <HelpCircle size={13} />
          </button>
        </div>
      </div>

      {/* Main IDE Workspace */}
      <div className="ide-workspace-body">
        {/* Left Sub-Rail: File Explorer */}
        <div className="ide-file-tree-rail">
          <div className="file-tree-header">
            <span>FILES (3)</span>
            <button className="add-file-btn" title="Add File"><Plus size={11} /></button>
          </div>

          <div className="file-tree-list">
            <div className="tree-item folder open">
              <ChevronDown size={11} className="chevron-ico" />
              <FolderOpen size={12} className="folder-ico" />
              <span>Python</span>
            </div>
            <div className="tree-sub-group">
              <div className="tree-item folder">
                <ChevronRight size={11} className="chevron-ico" />
                <Folder size={12} className="folder-ico" />
                <span>tests</span>
              </div>
              <div className="tree-sub-group">
                <div className="tree-item file">
                  <FileCode size={11} className="file-ico" />
                  <span>main.py</span>
                </div>
                <div className="tree-item file">
                  <FileCode size={11} className="file-ico" />
                  <span>best_time.py</span>
                </div>
              </div>
            </div>

            <div className="tree-item file active">
              <FileCode size={11} className="file-ico" />
              <span>Main.java</span>
            </div>
            <div className="tree-item file">
              <FileCode size={11} className="file-ico" />
              <span>index.js</span>
            </div>
          </div>
        </div>

        {/* Right Editor Area */}
        <div className="ide-editor-container">
          {/* Tab Bar */}
          <div className="ide-tabs-bar">
            <button 
              className={`ide-tab ${activeTab === 'python' ? 'active' : ''}`}
              onClick={() => setActiveTab('python')}
            >
              <span>main.py</span>
            </button>
            <button 
              className={`ide-tab ${activeTab === 'java' ? 'active' : ''}`}
              onClick={() => setActiveTab('java')}
            >
              <span>Main.java</span>
              <span className="tab-dirty-dot" />
            </button>
            <button 
              className={`ide-tab ${activeTab === 'js' ? 'active' : ''}`}
              onClick={() => setActiveTab('js')}
            >
            </button>
          </div>
          {/* Monaco Editor */}
          <div className="editor-relative-wrap">
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
                fontFamily: "'JetBrains Mono', Consolas, monospace",
                fontSize: 13,
                lineHeight: 20,
                minimap: { enabled: false },
                lineNumbers: 'on',
                lineNumbersMinChars: 3,
                renderLineHighlight: 'all',
                scrollBeyondLastLine: false,
                padding: { top: 8, bottom: 8 },
                hover: { enabled: true, delay: 300 }
              }}
            />

            {/* Interactive Floating Hover Tooltip */}
            {showTooltip && (
              <div className="monaco-floating-tooltip">
                <div className="tooltip-badge">Annotation</div>
                <div className="tooltip-title">class GeneticAlgorithm</div>
                <p className="tooltip-desc">
                  Heuristic optimization loop using fitness scoring and iterative population selection.
                </p>
                <button className="tooltip-close" onClick={() => setShowTooltip(false)}>×</button>
              </div>
            )}
          </div>

          {/* Bottom Console Tabs */}
          <div className="ide-console-dock">
            <div className="console-tabs-row">
              <button 
                className={`c-tab ${activeConsoleTab === 'output' ? 'active' : ''}`}
                onClick={() => setActiveConsoleTab('output')}
              >
                Output
              </button>
              <button 
                className={`c-tab ${activeConsoleTab === 'terminal' ? 'active' : ''}`}
                onClick={() => setActiveConsoleTab('terminal')}
              >
                Terminal
              </button>
            </div>
            <div className="console-body">
              <pre className="c-output-text">{consoleOutput}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
