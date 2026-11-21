import { spawn } from "child_process";
import * as P from "@babel/parser";
import { aiProvider } from './ai/geminiProvider';

export interface AstNode { 
  id: string; 
  name: string; 
  type: string; 
  line?: number; 
  children?: AstNode[];
}

function createIdGenerator(prefix = "n"): () => string {
  let count = 0;
  return () => `${prefix}${++count}`;
}

function fromBabel(n: any, idGen: () => string): AstNode | null {
  if (!n || typeof n !== "object" || !n.type) return null;
  const label = n.name ?? n.id?.name ?? n.value?.toString() ?? n.type;
  const r: AstNode = {
    id: idGen(),
    name: String(label).slice(0, 40),
    type: n.type,
    line: n.loc?.start?.line,
    children: []
  };

  for (const k of Object.keys(n)) {
    if (["type", "loc", "start", "end", "comments"].includes(k)) continue;
    const v = n[k];
    if (Array.isArray(v)) {
      v.forEach((x: any) => {
        const c = fromBabel(x, idGen);
        if (c) r.children!.push(c);
      });
    } else if (v?.type) {
      const c = fromBabel(v, idGen);
      if (c) r.children!.push(c);
    }
  }

  if (!r.children!.length) delete r.children;
  return r;
}

function parseJsTs(code: string, lang: string): AstNode | { error: string; message: string; line: number; column: number } {
  const idGen = createIdGenerator("n");
  try {
    const ast = P.parse(code, {
      sourceType: "module",
      errorRecovery: false,
      plugins: lang === "typescript" ? ["typescript", "decorators-legacy"] : ["jsx", "decorators-legacy"]
    });
    return fromBabel(ast.program, idGen) ?? { id: idGen(), name: "Program", type: "File" };
  } catch (err: any) {
    return {
      error: "SyntaxError",
      message: err.message?.split('\n')[0] || "JavaScript/TypeScript syntax error",
      line: err.loc?.line || 1,
      column: err.loc?.column || 1
    };
  }
}

function parsePython(code: string): Promise<AstNode | { error: string; message: string; line: number; column: number }> {
  return new Promise(resolve => {
    const idGen = createIdGenerator("n");
    const script = `
import ast, json, sys
def cv(n, c=[0]):
 c[0] += 1; nid = f"n{c[0]}"
 if not isinstance(n, ast.AST): return {"id": nid, "name": str(n), "type": type(n).__name__} if not isinstance(n, (list, type(None))) else None
 nm = type(n).__name__
 for a in ["name", "id", "attr", "arg"]:
  if hasattr(n, a) and isinstance(getattr(n, a), str): nm = getattr(n, a); break
 ch = [x for f, v in ast.iter_fields(n) for x in ([cv(i, c) for i in v] if isinstance(v, list) else [cv(v, c)]) if x]
 r = {"id": nid, "name": nm, "type": type(n).__name__}
 if hasattr(n, "lineno"): r["line"] = n.lineno
 if ch: r["children"] = ch
 return r
try:
 tree = ast.parse(sys.stdin.read())
 print(json.dumps(cv(tree)))
except SyntaxError as e:
 print(json.dumps({"error": "SyntaxError", "message": e.msg or str(e), "line": e.lineno or 1, "column": e.offset or 1}))
except Exception as e:
 print(json.dumps({"error": "SyntaxError", "message": str(e), "line": 1, "column": 1}))
`;
    const proc = spawn("python", ["-c", script]);
    let out = "";
    proc.stdout.on("data", (d: Buffer) => out += d);
    proc.stdin.write(code); 
    proc.stdin.end();
    proc.on("close", () => {
      try {
        const parsed = JSON.parse(out.trim());
        resolve(parsed);
      } catch {
        resolve({ id: idGen(), name: "ParseError", type: "Error" });
      }
    });
    proc.on("error", () => resolve(fallback(code, "python")));
    setTimeout(() => {
      try { proc.kill(); } catch {}
      resolve(fallback(code, "python"));
    }, 5000);
  });
}

function fallback(code: string, lang: string): AstNode {
  const idGen = createIdGenerator("n");
  const root: AstNode = { id: idGen(), name: "Program", type: "Program", children: [] };
  code.split("\n").forEach((line, i) => {
    const fn = /(?:def|function|func|void|int|public)\s+(\w+)\s*\(/.exec(line);
    const cl = /(?:class|struct|interface)\s+(\w+)/.exec(line);
    const im = /^\s*(?:import|from|#include|using)\s+/.test(line);
    if (cl) root.children!.push({ id: idGen(), name: cl[1], type: "ClassDeclaration", line: i + 1 });
    else if (fn) root.children!.push({ id: idGen(), name: fn[1], type: "FunctionDeclaration", line: i + 1 });
    else if (im) root.children!.push({ id: idGen(), name: line.trim().slice(0, 40), type: "ImportDeclaration", line: i + 1 });
  });
  if (!root.children!.length) root.children!.push({ id: idGen(), name: "Block", type: "BlockStatement", line: 1 });
  return root;
}

export async function parseCode(code: string, language: string): Promise<any> {
  if (!code?.trim()) return { id: "n1", type: "EmptyFile", value: "Empty" };

  const l = (language || "javascript").toLowerCase();

  // 1. Instant native AST generation for JavaScript / TypeScript (Babel parser, <1ms)
  if (l === "javascript" || l === "js" || l === "typescript" || l === "ts") {
    return parseJsTs(code, l.includes("ts") ? "typescript" : "javascript");
  }

  // 2. Native AST generation for Python (Local AST parser)
  if (l === "python" || l === "python3" || l === "py") {
    return parsePython(code);
  }

  // 3. For other languages, try AI AST generator with fast 1.5s timeout or high-speed AST fallback
  try {
    const geminiAst = await Promise.race([
      aiProvider.generateAst(code, language),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 1500))
    ]);
    if (geminiAst && !(geminiAst as any).error) return geminiAst;
  } catch (e) {}

  return fallback(code, l);
}
