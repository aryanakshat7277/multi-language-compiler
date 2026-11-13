import React, { useState, useEffect } from 'react';
import FileExplorer from '../components/editor/FileExplorer';
import FileTabs from '../components/editor/FileTabs';
import Toolbar from '../components/editor/Toolbar';
import CodeEditor from '../components/editor/CodeEditor';
import OutputPanel from '../components/editor/OutputPanel';
import ResizeHandle from '../components/common/ResizeHandle';
import { PanelLeftClose, PanelLeftOpen, Maximize2, Minimize2, Code2, Terminal, FolderTree } from 'lucide-react';
import { useEditorStore } from '../stores/editorStore';
import './CompilerPage.css';

const CompilerPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(() => typeof window !== 'undefined' ? window.innerWidth > 768 : true);
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [terminalExpanded, setTerminalExpanded] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(220);
  const [mobileTab, setMobileTab] = useState<'code' | 'output' | 'files'>('code');

  const { executionStatus } = useEditorStore();
  const isRunning = executionStatus === 'submitted' || executionStatus === 'compiling' || executionStatus === 'running';

  // On mobile, auto-switch to output when code is executed
  useEffect(() => {
    if (isRunning) {
      if (typeof window !== 'undefined' && window.innerWidth <= 768) {
        setMobileTab('output');
      }
    }
  }, [isRunning]);

  const handleSidebarResize = (delta: number) => {
    setSidebarWidth(prev => Math.max(160, Math.min(500, prev + delta)));
  };

  const handleTerminalResize = (delta: number) => {
    // Dragging handle up increases height, dragging down decreases height
    setTerminalHeight(prev => Math.max(90, Math.min(650, prev - delta)));
  };

  return (
    <div className="compiler-page">
      {/* Mobile-only Segmented View Switcher (Hidden on Desktop) */}
      <div className="compiler-mobile-tabs">
        <button 
          className={`compiler-mobile-tab-btn ${mobileTab === 'code' ? 'active' : ''}`}
          onClick={() => setMobileTab('code')}
        >
          <Code2 size={16} />
          <span>Editor</span>
        </button>
        <button 
          className={`compiler-mobile-tab-btn ${mobileTab === 'output' ? 'active' : ''}`}
          onClick={() => setMobileTab('output')}
        >
          <Terminal size={16} />
          <span>Output</span>
          {isRunning && <span className="mobile-running-dot" />}
        </button>
        <button 
          className={`compiler-mobile-tab-btn ${mobileTab === 'files' ? 'active' : ''}`}
          onClick={() => setMobileTab('files')}
        >
          <FolderTree size={16} />
          <span>Files</span>
        </button>
      </div>

      {/* File Explorer Sidebar */}
      <div 
        className={`compiler-sidebar ${sidebarOpen ? 'open' : 'collapsed'} ${mobileTab === 'files' ? 'mobile-visible' : ''}`}
        style={{ width: sidebarOpen ? `${sidebarWidth}px` : undefined }}
      >
        <FileExplorer />
      </div>

      {/* Vertical Resize Handle for Sidebar (Desktop Only) */}
      {sidebarOpen && (
        <div className="desktop-resize-handle">
          <ResizeHandle 
            direction="vertical"
            onDrag={handleSidebarResize}
            onReset={() => setSidebarWidth(250)}
            title="Drag to resize File Explorer width (Double click to reset)"
          />
        </div>
      )}

      {/* Main IDE Workspace */}
      <div className="compiler-main">
        {/* Top Control Bar */}
        <div className="compiler-top">
          <div className="sidebar-toggle-bar">
            <button 
              className="sidebar-toggle-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? "Hide Explorer" : "Show Explorer"}
            >
              {sidebarOpen ? <PanelLeftClose size={15} /> : <PanelLeftOpen size={15} />}
            </button>
          </div>
          <div className="compiler-top-content">
            <Toolbar />
            <FileTabs />
          </div>
        </div>

        {/* Monaco Editor Container */}
        <div className={`compiler-editor ${terminalExpanded ? 'shrink' : ''} ${mobileTab === 'code' ? 'mobile-pane-active' : 'mobile-pane-hidden'}`}>
          <CodeEditor />
        </div>

        {/* Horizontal Resize Handle for Terminal (Desktop Only) */}
        {!terminalExpanded && (
          <div className="desktop-resize-handle">
            <ResizeHandle 
              direction="horizontal"
              onDrag={handleTerminalResize}
              onReset={() => setTerminalHeight(220)}
              title="Drag to resize Terminal height (Double click to reset)"
            />
          </div>
        )}

        {/* Bottom Execution Terminal */}
        <div 
          className={`compiler-bottom ${terminalExpanded ? 'expanded' : ''} ${mobileTab === 'output' ? 'mobile-pane-active' : 'mobile-pane-hidden'}`}
          style={{ height: terminalExpanded ? 'calc(100% - 45px)' : `${terminalHeight}px` }}
        >
          <div className="terminal-resize-bar">
            <button
              className="terminal-expand-btn"
              onClick={() => setTerminalExpanded(!terminalExpanded)}
              title={terminalExpanded ? "Restore Terminal" : "Maximize Terminal"}
            >
              {terminalExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
            </button>
          </div>
          <OutputPanel />
        </div>
      </div>
    </div>
  );
};

export default CompilerPage;
