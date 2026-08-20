/**
 * Parser Service — AST Generation
 * 
 * Generates Abstract Syntax Trees from source code using pattern-based parsing.
 * Builds a hierarchical tree structure representing the syntactic structure of code.
 * 
 * This is a regex/pattern-based parser suitable for educational purposes.
 * For production use, integrate web-tree-sitter WASM grammars for precise parsing.
 */

export interface ASTNode {
  id: string;
  type: string;
  text: string;
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
  children: ASTNode[];
  isNamed: boolean;
}

let nodeCounter = 0;

function createNode(type: string, text: string, startLine: number, startCol: number, endLine: number, endCol: number, children: ASTNode[] = []): ASTNode {
  return {
    id: `node_${++nodeCounter}`,
    type,
    text: text.length > 60 ? text.substring(0, 57) + '...' : text,
    startLine,
    startCol,
    endLine,
    endCol,
    children,
    isNamed: true
  };
}

export class ParserService {
  /**
   * Parse source code into an AST-like structure.
   */
  static async parseToAst(sourceCode: string, languageId: string): Promise<ASTNode> {
    nodeCounter = 0;
    const lines = sourceCode.split('\n');
    const totalLines = lines.length;
    
    const programNode = createNode('Program', sourceCode.substring(0, 50), 1, 0, totalLines, 0);

    // Parse based on language family
    if (['c', 'cpp', 'java', 'javascript', 'typescript', 'go', 'rust'].includes(languageId)) {
      programNode.children = this.parseCLikeCode(sourceCode, lines, languageId);
    } else if (languageId === 'python') {
      programNode.children = this.parsePythonCode(sourceCode, lines);
    } else {
      programNode.children = this.parseGenericCode(sourceCode, lines);
    }

    return programNode;
  }

  /**
   * Parse C-family languages (C, C++, Java, JS, TS, Go, Rust)
   */
  private static parseCLikeCode(sourceCode: string, lines: string[], languageId: string): ASTNode[] {
    const nodes: ASTNode[] = [];

    // Detect preprocessor directives (C/C++)
    if (languageId === 'c' || languageId === 'cpp') {
      const includeRegex = /^#\s*(include|define|ifdef|ifndef|endif|pragma)\s+(.*)$/gm;
      let match;
      while ((match = includeRegex.exec(sourceCode)) !== null) {
        const line = sourceCode.substring(0, match.index).split('\n').length;
        nodes.push(createNode('PreprocessorDirective', match[0].trim(), line, 0, line, match[0].length));
      }
    }

    // Detect import/package statements
    const importRegex = /^(import|package|using|require)\s+(.+?);?\s*$/gm;
    let match;
    while ((match = importRegex.exec(sourceCode)) !== null) {
      const line = sourceCode.substring(0, match.index).split('\n').length;
      nodes.push(createNode('ImportDeclaration', match[0].trim(), line, 0, line, match[0].length, [
        createNode('Identifier', match[2].trim(), line, match[1].length + 1, line, match[0].length)
      ]));
    }

    // Detect class declarations
    const classRegex = /\b(class|struct|interface|enum)\s+(\w+)/g;
    while ((match = classRegex.exec(sourceCode)) !== null) {
      const line = sourceCode.substring(0, match.index).split('\n').length;
      const bodyStart = sourceCode.indexOf('{', match.index);
      const bodyEnd = bodyStart >= 0 ? this.findMatchingBrace(sourceCode, bodyStart) : match.index + match[0].length;
      const endLine = sourceCode.substring(0, bodyEnd).split('\n').length;

      const classBody = bodyStart >= 0 ? sourceCode.substring(bodyStart + 1, bodyEnd) : '';
      const classMethods = this.extractFunctions(classBody, sourceCode.substring(0, bodyStart + 1).split('\n').length);

      nodes.push(createNode('ClassDeclaration', match[0], line, 0, endLine, 0, [
        createNode('Identifier', match[2], line, match.index - sourceCode.lastIndexOf('\n', match.index), line, 0),
        createNode('ClassBody', '{...}', line, 0, endLine, 0, classMethods)
      ]));
    }

    // Detect function declarations (not inside classes - top level)
    const funcNodes = this.extractFunctions(sourceCode, 1);
    // Only add functions that aren't already children of classes
    const classRanges = nodes
      .filter(n => n.type === 'ClassDeclaration')
      .map(n => ({ start: n.startLine, end: n.endLine }));

    for (const fn of funcNodes) {
      const insideClass = classRanges.some(r => fn.startLine >= r.start && fn.endLine <= r.end);
      if (!insideClass) {
        nodes.push(fn);
      }
    }

    // Detect global variable declarations
    const varRegex = /\b(const|let|var|int|float|double|char|bool|string|auto)\s+(\w+)\s*[=;]/g;
    while ((match = varRegex.exec(sourceCode)) !== null) {
      const line = sourceCode.substring(0, match.index).split('\n').length;
      const insideClass = classRanges.some(r => line >= r.start && line <= r.end);
      const insideFunc = funcNodes.some(f => line >= f.startLine && line <= f.endLine);
      if (!insideClass && !insideFunc) {
        nodes.push(createNode('VariableDeclaration', match[0], line, 0, line, match[0].length, [
          createNode('TypeAnnotation', match[1], line, 0, line, match[1].length),
          createNode('Identifier', match[2], line, 0, line, match[2].length)
        ]));
      }
    }

    // Sort by line number
    nodes.sort((a, b) => a.startLine - b.startLine);
    return nodes;
  }

