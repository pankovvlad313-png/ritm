(function(root){
 'use strict';
 const DAY=86400000;
 function dateKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
 function parse(s){return new Date(s+'T12:00:00');}
 function add(s,n){let d=parse(s);d.setDate(d.getDate()+n);return dateKey(d);}
 function diff(a,b){return Math.round((Date.UTC(...a.split('-').map((n,i)=>i===1?+n-1:+n))-Date.UTC(...b.split('-').map((n,i)=>i===1?+n-1:+n)))/DAY);}
 function monday(s){return add(s,-((parse(s).getDay()+6)%7));}
 function uid(){return globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;}
 function generate(tasks,settings,week,existing=[],neighbors=[],rng=Math.random){
   const dates=Array.from({length:7},(_,i)=>add(week,i));
   const active=new Map(tasks.map(t=>[t.id,t]));
   const entries=existing.filter(e=>(e.done||e.pinned)&&active.has(e.taskId)&&dates.includes(e.date)).map(e=>({...e}));
   const load=dates.map(d=>entries.filter(e=>e.date===d).reduce((s,e)=>s+active.get(e.taskId).duration,0));
   const count=dates.map(d=>entries.filter(e=>e.date===d).length);
   const issues=[];
   const ordered=tasks.filter(t=>!t.paused).slice().sort((a,b)=>a.days.length-b.days.length || b.priority-a.priority || b.duration-a.duration);
   for(const task of ordered){
     const kept=entries.filter(e=>e.taskId===task.id);
     const fixed=[...kept,...neighbors.filter(e=>e.taskId===task.id)];
     let target=task.mode==='weekly'?task.frequency:dates.filter(d=>diff(d,task.anchor)>=0 && diff(d,task.anchor)%task.interval===0).length;
     let need=Math.max(0,target-kept.length);
     const candidates=dates.map((d,i)=>i).filter(i=>task.days.includes(i)&&!kept.some(e=>e.date===dates[i])&&load[i]+task.duration<=settings.minutes&&count[i]<settings.maxTasks&&(task.mode!=='interval'||(diff(dates[i],task.anchor)>=0&&diff(dates[i],task.anchor)%task.interval===0))&&fixed.every(e=>Math.abs(diff(dates[i],e.date))>=task.gap+1));
     let best=[],bestScore=Infinity;
     function walk(pos,chosen){
       const score=chosen.reduce((s,i)=>s+load[i]/settings.minutes*2+count[i]*.12+rng()*.65,0);
       if(chosen.length>best.length || (chosen.length===best.length&&score<bestScore)){best=chosen.slice();bestScore=score;}
       if(chosen.length>=need)return;
       for(let j=pos;j<candidates.length;j++){const i=candidates[j];if(chosen.every(k=>Math.abs(i-k)>=task.gap+1))walk(j+1,[...chosen,i]);}
     }
     walk(0,[]);
     for(const i of best){entries.push({id:uid(),taskId:task.id,date:dates[i],done:false,pinned:false});load[i]+=task.duration;count[i]++;}
     if(best.length<need)issues.push({taskId:task.id,missing:need-best.length});
   }
   return {entries,issues};
 }
 const api={dateKey,parse,add,diff,monday,uid,generate};
 if(typeof module!=='undefined')module.exports=api;root.Planner=api;
})(typeof window!=='undefined'?window:globalThis);
