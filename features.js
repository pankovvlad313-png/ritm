(function(){
 'use strict';
 const api=window.ritmDesktop,HISTORY='ritm-history-v1';
 let syncTimer,backupMessage='',desktopStatus=null,movePlans=[],syncChain=Promise.resolve(),lastWebAt=0,previewWeeks=null,previewState='';
 RitmConfig.normalize(state);for(const date of Object.keys(state.settings.dateOverrides))if(date<P.add(TODAY,-90))delete state.settings.dateOverrides[date];
 let migrated=false;for(const w of Object.values(state.weeks)){const booked=w.entries.filter(e=>Number.isInteger(e.start));for(const e of w.entries.filter(e=>!Number.isInteger(e.start))){const t=task(e.taskId),start=t&&P.slot(t,e.date,booked,state.tasks,state.settings);if(Number.isInteger(start)){e.start=start;booked.push(e);migrated=true;}}}if(migrated)save();
 function currentSettings(){return {...state.settings,nowDate:TODAY,nowMinute:Math.ceil((new Date().getHours()*60+new Date().getMinutes())/5)*5};}
 function allEntries(){return Object.values(state.weeks).flatMap(w=>w.entries);}
 function info(title,html){let d=document.querySelector('#feature-dialog');if(!d){d=document.createElement('dialog');d.id='feature-dialog';d.className='feature-dialog';document.body.append(d);}d.innerHTML='<div class="dialog-head"><h2>'+esc(title)+'</h2><button class="close" data-feature="close" aria-label="Закрыть">×</button></div>'+html;d.showModal();}
 function settings(){
 const s=state.settings,n=s.notifications;
 return '<form id="settings-form" class="panel"><h2>Свободные часы и нагрузка</h2><p>Задайте часы для дел и свой темп на каждый день. 0 минут или 0 дел означает выходной. Время — местное, без перехода через полночь.</p><div class="rules-table"><div class="rules-heading"><span>День</span><span>С</span><span>До</span><span>Минут</span><span>Дел</span></div>'+s.dayRules.map((r,i)=>'<div class="rule-row"><strong>'+days[i]+'</strong><input aria-label="'+fullDays[i]+': начало" name="start-'+i+'" type="time" required value="'+P.clock(r.start)+'"><input aria-label="'+fullDays[i]+': конец" name="end-'+i+'" type="time" required value="'+P.clock(r.end)+'"><input aria-label="'+fullDays[i]+': лимит минут" name="minutes-'+i+'" type="number" min="0" max="1440" required value="'+r.minutes+'"><input aria-label="'+fullDays[i]+': лимит дел" name="tasks-'+i+'" type="number" min="0" max="30" required value="'+r.maxTasks+'"></div>').join('')+'</div><h2>Напоминания</h2><label class="toggle-row"><input name="notify" type="checkbox" '+(n.enabled?'checked ':'')+(!api?'disabled':'')+'> Напоминать о делах в Windows</label><div class="settings-grid"><div class="field"><label for="morning-time">Утренняя сводка</label><input id="morning-time" name="morning" type="time" required value="'+n.morning+'"></div><div class="field"><label for="reminder-lead">За сколько минут напоминать</label><input id="reminder-lead" name="lead" type="number" min="0" max="60" required value="'+n.lead+'"></div></div><label class="toggle-row"><input name="tray" type="checkbox" '+(n.tray?'checked':'')+'> Оставаться в трее при закрытии окна</label><p class="hint">'+(api?'Напоминания приходят, пока Ритм запущен, в том числе в трее. После перезагрузки компьютера откройте Ритм. Для полного выхода выберите «Файл → Выйти». Проверьте, что уведомления разрешены в Windows.':'Системные напоминания доступны в Windows-версии. В браузере можно экспортировать расписание в календарь.')+'</p><div class="actions"><button class="btn primary" type="submit">Сохранить и пересобрать</button>'+(api?'<button class="btn" type="button" data-feature="test-notify">Проверить уведомление</button>':'')+'</div><p id="notification-status" role="status"></p><p class="error" id="rules-error" role="alert"></p></form><section class="panel"><h2>Ваши данные и история</h2><p>'+(api?'Автоматические копии сохраняются на диске при запуске и после изменений, не чаще раза в час. Хранятся последние 30 копий. Они остаются после переустановки приложения.':'Автоматические копии хранятся в этом браузере: до 10 версий, не чаще раза в час. Для защиты от очистки браузера скачайте JSON.')+'</p><div class="actions wrap"><button class="btn" data-feature="backups">История и восстановление</button><button class="btn" data-feature="backup-now">Создать копию сейчас</button><button class="btn" data-action="export">Скачать JSON</button><button class="btn" data-action="import">Загрузить JSON</button><button class="btn" data-action="calendar">Экспорт в календарь</button></div><p class="hint">Экспорт включает время начала и окончания. Копии находятся на этом устройстве; синхронизации между устройствами пока нет.</p><p id="backup-status" role="status">'+esc(backupMessage)+'</p></section>'+(state.demo?'<section class="panel"><h2>Начать со своих дел</h2><p>Удалите примеры и создайте своё расписание. Перед этим будет сделана резервная копия.</p><button class="btn danger" data-action="clear-demo">Удалить примеры</button></section>':'');
 }
 settingsView=settings;
 function saveSettings(form){
   try{
     const f=new FormData(form),settings={...state.settings,dayRules:Array.from({length:7},(_,i)=>({start:P.minutes(f.get('start-'+i)),end:P.minutes(f.get('end-'+i)),minutes:+f.get('minutes-'+i),maxTasks:+f.get('tasks-'+i)})),notifications:{enabled:api?f.has('notify'):state.settings.notifications.enabled,morning:f.get('morning'),lead:+f.get('lead'),tray:f.has('tray')}};
     RitmConfig.normalize({settings,tasks:state.tasks,weeks:state.weeks});
     settings.minutes=Math.max(15,...settings.dayRules.map(r=>r.minutes));settings.maxTasks=Math.max(1,...settings.dayRules.map(r=>r.maxTasks));
     state.settings=settings;regenerateAll();toast('Свободные часы, нагрузка и напоминания сохранены');
   }catch(error){document.querySelector('#rules-error').textContent=error.message;}
 }
 function webHistory(){try{const list=JSON.parse(localStorage.getItem(HISTORY)||'[]');return Array.isArray(list)?list:[];}catch{return [];}}
 async function sync(force=false,raw=JSON.stringify(state)){
   if(api){
     desktopStatus=await api.sync(raw);
     if(force)await api.createBackup();
   }else if(force||Date.now()-lastWebAt>=3600000){
     const list=webHistory();if(force||list[0]?.raw!==raw){const record={id:P.uid(),created:new Date().toISOString(),raw};localStorage.setItem(HISTORY,JSON.stringify([record,...list].slice(0,10)));}lastWebAt=Date.now();
   }
 }
 function queueSync(force=false){const raw=JSON.stringify(state);syncChain=syncChain.catch(()=>{}).then(()=>sync(force,raw)).then(()=>{backupMessage='Резервные копии включены.';statusText();}).catch(()=>{backupMessage='Не удалось сохранить резервную копию. Скачайте JSON в настройках.';statusText();});return syncChain;}
 function statusText(){
   const b=document.querySelector('#backup-status');if(b)b.textContent=backupMessage;
   const n=document.querySelector('#notification-status');if(n&&desktopStatus)n.textContent=desktopStatus.notificationError||(!desktopStatus.supported?'Системные уведомления недоступны.':state.settings.notifications.enabled?(desktopStatus.background?'Напоминания включены. Ритм работает и в трее.':'Напоминания включены, пока приложение открыто.'):'Напоминания выключены.');
 }
 function scheduleSync(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>queueSync(),300);}
 function missed(){return allEntries().filter(e=>e.date<TODAY&&!e.done&&!e.pinned&&!task(e.taskId)?.paused);}
 function addTools(){
   if((view==='week'||view==='today')&&!document.querySelector('#rhythm-tools')){
     const box=document.createElement('section');box.id='rhythm-tools';box.className='rhythm-tools';
     const count=missed().length,override=state.settings.dateOverrides[TODAY];
     box.innerHTML='<div><strong>Подстройте неделю под себя</strong><p>'+(count?'Есть '+count+' пропущенных дел. Можно подобрать для них новые дни.':'Учитываем ваше свободное время и нагрузку.')+'</p></div><div class="actions wrap"><button class="btn" data-feature="missed">Перенести пропущенные'+(count?' · '+count:'')+'</button><button class="btn" data-feature="light">'+(override?'Вернуть обычный темп':'Сегодня мало сил')+'</button>'+(undo?.all?'<button class="btn" data-feature="undo-all">Отменить изменение</button>':'')+'</div>';
     document.querySelector('.heading').after(box);
   }
   for(const day of document.querySelectorAll('main .day')){const index=Array.from(day.parentNode.children).indexOf(day),date=view==='today'?TODAY:P.add(week,index),r=P.rule(state.settings,date);const load=day.querySelector('.day-load');if(load&&!load.querySelector('.day-capacity')){const p=document.createElement('small');p.className='day-capacity';const actual=allEntries().filter(e=>e.date===date),loadMinutes=actual.reduce((n,e)=>n+(task(e.taskId)?.duration||0),0);if(loadMinutes>r.minutes||actual.length>r.maxTasks)p.style.color='#ad5d62';p.textContent=P.clock(r.start)+'–'+P.clock(r.end)+' · до '+r.minutes+' мин';load.after(p);}}
   statusText();
 }
 function editorTime(){
   const form=document.querySelector('#task-form');if(!form||form.querySelector('[name="time"]'))return;
   const t=task(form.dataset.id),field=document.createElement('div');field.className='field';field.innerHTML='<label for="task-time">Точное начало (необязательно)</label><input id="task-time" name="time" type="time" value="'+esc(t?.time||'')+'"><small>Оставьте пустым — подберём свободное время внутри часов этого дня. Если заданное время занято, появится объяснение.</small>';form.querySelector('.dialog-actions').before(field);
 }
 function plannedWeeks(){const weeks=JSON.parse(JSON.stringify(state.weeks));for(let offset=0;offset<=30;offset+=1){const k=P.monday(P.add(TODAY,offset));if(!weeks[k])weeks[k]=P.generate(state.tasks,{...currentSettings(),notBefore:TODAY},k,[],Object.values(weeks).flatMap(w=>w.entries));}return weeks;}
 function buildMoves(){
   const planning=plannedWeeks();previewWeeks=planning;previewState=JSON.stringify(state);let entries=Object.values(planning).flatMap(w=>w.entries);movePlans=[];
   for(const source of missed().sort((a,b)=>a.date.localeCompare(b.date)).slice(0,100)){
     const target=P.suggestMove(task(source.taskId),source,entries,state.tasks,currentSettings(),TODAY);movePlans.push({source:{...source},target});
     if(target)entries=entries.map(e=>e.id===source.id?{...e,...target,pinned:true}:e);
   }
   info('Перенести пропущенные дела','<p>Подбираем ближайшие свободные дни на 30 дней вперёд. Учитываем часы, лимиты, интервалы и другие повторы, включая обычное расписание будущих недель. Перенесённые дела будут закреплены. Показаны первые 100 пропусков.</p><div class="move-list">'+movePlans.map((p,i)=>'<label class="move-row"><input type="checkbox" data-move="'+i+'" '+(p.target?'checked':'disabled')+'><span><strong>'+esc(task(p.source.taskId).title)+'</strong><small>'+p.source.date+' → '+(p.target?p.target.date+' в '+P.clock(p.target.start):'Нет подходящего времени. Измените правила дела или дневные лимиты.')+'</small></span></label>').join('')+'</div><p id="move-error" class="error" role="alert"></p><div class="actions"><button class="btn" data-feature="close">Отмена</button><button class="btn primary" data-feature="apply-moves" '+(!movePlans.some(p=>p.target)?'disabled':'')+'>Перенести выбранные</button></div>');
 }
 async function applyMoves(){
   const selected=Array.from(document.querySelectorAll('[data-move]:checked')).map(el=>movePlans[+el.dataset.move]);
   if(!selected.length)return;
   // Recompute every accepted destination against current data. Deselecting earlier proposals frees capacity.
   if(JSON.stringify(state)!==previewState){document.querySelector('#feature-dialog').close();buildMoves();toast('Расписание изменилось. Просмотрите обновлённые предложения.');return;}const planning=previewWeeks;let entries=Object.values(planning).flatMap(w=>w.entries).map(e=>({...e})),moves=[];
   for(const plan of selected){const source=entries.find(e=>e.id===plan.source.id),t=source&&task(source.taskId);if(!source||source.done||source.pinned||source.date>=TODAY)continue;const target=plan.target,others=entries.filter(e=>e.id!==source.id);if(!target||P.eligible(t,target.date,others,currentSettings(),state.tasks)||P.slot(t,target.date,others,state.tasks,currentSettings())!==target.start){document.querySelector('#move-error').textContent='Выбранные повторы зависят друг от друга. Выберите все предложения или откройте список заново.';return;}moves.push({source:{...source},target});entries=entries.map(e=>e.id===source.id?{...e,...target,pinned:true}:e);}
   await queueSync(true);undo={all:JSON.parse(JSON.stringify(state.weeks))};
   for(const {source,target} of moves){
     state.weeks[P.monday(source.date)].entries=state.weeks[P.monday(source.date)].entries.filter(e=>e.id!==source.id);
     const k=P.monday(target.date);if(!state.weeks[k])state.weeks[k]=JSON.parse(JSON.stringify(planning[k]));
     state.weeks[k].entries.push({...source,...target,movedFrom:source.movedFrom||source.date,pinned:true});
   }
   document.querySelector('#feature-dialog').close();save();render();toast('Перенесено дел: '+moves.length+'. Их можно открепить или отменить перенос.');
 }
 async function showBackups(){
   try{
     await queueSync();const result=api?await api.listBackups():{items:webHistory().map(x=>({id:x.id,created:x.created,tasks:JSON.parse(x.raw).tasks.length}))};
     info('История и восстановление','<p>Перед восстановлением сохраняем текущие данные отдельной копией.</p>'+ (result.error?'<p class="error">'+esc(result.error)+'</p>':'')+'<div class="backup-list">'+result.items.map(x=>'<div class="backup-row"><span><strong>'+esc(new Date(x.created).toLocaleString('ru'))+'</strong><small>'+x.tasks+' дел</small></span><button class="btn" data-feature="restore" data-id="'+esc(x.id)+'">Восстановить</button></div>').join('')+'</div>'+(!result.items.length?'<p>Копий пока нет. Нажмите «Создать копию сейчас» в настройках.</p>':''));
   }catch{toast('Не удалось открыть историю. Скачайте JSON для сохранения данных.');}
 }
 async function restore(id){
   try{
     const raw=api?await api.readBackup(id):webHistory().find(x=>x.id===id)?.raw,data=validate(JSON.parse(raw));
     document.querySelector('#feature-dialog').close();
     ask('Восстановить эту копию?','Текущее расписание будет заменено. Перед заменой сохраним отдельную копию, чтобы можно было вернуться.',async()=>{try{await syncChain;if(api){await api.sync(JSON.stringify(state));await api.beforeRestore();}else await sync(true);state=data;undo=null;save();render();toast('Расписание восстановлено. Предыдущая версия есть в истории.');}catch{toast('Не удалось сохранить копию перед восстановлением. Данные не заменены.');}});
   }catch{toast('Копия повреждена или несовместима. Текущие данные сохранены.');}
 }
 document.addEventListener('ritm:render',addTools);document.addEventListener('ritm:save',scheduleSync);document.addEventListener('ritm:editor',editorTime);
 document.addEventListener('click',async event=>{
   const b=event.target.closest('[data-feature]');if(!b)return;
   const action=b.dataset.feature;
   if(action==='close')document.querySelector('#feature-dialog')?.close();
   if(action==='why'){const e=allEntries().find(e=>e.id===b.dataset.id);if(e)info('Почему дело здесь?','<h3>'+esc(task(e.taskId).title)+'</h3>'+P.explain(task(e.taskId),e,allEntries(),state.tasks,state.settings).map(s=>'<p>'+esc(s)+'</p>').join(''));}
   if(action==='missed')buildMoves();
   if(action==='apply-moves'){b.disabled=true;try{await applyMoves();}catch{toast('Перенос не выполнен. Попробуйте ещё раз.');}finally{b.disabled=false;}}
   if(action==='light'){
     if(state.settings.dateOverrides[TODAY]){delete state.settings.dateOverrides[TODAY];save();regenerateAll();toast('Обычный лимит на сегодня восстановлен');}
     else{const r=P.rule(state.settings,TODAY);info('Сегодня мало сил','<p>Уменьшим лимит сегодняшнего дня до '+Math.floor(r.minutes/2)+' мин. Выполненные, закреплённые и прошлые дела сохранятся. Не поместившиеся повторы останутся в подсказке, их можно распределить после изменения лимитов.</p><button class="btn primary" data-feature="apply-light">Облегчить день</button>');}
   }
   if(action==='apply-light'){await queueSync(true);undo={all:JSON.parse(JSON.stringify(state.weeks)),settings:JSON.parse(JSON.stringify(state.settings))};const r=P.rule(state.settings,TODAY);state.settings.dateOverrides[TODAY]={minutes:Math.floor(r.minutes/2)};const previous=undo;regenerateAll();undo=previous;save();document.querySelector('#feature-dialog').close();render();toast('Сегодняшний день облегчили. Изменение можно отменить.');}
   if(action==='undo-all'&&undo?.all){state.weeks=undo.all;if(undo.settings)state.settings=undo.settings;undo=null;save();render();toast('Предыдущее расписание восстановлено');}
   if(action==='backups')showBackups();
   if(action==='backup-now'){await queueSync(true);toast(backupMessage);}
   if(action==='restore')restore(b.dataset.id);
   if(action==='test-notify'&&api){try{const result=await api.testNotification();document.querySelector('#notification-status').textContent=result.shown?'Отправлено тестовое уведомление. Если его нет, проверьте уведомления и режим «Не беспокоить» в Windows.':'Windows не смогла показать уведомление.';}catch{toast('Не удалось отправить уведомление');}}
 });
 // Preserve a recovery point before destructive imports, edits and deleting sample tasks.
 document.addEventListener('click',e=>{if(e.target.closest('[data-action="import"],[data-action="clear-demo"],[data-action="delete"]'))queueSync(true);},true);
 document.addEventListener('submit',e=>{if(e.target.id==='task-form'&&e.target.dataset.id)queueSync(true);},true);
 setInterval(()=>{const today=P.dateKey(new Date());if(today!==TODAY){const previous=TODAY;TODAY=today;if(week===P.monday(previous))week=P.monday(TODAY);if(!document.querySelector('dialog[open]'))render();}queueSync();},60000);
 window.RitmEnhancements={saveSettings,ready:queueSync(),flush:()=>queueSync(),showBackups};
 render();
})();
