import { spawn } from "child_process";
import * as P from "@babel/parser";
export interface AstNode { id:string; name:string; type:string; line?:number; children?:AstNode[] }
let _c=0; const id=()=>`n${++_c}`;
function fromBabel(n:any):AstNode|null{
  if(!n||typeof n!=="object"||!n.type)return null;
  const label=n.name??n.id?.name??n.value?.toString()??n.type;
  const r:AstNode={id:id(),name:String(label).slice(0,40),type:n.type,line:n.loc?.start?.line,children:[]};
  for(const k of Object.keys(n)){
    if(["type","loc","start","end","comments"].includes(k))continue;
    const v=n[k];
    if(Array.isArray(v))v.forEach((x:any)=>{const c=fromBabel(x);if(c)r.children!.push(c)});
    else if(v?.type){const c=fromBabel(v);if(c)r.children!.push(c)}
  }
  if(!r.children!.length)delete r.children;
  return r;
}
function parseJsTs(code:string,lang:string):AstNode{
  _c=0;
  const ast=P.parse(code,{sourceType:"module",errorRecovery:true,plugins:lang==="typescript"?["typescript","decorators-legacy"]:["jsx","decorators-legacy"]});
  return fromBabel(ast.program)??{id:"n1",name:"Program",type:"File"};
}
function parsePython(code:string):Promise<AstNode>{
  return new Promise(resolve=>{
    _c=0;
    const script=`
import ast,json,sys
def cv(n,c=[0]):
 c[0]+=1; nid=f"n{c[0]}"
 if not isinstance(n,ast.AST):return{"id":nid,"name":str(n),"type":type(n).__name__} if not isinstance(n,(list,type(None))) else None
 nm=type(n).__name__
 for a in["name","id","attr","arg"]:
  if hasattr(n,a) and isinstance(getattr(n,a),str): nm=getattr(n,a); break
 ch=[x for f,v in ast.iter_fields(n) for x in ([cv(i,c) for i in v] if isinstance(v,list) else [cv(v,c)]) if x]
 r={"id":nid,"name":nm,"type":type(n).__name__}
 if hasattr(n,"lineno"):r["line"]=n.lineno
 if ch:r["children"]=ch
 return r
try:print(json.dumps(cv(ast.parse(sys.stdin.read()))))
except Exception as e:print(json.dumps({"id":"n1","name":str(e),"type":"SyntaxError"}))
`;
    const proc=spawn("python",["-c",script]);
    let out="";
    proc.stdout.on("data",(d:Buffer)=>out+=d);
    proc.stdin.write(code); proc.stdin.end();
    proc.on("close",()=>{try{resolve(JSON.parse(out.trim()))}catch{resolve({id:"n1",name:"ParseError",type:"Error"})}});
    proc.on("error",()=>resolve(fallback(code,"python")));
    setTimeout(()=>{try{proc.kill()}catch{}resolve(fallback(code,"python"))},5000);
  });
}
function fallback(code:string,lang:string):AstNode{
  _c=0;
  const root:AstNode={id:id(),name:"Program",type:"Program",children:[]};
  code.split("\n").forEach((line,i)=>{
    const fn=/(?:def|function|func|void|int|public)\s+(\w+)\s*\(/.exec(line);
    const cl=/(?:class|struct|interface)\s+(\w+)/.exec(line);
    const im=/^\s*(?:import|from|#include|using)\s+/.test(line);
    if(cl)root.children!.push({id:id(),name:cl[1],type:"ClassDeclaration",line:i+1});
    else if(fn)root.children!.push({id:id(),name:fn[1],type:"FunctionDeclaration",line:i+1});
    else if(im)root.children!.push({id:id(),name:line.trim().slice(0,40),type:"ImportDeclaration",line:i+1});
  });
  if(!root.children!.length)root.children!.push({id:id(),name:"Block",type:"BlockStatement",line:1});
  return root;
}
import { aiProvider } from './ai/geminiProvider';

export async function parseCode(code: string, language: string): Promise<any> {
  if (!code?.trim()) return { id: "n1", type: "EmptyFile", value: "Empty" };
  try {
    const geminiAst = await aiProvider.generateAst(code, language);
    if (geminiAst) return geminiAst;
  } catch (e) {}

  const l = language.toLowerCase();
  if (l === "javascript" || l === "js") return parseJsTs(code, "javascript");
  if (l === "typescript" || l === "ts") return parseJsTs(code, "typescript");
  if (l === "python" || l === "python3" || l === "py") return parsePython(code);
  return fallback(code, l);
}
