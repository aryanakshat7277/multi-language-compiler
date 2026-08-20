export interface CodeMetricsResult{loc:number;sloc:number;cyclomaticComplexity:number;maintainabilityIndex:number;halstead:{volume:number;difficulty:number;effort:number;bugs:number};tokens:{keywords:number;operators:number;identifiers:number};grade:"A"|"B"|"C"|"D"|"F"}
export function analyzeCode(code:string,language:string):CodeMetricsResult{
  const lines=code.split("\n");
  const loc=lines.length;
  const blank=lines.filter(l=>!l.trim()).length;
  const comments=lines.filter(l=>/^\s*(\/\/|#|\*|\/\*)/.test(l)).length;
  const sloc=Math.max(1,loc-blank-comments);
  const kwPy=/\b(def|class|return|if|elif|else|for|while|import|from|try|except|with|raise|yield|async|await)\b/g;
  const kwJs=/\b(function|class|return|if|else|for|while|const|let|var|import|export|try|catch|async|await|throw|new)\b/g;
  const l=language.toLowerCase();
  const keywords=(code.match(l==="python"||l==="py"?kwPy:kwJs)||[]).length;
  const operators=(code.match(/[+\-*/%=<>!&|^~?]+|=>|&&|\|\|/g)||[]).length;
  const identifiers=new Set((code.match(/\b[a-zA-Z_]\w{2,}\b/g)||[]).filter(x=>!["def","class","for","if","else","return","import","function","const","let","var","while"].includes(x))).size;
  const decisions=(code.match(/\b(if|elif|else if|for|while|case|catch)\b|&&|\|\||and\b|or\b/g)||[]).length;
  const cc=Math.max(1,1+decisions);
  const n1=Math.max(1,keywords+operators),n2=Math.max(1,identifiers);
  const N=n1*2+n2*2,vocab=n1+n2;
  const vol=Math.max(1,Math.round(N*Math.log2(Math.max(2,vocab))));
  const diff=parseFloat(((n1/2)*(N/(2*Math.max(1,n2)))).toFixed(2));
  const effort=Math.round(vol*diff);
  const bugs=parseFloat((vol/3000).toFixed(3));
  const miRaw=171-5.2*Math.log(Math.max(1,vol))-0.23*cc-16.2*Math.log(Math.max(1,sloc));
  const mi=Math.min(100,Math.max(0,Math.round((miRaw/171)*100)));
  const grade=mi>=80?"A":mi>=60?"B":mi>=40?"C":mi>=20?"D":"F";
  return{loc,sloc,cyclomaticComplexity:cc,maintainabilityIndex:mi,halstead:{volume:vol,difficulty:diff,effort,bugs},tokens:{keywords,operators,identifiers},grade:grade as any};
}
