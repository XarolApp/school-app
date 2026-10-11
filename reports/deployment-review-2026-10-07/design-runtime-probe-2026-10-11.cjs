const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const path='design/system/templates/skolamatch-screen/support.js',src=fs.readFileSync(path,'utf8');
const cutoff=src.indexOf('  hideRawTemplate();\n');assert(cutoff>0);
const scoped=src.slice(0,cutoff)+'  globalThis.audit = { resolve, cssToObj, importantify, parseDataProps, createStreamTracker };\n})();';
const context=vm.createContext({console,window:{}});vm.runInContext(scoped,context,{timeout:1000});
const a=context.audit,rows=[];
for(const [expr,expected] of [['\"a==b\"','a==b'],["'x!==y'",'x!==y'],['user.label == \"a==b\"',true],['user.answer === 2',true],['(user.answer === 2)',true],['!false',true],['null',null]]){let actual=a.resolve({user:{answer:2,label:'a==b'}},expr);rows.push({kind:'expression',expr,actual,expected,pass:actual===expected});}
const css='background-image:url("data:image/svg+xml;base64,AAA");color:red';rows.push({kind:'css-semicolon',input:css,actual:a.cssToObj(css),expected:{backgroundImage:'url("data:image/svg+xml;base64,AAA")',color:'red'}});
let now=0;const tracker=a.createStreamTracker(60000,()=>now);tracker.push('A',true);assert.equal(tracker.live('A'),true);now=60001;assert.equal(tracker.live('A'),false);rows.push({kind:'stream-stale',pass:true});
assert.equal(a.importantify('content:"a;b";color:red'),'content:"a;b" !important;color:red !important');rows.push({kind:'importantify-quoted-semicolon',pass:true});
const template='design/system/templates/skolamatch-screen/SkolamatchScreen.dc.html';
const snapshots={before:require('node:child_process').execFileSync('git',['show','85747ec9f1ef2c35b8d905825f833ddad43fc8ad:'+template],{encoding:'utf8'}),after:fs.readFileSync(template,'utf8')};
const expected={0:['0 škol odpovídá tvým filtrům','Porovnat 0 škol'],1:['1 škola odpovídá tvým filtrům','Porovnat 1 školu'],2:['2 školy odpovídají tvým filtrům','Porovnat 2 školy'],4:['4 školy odpovídají tvým filtrům','Porovnat 4 školy'],5:['5 škol odpovídá tvým filtrům','Porovnat 5 škol'],24:['24 škol odpovídá tvým filtrům','Porovnat 24 škol']};
for(const [snapshot,doc] of Object.entries(snapshots)){
 const logic=doc.match(/<script type="text\/x-dc"[\s\S]*?>([\s\S]*?)<\/script>/)[1];
 const c=vm.createContext({});vm.runInContext('class DCLogic {constructor(props){this.props=props;}}\n'+logic+'\nglobalThis.Component=Component;',c);
 for(const n of [0,1,2,4,5,24]){let result=new c.Component({resultCount:n}).renderVals();const actual=[result.countLabel,result.ctaLabel];const pass=JSON.stringify(actual)===JSON.stringify(expected[n]);rows.push({kind:'count-'+snapshot,n,countLabel:result.countLabel,ctaLabel:result.ctaLabel,expected:expected[n],pass});if(snapshot==='after')assert.equal(pass,true,'count '+n);}
}
fs.writeFileSync('/private/tmp/design-runtime-probe-results.json',JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(rows,null,2));
