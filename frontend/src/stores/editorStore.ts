import { create } from 'zustand';

export interface EditorFile {
  id: string;
  name: string;
  content: string;
  language: string;
  isDirty: boolean;
}

export interface TestResult {
  id: string;
  testNumber: number;
  status: 'passed' | 'failed' | 'error';
  time: number;
  memory: number;
  expected?: string;
  actual?: string;
}

export interface ExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  time: number;
  memory: number;
}

export type ExecutionStatus = 
  | 'idle' 
  | 'submitted' 
  | 'compiling' 
  | 'running' 
  | 'completed' 
  | 'error' 
  | 'compilation_error'
  | 'timeout'
  | 'cancelled'
  | 'service_unavailable';

export interface CompilationTraceMetadata {
  compilationId?: string;
  status?: string;
  stage?: string;
  queuePosition?: number;
  durationMs?: number;
  diagnostics?: Array<{ severity: string; message: string; code?: string }>;
  statistics?: { linesOfCode?: number; sourceSizeBytes?: number; peakMemoryMb?: number };
}

export interface CompileOutput {
  stdout: string;
  stderr: string;
  code: number;
}

export const STARTER_TEMPLATES: Record<string, { filename: string; content: string; language: string }> = {
  python: {
    filename: 'main.py',
    language: 'python',
    content: 'def main():\n    print("Hello, CodeForge!")\n\nif __name__ == "__main__":\n    main()\n'
  },
  c: {
    filename: 'main.c',
    language: 'c',
    content: '#include <stdio.h>\n\nint main() {\n    printf("Hello, CodeForge!\\n");\n    return 0;\n}\n'
  },
  cpp: {
    filename: 'main.cpp',
    language: 'cpp',
    content: '#include <iostream>\n\nint main() {\n    std::cout << "Hello, CodeForge!" << std::endl;\n    return 0;\n}\n'
  },
  java: {
    filename: 'Main.java',
    language: 'java',
    content: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, CodeForge!");\n    }\n}\n'
  },
  javascript: {
    filename: 'index.js',
    language: 'javascript',
    content: 'function main() {\n    console.log("Hello, CodeForge!");\n}\n\nmain();\n'
  },
  typescript: {
    filename: 'index.ts',
    language: 'typescript',
    content: 'const greeting: string = "Hello, CodeForge!";\nconsole.log(greeting);\n'
  },
  go: {
    filename: 'main.go',
    language: 'go',
    content: 'package main\n\nimport "fmt"\n\nfunc main() {\n    fmt.Println("Hello, CodeForge!")\n}\n'
  },
  rust: {
    filename: 'main.rs',
    language: 'rust',
    content: 'fn main() {\n    println!("Hello, CodeForge!");\n}\n'
  }
};

interface EditorState {
  files: EditorFile[];
  activeFileId: string | null;
  language: string;
  languageVersion: string;
  stdin: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  executionStatus: ExecutionStatus;
  executionTime: number | null;
  memoryUsed: number | null;
  jobId: string | null;
  testResults: TestResult[];
  analysisResults: any;
  compileOutput: CompileOutput | null;
  statusMessage: string;
  compilationMeta: CompilationTraceMetadata | null;
  
  addFile: (name: string) => void;
  removeFile: (id: string) => void;
  renameFile: (id: string, newName: string) => void;
  setActiveFile: (id: string) => void;
  updateFileContent: (id: string, content: string) => void;
  setLanguage: (lang: string) => void;
  setLanguageVersion: (version: string) => void;
  setStdin: (value: string) => void;
  setExecutionResult: (result: ExecutionResult) => void;
  setExecutionStatus: (status: ExecutionStatus, jobId?: string) => void;
  setStatusMessage: (msg: string) => void;
  setCompileOutput: (output: CompileOutput | null) => void;
  setCompilationMeta: (meta: CompilationTraceMetadata | null) => void;
  setFullResult: (result: {
    status: ExecutionStatus;
    stdout?: string;
    stderr?: string;
    exitCode?: number;
    executionTime?: number;
    compileOutput?: CompileOutput | null;
    statusMessage?: string;
    compilationMeta?: CompilationTraceMetadata | null;
  }) => void;
  resetOutput: () => void;
  resetEditor: () => void;
}

