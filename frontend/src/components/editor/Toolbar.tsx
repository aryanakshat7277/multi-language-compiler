import React, { useEffect, useState, useCallback } from 'react';
import { Play, Square, RotateCcw, Loader2, Sparkles, CheckCircle, Cpu } from 'lucide-react';
import { useEditorStore } from '../../stores/editorStore';
import { api } from '../../services/api';
import { wsService } from '../../services/websocket';
import './Toolbar.css';

interface LanguageOption {
  id: string;
  displayName: string;
  pistonLanguage: string;
  pistonVersion: string;
  fileExtension: string;
  defaultFilename: string;
  enabled: boolean;
}

const FALLBACK_LANGUAGES: LanguageOption[] = [
  { id: 'python', displayName: 'Python 3.14', pistonLanguage: 'python', pistonVersion: '3.10', fileExtension: '.py', defaultFilename: 'main.py', enabled: true },
  { id: 'javascript', displayName: 'JavaScript (Node 24)', pistonLanguage: 'javascript', pistonVersion: '18', fileExtension: '.js', defaultFilename: 'index.js', enabled: true },
  { id: 'typescript', displayName: 'TypeScript 5', pistonLanguage: 'typescript', pistonVersion: '5', fileExtension: '.ts', defaultFilename: 'index.ts', enabled: true },
  { id: 'cpp', displayName: 'C++ 17', pistonLanguage: 'c++', pistonVersion: '17', fileExtension: '.cpp', defaultFilename: 'main.cpp', enabled: true },
  { id: 'c', displayName: 'C 11', pistonLanguage: 'c', pistonVersion: '11', fileExtension: '.c', defaultFilename: 'main.c', enabled: true },
  { id: 'java', displayName: 'Java 17', pistonLanguage: 'java', pistonVersion: '17', fileExtension: '.java', defaultFilename: 'Main.java', enabled: true },
  { id: 'go', displayName: 'Go 1.20', pistonLanguage: 'go', pistonVersion: '1.20', fileExtension: '.go', defaultFilename: 'main.go', enabled: true },
  { id: 'rust', displayName: 'Rust 1.70', pistonLanguage: 'rust', pistonVersion: '1.70', fileExtension: '.rs', defaultFilename: 'main.rs', enabled: true },
];

