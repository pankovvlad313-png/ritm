(function(root){
 'use strict';
 const DAY=86400000;
 function dateKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
 function parse(s){return new Date(s+'T12:00:00');}
 function add(s,n){let d=parse(s);d.setDate(d.getDate()+n);return dateKey(d);}
 function diff(a,b){return Math.round((Date.UTC(...a.split('-').map((n,i)=>i===1?+n-1:+n))-Date.UTC(...b.split('-').map((n,i)=>i===1?+n-1:+n)))/DAY);}
 function monday(s){return add(s,-((parse(s).getDay()+6)%7));}
 function uid(){return globalThis.crypto?.randomUUID?.() || Date.now()+'-'+Math.random().toString(36).slice(2);}
 function clock(n){return String(Math.floor(n/60)).padStart(2,'0')+':'+String(n%60).padStart(2,'0');}
 function minutes(s){return /^([01]\d|2[0-3]):[0-5]\d$/.test(s)?Number(s.slice(0,2))*60+Number(s.slice(3)):null;}
 function rule(settings,date){const i=(parse(date).getDay()+6)%7,r=settings.dayRules?.[i]||{};return {minutes:settings.dateOverrides?.[date]?.minutes??r.minutes??settings.minutes,maxTasks:r.maxTasks??settings.maxTasks,start:r.start??540,end:r.end??1260};}

 function merge(ranges){const result=[];for(const r of ranges.filter(r=>Number.isInteger(r.start)&&Number.isInteger(r.end)&&r.start<r.end).map(r=>({...r})).sort((a,b)=>a.start-b.start)){const last=result.at(-1);if(last&&r.start<=last.end)last.end=Math.max(last.end,r.end);else result.push(r);}return result;}
 function windows(settings,date){
   const r=rule(settings,date),day=settings.dayRules?.[(parse(date).getDay()+6)%7]||{},exception=settings.exceptions?.[date];
   let free=merge(exception?.windows??day.windows??[{start:r.start,end:r.end}]);
   const busy=(settings.busyBlocks||[]).filter(b=>b.days.includes((parse(date).getDay()+6)%7)).concat(exception?.busy||[]);
   for(const block of merge(busy)){const next=[];for(const w of free){if(block.end<=w.start||block.start>=w.end)next.push(w);else{if(block.start>w.start)next.push({start:w.start,end:block.start});if(block.end<w.end)next.push({start:block.end,end:w.end});}}free=next;}
   return free;
 }
 function slot(task,date,entries,tasks,settings){
   const r=rule(settings,date),items=entries.filter(e=>e.date===date),byId=new Map(tasks.map(t=>[t.id,t])),gap=settings.breakMinutes||0;
   if(items.length>=r.maxTasks||items.reduce((n,e)=>n+(byId.get(e.taskId)?.duration||0),0)+task.duration>r.minutes)return null;
   const earliest=date===settings.nowDate?Math.max(0,settings.nowMinute||0):0,free=windows(settings,date),occupied=[];let cursor=free[0]?.start??r.start;
   for(const e of entries.filter(e=>e.date===date||(gap&&Number.isInteger(e.start)&&Math.abs(diff(e.date,date))===1)).sort((a,b)=>(a.start??1440)-(b.start??1440))){const duration=byId.get(e.taskId)?.duration||0,start=Number.isInteger(e.start)?e.start+diff(e.date,date)*1440:cursor;occupied.push({start:start-gap,end:start+duration+gap});if(e.date===date)cursor=Math.max(cursor,start+duration+gap);}
   const blocks=merge(occupied),fixed=minutes(task.time||'');
   if(fixed!==null)return fixed>=earliest&&free.some(w=>fixed>=w.start&&fixed+task.duration<=w.end)&&blocks.every(b=>fixed+task.duration<=b.start||fixed>=b.end)?fixed:null;
   for(const w of free){let start=Math.max(w.start,earliest);for(const b of blocks){if(start+task.duration<=b.start)break;if(start<b.end)start=b.end;}if(start+task.duration<=w.end)return start;}
   return null;
 }
 function conflicts(tasks,settings,entries){
   const byId=new Map(tasks.map(t=>[t.id,t])),result=[],gap=settings.breakMinutes||0;
   for(const e of entries){const t=byId.get(e.taskId);if(!t||e.done||!Number.isInteger(e.start))continue;const reasons=[];
     if(!windows(settings,e.date).some(w=>e.start>=w.start&&e.start+t.duration<=w.end))reasons.push('Пересекается с занятостью или выходит за свободные окна.');
     if(entries.some(other=>other.id!==e.id&&Math.abs(diff(other.date,e.date))<=1&&Number.isInteger(other.start)&&byId.has(other.taskId)&&e.start<other.start+diff(other.date,e.date)*1440+byId.get(other.taskId).duration+gap&&e.start+t.duration+gap>other.start+diff(other.date,e.date)*1440))reasons.push('Не хватает перерыва или есть пересечение с другим делом.');
     if(reasons.length)result.push({id:e.id,taskId:e.taskId,date:e.date,reasons});
   }return result;
 }
 function suggestRebook(task,source,entries,tasks,settings,today){
   if(task.paused||source.done)return null;
   const first=source.date>today?source.date:today,others=entries.filter(e=>e.id!==source.id);
   for(let offset=0;offset<=30;offset++){const date=add(first,offset);if(!eligible(task,date,others,settings,tasks)){const start=slot(task,date,others,tasks,settings);if(date!==source.date||start!==source.start)return {date,start};}}
   return null;
 }
 function assess(tasks,settings,week){
   const dates=Array.from({length:7},(_,i)=>add(week,i));let demand=0,count=0;
   for(const t of tasks.filter(t=>!t.paused)){const repeats=t.mode==='weekly'?t.frequency:dates.filter(d=>diff(d,t.anchor)>=0&&diff(d,t.anchor)%t.interval===0).length;demand+=repeats*t.duration;count+=repeats;}
   const available=dates.reduce((n,d)=>n+Math.min(rule(settings,d).maxTasks?rule(settings,d).minutes:0,windows(settings,d).reduce((s,w)=>s+w.end-w.start,0)),0);
   return {demand,available,count,over:Math.max(0,demand-available),minimumBreaks:Math.max(0,count-7)*(settings.breakMinutes||0)};
 }
 function eligible(task,date,entries,settings,tasks){
   if(!task.days.includes((parse(date).getDay()+6)%7))return 'day';
   if(task.mode==='interval'&&(diff(date,task.anchor)<0||diff(date,task.anchor)%task.interval!==0))return 'interval';
   if(entries.some(e=>e.taskId===task.id&&Math.abs(diff(date,e.date))<task.gap+1))return 'gap';
   if(slot(task,date,entries,tasks,settings)===null)return 'capacity';
   return null;
 }
 function generate(tasks,settings,week,existing=[],neighbors=[],rng=Math.random){
   const dates=Array.from({length:7},(_,i)=>add(week,i)),active=new Map(tasks.map(t=>[t.id,t]));
   const entries=existing.filter(e=>(e.done||e.pinned||(settings.notBefore&&e.date<settings.notBefore))&&active.has(e.taskId)&&dates.includes(e.date)).map(e=>({...e}));
   for(const date of dates){let cursor=rule(settings,date).start;for(const e of entries.filter(e=>e.date===date).sort((a,b)=>(a.start??1440)-(b.start??1440))){if(!Number.isInteger(e.start))e.start=cursor;cursor=Math.max(cursor,e.start+active.get(e.taskId).duration);}}
   const issues=[],ordered=tasks.filter(t=>!t.paused).slice().sort((a,b)=>a.days.length-b.days.length||b.priority-a.priority||b.duration-a.duration);
   for(const task of ordered){
     const kept=entries.filter(e=>e.taskId===task.id),fixed=[...entries,...neighbors],target=task.mode==='weekly'?task.frequency:dates.filter(d=>diff(d,task.anchor)>=0&&diff(d,task.anchor)%task.interval===0).length,need=Math.max(0,target-kept.length);
     const reasons={past:0,day:0,interval:0,gap:0,capacity:0};
     const candidates=dates.map((d,i)=>i).filter(i=>{const reason=settings.notBefore&&dates[i]<settings.notBefore?'past':eligible(task,dates[i],fixed,settings,tasks);if(reason)reasons[reason]++;return !reason;});
     let best=[],bestScore=Infinity;
     function walk(pos,chosen){
       const score=chosen.reduce((s,i)=>{const items=entries.filter(e=>e.date===dates[i]),load=items.reduce((n,e)=>n+active.get(e.taskId).duration,0);return s+load/Math.max(1,rule(settings,dates[i]).minutes)*2+items.length*.12+rng()*.65;},0);
       if(chosen.length>best.length||(chosen.length===best.length&&score<bestScore)){best=chosen.slice();bestScore=score;}
       if(chosen.length>=need)return;
       for(let j=pos;j<candidates.length;j++){const i=candidates[j];if(chosen.every(k=>Math.abs(i-k)>=task.gap+1))walk(j+1,[...chosen,i]);}
     }
     walk(0,[]);
     let added=0;for(const i of best){const start=slot(task,dates[i],[...entries,...neighbors],tasks,settings);if(start!==null){entries.push({id:uid(),taskId:task.id,date:dates[i],start,done:false,pinned:false});added++;}}
     if(added<need)issues.push({taskId:task.id,missing:need-added,reasons});
   }
   return {entries,issues};
 }
 function suggestMove(task,source,entries,tasks,settings,today){
   if(task.paused||source.done||source.pinned)return null;
   const others=entries.filter(e=>e.id!==source.id);
   for(let offset=0;offset<31;offset++){const date=add(today,offset);if(date<=source.date)continue;if(!eligible(task,date,others,settings,tasks))return {date,start:slot(task,date,others,tasks,settings)};}
   return null;
 }
 function explain(task,entry,entries,tasks,settings){
   const r=rule(settings,entry.date),load=entries.filter(e=>e.date===entry.date).reduce((n,e)=>n+(tasks.find(t=>t.id===e.taskId)?.duration||0),0),messages=[];
   if(entry.movedFrom)messages.push('Перенесено с '+entry.movedFrom+' и закреплено, чтобы не потеряться при перемешивании.');
   if(entry.done)messages.push('Выполненное дело сохраняется на своём месте.');
   else if(entry.pinned)messages.push('День закреплён вами. Ручное закрепление может превышать лимиты.');
   else messages.push('Выбран один из подходящих дней: учитываются свободное время, частота, перерывы и нагрузка. Между допустимыми вариантами есть случайный выбор.');
   messages.push('Подходящие дни: '+task.days.map(i=>['Пн','Вт','Ср','Чт','Пт','Сб','Вс'][i]).join(', ')+'.');
   messages.push('Свободные часы: '+(windows(settings,entry.date).map(w=>clock(w.start)+'–'+clock(w.end)).join(', ')||'нет')+'. Нагрузка дня: '+load+' из '+r.minutes+' мин.');
   if(task.time)messages.push('Задано точное начало: '+task.time+'.');
   if(task.gap)messages.push('Между повторениями — минимум '+task.gap+' полных дней.');
   if(load>r.minutes)messages.push('Лимит превышен сохранёнными или закреплёнными делами. Их можно изменить вручную.');
   if(Number.isInteger(entry.start)&&(entry.start<r.start||entry.start+task.duration>r.end))messages.push('Сохранённое время выходит за текущие свободные часы. Открепите невыполненное дело и перемешайте неделю, чтобы подобрать новое время.');
   if(settings.breakMinutes)messages.push('Перерыв между делами — '+settings.breakMinutes+' мин.');for(const c of conflicts(tasks,settings,entries.filter(e=>Math.abs(diff(e.date,entry.date))<=1)).filter(c=>c.id===entry.id))messages.push(...c.reasons);return messages;
 }
 const api={dateKey,parse,add,diff,monday,uid,clock,minutes,rule,merge,windows,slot,conflicts,suggestRebook,assess,eligible,generate,suggestMove,explain};
 if(typeof module!=='undefined')module.exports=api;root.Planner=api;
})(typeof window!=='undefined'?window:globalThis);
