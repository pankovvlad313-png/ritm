const P=require('../planner.js');
function dueNotifications(snapshot,now,sent={}){
 const n=snapshot?.settings?.notifications;if(!n?.enabled)return [];
 const date=P.dateKey(now),minute=now.getHours()*60+now.getMinutes(),entries=Object.values(snapshot.weeks||{}).flatMap(w=>w.entries||[]).filter(e=>e.date===date&&!e.done),tasks=new Map(snapshot.tasks.map(t=>[t.id,t])),result=[];
 const morning=P.minutes(n.morning),summary='summary:'+date;
 if(entries.length&&minute>=morning&&minute<morning+30&&!sent[summary])result.push({id:summary,title:'Ваш ритм на сегодня',body:entries.length+' дел · '+entries.reduce((s,e)=>s+(tasks.get(e.taskId)?.duration||0),0)+' мин. Откройте Ритм, чтобы посмотреть расписание.'});
 for(const e of entries){const t=tasks.get(e.taskId);if(!t||t.paused||!Number.isInteger(e.start)||minute>=e.start+t.duration)continue;const at=e.start-n.lead,id='entry:'+date+':'+e.id+':'+e.start;if(minute>=at&&minute<at+5&&!sent[id])result.push({id,title:t.title,body:P.clock(e.start)+' · '+t.duration+' мин. Пора уделить время этому делу.'});}
 // A backlog after waking the computer never floods the desktop.
 return result.slice(0,3);
}
module.exports={dueNotifications};
