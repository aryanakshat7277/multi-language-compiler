import React, { useState, useRef, useEffect } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { 
  GitBranch, Search, CornerDownRight, 
  Code2, Sparkles, Loader2, Layers, Cpu
} from 'lucide-react';
import { api } from '../services/api';
import { useToast } from '../contexts/ToastContext';
import { registerMonacoThemes } from '../utils/monacoThemes';
import './AstVisualizationPage.css';

interface AstNode {
  id: string;
  type: string;
  value?: string;
  loc?: { start: { line: number; column: number }; end: { line: number; column: number } };
  children?: AstNode[];
}

const DEFAULT_CODE = `function binarySearch(arr, target) {
  let left = 0;
  let right = arr.length - 1;

  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}`;

export default function AstVisualizationPage() {
  const [code, setCode] = useState(DEFAULT_CODE);
  const [language, setLanguage] = useState('javascript');
  const [selectedNode, setSelectedNode] = useState<AstNode | null>(null);
  const [filterQuery, setFilterQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(true);
  const editorRef = useRef<any>(null);
  const monaco = useMonaco();
  const decorationsRef = useRef<string[]>([]);
  const { showToast } = useToast();

  const [astTree, setAstTree] = useState<AstNode>({
    id: 'root-1',
    type: 'Program',
    value: 'binarySearch.js',
    loc: { start: { line: 1, column: 0 }, end: { line: 12, column: 1 } },
    children: [
      {
        id: 'func-1',
        type: 'FunctionDeclaration',
        value: 'binarySearch(arr, target)',
        loc: { start: { line: 1, column: 0 }, end: { line: 12, column: 1 } },
        children: [
          {
            id: 'param-1',
            type: 'Identifier (Param 1)',
            value: 'arr',
            loc: { start: { line: 1, column: 22 }, end: { line: 1, column: 25 } }
          },
          {
            id: 'param-2',
            type: 'Identifier (Param 2)',
            value: 'target',
            loc: { start: { line: 1, column: 27 }, end: { line: 1, column: 33 } }
          },
          {
            id: 'body-1',
            type: 'BlockStatement',
            loc: { start: { line: 1, column: 35 }, end: { line: 12, column: 1 } },
            children: [
              {
                id: 'var-1',
                type: 'VariableDeclaration',
                value: 'left = 0',
                loc: { start: { line: 2, column: 2 }, end: { line: 2, column: 15 } }
              },
              {
                id: 'var-2',
                type: 'VariableDeclaration',
                value: 'right = arr.length - 1',
                loc: { start: { line: 3, column: 2 }, end: { line: 3, column: 30 } }
              },
              {
                id: 'loop-1',
                type: 'WhileStatement',
                value: 'left <= right',
                loc: { start: { line: 5, column: 2 }, end: { line: 10, column: 3 } },
                children: [
                  {
                    id: 'if-1',
                    type: 'IfStatement',
                    value: 'arr[mid] === target',
                    loc: { start: { line: 7, column: 4 }, end: { line: 7, column: 40 } }
                  },
                  {
                    id: 'if-2',
                    type: 'IfStatement',
                    value: 'arr[mid] < target',
                    loc: { start: { line: 8, column: 4 }, end: { line: 9, column: 26 } }
                  }
                ]
              },
              {
                id: 'ret-1',
                type: 'ReturnStatement',
                value: '-1',
                loc: { start: { line: 11, column: 2 }, end: { line: 11, column: 12 } }
              }
            ]
          }
        ]
      }
    ]
  });

  const handleNodeSelect = (node: AstNode) => {
    setSelectedNode(node);

    if (node.loc && editorRef.current && monaco) {
      const range = new monaco.Range(
        node.loc.start.line,
        node.loc.start.column + 1,
        node.loc.end.line,
        node.loc.end.column + 1
      );

      decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current,
        [
          {
            range,
            options: {
              inlineClassName: 'monaco-ast-light-highlight',
              isWholeLine: false,
            },
          },
        ]
      );
      editorRef.current.revealRangeInCenter(range);
    }
  };

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await api.post('/ast/parse', { code, language });
      if (res && res.ast) {
        setAstTree(res.ast);
        showToast('Gemini AI AST Hierarchy parsed successfully!', 'success');
      } else if (res && res.astJson) {
        setAstTree(res.astJson);
        showToast('AST Hierarchy parsed successfully!', 'success');
      }
      setHasGenerated(true);
    } catch (e: any) {
      setHasGenerated(true);
      showToast(e.message || 'Error parsing AST tree', 'error');
    } finally {
      setLoading(false);
    }
  };

  const renderAstBranch = (node: AstNode, depth: number = 0) => {
    const isSelected = selectedNode?.id === node.id;
    const matchesFilter = filterQuery ? node.type.toLowerCase().includes(filterQuery.toLowerCase()) || (node.value && node.value.toLowerCase().includes(filterQuery.toLowerCase())) : true;

    return (
      <div key={node.id} className={`ast-tree-branch ${matchesFilter ? '' : 'filter-dim'}`}>
        <div 
          className={`ast-node-pill ${isSelected ? 'selected' : ''}`}
          onClick={() => handleNodeSelect(node)}
          style={{ marginLeft: `${depth * 18}px` }}
        >
          <CornerDownRight size={12} className="ast-indent-icon" />
          <span className="ast-node-type">{node.type}</span>
          {node.value && <span className="ast-node-val">"{node.value}"</span>}
          {node.loc && <span className="ast-node-loc">L{node.loc.start.line}</span>}
        </div>

        {node.children && node.children.map(child => renderAstBranch(child, depth + 1))}
      </div>
    );
  };

  return (
    <div className="light-ast-page page-enter">
      {/* Top Toolbar */}
      <div className="ast-top-toolbar">
        <div className="toolbar-left-brand">
          <GitBranch size={16} className="text-emerald" />
          <span className="ast-title-text">ABSTRACT SYNTAX TREE COMPILER IR</span>
        </div>

        <div className="ast-filter-search-box">
          <Search size={14} className="search-ico" />
          <input
            type="text"
            placeholder="Filter AST nodes..."
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            className="search-field"
          />
        </div>

        <div className="toolbar-right-actions">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="ast-lang-select"
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="typescript">TypeScript</option>
          </select>
          <button className="btn btn-primary btn-sm" onClick={handleGenerate} disabled={loading}>
            {loading ? <Loader2 size={13} className="spin-icon" /> : <Sparkles size={13} />}
            <span>Generate AST</span>
          </button>
        </div>
      </div>

      {/* Main Split: Left Source Code + Right AST Tree */}
      <div className="ast-main-split">
        {/* Left Editor */}
        <div className="ast-pane left-pane">
          <div className="pane-header">
            <Code2 size={14} className="text-sky" />
            <span>Source Code (Synchronized Highlighting)</span>
          </div>
          <div className="editor-fill">
            <Editor
              height="100%"
              language={language}
              theme="clay-light"
              beforeMount={registerMonacoThemes}
              value={code}
              onChange={(val) => setCode(val || '')}
              onMount={(editor) => { editorRef.current = editor; }}
              options={{
                minimap: { enabled: false },
                fontSize: 13.5,
                fontFamily: "'JetBrains Mono', Consolas, monospace",
                lineNumbers: 'on',
                padding: { top: 12 }
              }}
            />
          </div>
        </div>

        {/* Right Tree */}
        <div className="ast-pane right-pane">
          <div className="pane-header">
            <Layers size={14} className="text-sky" />
            <span>Abstract Syntax Tree</span>
          </div>

          {!hasGenerated && (
            <div className="empty-state-container">
              <div className="empty-state-circle sky">
                <GitBranch size={48} className="empty-state-icon" />
              </div>
              <h4 className="empty-state-title">No Syntax Tree Generated</h4>
              <p className="empty-state-desc">
                Click <strong>Generate AST</strong> to parse the source code into an interactive hierarchical syntax tree.
              </p>
            </div>
          )}

          {hasGenerated && (
            <div className="ast-tree-scroll-list">
              {renderAstBranch(astTree)}
            </div>
          )}

          {hasGenerated && selectedNode && (
            <div className="node-detail-dock">
              <div className="detail-node-name">Selected AST Node: <strong>{selectedNode.type}</strong></div>
              <div className="detail-node-meta">
                <span>Value: <code>{selectedNode.value || 'None'}</code></span>
                <span>Range: <code>{selectedNode.loc ? `L${selectedNode.loc.start.line}:${selectedNode.loc.start.column} → L${selectedNode.loc.end.line}:${selectedNode.loc.end.column}` : 'Auto'}</code></span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
