/**
 * Lexical Analysis Service
 * 
 * Performs tokenization of source code using pattern-based analysis.
 * Supports language-specific keyword sets and operator detection.
 * Can be enhanced with web-tree-sitter when WASM grammars are available.
 */

interface TokenInfo {
  type: string;
  value: string;
  line: number;
  column: number;
}

interface TokenDistribution {
  keywords: number;
  identifiers: number;
  operators: number;
  literals: number;
  strings: number;
  comments: number;
  punctuation: number;
  numbers: number;
}

interface LexerResult {
  totalTokens: number;
  distribution: TokenDistribution;
  tokens: TokenInfo[];
  uniqueIdentifiers: string[];
  topIdentifiers: Array<{ name: string; count: number }>;
}

/** Language-specific keyword sets */
const KEYWORDS: Record<string, Set<string>> = {
  c: new Set(['auto', 'break', 'case', 'char', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extern', 'float', 'for', 'goto', 'if', 'inline', 'int', 'long', 'register', 'restrict', 'return', 'short', 'signed', 'sizeof', 'static', 'struct', 'switch', 'typedef', 'union', 'unsigned', 'void', 'volatile', 'while']),
  cpp: new Set(['alignas', 'alignof', 'and', 'and_eq', 'asm', 'auto', 'bitand', 'bitor', 'bool', 'break', 'case', 'catch', 'char', 'char8_t', 'char16_t', 'char32_t', 'class', 'compl', 'concept', 'const', 'consteval', 'constexpr', 'constinit', 'const_cast', 'continue', 'co_await', 'co_return', 'co_yield', 'decltype', 'default', 'delete', 'do', 'double', 'dynamic_cast', 'else', 'enum', 'explicit', 'export', 'extern', 'false', 'float', 'for', 'friend', 'goto', 'if', 'inline', 'int', 'long', 'mutable', 'namespace', 'new', 'noexcept', 'not', 'not_eq', 'nullptr', 'operator', 'or', 'or_eq', 'private', 'protected', 'public', 'register', 'reinterpret_cast', 'requires', 'return', 'short', 'signed', 'sizeof', 'static', 'static_assert', 'static_cast', 'struct', 'switch', 'template', 'this', 'thread_local', 'throw', 'true', 'try', 'typedef', 'typeid', 'typename', 'union', 'unsigned', 'using', 'virtual', 'void', 'volatile', 'wchar_t', 'while', 'xor', 'xor_eq', 'include', 'define', 'ifdef', 'ifndef', 'endif', 'pragma']),
  java: new Set(['abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final', 'finally', 'float', 'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int', 'interface', 'long', 'native', 'new', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while', 'var', 'yield', 'record', 'sealed', 'permits']),
  python: new Set(['False', 'None', 'True', 'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue', 'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from', 'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not', 'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield']),
  javascript: new Set(['abstract', 'arguments', 'async', 'await', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'double', 'else', 'enum', 'eval', 'export', 'extends', 'false', 'final', 'finally', 'float', 'for', 'function', 'goto', 'if', 'implements', 'import', 'in', 'instanceof', 'int', 'interface', 'let', 'long', 'native', 'new', 'null', 'of', 'package', 'private', 'protected', 'public', 'return', 'short', 'static', 'super', 'switch', 'synchronized', 'this', 'throw', 'throws', 'transient', 'true', 'try', 'typeof', 'undefined', 'var', 'void', 'volatile', 'while', 'with', 'yield']),
  typescript: new Set(['abstract', 'any', 'as', 'async', 'await', 'boolean', 'break', 'case', 'catch', 'class', 'const', 'constructor', 'continue', 'debugger', 'declare', 'default', 'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally', 'for', 'from', 'function', 'get', 'if', 'implements', 'import', 'in', 'infer', 'instanceof', 'interface', 'is', 'keyof', 'let', 'module', 'namespace', 'never', 'new', 'null', 'number', 'object', 'of', 'package', 'private', 'protected', 'public', 'readonly', 'require', 'return', 'set', 'static', 'string', 'super', 'switch', 'symbol', 'this', 'throw', 'true', 'try', 'type', 'typeof', 'undefined', 'unique', 'unknown', 'var', 'void', 'while', 'with', 'yield']),
  go: new Set(['break', 'case', 'chan', 'const', 'continue', 'default', 'defer', 'else', 'fallthrough', 'for', 'func', 'go', 'goto', 'if', 'import', 'interface', 'map', 'package', 'range', 'return', 'select', 'struct', 'switch', 'type', 'var']),
  rust: new Set(['as', 'async', 'await', 'break', 'const', 'continue', 'crate', 'dyn', 'else', 'enum', 'extern', 'false', 'fn', 'for', 'if', 'impl', 'in', 'let', 'loop', 'match', 'mod', 'move', 'mut', 'pub', 'ref', 'return', 'self', 'Self', 'static', 'struct', 'super', 'trait', 'true', 'type', 'unsafe', 'use', 'where', 'while'])
};

const OPERATORS = new Set(['+', '-', '*', '/', '%', '=', '==', '!=', '<', '>', '<=', '>=', '&&', '||', '!', '&', '|', '^', '~', '<<', '>>', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=', '->', '=>', '::', '?', '??', '?.', '...']);

const PUNCTUATION = new Set(['(', ')', '{', '}', '[', ']', ';', ',', '.', ':']);

export class LexerService {
  /**
   * Tokenize source code and return detailed token analysis.
   */
  static async tokenize(sourceCode: string, languageId: string): Promise<LexerResult> {
    const keywordSet = KEYWORDS[languageId] || KEYWORDS['javascript'];
    const lines = sourceCode.split('\n');
    const tokens: TokenInfo[] = [];
    const distribution: TokenDistribution = {
      keywords: 0,
      identifiers: 0,
      operators: 0,
      literals: 0,
      strings: 0,
      comments: 0,
      punctuation: 0,
      numbers: 0
    };

    const identifierCounts = new Map<string, number>();
    let inBlockComment = false;

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      let line = lines[lineIdx];
      let col = 0;

      // Handle block comments
      if (inBlockComment) {
        const endIdx = line.indexOf('*/');
        if (endIdx >= 0) {
          const commentText = line.substring(0, endIdx + 2);
          tokens.push({ type: 'comment', value: commentText, line: lineIdx + 1, column: 1 });
          distribution.comments++;
          inBlockComment = false;
          line = line.substring(endIdx + 2);
          col = endIdx + 2;
        } else {
          tokens.push({ type: 'comment', value: line, line: lineIdx + 1, column: 1 });
          distribution.comments++;
          continue;
        }
      }

      // Tokenize the line
      let i = col;
      while (i < line.length) {
        const ch = line[i];

        // Skip whitespace
        if (/\s/.test(ch)) { i++; continue; }

        // Single-line comments
        if ((line.substring(i, i + 2) === '//' || (languageId === 'python' && ch === '#'))) {
          tokens.push({ type: 'comment', value: line.substring(i), line: lineIdx + 1, column: i + 1 });
          distribution.comments++;
          break;
        }

        // Block comment start
        if (line.substring(i, i + 2) === '/*') {
          const endIdx = line.indexOf('*/', i + 2);
          if (endIdx >= 0) {
            tokens.push({ type: 'comment', value: line.substring(i, endIdx + 2), line: lineIdx + 1, column: i + 1 });
            distribution.comments++;
            i = endIdx + 2;
          } else {
            tokens.push({ type: 'comment', value: line.substring(i), line: lineIdx + 1, column: i + 1 });
            distribution.comments++;
            inBlockComment = true;
            break;
          }
          continue;
        }

        // String literals
        if (ch === '"' || ch === "'" || ch === '`') {
          const quote = ch;
          let j = i + 1;
          while (j < line.length && line[j] !== quote) {
            if (line[j] === '\\') j++; // skip escaped chars
            j++;
          }
          const strValue = line.substring(i, j + 1);
          tokens.push({ type: 'string', value: strValue, line: lineIdx + 1, column: i + 1 });
          distribution.strings++;
          i = j + 1;
          continue;
        }

        // Numbers
        if (/[0-9]/.test(ch) || (ch === '.' && i + 1 < line.length && /[0-9]/.test(line[i + 1]))) {
          let j = i;
          if (line.substring(i, i + 2) === '0x' || line.substring(i, i + 2) === '0X') {
            j = i + 2;
            while (j < line.length && /[0-9a-fA-F]/.test(line[j])) j++;
          } else {
            while (j < line.length && /[0-9.eE+\-_]/.test(line[j])) j++;
          }
          const numStr = line.substring(i, j);
          tokens.push({ type: 'number', value: numStr, line: lineIdx + 1, column: i + 1 });
          distribution.numbers++;
          i = j;
          continue;
        }

        // Identifiers and keywords
        if (/[a-zA-Z_$]/.test(ch)) {
          let j = i + 1;
          while (j < line.length && /[a-zA-Z0-9_$]/.test(line[j])) j++;
          const word = line.substring(i, j);

          if (keywordSet.has(word)) {
            tokens.push({ type: 'keyword', value: word, line: lineIdx + 1, column: i + 1 });
            distribution.keywords++;
          } else if (word === 'true' || word === 'false' || word === 'null' || word === 'undefined' || word === 'None' || word === 'True' || word === 'False') {
            tokens.push({ type: 'literal', value: word, line: lineIdx + 1, column: i + 1 });
            distribution.literals++;
          } else {
            tokens.push({ type: 'identifier', value: word, line: lineIdx + 1, column: i + 1 });
            distribution.identifiers++;
            identifierCounts.set(word, (identifierCounts.get(word) || 0) + 1);
          }
          i = j;
          continue;
        }

        // Multi-character operators
        const threeChar = line.substring(i, i + 3);
        const twoChar = line.substring(i, i + 2);

        if (OPERATORS.has(threeChar)) {
          tokens.push({ type: 'operator', value: threeChar, line: lineIdx + 1, column: i + 1 });
          distribution.operators++;
          i += 3;
          continue;
        }
        if (OPERATORS.has(twoChar)) {
          tokens.push({ type: 'operator', value: twoChar, line: lineIdx + 1, column: i + 1 });
          distribution.operators++;
          i += 2;
          continue;
        }
        if (OPERATORS.has(ch)) {
          tokens.push({ type: 'operator', value: ch, line: lineIdx + 1, column: i + 1 });
          distribution.operators++;
          i++;
          continue;
        }

        // Punctuation
        if (PUNCTUATION.has(ch)) {
          tokens.push({ type: 'punctuation', value: ch, line: lineIdx + 1, column: i + 1 });
          distribution.punctuation++;
          i++;
          continue;
        }

        // Unknown character — skip
        i++;
      }
    }

    // Build top identifiers
    const topIdentifiers = Array.from(identifierCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    return {
      totalTokens: tokens.length,
      distribution,
      tokens,
      uniqueIdentifiers: Array.from(identifierCounts.keys()),
      topIdentifiers
    };
  }
}
