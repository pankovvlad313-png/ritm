module.exports=async function(){
  const initial={title:document.title,days:document.querySelectorAll('main .day').length,cards:document.querySelectorAll('main .task-card').length,hasNode:typeof require!=='undefined'};
  const before=localStorage.getItem('ritm-planner-v1');
  localStorage.setItem('ritm-smoke','ok');const storageWorks=localStorage.getItem('ritm-smoke')==='ok';localStorage.removeItem('ritm-smoke');
  function click(action){const button=document.querySelector('#ritm-guide [data-guide="'+action+'"]');if(!button||button.disabled)throw Error('Guide action not available: '+action);button.click();}
  window.RitmGuide.begin();click('next');
  document.querySelector('#guide-title').value='Учебная гитара';click('next');click('next');click('generate');
  if(document.querySelectorAll('.guide-demo-card').length!==3)throw Error('Practice should schedule 3 repeats');
  click('next');const fixed=document.querySelector('[data-guide="pin"]').dataset.id;click('pin');click('shuffle');
  if(!document.querySelector('[data-guide="pin"][data-id="'+fixed+'"][aria-pressed="true"]'))throw Error('Practice pin lost');
  click('next');click('complete');click('next');click('next');
  const practicePreserved=localStorage.getItem('ritm-planner-v1')===before,guideComplete=localStorage.getItem('ritm-guide-v1')==='completed'&&!document.querySelector('#ritm-guide').open;
  document.querySelector('[data-action="nav"][data-view="settings"]').click();
  const desktopState=await window.ritmDesktop.getUpdateState();

  async function until(condition){const deadline=Date.now()+5000;while(!condition()){if(Date.now()>deadline)throw Error('Async UI deadline exceeded');await new Promise(resolve=>setTimeout(resolve,20));}}
  await window.RitmEnhancements.ready;
  const form=document.querySelector('#settings-form');
  if(form.querySelectorAll('.rule-row').length!==7)throw Error('Missing daily settings');
  for(let i=0;i<7;i++){form.elements['windows-'+i].value='19:00–22:00';form.elements['minutes-'+i].value=i===6?'0':'120';form.elements['tasks-'+i].value='4';}
  form.requestSubmit();
  if(state.settings.dayRules[0].start!==1140||state.settings.dayRules[6].minutes!==0)throw Error('Settings not saved');
  document.querySelector('[data-action="nav"][data-view="tasks"]').click();document.querySelector('[data-action="add"]').click();
  document.querySelector('#title').value='Дело с точным временем';document.querySelector('#task-time').value='20:00';document.querySelector('#task-form').requestSubmit();
  if(state.tasks.at(-1).time!=='20:00')throw Error('Task time not saved');
  document.querySelector('[data-action="nav"][data-view="week"]').click();
  const beforeLight=JSON.stringify(state.weeks);
  document.querySelector('[data-feature="light"]').click();document.querySelector('[data-feature="apply-light"]').click();
  await until(()=>!!state.settings.dateOverrides[TODAY]);
  if(!state.settings.dateOverrides[TODAY])throw Error('Light day not applied');
  document.querySelector('[data-feature="undo-all"]').click();
  if(JSON.stringify(state.weeks)!==beforeLight||state.settings.dateOverrides[TODAY])throw Error('Light day undo lost data');
  const oldDate=P.add(TODAY,-2),oldWeek=P.monday(oldDate),carryTask={id:'smoke-carry',title:'Перенос из прошлого',category:'home',duration:5,frequency:1,mode:'weekly',days:[0,1,2,3,4,5,6],gap:0,interval:2,anchor:oldDate,priority:3,paused:false,notes:'',time:''};
  state.tasks.push(carryTask);if(!state.weeks[oldWeek])state.weeks[oldWeek]={entries:[],issues:[]};state.weeks[oldWeek].entries.push({id:'smoke-missed',taskId:carryTask.id,date:oldDate,done:false,pinned:false});save();render();
  document.querySelector('[data-feature="missed"]').click();
  const carryRow=Array.from(document.querySelectorAll('.move-row')).find(el=>el.textContent.includes(carryTask.title));
  if(!carryRow||carryRow.querySelector('input').disabled)throw Error('Missing carry proposal');
  for(const el of document.querySelectorAll('[data-move]'))el.checked=el===carryRow.querySelector('input');
  document.querySelector('[data-feature="apply-moves"]').click();
  await until(()=>Object.values(state.weeks).some(w=>w.entries.some(e=>e.id==='smoke-missed'&&e.movedFrom)));
  const moved=Object.values(state.weeks).flatMap(w=>w.entries).find(e=>e.id==='smoke-missed');
  if(!moved||moved.date<TODAY||!moved.pinned||moved.movedFrom!==oldDate)throw Error('Missed task not moved safely');
  const why=document.querySelector('[data-feature="why"]');if(why){why.click();if(!document.querySelector('#feature-dialog').textContent.includes('Свободные часы'))throw Error('Missing explanation');document.querySelector('#feature-dialog [data-feature="close"]').click();}
  await window.RitmEnhancements.flush();await window.ritmDesktop.createBackup();
  const history=await window.ritmDesktop.listBackups(),raw=await window.ritmDesktop.readBackup(history.items[0].id);
  const backupWorks=validate(JSON.parse(raw)).tasks.some(t=>t.id==='smoke-carry');
  const recoveryId=history.items[0].id;state.tasks.find(t=>t.id==='smoke-carry').title='Временное изменение';save();await window.RitmEnhancements.flush();await window.RitmEnhancements.showBackups();document.querySelector('[data-feature="restore"][data-id="'+recoveryId+'"]').click();await until(()=>document.querySelector('#confirm').open);document.querySelector('#confirm-ok').click();await until(()=>state.tasks.find(t=>t.id==='smoke-carry').title==='Перенос из прошлого');
  const notification=await window.ritmDesktop.testNotification();if(notification.shown)throw Error('Smoke must not send OS notifications');
  document.querySelector('[data-action="nav"][data-view="settings"]').click();
  const enhancements=!!document.querySelector('#settings-form .rule-row')&&!!document.querySelector('[data-feature="backups"]');


  const calendarForm=document.querySelector('#settings-form');
  for(let i=0;i<7;i++)calendarForm.elements['windows-'+i].value='07:30–08:00, 19:00–22:00';
  calendarForm.elements.breakMinutes.value='10';calendarForm.requestSubmit();
  if(state.settings.dayRules[0].windows.length!==2||state.settings.breakMinutes!==10)throw Error('Multi-window settings not saved');
  document.querySelector('[data-calendar="add-busy"]').click();
  const busyForm=document.querySelector('#busy-form');busyForm.elements.title.value='Учебная работа';busyForm.elements.start.value='19:15';busyForm.elements.end.value='19:45';for(const el of busyForm.querySelectorAll('[name="days"]'))el.checked=true;busyForm.requestSubmit();
  await until(()=>state.settings.busyBlocks.some(b=>b.title==='Учебная работа'));
  document.querySelector('[data-calendar="add-exception"]').click();
  const exceptionDate=P.add(TODAY,3),exceptionForm=document.querySelector('#exception-form');exceptionForm.elements.date.value=exceptionDate;exceptionForm.elements.mode.value='off';exceptionForm.requestSubmit();
  await until(()=>state.settings.exceptions[exceptionDate]?.windows?.length===0);
  if(P.windows(state.settings,exceptionDate).length)throw Error('Full day exception ignored');
  let conflictDate=P.add(TODAY,1);while((P.parse(conflictDate).getDay()+6)%7===6||conflictDate===exceptionDate)conflictDate=P.add(conflictDate,1);
  state.tasks.push({...carryTask,id:'calendar-conflict',title:'Закреплённое дело в занятое время'});const conflictWeek=P.monday(conflictDate);if(!state.weeks[conflictWeek])state.weeks[conflictWeek]={entries:[],issues:[]};state.weeks[conflictWeek].entries.push({id:'calendar-pinned',taskId:'calendar-conflict',date:conflictDate,start:1155,pinned:true,done:false});save();week=conflictWeek;view='week';render();
  document.querySelector('[data-calendar="conflicts"]').click();
  const rebook=document.querySelector('[data-calendar="rebook"][data-id="calendar-pinned"]');if(!rebook)throw Error('Pinned conflict has no rebooking proposal');rebook.click();
  await until(()=>!document.querySelector('#calendar-dialog').open);
  const corrected=Object.values(state.weeks).flatMap(w=>w.entries).find(e=>e.id==='calendar-pinned');if(!corrected.pinned||corrected.start===1155||P.conflicts(state.tasks,state.settings,[corrected]).length)throw Error('Rebooking still conflicts with work');
  if(!document.querySelector('#week-capacity'))throw Error('Missing week capacity report');
  await window.RitmEnhancements.flush();const calendarWorks=true;

  return {...initial,calendarWorks,enhancements,backupWorks,storageWorks,practicePreserved,guideComplete,updaterPanel:!!document.querySelector('#desktop-updates'),updaterDisabled:desktopState.status==='disabled',version:desktopState.currentVersion};
};
