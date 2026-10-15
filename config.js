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
   return d;
 }
 const api={normalize};if(typeof module!=='undefined')module.exports=api;root.RitmConfig=api;
})(typeof window==='undefined'?globalThis:window);
