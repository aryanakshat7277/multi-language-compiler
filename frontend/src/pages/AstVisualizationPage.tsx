import React, { useState, useRef, useEffect } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { 
  GitBranch, Search, CornerDownRight, 
  Code2, Sparkles, Loader2, Layers, Cpu, AlertTriangle,
  Wrench, Info, CheckCircle2, Zap, HelpCircle
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

function smartSyntaxRepair(srcCode: string, lang: string, error: { message: string; line: number; column: number }): string {
  if (!srcCode) return srcCode;
  let lines = srcCode.split('\n');

  // 1. Balance curly braces { }
  const openBraces = (srcCode.match(/\{/g) || []).length;
  const closeBraces = (srcCode.match(/\}/g) || []).length;
  if (openBraces > closeBraces) {
    const missing = openBraces - closeBraces;
    return srcCode + '\n' + '}'.repeat(missing);
  } else if (closeBraces > openBraces) {
    const errIdx = Math.min(Math.max(0, error.line - 1), lines.length - 1);
    if (lines[errIdx] && lines[errIdx].includes('}')) {
      lines[errIdx] = lines[errIdx].replace('}', '');
      return lines.join('\n');
    }
  }

  // 2. Balance parentheses ( )
  const openParens = (srcCode.match(/\(/g) || []).length;
  const closeParens = (srcCode.match(/\)/g) || []).length;
  if (openParens > closeParens) {
    const errIdx = Math.min(Math.max(0, error.line - 1), lines.length - 1);
    if (lines[errIdx] !== undefined) {
      lines[errIdx] = lines[errIdx] + ')'.repeat(openParens - closeParens);
      return lines.join('\n');
    }
  }

  // 3. Balance square brackets [ ]
  const openBrackets = (srcCode.match(/\[/g) || []).length;
  const closeBrackets = (srcCode.match(/\]/g) || []).length;
  if (openBrackets > closeBrackets) {
    const errIdx = Math.min(Math.max(0, error.line - 1), lines.length - 1);
    if (lines[errIdx] !== undefined) {
      lines[errIdx] = lines[errIdx] + ']'.repeat(openBrackets - closeBrackets);
      return lines.join('\n');
    }
  }

  // 4. Missing string quote termination on error line
  const errIdx = Math.min(Math.max(0, error.line - 1), lines.length - 1);
  const targetLine = lines[errIdx] || '';
  const singleQuotes = (targetLine.match(/'/g) || []).length;
  const doubleQuotes = (targetLine.match(/"/g) || []).length;
  if (singleQuotes % 2 !== 0) {
    lines[errIdx] = targetLine + "'";
    return lines.join('\n');
  }
  if (doubleQuotes % 2 !== 0) {
    lines[errIdx] = targetLine + '"';
    return lines.join('\n');
  }

  // 5. If trailing dangling token on error line (e.g. repeated semicolon or stray comma)
  if (targetLine.trim().endsWith(',,') || targetLine.trim().endsWith(';;')) {
    lines[errIdx] = targetLine.replace(/([,;])\1+$/, '$1');
    return lines.join('\n');
  }

  return srcCode;
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
  const [syntaxError, setSyntaxError] = useState<{ message: string; line: number; column: number } | null>(null);
  const [isFixing, setIsFixing] = useState(false);
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

  const handleGenerate = async (codeToUse?: string) => {
    const src = typeof codeToUse === 'string' ? codeToUse : code;
    setLoading(true);
    setSyntaxError(null);
    try {
      const res = await api.post('/ast/parse', { code: src, language });

      if (res && res.success === false) {
        const line = res.line || 1;
        const col = res.column || 1;
        const msg = res.message || 'Syntax error in source code.';
        setSyntaxError({ message: msg, line, column: col });

        // Highlight error on Monaco editor
        if (editorRef.current && monaco) {
          const model = editorRef.current.getModel();
          if (model) {
            monaco.editor.setModelMarkers(model, 'ast-syntax-error', [
              {
                startLineNumber: line,
                startColumn: col,
                endLineNumber: line,
                endColumn: col + 10,
                message: msg,
                severity: monaco.MarkerSeverity.Error
              }
            ]);
            editorRef.current.revealLineInCenter(line);
          }
        }
        showToast(`⚠️ Syntax error at line ${line}: ${msg}`, 'error');
        setHasGenerated(true);
        return;
      }

      // If valid, clear editor markers
      if (editorRef.current && monaco) {
        const model = editorRef.current.getModel();
        if (model) {
          monaco.editor.setModelMarkers(model, 'ast-syntax-error', []);
        }
      }

      if (res && res.ast) {
        setAstTree(res.ast);
        showToast('✓ AST Hierarchy parsed successfully!', 'success');
      } else if (res && res.astJson) {
        setAstTree(res.astJson);
        showToast('✓ AST Hierarchy parsed successfully!', 'success');
      }
      setHasGenerated(true);
    } catch (e: any) {
      setHasGenerated(true);
      setSyntaxError({ message: e.message || 'Error parsing AST tree', line: 1, column: 1 });
      showToast(e.message || 'Error parsing AST tree', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleFixSyntaxError = async () => {
    if (!syntaxError) return;
    setIsFixing(true);
    showToast('Analyzing and repairing syntax error...', 'info');

    let repairedCode = '';

    // 1. Try AI-powered debugger / repair endpoint
    try {
      const res = await api.post<any>('/ai-review/debug', {
        sourceCode: code,
        languageId: language,
        errorMessage: `Line ${syntaxError.line}, Col ${syntaxError.column}: ${syntaxError.message}`
      });

      if (res && res.fix && typeof res.fix === 'string' && res.fix.trim().length > 0) {
        repairedCode = res.fix;
      }
    } catch (aiErr) {
      console.warn('AI debug endpoint error, using heuristic parser repair:', aiErr);
    }

    // 2. Intelligent deterministic fallback if AI didn't return code or errored
    if (!repairedCode || repairedCode.trim() === code.trim()) {
      repairedCode = smartSyntaxRepair(code, language, syntaxError);
    }

    if (repairedCode && repairedCode.trim() !== code.trim()) {
      setCode(repairedCode);
      if (editorRef.current) {
        editorRef.current.setValue(repairedCode);
      }
      showToast('✓ Syntax error fixed! Re-generating AST...', 'success');

      // Clear monaco error markers
      if (editorRef.current && monaco) {
        const model = editorRef.current.getModel();
        if (model) {
          monaco.editor.setModelMarkers(model, 'ast-syntax-error', []);
        }
      }

      // Automatically re-generate AST with the repaired code
      await handleGenerate(repairedCode);
    } else {
      showToast('Could not automatically determine safe fix for line ' + syntaxError.line, 'warning');
    }
    setIsFixing(false);
  };

  const getCauseBreakdown = () => {
    if (!syntaxError) return [];
    const msg = (syntaxError.message || '').toLowerCase();
    const points: { label: string; text: string; icon: string }[] = [];

    // Point 1: Grammatical Token Conflict
    if (msg.includes('unexpected token')) {
      points.push({
        label: 'Grammatical Token Conflict',
        text: `The ${language} parser encountered an unexpected token at Line ${syntaxError.line}, Column ${syntaxError.column}. In this grammatical context, the parser expected an identifier, operand, or closing delimiter instead of this symbol.`,
        icon: '🔴'
      });
    } else if (msg.includes('unterminated') || msg.includes('unclosed')) {
      points.push({
        label: 'Unterminated Literal or Delimiter',
        text: `A string literal, quotation mark, or delimiter was opened on or before Line ${syntaxError.line} but never terminated before encountering a newline or end-of-file.`,
        icon: '🔴'
      });
    } else {
      points.push({
        label: 'Syntax Specification Violation',
        text: `The source code at Line ${syntaxError.line} violates the formal Context-Free Grammar (CFG) specification for ${language}: "${syntaxError.message}".`,
        icon: '🔴'
      });
    }

    // Point 2: Scope & Delimiters
    const openB = (code.match(/\{/g) || []).length;
    const closeB = (code.match(/\}/g) || []).length;
    const openP = (code.match(/\(/g) || []).length;
    const closeP = (code.match(/\)/g) || []).length;
    const openBrackets = (code.match(/\[/g) || []).length;
    const closeBrackets = (code.match(/\]/g) || []).length;

    if (openB !== closeB) {
      points.push({
        label: 'Unbalanced Block Delimiters { }',
        text: `Detected ${openB} opening '{' vs ${closeB} closing '}'. An unclosed function, class, or control block leaves statement boundaries ambiguous, causing parser cascading errors.`,
        icon: '⚠️'
      });
    } else if (openP !== closeP) {
      points.push({
        label: 'Unbalanced Parentheses ( )',
        text: `Detected ${openP} opening '(' vs ${closeP} closing ')'. An unclosed parameter list, condition, or expression blocks statement completion.`,
        icon: '⚠️'
      });
    } else if (openBrackets !== closeBrackets) {
      points.push({
        label: 'Unbalanced Square Brackets [ ]',
        text: `Detected ${openBrackets} opening '[' vs ${closeBrackets} closing ']'. Array literals or index accessors remain open.`,
        icon: '⚠️'
      });
    } else {
      points.push({
        label: 'Statement Boundary Breakdown',
        text: `The compiler cannot establish statement termination or scope boundaries at Line ${syntaxError.line}. Check for misplaced punctuation or keywords.`,
        icon: '⚠️'
      });
    }

    // Point 3: Why AST Generation Fails
    points.push({
      label: 'AST Pipeline Invariant (Compiler Pre-Flight Requirement)',
      text: `An Abstract Syntax Tree (AST) represents unambiguous semantic hierarchies. When syntax is malformed, the Concrete Syntax Tree (CST) cannot be derived, preventing AST generation.`,
      icon: '🚫'
    });

    // Point 4: Remediation
    points.push({
      label: 'Recommended Remediation',
      text: `Inspect Line ${syntaxError.line} in the code editor, balance delimiter pairs, or click the "⚡ Fix Error Automatically" button to let the system repair the code and rebuild the AST.`,
      icon: '💡'
    });

    return points;
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

          {hasGenerated && syntaxError && (
            <div className="ast-error-card">
              <div className="ast-error-header">
                <div className="ast-error-title-wrap">
                  <AlertTriangle size={19} style={{ color: '#C85A32' }} />
                  <span>Cannot Build AST: Syntax Error Detected</span>
                </div>
                <button 
                  className="ast-quick-fix-btn"
                  onClick={handleFixSyntaxError}
                  disabled={isFixing}
                  title="Automatically fix syntax error and re-generate AST"
                >
                  {isFixing ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Fixing Syntax Error...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>⚡ Fix Error Automatically</span>
                    </>
                  )}
                </button>
              </div>

              <p style={{ margin: 0, fontSize: '13px', color: '#5C4E44', lineHeight: 1.5 }}>
                An Abstract Syntax Tree (AST) can only be generated for syntactically correct programs. The parser encountered a fatal syntax violation:
              </p>

              <div className="ast-error-badge">
                <span style={{ color: '#E87A50' }}>●</span>
                <span>Line {syntaxError.line}, Col {syntaxError.column}: {syntaxError.message}</span>
              </div>

              {/* Point-by-point cause breakdown */}
              <div className="ast-causes-container">
                <div className="ast-causes-heading">
                  <Info size={15} style={{ color: '#C85A32' }} />
                  <span>Root Cause Analysis & Compiler Diagnostics (Pointwise):</span>
                </div>
                <ul className="ast-causes-list">
                  {getCauseBreakdown().map((pt, idx) => (
                    <li key={idx} className="ast-cause-item">
                      <span className="ast-cause-bullet">{pt.icon}</span>
                      <div className="ast-cause-content">
                        <strong>{pt.label}:</strong> {pt.text}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="ast-actions-footer">
                <span className="ast-footer-hint">
                  💡 Fix the syntax error highlighted with the red marker in the left editor or click the fix button to repair automatically.
                </span>
                <button 
                  className="ast-action-fix-btn"
                  onClick={handleFixSyntaxError}
                  disabled={isFixing}
                >
                  {isFixing ? <Loader2 size={14} className="animate-spin" /> : <Wrench size={14} />}
                  <span>{isFixing ? 'Applying Fix...' : 'Apply Automated Fix & Re-Generate AST'}</span>
                </button>
              </div>
            </div>
          )}

          {hasGenerated && !syntaxError && astTree && (
            <div className="ast-tree-scroll-list">
              {renderAstBranch(astTree)}
            </div>
          )}

          {hasGenerated && !syntaxError && selectedNode && (
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
