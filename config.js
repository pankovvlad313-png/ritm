(function(root){
 'use strict';
 function normalize(d){
   const s=d.settings;
   if(s.dayRules===undefined)s.dayRules=Array.from({length:7},()=>({minutes:s.minutes,maxTasks:s.maxTasks,start:540,end:1260}));
   if(!Array.isArray(s.dayRules)||s.dayRules.length!==7)throw Error('Нужны правила для семи дней.');
   for(const r of s.dayRules)if(!r||!Number.isInteger(r.minutes)||r.minutes<0||r.minutes>1440||!Number.isInteger(r.maxTasks)||r.maxTasks<0||r.maxTasks>30||!Number.isInteger(r.start)||r.start<0||!Number.isInteger(r.end)||r.end>1440||r.start>=r.end)throw Error('Проверьте часы и нагрузку по дням.');
   if(s.dateOverrides===undefined)s.dateOverrides={};
   if(!s.dateOverrides||Array.isArray(s.dateOverrides)||typeof s.dateOverrides!=='object'||Object.keys(s.dateOverrides).length>366)throw Error('Некорректные временные лимиты.');
   for(const [date,r] of Object.entries(s.dateOverrides))if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!r||!Number.isInteger(r.minutes)||r.minutes<0||r.minutes>1440)throw Error('Некорректный лимит дня.');
   if(s.notifications===undefined)s.notifications={enabled:false,morning:'09:00',lead:10,tray:true};
   const n=s.notifications;if(!n||typeof n.enabled!=='boolean'||typeof n.tray!=='boolean'||root.Planner.minutes(n.morning)===null||!Number.isInteger(n.lead)||n.lead<0||n.lead>60)throw Error('Некорректные настройки напоминаний.');
   for(const t of d.tasks){if(t.time===undefined)t.time='';if(t.time!==''&&root.Planner.minutes(t.time)===null)throw Error('Некорректное время дела.');}
   for(const w of Object.values(d.weeks))for(const e of w.entries){if(e.start!==undefined&&(!Number.isInteger(e.start)||e.start<0||e.start>1439))throw Error('Некорректное время в расписании.');if(e.movedFrom!==undefined&&!/^\d{4}-\d{2}-\d{2}$/.test(e.movedFrom))throw Error('Некорректная дата переноса.');}

   function ranges(value,label,max=12){if(!Array.isArray(value)||value.length>max)throw Error('Проверьте '+label+'.');for(const w of value)if(!w||!Number.isInteger(w.start)||!Number.isInteger(w.end)||w.start<0||w.end>1440||w.start>=w.end)throw Error('Некорректный промежуток: '+label+'.');return root.Planner.merge(value);}
   function realDate(s){return typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&root.Planner.dateKey(root.Planner.parse(s))===s;}
   for(const r of s.dayRules)r.windows=ranges(r.windows??[{start:r.start,end:r.end}],'свободные окна');
   if(s.breakMinutes===undefined)s.breakMinutes=0;
   if(!Number.isInteger(s.breakMinutes)||s.breakMinutes<0||s.breakMinutes>120)throw Error('Перерыв должен быть от 0 до 120 минут.');
   if(s.busyBlocks===undefined)s.busyBlocks=[];
   if(!Array.isArray(s.busyBlocks)||s.busyBlocks.length>200)throw Error('Слишком много блоков занятости.');
   const blockIds=new Set();
   for(const b of s.busyBlocks){if(!b||typeof b.id!=='string'||blockIds.has(b.id)||typeof b.title!=='string'||!b.title.trim()||b.title.length>100||!Array.isArray(b.days)||!b.days.length||new Set(b.days).size!==b.days.length||b.days.some(i=>!Number.isInteger(i)||i<0||i>6))throw Error('Некорректный блок занятости.');ranges([b],'занятость');blockIds.add(b.id);}
   if(s.exceptions===undefined)s.exceptions={};
   if(!s.exceptions||typeof s.exceptions!=='object'||Array.isArray(s.exceptions)||Object.keys(s.exceptions).length>366)throw Error('Не больше 366 дат с исключениями.');
   for(const [date,e] of Object.entries(s.exceptions)){if(!realDate(date)||!e||typeof e!=='object'||Array.isArray(e))throw Error('Некорректная дата исключения.');if(e.windows!==undefined)e.windows=ranges(e.windows,'окна на дату');if(e.busy===undefined)e.busy=[];ranges(e.busy,'занятость на дату',30);for(const b of e.busy)if(typeof b.title!=='string'||b.title.length>100)throw Error('Некорректное название встречи.');}

   return d;
 }
 const api={normalize};if(typeof module!=='undefined')module.exports=api;root.RitmConfig=api;
})(typeof window==='undefined'?globalThis:window);