  /**
   * Parse Python code
   */
  private static parsePythonCode(sourceCode: string, lines: string[]): ASTNode[] {
    const nodes: ASTNode[] = [];

    // Imports
    const importRegex = /^(from\s+\S+\s+import\s+.+|import\s+.+)$/gm;
    let match;
    while ((match = importRegex.exec(sourceCode)) !== null) {
      const line = sourceCode.substring(0, match.index).split('\n').length;
      nodes.push(createNode('ImportStatement', match[0].trim(), line, 0, line, match[0].length));
    }

    // Class definitions
    const classRegex = /^class\s+(\w+).*?:/gm;
    while ((match = classRegex.exec(sourceCode)) !== null) {
      const line = sourceCode.substring(0, match.index).split('\n').length;
      const endLine = this.findPythonBlockEnd(lines, line - 1);
      const bodyLines = lines.slice(line, endLine);
      const methods = this.extractPythonFunctions(bodyLines, line + 1);

      nodes.push(createNode('ClassDefinition', match[0].trim(), line, 0, endLine, 0, [
        createNode('Identifier', match[1], line, 6, line, 6 + match[1].length),
        createNode('ClassBody', '...', line + 1, 0, endLine, 0, methods)
      ]));
    }

    // Top-level function definitions
    const funcRegex = /^def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*\S+\s*)?:/gm;
    while ((match = funcRegex.exec(sourceCode)) !== null) {
      const line = sourceCode.substring(0, match.index).split('\n').length;
      const endLine = this.findPythonBlockEnd(lines, line - 1);
      const children: ASTNode[] = [
        createNode('Identifier', match[1], line, 4, line, 4 + match[1].length)
      ];

      // Parse parameters
      if (match[2].trim()) {
        const params = match[2].split(',').map(p => p.trim());
        const paramsNode = createNode('Parameters', `(${match[2]})`, line, 0, line, 0,
          params.map(p => createNode('Parameter', p, line, 0, line, p.length))
        );
        children.push(paramsNode);
      }

      // Parse function body for statements
      const bodyLines = lines.slice(line, endLine);
      const bodyNodes = this.parsePythonBody(bodyLines, line + 1);
      if (bodyNodes.length > 0) {
        children.push(createNode('FunctionBody', '...', line + 1, 0, endLine, 0, bodyNodes));
      }

      nodes.push(createNode('FunctionDefinition', match[0].trim(), line, 0, endLine, 0, children));
    }

    // Top-level assignments
    const assignRegex = /^(\w+)\s*=\s*(.+)$/gm;
    while ((match = assignRegex.exec(sourceCode)) !== null) {
      const line = sourceCode.substring(0, match.index).split('\n').length;
      if (!lines[line - 1].startsWith(' ') && !lines[line - 1].startsWith('\t')) {
        nodes.push(createNode('Assignment', match[0].trim(), line, 0, line, match[0].length, [
          createNode('Identifier', match[1], line, 0, line, match[1].length),
          createNode('Expression', match[2].trim(), line, 0, line, match[2].length)
        ]));
      }
    }

