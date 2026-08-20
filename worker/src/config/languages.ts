export interface LanguageConfig {
  id: string;
  displayName: string;
  extension: string;
  compileCmd?: string;
  runCmd: string;
  compileRequired: boolean;
  memoryLimitMb: number;
  timeLimitMs: number;
  mainFile: string;
}

export const languages: Record<string, LanguageConfig> = {
  c: {
    id: 'c',
    displayName: 'C (GCC)',
    extension: '.c',
    compileCmd: 'gcc {file} -o {output} -Wall -O2',
    runCmd: './{output}',
    compileRequired: true,
    memoryLimitMb: 256,
    timeLimitMs: 5000,
    mainFile: 'main.c'
  },
  cpp: {
    id: 'cpp',
    displayName: 'C++ (G++)',
    extension: '.cpp',
    compileCmd: 'g++ {file} -o {output} -std=c++17 -Wall -O2',
    runCmd: './{output}',
    compileRequired: true,
    memoryLimitMb: 256,
    timeLimitMs: 5000,
    mainFile: 'main.cpp'
  },
  java: {
    id: 'java',
    displayName: 'Java (OpenJDK 17)',
    extension: '.java',
    compileCmd: 'javac {file}',
    runCmd: 'java -Xmx{memory}m {className}',
    compileRequired: true,
    memoryLimitMb: 512,
    timeLimitMs: 8000,
    mainFile: 'Main.java'
  },
  python: {
    id: 'python',
    displayName: 'Python 3',
    extension: '.py',
    runCmd: 'python3 -u {file}',
    compileRequired: false,
    memoryLimitMb: 256,
    timeLimitMs: 5000,
    mainFile: 'main.py'
  },
  javascript: {
    id: 'javascript',
    displayName: 'JavaScript (Node.js)',
    extension: '.js',
    runCmd: 'node {file}',
    compileRequired: false,
    memoryLimitMb: 256,
    timeLimitMs: 5000,
    mainFile: 'main.js'
  },
  typescript: {
    id: 'typescript',
    displayName: 'TypeScript',
    extension: '.ts',
    compileCmd: 'npx tsc {file} --outDir /workspace',
    runCmd: 'node {output}',
    compileRequired: true,
    memoryLimitMb: 256,
    timeLimitMs: 5000,
    mainFile: 'main.ts'
  },
  go: {
    id: 'go',
    displayName: 'Go',
    extension: '.go',
    compileCmd: 'go build -o {output} {file}',
    runCmd: './{output}',
    compileRequired: true,
    memoryLimitMb: 256,
    timeLimitMs: 5000,
    mainFile: 'main.go'
  },
  rust: {
    id: 'rust',
    displayName: 'Rust',
    extension: '.rs',
    compileCmd: 'rustc {file} -o {output} -O',
    runCmd: './{output}',
    compileRequired: true,
    memoryLimitMb: 256,
    timeLimitMs: 5000,
    mainFile: 'main.rs'
  }
};

export function getLanguageConfig(id: string): LanguageConfig {
  const config = languages[id.toLowerCase()];
  if (!config) {
    throw new Error(`Unsupported language: ${id}`);
  }
  return config;
}
