import React, { useState } from 'react';
import FileExplorer from '../components/editor/FileExplorer';
import FileTabs from '../components/editor/FileTabs';
import Toolbar from '../components/editor/Toolbar';
import CodeEditor from '../components/editor/CodeEditor';
import OutputPanel from '../components/editor/OutputPanel';
import ResizeHandle from '../components/common/ResizeHandle';
import { PanelLeftClose, PanelLeftOpen, Maximize2, Minimize2 } from 'lucide-react';
import './CompilerPage.css';

const CompilerPage: React.FC = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [terminalExpanded, setTerminalExpanded] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(220);

  const handleSidebarResize = (delta: number) => {
    setSidebarWidth(prev => Math.max(160, Math.min(500, prev + delta)));
  };

  const handleTerminalResize = (delta: number) => {
    // Dragging handle up increases height, dragging down decreases height
    setTerminalHeight(prev => Math.max(90, Math.min(650, prev - delta)));
  };

  return (
    <div className="compiler-page">
      {/* File Explorer Sidebar */}
      <div 
        className={`compiler-sidebar ${sidebarOpen ? 'open' : 'collapsed'}`}
        style={{ width: sidebarOpen ? `${sidebarWidth}px` : '0px' }}
      >
        <FileExplorer />
      </div>

      {/* Vertical Resize Handle for Sidebar */}
      {sidebarOpen && (
        <ResizeHandle 
          direction="vertical"
          onDrag={handleSidebarResize}
          onReset={() => setSidebarWidth(250)}
          title="Drag to resize File Explorer width (Double click to reset)"
        />
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
        <div className={`compiler-editor ${terminalExpanded ? 'shrink' : ''}`}>
          <CodeEditor />
        </div>

        {/* Horizontal Resize Handle for Terminal */}
        {!terminalExpanded && (
          <ResizeHandle 
            direction="horizontal"
            onDrag={handleTerminalResize}
            onReset={() => setTerminalHeight(220)}
            title="Drag to resize Terminal height (Double click to reset)"
          />
        )}

        {/* Bottom Execution Terminal */}
        <div 
          className={`compiler-bottom ${terminalExpanded ? 'expanded' : ''}`}
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
