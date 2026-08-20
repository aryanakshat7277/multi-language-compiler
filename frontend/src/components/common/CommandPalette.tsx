import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, CheckCircle, Brain, BarChart3, Terminal, 
  Code2, GitBranch, GitCompare, User, Search, 
  Keyboard, Sparkles, FolderCode, ArrowRight, X
} from 'lucide-react';
import { useEditorStore } from '../../stores/editorStore';
import { useToast } from '../../contexts/ToastContext';
import './CommandPalette.css';

interface CommandItem {
  id: string;
  title: string;
  category: 'Actions' | 'Navigation' | 'Languages' | 'AI Intelligence';
  icon: React.ReactNode;
  shortcut?: string;
  action: () => void;
}

export const CommandPalette: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { setLanguage } = useEditorStore();
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const commands: CommandItem[] = [
    // Actions
    {
      id: 'run-code',
      title: 'Run Current Code',
      category: 'Actions',
      icon: <Play size={14} className="cmd-icon-emerald" />,
      shortcut: 'Ctrl+Enter',
      action: () => {
        navigate('/compiler');
        // Dispatch run event
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', ctrlKey: true }));
        onClose();
      }
    },
    {
      id: 'open-problems',
      title: 'Browse Problem Archive',
      category: 'Navigation',
      icon: <Code2 size={14} className="cmd-icon-accent" />,
      shortcut: 'P',
      action: () => { navigate('/problems'); onClose(); }
    },
    {
      id: 'open-compiler',
      title: 'Open Full Compiler IDE',
      category: 'Navigation',
      icon: <Terminal size={14} className="cmd-icon-accent" />,
      shortcut: 'C',
      action: () => { navigate('/compiler'); onClose(); }
    },
    {
      id: 'open-ai-review',
      title: 'AI Code Review & Mentor',
      category: 'AI Intelligence',
      icon: <Brain size={14} className="cmd-icon-purple" />,
      shortcut: 'Alt+E',
      action: () => { navigate('/ai-review'); onClose(); }
    },
    {
      id: 'open-analysis',
      title: 'Code Metrics & Quality Analysis',
      category: 'AI Intelligence',
      icon: <BarChart3 size={14} className="cmd-icon-amber" />,
      shortcut: 'Alt+A',
      action: () => { navigate('/analysis'); onClose(); }
    },
    {
      id: 'open-ast',
      title: 'AST Syntax Tree Explorer',
      category: 'AI Intelligence',
      icon: <GitBranch size={14} className="cmd-icon-cyan" />,
      action: () => { navigate('/ast'); onClose(); }
    },
    {
      id: 'open-similarity',
      title: 'Code DNA Similarity Detector',
      category: 'AI Intelligence',
      icon: <GitCompare size={14} className="cmd-icon-rose" />,
      action: () => { navigate('/similarity'); onClose(); }
    },
    {
      id: 'open-submissions',
      title: 'View My Submissions',
      category: 'Navigation',
      icon: <CheckCircle size={14} className="cmd-icon-emerald" />,
      action: () => { navigate('/submissions'); onClose(); }
    },
    {
      id: 'open-profile',
      title: 'Developer Profile & Skill Graph',
      category: 'Navigation',
      icon: <User size={14} className="cmd-icon-accent" />,
      action: () => { navigate('/profile'); onClose(); }
    },
    // Language quick switchers
    {
      id: 'lang-python',
      title: 'Switch Language: Python 3.14',
      category: 'Languages',
      icon: <span className="cmd-emoji">🐍</span>,
      action: () => {
        setLanguage('python');
        showToast('Language switched to Python 3.14', 'success');
        navigate('/compiler');
        onClose();
      }
    },
    {
      id: 'lang-cpp',
      title: 'Switch Language: C++ 17',
      category: 'Languages',
      icon: <span className="cmd-emoji">🔷</span>,
      action: () => {
        setLanguage('cpp');
        showToast('Language switched to C++ 17', 'success');
        navigate('/compiler');
        onClose();
      }
    },
    {
      id: 'lang-java',
      title: 'Switch Language: Java 17',
      category: 'Languages',
      icon: <span className="cmd-emoji">☕</span>,
      action: () => {
        setLanguage('java');
        showToast('Language switched to Java 17', 'success');
        navigate('/compiler');
        onClose();
      }
    },
    {
      id: 'lang-js',
      title: 'Switch Language: JavaScript (Node 24)',
      category: 'Languages',
      icon: <span className="cmd-emoji">🟨</span>,
      action: () => {
        setLanguage('javascript');
        showToast('Language switched to JavaScript', 'success');
        navigate('/compiler');
        onClose();
      }
    },
    {
      id: 'lang-ts',
      title: 'Switch Language: TypeScript 5',
      category: 'Languages',
      icon: <span className="cmd-emoji">🟦</span>,
      action: () => {
        setLanguage('typescript');
        showToast('Language switched to TypeScript 5', 'success');
        navigate('/compiler');
        onClose();
      }
    },
    {
      id: 'lang-rust',
      title: 'Switch Language: Rust 1.70',
      category: 'Languages',
      icon: <span className="cmd-emoji">🦀</span>,
      action: () => {
        setLanguage('rust');
        showToast('Language switched to Rust', 'success');
        navigate('/compiler');
        onClose();
      }
    },
    {
      id: 'lang-go',
      title: 'Switch Language: Go 1.20',
      category: 'Languages',
      icon: <span className="cmd-emoji">🐹</span>,
      action: () => {
        setLanguage('go');
        showToast('Language switched to Go', 'success');
        navigate('/compiler');
        onClose();
      }
    },
  ];

  const filtered = commands.filter((cmd) =>
    cmd.title.toLowerCase().includes(query.toLowerCase()) ||
    cmd.category.toLowerCase().includes(query.toLowerCase())
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filtered.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filtered.length) % Math.max(1, filtered.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].action();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="cmd-backdrop" onClick={onClose}>
      <div className="cmd-palette" onClick={(e) => e.stopPropagation()}>
        {/* Search Header */}
        <div className="cmd-header">
          <Search size={16} className="cmd-search-icon" />
          <input
            ref={inputRef}
            type="text"
            className="cmd-input"
            placeholder="Type a command or search workspace..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <kbd className="cmd-esc-tag">ESC</kbd>
        </div>

        {/* Results List */}
        <div className="cmd-list" ref={listRef}>
          {filtered.length === 0 ? (
            <div className="cmd-empty">No matching commands found</div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={item.id}
                  className={`cmd-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => item.action()}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <div className="cmd-item-left">
                    <span className="cmd-icon-wrap">{item.icon}</span>
                    <span className="cmd-item-title">{item.title}</span>
                  </div>
                  <div className="cmd-item-right">
                    <span className="cmd-category-tag">{item.category}</span>
                    {item.shortcut && <kbd className="cmd-key-tag">{item.shortcut}</kbd>}
                    <ArrowRight size={12} className="cmd-arrow" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="cmd-footer">
          <span>Navigation: <kbd>↑</kbd> <kbd>↓</kbd></span>
          <span>Execute: <kbd>↵</kbd></span>
          <span>Close: <kbd>ESC</kbd></span>
        </div>
      </div>
    </div>
  );
};
