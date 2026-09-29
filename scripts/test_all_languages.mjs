const BASE = 'http://localhost:3001/api/compiler/execute';

const tests = [
  {
    lang: 'python',
    name: 'Python 3',
    file: 'main.py',
    code: 'print("PYTHON_OK_101")',
    expected: 'PYTHON_OK_101'
  },
  {
    lang: 'javascript',
    name: 'JavaScript (Node.js)',
    file: 'index.js',
    code: 'console.log("JAVASCRIPT_OK_202");',
    expected: 'JAVASCRIPT_OK_202'
  },
  {
    lang: 'typescript',
    name: 'TypeScript',
    file: 'index.ts',
    code: 'const msg: string = "TYPESCRIPT_OK_303"; console.log(msg);',
    expected: 'TYPESCRIPT_OK_303'
  },
  {
    lang: 'c',
    name: 'C (GCC)',
    file: 'main.c',
    code: '#include <stdio.h>\nint main() { printf("C_OK_404\\n"); return 0; }',
    expected: 'C_OK_404'
  },
  {
    lang: 'cpp',
    name: 'C++ (G++)',
    file: 'main.cpp',
    code: '#include <iostream>\nint main() { std::cout << "CPP_OK_505" << std::endl; return 0; }',
    expected: 'CPP_OK_505'
  },
  {
    lang: 'java',
    name: 'Java (OpenJDK)',
    file: 'Main.java',
    code: 'public class Main { public static void main(String[] args) { System.out.println("JAVA_OK_606"); } }',
    expected: 'JAVA_OK_606'
  },
  {
    lang: 'go',
    name: 'Go (Golang)',
    file: 'main.go',
    code: 'package main\nimport "fmt"\nfunc main() { fmt.Println("GO_OK_707") }',
    expected: 'GO_OK_707'
  },
  {
    lang: 'rust',
    name: 'Rust (Rustc)',
    file: 'main.rs',
    code: 'fn main() { println!("RUST_OK_808"); }',
    expected: 'RUST_OK_808'
  },
  {
    lang: 'php',
    name: 'PHP 8.4',
    file: 'main.php',
    code: '<?php echo "PHP_OK_909\\n";',
    expected: 'PHP_OK_909'
  },
  {
    lang: 'ruby',
    name: 'Ruby 3.3',
    file: 'main.rb',
    code: 'puts "RUBY_OK_1010"',
    expected: 'RUBY_OK_1010'
  }
];

async function run() {
  console.log('==================================================');
  console.log('   TESTING ALL 10 COMPILER LANGUAGE RUNTIMES      ');
  console.log('==================================================\n');

  let passed = 0;
  let total = tests.length;

  for (const t of tests) {
    const start = Date.now();
    try {
      const res = await fetch(BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          language: t.lang,
          files: [{ name: t.file, content: t.code }]
        })
      });
      const data = await res.json();
      const elapsed = Date.now() - start;
      const stdout = data.run?.stdout ? data.run.stdout.trim() : '';
      const stderr = data.run?.stderr ? data.run.stderr.trim() : (data.compile?.stderr || '');

      if (data.status === 'SUCCESS' && stdout.includes(t.expected)) {
        console.log(`✅ [PASS] ${t.name.padEnd(22)} (${elapsed}ms) Output: "${stdout}"`);
        passed++;
      } else {
        console.log(`❌ [FAIL] ${t.name.padEnd(22)} (${elapsed}ms) Status: ${data.status}`);
        if (stdout) console.log(`   stdout: ${stdout}`);
        if (stderr) console.log(`   stderr: ${stderr}`);
        if (data.error) console.log(`   error: ${data.error}`);
      }
    } catch (err) {
      console.log(`❌ [ERROR] ${t.name.padEnd(22)}: ${err.message}`);
    }
  }

  console.log('\n==================================================');
  console.log(`SUMMARY: ${passed} / ${total} Languages Operational (${Math.round((passed / total) * 100)}%)`);
  console.log('==================================================');
}

run();
