// Parse complete generated editor/CSS only; never execute it or publish a file.
import fs from 'node:fs';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {parseAst} from '../../frontend/node_modules/rolldown/dist/parse-ast-index.mjs';
const require=createRequire(import.meta.url);
const postcss=require('../../frontend/node_modules/postcss');
const html=fs.readFileSync('design/logo-concepts/stredni-na-miru-logo.html','utf8');
const code=html.match(/<script id="appifact-app">([\s\S]*?)<\/script>/)[1];
const css=html.match(/<style id="appifact-style">([\s\S]*?)<\/style>/)[1];
const ast=parseAst(code); const counts={},interesting=[];
const targets=new Set(['fetch','XMLHttpRequest','WebSocket','Worker','eval','Function',
  'postMessage','localStorage','sessionStorage','indexedDB','cookie','innerHTML','outerHTML','srcdoc']);
const short=(node)=>code.slice(Math.max(0,node.start-80),Math.min(code.length,node.end+100)).slice(0,1000);
let nodeCount=0,functions=0;
const stack=[ast];
while(stack.length){
  const node=stack.pop();if(!node||typeof node!=='object')continue;
  if(Array.isArray(node)){for(const e of node)stack.push(e);continue;}
  if(typeof node.type==='string'){
    nodeCount++;counts[node.type]=(counts[node.type]||0)+1;
    if(['FunctionDeclaration','FunctionExpression','ArrowFunctionExpression'].includes(node.type))functions++;
    if(node.type==='CallExpression'||node.type==='NewExpression'){
      const c=node.callee;const name=c?.type==='Identifier'?c.name:c?.type==='MemberExpression'?(c.property.name||c.property.value):null;
      if(targets.has(name))interesting.push({kind:node.type,name,start:node.start,end:node.end,context:short(node)});
    }
    if(node.type==='MemberExpression'){
      const name=node.property?.name||node.property?.value;
      if(['localStorage','sessionStorage','indexedDB','cookie','innerHTML','outerHTML','srcdoc'].includes(name))interesting.push({kind:node.type,name,start:node.start,end:node.end,context:short(node)});
    }
  }
  for(const [k,v] of Object.entries(node))if(k!=='type'&&v&&typeof v==='object')stack.push(v);
}
const style=postcss.parse(css);let declarations=0,rules=0,atRules=0;
style.walkDecls(()=>declarations++);style.walkRules(()=>rules++);style.walkAtRules(()=>atRules++);
const result={source_sha256:crypto.createHash('sha256').update(html).digest('hex'),
  script_chars:code.length,style_chars:css.length,script_ast_nodes:nodeCount,functions,
  ast_start:ast.start,ast_end:ast.end,node_types:counts,
  css:{declarations,rules,atRules},interesting,
  method:'Complete JavaScript and CSS parsed with installed local parsers; all AST nodes traversed and direct critical API/member sites extracted. Generated editor is not executed. Embedded authored files reviewed separately.',
  limitations:'Static AST inventory does not prove every alias/indirect call safe, runtime capability permissions, browser compatibility or asset rights; not a manual line-by-line vendor implementation approval.'};
fs.writeFileSync('/private/tmp/logo-editor-structural-audit-2026-10-12.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({...result,interesting:result.interesting.length,node_types:Object.keys(counts).length}));