const Toolbar: React.FC = () => {
  const {
    language, executionStatus, files, stdin,
    setLanguage, setExecutionStatus, setStatusMessage,
    setFullResult, resetOutput, resetEditor
  } = useEditorStore();

  const [languages, setLanguages] = useState<LanguageOption[]>(FALLBACK_LANGUAGES);
  const [isLoadingLangs, setIsLoadingLangs] = useState(false);

  // Fetch available languages on mount
  useEffect(() => {
    const fetchLanguages = async () => {
      setIsLoadingLangs(true);
      try {
        const data = await api.get<LanguageOption[]>('/compiler/languages');
        if (Array.isArray(data) && data.length > 0) {
          setLanguages(data);
        }
      } catch {
        // Fallback to defaults
      } finally {
        setIsLoadingLangs(false);
      }
    };
    fetchLanguages();
  }, []);

  const isRunning = executionStatus === 'submitted' || executionStatus === 'compiling' || executionStatus === 'running';

  const handleRun = useCallback(async () => {
    if (isRunning) return;

    resetOutput();
    setExecutionStatus('submitted');
    setStatusMessage('Initiating execution...');

    const codeFiles = files.map(f => ({ name: f.name, content: f.content }));
    const selectedLang = languages.find(l => l.id === language);

    try {
      const result = await api.post<any>('/compiler/execute', {
        language: selectedLang?.pistonLanguage || language,
        version: selectedLang?.pistonVersion || '*',
        files: codeFiles,
        stdin: stdin || '',
      });

      // WebSocket listener
      if (result.executionId) {
        wsService.connect();
        wsService.subscribeToJob(result.executionId, (update: any) => {
          if (update.status === 'COMPILING') {
            setExecutionStatus('compiling');
            setStatusMessage('Compiling program...');
          } else if (update.status === 'RUNNING') {
            setExecutionStatus('running');
            setStatusMessage('Executing program...');
          } else if (update.data) {
            handleFinalResult(update.data);
            wsService.unsubscribe(result.executionId);
          }
        });
      }

      // Synchronous response
      if (result.status) {
        handleFinalResult(result);
      }
    } catch (err: any) {
      const isFetchErr = err.message === 'Failed to fetch' || err.message?.includes('fetch');
      setFullResult({
        status: 'error',
        stderr: isFetchErr 
          ? 'Backend connection error (Failed to fetch). The backend server on port 3001 is reconnecting. Please try again.' 
          : (err.message || 'Execution error occurred'),
        statusMessage: isFetchErr ? 'Backend Server Reconnecting' : 'Execution Failed',
      });
    }
  }, [files, language, languages, stdin, isRunning, resetOutput, setExecutionStatus, setStatusMessage, setFullResult]);

  // Keyboard shortcut: Ctrl+Enter / Cmd+Enter to run code
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRun();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRun]);

  const handleFinalResult = (result: any) => {
    const runOut = result.run;
    const compileOut = result.compile;

    if (result.status === 'COMPILATION_ERROR') {
      setFullResult({
        status: 'compilation_error',
        stderr: compileOut?.stderr || 'Compilation failed',
        stdout: compileOut?.stdout || '',
        exitCode: compileOut?.code ?? 1,
        compileOutput: compileOut || null,
        statusMessage: 'Compilation Error',
      });
    } else if (result.status === 'TIME_LIMIT_EXCEEDED') {
      setFullResult({
        status: 'timeout',
        stdout: runOut?.stdout || '',
        stderr: runOut?.stderr || 'Execution timed out',
        exitCode: runOut?.code ?? -1,
        compileOutput: compileOut || null,
        statusMessage: 'Time Limit Exceeded',
      });
    } else if (result.status === 'RUNTIME_ERROR') {
      setFullResult({
        status: 'error',
        stdout: runOut?.stdout || '',
        stderr: runOut?.stderr || 'Runtime error',
        exitCode: runOut?.code ?? 1,
        compileOutput: compileOut || null,
        statusMessage: `Runtime Error (code ${runOut?.code ?? '1'})`,
      });
    } else if (result.status === 'SUCCESS') {
      setFullResult({
        status: 'completed',
        stdout: runOut?.stdout || '',
        stderr: runOut?.stderr || '',
        exitCode: runOut?.code ?? 0,
        executionTime: result.executionTimeMs,
        compileOutput: compileOut || null,
        statusMessage: `Execution Succeeded (${result.executionTimeMs ?? 0}ms)`,
      });
    } else {
      setFullResult({
        status: runOut?.code === 0 ? 'completed' : 'error',
        stdout: runOut?.stdout || result.stdout || '',
        stderr: runOut?.stderr || result.stderr || '',
        exitCode: runOut?.code ?? result.exitCode ?? null,
        compileOutput: compileOut || null,
        statusMessage: runOut?.code === 0 ? 'Completed' : 'Failed',
      });
    }
  };

  const handleCancel = () => {
    setFullResult({
      status: 'cancelled',
      statusMessage: 'Execution halted by user',
    });
  };

  return (
    <div className="toolbar">
      <div className="toolbar-left">
        <div className="lang-select-wrapper">
          <Cpu size={14} className="lang-icon" />
          <select
            className="lang-select"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={isRunning || isLoadingLangs}
          >
            {languages.filter(l => l.enabled).map(l => (
              <option key={l.id} value={l.id}>{l.displayName}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="toolbar-right">
        {isRunning && (
          <div className="running-indicator">
            <Loader2 size={13} className="spin-icon" />
            <span>
              {executionStatus === 'submitted' && 'Starting...'}
              {executionStatus === 'compiling' && 'Compiling...'}
              {executionStatus === 'running' && 'Running...'}
            </span>
          </div>
        )}

        <button 
          className="btn btn-secondary btn-icon-only" 
          onClick={resetEditor} 
          title="Reset to starter code"
          disabled={isRunning}
        >
          <RotateCcw size={14} />
        </button>

        {isRunning ? (
          <button className="btn btn-danger btn-run" onClick={handleCancel}>
            <Square size={13} />
            <span>Stop</span>
          </button>
        ) : (
          <button className="btn btn-primary btn-run" onClick={handleRun} title="Run Code (Ctrl + Enter)">
            <Play size={13} className="fill-current" />
            <span>Run Code</span>
            <kbd className="kbd-shortcut">Ctrl+↵</kbd>
          </button>
        )}

        <button className="btn btn-secondary btn-submit" disabled={isRunning}>
          <CheckCircle size={14} />
          <span>Submit</span>
        </button>
      </div>
    </div>
  );
};

export default Toolbar;
