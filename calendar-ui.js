(function(){
 'use strict';
 let proposals=new Map();
 function parseWindows(text){
   if(!String(text||'').trim())return [];
   const ranges=String(text).split(/[,;]/).map(part=>{const m=part.trim().match(/^(\d{2}:\d{2})\s*[-–—]\s*(\d{2}:\d{2})$/);if(!m)throw Error('Введите окна как 07:30–08:00, 19:00–22:00.');const start=P.minutes(m[1]),end=m[2]==='24:00'?1440:P.minutes(m[2]);if(start===null||end===null||start>=end)throw Error('Конец окна должен быть позже начала. Ночной промежуток разделите на два дня.');return {start,end};});
   if(ranges.length>12)throw Error('Не больше 12 окон в день.');return P.merge(ranges);
 }
 const format=windows=>windows.map(w=>P.clock(w.start)+'–'+P.clock(w.end)).join(', ');
 function modal(title,html){let d=document.querySelector('#calendar-dialog');if(!d){d=document.createElement('dialog');d.id='calendar-dialog';d.className='feature-dialog calendar-dialog';document.body.append(d);}d.innerHTML='<div class="dialog-head"><h2>'+esc(title)+'</h2><button class="close" data-calendar="close" aria-label="Закрыть">×</button></div>'+html;d.showModal();}
 function close(){document.querySelector('#calendar-dialog')?.close();}
 async function commit(settings,message){
   RitmConfig.normalize({settings,tasks:state.tasks,weeks:state.weeks});
   await window.RitmEnhancements.checkpoint();
   const previous={all:JSON.parse(JSON.stringify(state.weeks)),settings:JSON.parse(JSON.stringify(state.settings))};
   state.settings=settings;regenerateAll();undo=previous;close();render();toast(message);
 }
 function panel(){
   const s=state.settings;
   return '<section id="availability-panel" class="panel availability-panel"><div class="calendar-heading"><div><h2>Календарь занятости</h2><p>Работа, учёба и дорога вычитаются из свободных окон. Переход через полночь разделите на два дня.</p></div><button class="btn primary" data-calendar="add-busy">Добавить блок</button></div><h3>Повторяется каждую неделю</h3><div class="availability-list">'+s.busyBlocks.map(b=>'<article class="availability-row"><div><strong>'+esc(b.title)+'</strong><small>'+b.days.map(i=>days[i]).join(', ')+' · '+P.clock(b.start)+'–'+P.clock(b.end)+'</small></div><div class="actions"><button class="btn" data-calendar="edit-busy" data-id="'+esc(b.id)+'">Изменить</button><button class="btn" data-calendar="delete-busy" data-id="'+esc(b.id)+'">Удалить</button></div></article>').join('')+(!s.busyBlocks.length?'<p class="hint">Пока нет блоков. Добавьте, например, работу по будням с 09:00 до 18:00.</p>':'')+'</div><div class="calendar-heading"><h3>Разовые исключения</h3><button class="btn" data-calendar="add-exception">Добавить исключение</button></div><p class="hint">Можно занять весь день, добавить встречу или заменить свободные окна на конкретную дату. Исключения сохраняются вместе с резервной копией.</p><div class="availability-list">'+Object.entries(s.exceptions).sort(([a],[b])=>a.localeCompare(b)).map(([date,e])=>'<article class="availability-row"><div><strong>'+P.parse(date).toLocaleDateString('ru',{day:'numeric',month:'long',year:'numeric'})+'</strong><small>'+(e.windows!==undefined?(e.windows.length?'Свободно: '+format(e.windows):'Весь день занят'):'Обычные свободные окна')+(e.busy.length?' · '+e.busy.map(b=>esc(b.title)+' '+P.clock(b.start)+'–'+P.clock(b.end)).join('; '):'')+'</small></div><div class="actions"><button class="btn" data-calendar="date-exception" data-date="'+date+'">Дополнить</button><button class="btn" data-calendar="reset-exception" data-date="'+date+'">Убрать</button></div></article>').join('')+'</div></section>';
 }
 function decorate(){
   const nav=document.querySelector('.nav');if(nav&&!nav.querySelector('[data-calendar="open"]')){const b=document.createElement('button');b.dataset.calendar='open';b.innerHTML=icon('clock')+'Занятость';nav.append(b);}
   const form=document.querySelector('#settings-form');
   if(form&&!form.querySelector('.window-input')){
     form.querySelector('.rules-table').classList.add('multi-window-table');
     form.querySelector('.rules-heading').innerHTML='<span>День</span><span>Свободные окна</span><span>Минут</span><span>Дел</span>';
     form.querySelectorAll('.rule-row').forEach((row,i)=>{const start=row.querySelector('[name="start-'+i+'"]'),end=row.querySelector('[name="end-'+i+'"]');start.type='hidden';end.type='hidden';const input=document.createElement('input');input.type='text';input.name='windows-'+i;input.className='window-input';input.setAttribute('aria-label',fullDays[i]+': свободные окна');input.placeholder='07:30–08:00, 19:00–22:00';input.value=format(state.settings.dayRules[i].windows);row.insertBefore(input,start);});
     const hint=document.createElement('p');hint.className='hint';hint.textContent='Несколько окон разделяйте запятой: 07:30–08:00, 19:00–22:00. Пустое поле — без дел в этот день. Лимит минут относится к делам; перерывы занимают свободное время отдельно.';form.querySelector('.rules-table').after(hint);
     const field=document.createElement('div');field.className='field break-field';field.innerHTML='<label for="break-minutes">Перерыв между делами, мин</label><input id="break-minutes" name="breakMinutes" type="number" min="0" max="120" required value="'+state.settings.breakMinutes+'">';hint.after(field);
     form.insertAdjacentHTML('afterend',panel());
   }
   if(view==='week'||view==='today'){
     const w=view==='today'?P.monday(TODAY):week,entries=ensure(w).entries,report=P.assess(state.tasks,state.settings,w),conflicts=P.conflicts(state.tasks,state.settings,entries).filter(c=>c.date>=TODAY);
     if(!document.querySelector('#week-capacity')){
       const box=document.createElement('section');box.id='week-capacity';box.className='capacity-panel'+(report.over||conflicts.length?' capacity-warning':'');
       box.innerHTML='<div><strong>Реалистичная неделя</strong><p>На дела нужно '+time(report.demand)+', доступно до '+time(report.available)+' после занятости и дневных лимитов.</p><small>'+(report.over?'Не хватает как минимум '+time(report.over)+'. Можно сократить частоту или отложить менее важное.':'Это оценка общего времени. Подходящие дни, длина отдельных окон и перерывы могут ограничить размещение.')+'</small></div><div class="actions wrap"><button class="btn" data-calendar="capacity">Посмотреть нагрузку</button><button class="btn" data-calendar="conflicts">Конфликты'+(conflicts.length?' · '+conflicts.length:'')+'</button></div>';
       document.querySelector('#rhythm-tools')?.after(box);
     }
     for(const [i,day] of Array.from(document.querySelectorAll('main .day')).entries()){
       if(day.querySelector('.busy-blocks'))continue;const date=view==='today'?TODAY:P.add(week,i),s=state.settings,exception=s.exceptions[date],busy=s.busyBlocks.filter(b=>b.days.includes((P.parse(date).getDay()+6)%7)).concat(exception?.busy||[]);
       const box=document.createElement('div');box.className='busy-blocks';box.innerHTML=(exception?.windows?.length===0?'<div class="busy-pill">Весь день занят</div>':'')+busy.map(b=>'<div class="busy-pill"><strong>'+esc(b.title)+'</strong><span>'+P.clock(b.start)+'–'+P.clock(b.end)+'</span></div>').join('');day.querySelector('.day-load')?.after(box);
     }
   }
 }
 function openCalendar(){view='settings';render();document.querySelector('#availability-panel')?.scrollIntoView({block:'start',behavior:'smooth'});}
 function busyEditor(id){
   const b=state.settings.busyBlocks.find(b=>b.id===id)||{title:'Работа',days:[0,1,2,3,4],start:540,end:1080};
   modal(id?'Изменить занятость':'Повторяющийся блок','<form id="busy-form" data-id="'+esc(id||'')+'"><div class="field"><label for="busy-title">Название</label><input id="busy-title" name="title" maxlength="100" required value="'+esc(b.title)+'"></div><fieldset class="busy-days"><legend>Повторять по дням</legend>'+days.map((d,i)=>'<label><input type="checkbox" name="days" value="'+i+'" '+(b.days.includes(i)?'checked':'')+'>'+d+'</label>').join('')+'</fieldset><div class="field-row"><div class="field"><label for="busy-start">С</label><input id="busy-start" name="start" type="time" required value="'+P.clock(b.start)+'"></div><div class="field"><label for="busy-end">До</label><input id="busy-end" name="end" type="time" required value="'+(b.end===1440?'23:59':P.clock(b.end))+'"></div></div><p class="hint">Занятость может пересекаться с другими блоками — общее время будет вычтено один раз. Расписание пересоберётся, закреплённые дела сохранятся с предупреждениями.</p><p id="calendar-error" class="error" role="alert"></p><button type="submit" class="btn primary">Сохранить занятость</button></form>');
 }
 function exceptionEditor(date){
   modal('Исключение на дату','<form id="exception-form"><div class="field"><label for="exception-date">Дата</label><input id="exception-date" name="date" type="date" required value="'+(date||TODAY)+'"></div><div class="field"><label for="exception-mode">Что меняется?</label><select id="exception-mode" name="mode"><option value="busy">Разовая встреча или поездка</option><option value="off">Весь день занят</option><option value="windows">Другие свободные окна</option></select></div><div class="exception-busy"><div class="field"><label for="exception-title">Название встречи</label><input id="exception-title" name="title" maxlength="100" value="Встреча"></div><div class="field-row"><div class="field"><label for="exception-start">С</label><input id="exception-start" name="start" type="time" value="12:00"></div><div class="field"><label for="exception-end">До</label><input id="exception-end" name="end" type="time" value="13:00"></div></div></div><div class="field exception-windows" hidden><label for="exception-windows">Свободные окна на эту дату</label><input id="exception-windows" name="windows" placeholder="07:30–08:00, 19:00–22:00"><small>Заменяют обычные окна дня. Работа и встречи продолжают вычитаться.</small></div><p id="calendar-error" class="error" role="alert"></p><button type="submit" class="btn primary">Сохранить исключение</button></form>');
 }
 function conflictDialog(){
   proposals.clear();const w=view==='today'?P.monday(TODAY):week,entries=ensure(w).entries,conflicts=P.conflicts(state.tasks,state.settings,entries).filter(c=>c.date>=TODAY),planning=window.RitmEnhancements.planning(),all=Object.values(planning).flatMap(w=>w.entries);
   const html=conflicts.map(c=>{const e=entries.find(e=>e.id===c.id),t=task(c.taskId),target=P.suggestRebook(t,e,all,state.tasks,{...state.settings,nowDate:TODAY,nowMinute:Math.ceil((new Date().getHours()*60+new Date().getMinutes())/5)*5},TODAY);if(target)proposals.set(c.id,{target,planning,snapshot:JSON.stringify(state)});return '<article class="conflict-row"><strong>'+esc(t.title)+' · '+e.date+' '+P.clock(e.start)+'</strong><p>'+c.reasons.map(esc).join(' ')+'</p>'+(target?'<button class="btn" data-calendar="rebook" data-id="'+esc(c.id)+'">Перенести на '+target.date+' в '+P.clock(target.start)+'</button>':'<p class="hint">Подходящего времени в ближайшие 30 дней нет. Измените время дела или правила занятости.</p>')+'</article>';}).join('');
   modal('Конфликты расписания',html||'<p>Конфликтов занятости и перерывов в выбранной неделе нет.</p>');
 }
 async function rebook(id){
   const p=proposals.get(id),e=Object.values(state.weeks).flatMap(w=>w.entries).find(e=>e.id===id);if(!p||!e)return;
   if(JSON.stringify(state)!==p.snapshot){close();conflictDialog();return;}
   await window.RitmEnhancements.checkpoint();const previous={all:JSON.parse(JSON.stringify(state.weeks))};const from=P.monday(e.date),to=P.monday(p.target.date);
   state.weeks[from].entries=state.weeks[from].entries.filter(x=>x.id!==id);if(!state.weeks[to])state.weeks[to]=JSON.parse(JSON.stringify(p.planning[to]));
   state.weeks[to].entries.push({...e,...p.target,pinned:true,movedFrom:e.movedFrom||e.date});undo=previous;save();close();render();toast('Дело перенесено и закреплено. Перенос можно отменить.');
 }
 function capacityDialog(){
   const w=view==='today'?P.monday(TODAY):week,a=P.assess(state.tasks,state.settings,w),low=state.tasks.filter(t=>!t.paused).slice().sort((a,b)=>a.priority-b.priority||b.duration-a.duration).slice(0,12);
   modal('Нагрузка недели','<p>На дела нужно <strong>'+time(a.demand)+'</strong>, доступно до <strong>'+time(a.available)+'</strong>. Длительность окон и правила повторения проверяются при распределении.</p><p>Перерыв между делами: '+state.settings.breakMinutes+' мин. Перерывы занимают окна, но не расходуют лимит минут на сами дела.</p><h3>Что можно упростить</h3><p>Сначала показаны дела с меньшим приоритетом. Вы сами выбираете, что изменить.</p>'+low.map(t=>'<article class="availability-row"><div><strong>'+esc(t.title)+'</strong><small>'+frequency(t)+' · '+time(t.duration)+'</small></div><div class="actions">'+(t.mode==='weekly'&&t.frequency>1?'<button class="btn" data-calendar="less" data-id="'+esc(t.id)+'">На 1 повтор реже</button>':'')+'<button class="btn" data-calendar="pause" data-id="'+esc(t.id)+'">На паузу</button></div></article>').join(''));
 }
 document.addEventListener('ritm:render',decorate);
 document.addEventListener('change',e=>{if(e.target.id==='exception-mode'){const mode=e.target.value;document.querySelector('.exception-busy').hidden=mode!=='busy';document.querySelector('.exception-windows').hidden=mode!=='windows';}});
 document.addEventListener('submit',async e=>{
   if(!['busy-form','exception-form'].includes(e.target.id))return;e.preventDefault();const form=e.target,f=new FormData(form),settings=JSON.parse(JSON.stringify(state.settings)),submit=form.querySelector('[type="submit"]');submit.disabled=true;
   try{
     if(form.id==='busy-form'){const id=form.dataset.id||P.uid(),b={id,title:String(f.get('title')).trim(),days:f.getAll('days').map(Number),start:P.minutes(f.get('start')),end:P.minutes(f.get('end'))};settings.busyBlocks=settings.busyBlocks.filter(x=>x.id!==id).concat(b);}
     else{const date=String(f.get('date')),mode=f.get('mode'),exception=settings.exceptions[date]||{busy:[]};if(mode==='off')exception.windows=[];else if(mode==='windows')exception.windows=parseWindows(f.get('windows'));else exception.busy.push({title:String(f.get('title')||'Встреча').trim(),start:P.minutes(f.get('start')),end:P.minutes(f.get('end'))});settings.exceptions[date]=exception;}
     await commit(settings,'Занятость сохранена. Свободные дела пересобраны.');
   }catch(error){document.querySelector('#calendar-error').textContent=error.message;}finally{submit.disabled=false;}
 });
 document.addEventListener('click',async e=>{
   const b=e.target.closest('[data-calendar]');if(!b)return;const action=b.dataset.calendar,id=b.dataset.id;
   if(action==='open')openCalendar();if(action==='close')close();if(action==='add-busy')busyEditor();if(action==='edit-busy')busyEditor(id);if(action==='add-exception')exceptionEditor();if(action==='date-exception')exceptionEditor(b.dataset.date);
   if(action==='delete-busy'||action==='reset-exception'){const settings=JSON.parse(JSON.stringify(state.settings));if(action==='delete-busy')settings.busyBlocks=settings.busyBlocks.filter(x=>x.id!==id);else delete settings.exceptions[b.dataset.date];ask('Убрать правило занятости?','Свободные дела будут распределены заново. Изменение можно отменить.',()=>commit(settings,'Правило убрано'));}
   if(action==='conflicts')conflictDialog();if(action==='capacity')capacityDialog();
   if(action==='rebook'){b.disabled=true;try{await rebook(id);}catch{toast('Не удалось выполнить перенос. Расписание сохранено.');}finally{b.disabled=false;}}
   if(action==='less'||action==='pause'){const t=task(id);close();ask(action==='less'?'Уменьшить частоту?':'Поставить дело на паузу?',t.title+'. Выполненные и закреплённые повторы останутся.',async()=>{await window.RitmEnhancements.checkpoint();if(action==='less')t.frequency=Math.max(1,t.frequency-1);else t.paused=true;regenerateAll();toast('Нагрузка обновлена');});}
 });
 window.RitmCalendar={parseWindows,open:openCalendar};decorate();
})();
