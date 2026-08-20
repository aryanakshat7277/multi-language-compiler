// This will be populated from DB during initialization if needed,
// but providing a fallback registry is useful for the execution engine.
export const LANGUAGE_REGISTRY: Record<string, { extension: string, compileCmd: string | null, runCmd: string }> = {
  'c': { extension: 'c', compileCmd: 'gcc {file} -o main', runCmd: './main' },
  'cpp': { extension: 'cpp', compileCmd: 'g++ {file} -o main', runCmd: './main' },
  'java': { extension: 'java', compileCmd: 'javac {file}', runCmd: 'java Main' },
  'python': { extension: 'py', compileCmd: null, runCmd: 'python3 {file}' },
  'javascript': { extension: 'js', compileCmd: null, runCmd: 'node {file}' },
  'typescript': { extension: 'ts', compileCmd: 'npx tsc {file}', runCmd: 'node {file_no_ext}.js' },
  'go': { extension: 'go', compileCmd: 'go build -o main {file}', runCmd: './main' },
  'rust': { extension: 'rs', compileCmd: 'rustc {file} -o main', runCmd: './main' }
};