export const useEditorStore = create<EditorState>((set) => ({
  files: [{ 
    id: 'main', 
    name: STARTER_TEMPLATES.python.filename, 
    content: STARTER_TEMPLATES.python.content, 
    language: 'python', 
    isDirty: false 
  }],
  activeFileId: 'main',
  language: 'python',
  languageVersion: '*',
  stdin: '',
  stdout: '',
  stderr: '',
  exitCode: null,
  executionStatus: 'idle',
  executionTime: null,
  memoryUsed: null,
  jobId: null,
  testResults: [],
  analysisResults: null,
  compileOutput: null,
  statusMessage: '',
  compilationMeta: null,

  addFile: (name) => set((state) => {
    const ext = name.split('.').pop() || 'txt';
    const langMap: Record<string, string> = { 
      js: 'javascript', 
      ts: 'typescript', 
      py: 'python', 
      java: 'java', 
      cpp: 'cpp', 
      c: 'c', 
      go: 'go', 
      rs: 'rust' 
    };
    const newFile = { id: Date.now().toString(), name, content: '', language: langMap[ext] || 'plaintext', isDirty: false };
    return { files: [...state.files, newFile], activeFileId: newFile.id };
  }),
  
  removeFile: (id) => set((state) => {
    const newFiles = state.files.filter(f => f.id !== id);
    return { files: newFiles, activeFileId: state.activeFileId === id ? (newFiles[0]?.id || null) : state.activeFileId };
  }),

  renameFile: (id, newName) => set((state) => ({
    files: state.files.map(f => f.id === id ? { ...f, name: newName } : f)
  })),

  setActiveFile: (id) => set({ activeFileId: id }),

  updateFileContent: (id, content) => set((state) => ({
    files: state.files.map(f => f.id === id ? { ...f, content, isDirty: true } : f)
  })),

  setLanguage: (lang) => set((state) => {
    const tpl = STARTER_TEMPLATES[lang] || {
      filename: `main.${lang}`,
      content: '',
      language: lang
    };

    // If only 1 file exists or current active file matches default, update filename and content if not heavily edited
    const updatedFiles = state.files.map(f => {
      if (f.id === state.activeFileId || state.files.length === 1) {
        // If file is clean or matches old template, swap content and filename
        const isDefaultCode = Object.values(STARTER_TEMPLATES).some(t => t.content === f.content || f.content === '' || f.content.includes('Hello'));
        return {
          ...f,
          name: tpl.filename,
          language: tpl.language,
          content: isDefaultCode ? tpl.content : f.content
        };
      }
      return f;
    });

    return { 
      language: lang,
      files: updatedFiles
    };
  }),
  
  setLanguageVersion: (version) => set({ languageVersion: version }),
  
  setStdin: (value) => set({ stdin: value }),

  setExecutionResult: (result) => set({
    stdout: result.stdout,
    stderr: result.stderr,
    exitCode: result.exitCode,
    executionTime: result.time,
    memoryUsed: result.memory,
    executionStatus: result.exitCode === 0 ? 'completed' : 'error'
  }),

  setExecutionStatus: (status, jobId) => set((state) => ({ 
    executionStatus: status, 
    jobId: jobId !== undefined ? jobId : state.jobId 
  })),

  setStatusMessage: (msg) => set({ statusMessage: msg }),

  setCompileOutput: (output) => set({ compileOutput: output }),

  setCompilationMeta: (meta) => set({ compilationMeta: meta }),

  setFullResult: (result) => set({
    executionStatus: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.exitCode ?? null,
    executionTime: result.executionTime ?? null,
    compileOutput: result.compileOutput ?? null,
    statusMessage: result.statusMessage ?? '',
    compilationMeta: result.compilationMeta !== undefined ? result.compilationMeta : null
  }),

  resetOutput: () => set({
    stdout: '',
    stderr: '',
    exitCode: null,
    executionTime: null,
    memoryUsed: null,
    executionStatus: 'idle',
    testResults: [],
    compileOutput: null,
    statusMessage: ''
  }),

  resetEditor: () => set((state) => {
    const tpl = STARTER_TEMPLATES[state.language] || STARTER_TEMPLATES.python;
    return {
      files: [{ id: 'main', name: tpl.filename, content: tpl.content, language: tpl.language, isDirty: false }],
      activeFileId: 'main',
      stdout: '',
      stderr: '',
      exitCode: null,
      executionStatus: 'idle',
      testResults: [],
      compileOutput: null,
      statusMessage: ''
    };
  })
}));
