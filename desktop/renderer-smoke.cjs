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
  return {...initial,storageWorks,practicePreserved,guideComplete,updaterPanel:!!document.querySelector('#desktop-updates'),updaterDisabled:desktopState.status==='disabled',version:desktopState.currentVersion};
};
