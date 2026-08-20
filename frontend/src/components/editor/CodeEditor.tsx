import React, { useRef, useEffect } from 'react';
import Editor, { useMonaco } from '@monaco-editor/react';
import { useEditorStore } from '../../stores/editorStore';
import { registerMonacoThemes } from '../../utils/monacoThemes';

const CodeEditor: React.FC = () => {
  const { files, activeFileId, updateFileContent, stderr, compileOutput, executionStatus } = useEditorStore();
  const activeFile = files.find(f => f.id === activeFileId);
  const editorRef = useRef<any>(null);
  const monaco = useMonaco();
  const decorationsRef = useRef<string[]>([]);

  // Highlight compiler error lines in Monaco
  useEffect(() => {
    if (!editorRef.current || !monaco) return;

    const errorText = compileOutput?.stderr || stderr || '';
    if ((executionStatus === 'error' || executionStatus === 'compilation_error') && errorText) {
      let errLine: number | null = null;

      // Parse error line numbers from various compilers
      const pyMatch = errorText.match(/line\s+(\d+)/i);
      const gccMatch = errorText.match(/:(\d+):\d+:/);
      const javaMatch = errorText.match(/:(\d+):\s*error:/i);

      if (gccMatch) errLine = parseInt(gccMatch[1], 10);
      else if (pyMatch) errLine = parseInt(pyMatch[1], 10);
      else if (javaMatch) errLine = parseInt(javaMatch[1], 10);

      if (errLine && errLine > 0) {
        const range = new monaco.Range(errLine, 1, errLine, 100);
        decorationsRef.current = editorRef.current.deltaDecorations(
          decorationsRef.current,
          [
            {
              range,
              options: {
                isWholeLine: true,
                className: 'monaco-error-line-bg',
                glyphMarginClassName: 'monaco-error-glyph',
                linesDecorationsClassName: 'monaco-error-line-dec',
              },
            },
          ]
        );
        editorRef.current.revealLineInCenter(errLine);
        return;
      }
    }

    // Clear decorations on successful execution or reset
    decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
  }, [stderr, compileOutput, executionStatus, monaco]);

  if (!activeFile) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: 'var(--text-tertiary)',
        fontFamily: "var(--font-sans)",
        fontSize: '13px',
        backgroundColor: 'var(--bg-surface-sunken)'
      }}>
        Select a file from the explorer to begin editing
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', backgroundColor: 'var(--bg-surface-sunken)' }}>
      <Editor
        height="100%"
        path={activeFile.name}
        language={activeFile.language}
        value={activeFile.content}
        theme="clay-light"
        beforeMount={registerMonacoThemes}
        onMount={(editor) => { editorRef.current = editor; }}
        onChange={(val) => updateFileContent(activeFile.id, val || '')}
        options={{
          fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
          fontSize: 15.5,
          fontWeight: 'bold',
          lineHeight: 24,
          fontLigatures: true,
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          minimap: { enabled: true, maxColumn: 70, scale: 0.8 },
          bracketPairColorization: { enabled: true },
          guides: { bracketPairs: true, indentation: true },
          renderLineHighlight: 'all',
          renderWhitespace: 'selection',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 12, bottom: 12 },
          folding: true,
          tabSize: 2,
          wordWrap: 'on',
        }}
      />
    </div>
  );
};

export default CodeEditor;
