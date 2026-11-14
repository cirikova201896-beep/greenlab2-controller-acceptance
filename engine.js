/* Учебная дискретная модель, не контроллер реального оборудования. */
(function(root){'use strict';
const decisions=['valid','fresh','latched','ventStart','ventStop','pumpStart','pumpStop','cold','rain','lowTank','ventFits','pumpFits'];
const outcomes=decisions.flatMap(x=>[x+':true',x+':false']);
const initial=()=>({pump:false,vent:false,fault:false});
const policies={
 reference:{pumpStart:h=>h<35,pumpStop:h=>h>=45,ventStart:t=>t>=30,fresh:a=>a<=30,cold:t=>t<=3,lowTank:n=>n<10,hold:(s,x)=>s.fault&&!x.reset,order:()=>['vent','pump']}
};
const changes={M1:{pumpStart:h=>h<=35},M2:{pumpStop:h=>h>45},M3:{ventStart:t=>t>30},M4:{fresh:a=>a<30},M5:{hold:()=>false},M6:{order:()=>['pump','vent']},M7:{cold:t=>t<3},M8:{lowTank:n=>n<=10}};
function valid(x){return x&&typeof x==='object'&&!Array.isArray(x)&&[['humidity',0,100],['temp',-10,50],['age',0,120],['tank',0,100],['budget',0,6]].every(([k,a,b])=>typeof x[k]==='number'&&Number.isFinite(x[k])&&x[k]>=a&&x[k]<=b)&&Number.isInteger(x.budget)&&typeof x.rain==='boolean'&&typeof x.reset==='boolean';}
function step(previous,input,policy=policies.reference){
 const p=Object.assign({},policies.reference,policy), trace=[];
 const d=(id,v)=>{trace.push(id+':'+Boolean(v));return Boolean(v);};
 const stop=reason=>({state:{pump:false,vent:false,fault:true},out:{pump:false,vent:false,fault:true,used:0},reason,trace});
 if(!d('valid',valid(input)))return stop('INVALID');
 if(!d('fresh',p.fresh(input.age)))return stop('STALE');
 if(d('latched',p.hold(previous,input)))return stop('LATCHED');
 let vent=previous.vent,pump=previous.pump;
 if(d('ventStart',p.ventStart(input.temp)))vent=true;
 else if(d('ventStop',input.temp<=26))vent=false;
 if(d('pumpStart',p.pumpStart(input.humidity)))pump=true;
 else if(d('pumpStop',p.pumpStop(input.humidity)))pump=false;
 // Все три блокировки оцениваются отдельно: удобно исследовать независимость условий.
 const cold=d('cold',p.cold(input.temp)), rain=d('rain',input.rain), low=d('lowTank',p.lowTank(input.tank));
 if(cold||rain||low)pump=false;
 const requests={pump,vent},cost={pump:2,vent:3},actual={pump:false,vent:false};let left=input.budget;
 for(const device of p.order())if(requests[device]){if(d(device+'Fits',left>=cost[device])){actual[device]=true;left-=cost[device];}}
 const state={...actual,fault:false},out={...state,used:input.budget-left};
 return {state,out,reason:cold?'COLD':rain?'RAIN':low?'LOW_TANK':((requests.pump&&!actual.pump)||(requests.vent&&!actual.vent))?'BUDGET':'NORMAL',trace};
}
function validateSuite(tests){
 if(!Array.isArray(tests)||!tests.length||tests.length>100)throw Error('Нужно от 1 до 100 сценариев.');
 let count=0;
 tests.forEach((t,i)=>{if(!t||typeof t.name!=='string'||!t.name.trim()||!Array.isArray(t.steps)||!t.steps.length||t.steps.length>50)throw Error('Сценарий '+(i+1)+': нужны name и 1…50 steps.');t.steps.forEach((s,j)=>{count++;const e=s&&s.expected;if(!s||!Object.hasOwn(s,'input')||!e||['pump','vent','fault'].some(k=>typeof e[k]!=='boolean')||!Number.isInteger(e.used)||e.used<0||e.used>6)throw Error(t.name+', шаг '+(j+1)+': expected требует pump/vent/fault boolean и used целое 0…6.');});});
 if(count>1000)throw Error('Не более 1000 шагов в наборе.');return tests;
}
const equal=(a,b)=>['pump','vent','fault','used'].every(k=>a[k]===b[k]);
function execute(tests,policy){return tests.map(t=>{let state=initial();return {name:t.name,steps:t.steps.map((s,i)=>{const before={...state},r=step(state,s.input,policy);state=r.state;return {number:i+1,input:s.input,before,expected:s.expected,actual:r.out,pass:equal(s.expected,r.out),reason:r.reason,trace:r.trace};})};});}
function run(tests,candidate){validateSuite(tests);const reference=execute(tests,policies.reference),candidateResults=execute(tests,candidate||policies.reference),flat=reference.flatMap(t=>t.steps),covered=[...new Set(flat.flatMap(s=>s.trace))];
 const baselinePass=flat.every(s=>s.pass);
 const mutations=Object.entries(changes).map(([id,change])=>{const runs=execute(tests,{...policies.reference,...change});const killedBy=runs.flatMap(t=>t.steps.filter(s=>!s.pass).map(s=>t.name+' / '+s.number));return {id,killed:baselinePass&&killedBy.length>0,killedBy:baselinePass?killedBy:[],status:baselinePass?(killedBy.length?'killed':'survived'):'blocked: correct expectations first'};});
 return {createdAt:new Date().toISOString(),tests,reference,candidate:candidateResults,baselinePass,candidatePass:candidateResults.every(t=>t.steps.every(s=>s.pass)),coverage:{covered,missing:outcomes.filter(x=>!covered.includes(x)),total:outcomes.length,percent:Math.round(covered.length/outcomes.length*100)},mutations,mutationScore:baselinePass?mutations.filter(m=>m.killed).length/8*100:null};
}
const api={initial,step,run,validateSuite,policies,changes,outcomes,valid};if(typeof module!=='undefined')module.exports=api;else root.GreenLab2=api;
})(typeof window!=='undefined'?window:globalThis);
