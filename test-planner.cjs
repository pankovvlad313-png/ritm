const assert=require('node:assert/strict');
const P=require('./planner.js');
const week='2026-10-12',settings={minutes:120,maxTasks:3};
const base={id:'a',mode:'weekly',frequency:3,duration:30,days:[0,1,2,3,4,5,6],gap:1,priority:1,paused:false,interval:3,anchor:week};
for(let n=0;n<300;n++){
 const tasks=[base,{...base,id:'b',frequency:7,gap:0,duration:45},{...base,id:'c',days:[0,2,4],gap:0,frequency:2,duration:35}];
 const result=P.generate(tasks,settings,week);
 for(let i=0;i<7;i++){const items=result.entries.filter(e=>e.date===P.add(week,i));assert(items.length<=settings.maxTasks);assert(items.reduce((s,e)=>s+tasks.find(t=>t.id===e.taskId).duration,0)<=settings.minutes);}
 for(const t of tasks){const items=result.entries.filter(e=>e.taskId===t.id);assert(items.length<=t.frequency);assert.equal(new Set(items.map(e=>e.date)).size,items.length);for(const a of items){assert(t.days.includes(P.diff(a.date,week)));for(const b of items)if(a!==b)assert(Math.abs(P.diff(a.date,b.date))>t.gap);}}
}
const locked=[{id:'fixed',taskId:'a',date:week,done:true,pinned:false},{id:'pinned',taskId:'a',date:P.add(week,2),pinned:true,done:false}];
const result=P.generate([base],settings,week,locked);assert(result.entries.some(e=>e.id==='fixed'));assert(result.entries.some(e=>e.id==='pinned'));assert.equal(result.entries.length,3);
const impossible=P.generate([{...base,frequency:7,gap:6}],settings,week);assert.equal(impossible.entries.length,1);assert.equal(impossible.issues[0].missing,6);
const interval=P.generate([{...base,mode:'interval',gap:0}],settings,week);assert.deepEqual(interval.entries.map(e=>e.date).sort(),[week,P.add(week,3),P.add(week,6)]);
const blocked=P.generate([{...base,mode:'interval',days:[1],gap:0}],settings,week);assert.equal(blocked.entries.length,0);assert.equal(blocked.issues[0].missing,3);
const neighbors=P.generate([base],settings,week,[],[{taskId:'a',date:'2026-10-11'}]);assert(!neighbors.entries.some(e=>e.date===week));
assert.equal(P.generate([{...base,paused:true}],settings,week).entries.length,0);
assert.equal(P.diff('2026-11-01','2026-10-31'),1);
assert.equal(P.monday('2026-10-18'),week);
console.log('PASS: 300 randomized schedules, capacity, frequency, allowed days, spacing, locked entries, impossible rules, intervals, neighboring weeks, paused tasks and date arithmetic.');

