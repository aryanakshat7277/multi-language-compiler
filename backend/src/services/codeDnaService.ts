import{parseCode,AstNode}from"./astService";
import{analyzeCode}from"./codeMetricsService";
export interface CodeDnaResult{overallSimilarity:number;verdict:string;metrics:{astStructure:number;tokenSequence:number;halsteadProfile:number;cyclomaticParity:number;locRatio:number};table:Array<{metric:string;scoreA:string;scoreB:string;similarity:string}>}
function seq(n:AstNode):string[]{return[n.type,...(n.children??[]).flatMap(seq)]}
function jaccard(a:string[],b:string[]):number{const sa=new Set(a),sb=new Set(b);let i=0;for(const x of sa)if(sb.has(x))i++;const u=sa.size+sb.size-i;return u===0?1:parseFloat((i/u).toFixed(4))}
function lcs(a:string[],b:string[]):number{const sa=a.slice(0,400),sb=b.slice(0,400);const dp=Array.from({length:sa.length+1},()=>new Array(sb.length+1).fill(0));for(let i=1;i<=sa.length;i++)for(let j=1;j<=sb.length;j++)dp[i][j]=sa[i-1]===sb[j-1]?dp[i-1][j-1]+1:Math.max(dp[i-1][j],dp[i][j-1]);return parseFloat((2*dp[sa.length][sb.length]/(sa.length+sb.length)).toFixed(4))}
const pct=(v:number)=>`${Math.round(v*100)}%`;
const verdict=(s:number)=>s>=.9?"HIGHLY SIMILAR — Possible Plagiarism":s>=.7?"STRUCTURALLY SIMILAR":s>=.45?"PARTIALLY SIMILAR":s>=.2?"LOW SIMILARITY":"DISTINCT IMPLEMENTATIONS";
export async function compareCode(codeA:string,codeB:string,language:string):Promise<CodeDnaResult>{
  const[tA,tB]=await Promise.all([parseCode(codeA,language),parseCode(codeB,language)]);
  const[sA,sB]=[seq(tA),seq(tB)];
  const ast=jaccard(sA,sB),tok=lcs(sA,sB);
  const[mA,mB]=[analyzeCode(codeA,language),analyzeCode(codeB,language)];
  const hal=1-Math.min(1,Math.abs(mA.halstead.volume-mB.halstead.volume)/Math.max(1,Math.max(mA.halstead.volume,mB.halstead.volume)));
  const cc=1-Math.min(1,Math.abs(mA.cyclomaticComplexity-mB.cyclomaticComplexity)/Math.max(1,Math.max(mA.cyclomaticComplexity,mB.cyclomaticComplexity)));
  const loc=Math.min(mA.sloc,mB.sloc)/Math.max(1,Math.max(mA.sloc,mB.sloc));
  const overall=parseFloat((ast*.35+tok*.30+hal*.15+cc*.10+loc*.10).toFixed(4));
  return{overallSimilarity:overall,verdict:verdict(overall),metrics:{astStructure:ast,tokenSequence:tok,halsteadProfile:hal,cyclomaticParity:cc,locRatio:loc},table:[{metric:"AST Node Jaccard",scoreA:String(sA.length),scoreB:String(sB.length),similarity:pct(ast)},{metric:"Token LCS",scoreA:pct(tok),scoreB:pct(tok),similarity:pct(tok)},{metric:"Halstead Volume",scoreA:String(mA.halstead.volume),scoreB:String(mB.halstead.volume),similarity:pct(hal)},{metric:"Cyclomatic Complexity",scoreA:String(mA.cyclomaticComplexity),scoreB:String(mB.cyclomaticComplexity),similarity:pct(cc)},{metric:"Lines of Code",scoreA:String(mA.sloc),scoreB:String(mB.sloc),similarity:pct(loc)}]};
}