    nodes.sort((a, b) => a.startLine - b.startLine);
    return nodes;
  }

  /**
   * Extract function declarations from C-like code
   */
  private static extractFunctions(code: string, baseLineOffset: number): ASTNode[] {
    const funcNodes: ASTNode[] = [];
    // Match function patterns: returnType name(params) {
    const funcRegex = /\b(?:(?:public|private|protected|static|async|virtual|override|export|default)\s+)*(?:\w+(?:<[^>]+>)?(?:\[\])?)\s+(\w+)\s*\(([^)]*)\)\s*(?:const\s*)?(?:override\s*)?(?:throws\s+\w+(?:,\s*\w+)*)?\s*\{/g;
    let match;
    while ((match = funcRegex.exec(code)) !== null) {
      const preMatch = code.substring(0, match.index);
      const line = preMatch.split('\n').length + baseLineOffset - 1;
      const bodyStart = code.indexOf('{', match.index);
      const bodyEnd = this.findMatchingBrace(code, bodyStart);
      const endLine = code.substring(0, bodyEnd).split('\n').length + baseLineOffset - 1;

      const children: ASTNode[] = [
        createNode('Identifier', match[1], line, 0, line, match[1].length)
      ];

      // Parse parameters
      if (match[2].trim()) {
        const params = match[2].split(',').map(p => p.trim());
        children.push(createNode('ParameterList', `(${match[2]})`, line, 0, line, 0,
          params.map(p => createNode('Parameter', p, line, 0, line, p.length))
        ));
      }

      // Parse function body for control flow
      const body = code.substring(bodyStart + 1, bodyEnd);
      const bodyStatements = this.extractStatements(body, line + 1);
      if (bodyStatements.length > 0) {
        children.push(createNode('Block', '{...}', line, 0, endLine, 0, bodyStatements));
      }

      funcNodes.push(createNode('FunctionDeclaration', match[0].substring(0, 50), line, 0, endLine, 0, children));
    }

    // Also match simpler function patterns like JS: function name(params) {
    const simpleFuncRegex = /\bfunction\s+(\w+)\s*\(([^)]*)\)\s*\{/g;
    while ((match = simpleFuncRegex.exec(code)) !== null) {
      const preMatch = code.substring(0, match.index);
      const line = preMatch.split('\n').length + baseLineOffset - 1;
      const bodyStart = code.indexOf('{', match.index);
      const bodyEnd = this.findMatchingBrace(code, bodyStart);
      const endLine = code.substring(0, bodyEnd).split('\n').length + baseLineOffset - 1;

      // Skip if we already matched this function
      const alreadyMatched = funcNodes.some(f => f.startLine === line);
      if (alreadyMatched) continue;

      const children: ASTNode[] = [
        createNode('Identifier', match[1], line, 0, line, match[1].length)
      ];

      funcNodes.push(createNode('FunctionDeclaration', match[0].substring(0, 50), line, 0, endLine, 0, children));
    }

    return funcNodes;
  }

  /**
   * Extract control-flow statements from function body
   */
  private static extractStatements(body: string, baseLineOffset: number): ASTNode[] {
    const statements: ASTNode[] = [];
    let match;

    // If statements
    const ifRegex = /\bif\s*\(([^)]+)\)/g;
    while ((match = ifRegex.exec(body)) !== null) {
      const line = body.substring(0, match.index).split('\n').length + baseLineOffset - 1;
      statements.push(createNode('IfStatement', match[0], line, 0, line, match[0].length, [
        createNode('Condition', match[1].trim(), line, 0, line, match[1].length)
      ]));
    }

    // For loops
    const forRegex = /\bfor\s*\(([^)]+)\)/g;
    while ((match = forRegex.exec(body)) !== null) {
      const line = body.substring(0, match.index).split('\n').length + baseLineOffset - 1;
      statements.push(createNode('ForStatement', match[0], line, 0, line, match[0].length));
    }

    // While loops
    const whileRegex = /\bwhile\s*\(([^)]+)\)/g;
    while ((match = whileRegex.exec(body)) !== null) {
      const line = body.substring(0, match.index).split('\n').length + baseLineOffset - 1;
      statements.push(createNode('WhileStatement', match[0], line, 0, line, match[0].length));
    }

    // Return statements
    const returnRegex = /\breturn\s+([^;]+)/g;
    while ((match = returnRegex.exec(body)) !== null) {
      const line = body.substring(0, match.index).split('\n').length + baseLineOffset - 1;
      statements.push(createNode('ReturnStatement', match[0], line, 0, line, match[0].length, [
        createNode('Expression', match[1].trim(), line, 0, line, match[1].length)
      ]));
    }

    // Variable declarations
    const varRegex = /\b(const|let|var|int|float|double|auto)\s+(\w+)\s*=/g;
    while ((match = varRegex.exec(body)) !== null) {
      const line = body.substring(0, match.index).split('\n').length + baseLineOffset - 1;
      statements.push(createNode('VariableDeclaration', match[0], line, 0, line, match[0].length, [
        createNode('Identifier', match[2], line, 0, line, match[2].length)
      ]));
    }

    statements.sort((a, b) => a.startLine - b.startLine);
    return statements;
  }

  /**
   * Find matching closing brace for an opening brace
   */
  private static findMatchingBrace(code: string, openIndex: number): number {
    let depth = 0;
    for (let i = openIndex; i < code.length; i++) {
      if (code[i] === '{') depth++;
      if (code[i] === '}') {
        depth--;
        if (depth === 0) return i;
      }
    }
    return code.length - 1;
  }

  /**
   * Find the end of a Python indentation block
   */
  private static findPythonBlockEnd(lines: string[], startIdx: number): number {
    if (startIdx >= lines.length - 1) return lines.length;
    const startLine = lines[startIdx];
    const baseIndent = startLine.search(/\S/);

    for (let i = startIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (line.trim() === '') continue;
      const indent = line.search(/\S/);
      if (indent <= baseIndent) return i;
    }
    return lines.length;
  }

  /**
   * Extract Python function definitions from lines
   */
  private static extractPythonFunctions(lines: string[], baseLineOffset: number): ASTNode[] {
    const nodes: ASTNode[] = [];
    const funcRegex = /^\s+def\s+(\w+)\s*\(([^)]*)\)\s*(?:->\s*\S+\s*)?:/;

    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(funcRegex);
      if (match) {
        const line = i + baseLineOffset;
        nodes.push(createNode('MethodDefinition', match[0].trim(), line, 0, line + 1, 0, [
          createNode('Identifier', match[1], line, 0, line, match[1].length)
        ]));
      }
    }
    return nodes;
  }

  /**
   * Parse Python function body for control flow statements
   */
  private static parsePythonBody(lines: string[], baseLineOffset: number): ASTNode[] {
    const nodes: ASTNode[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lineNum = i + baseLineOffset;

      if (line.startsWith('if ') || line.startsWith('elif ')) {
        nodes.push(createNode('IfStatement', line, lineNum, 0, lineNum, line.length));
      } else if (line.startsWith('for ')) {
        nodes.push(createNode('ForStatement', line, lineNum, 0, lineNum, line.length));
      } else if (line.startsWith('while ')) {
        nodes.push(createNode('WhileStatement', line, lineNum, 0, lineNum, line.length));
      } else if (line.startsWith('return ') || line === 'return') {
        nodes.push(createNode('ReturnStatement', line, lineNum, 0, lineNum, line.length));
      } else if (line.startsWith('try:')) {
        nodes.push(createNode('TryStatement', line, lineNum, 0, lineNum, line.length));
      }
    }
    return nodes;
  }

  /**
   * Generic fallback parser
   */
  private static parseGenericCode(sourceCode: string, lines: string[]): ASTNode[] {
    const nodes: ASTNode[] = [];
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('#')) {
        nodes.push(createNode('Statement', trimmed, i + 1, 0, i + 1, trimmed.length));
      }
    }
    return nodes;
  }
}
