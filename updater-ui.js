(function(){
  'use strict';
  const api=window.ritmDesktop;if(!api)return;
  let update={status:'idle',currentVersion:'1.1.0',percent:0};
  const labels={idle:'Обновления проверяются автоматически.',checking:'Проверяем обновления…',current:'Установлена последняя версия.',downloading:'Загружаем обновление',ready:'Обновление готово к установке.',installing:'Перезапускаем приложение…',error:'Не удалось проверить или скачать обновление. Проверьте интернет и попробуйте ещё раз.',disabled:'В режиме разработки обновления отключены.'};
  function draw(){
    const main=document.querySelector('main');
    if(main&&document.querySelector('#settings-form')&&!document.querySelector('#desktop-updates')){
      const panel=document.createElement('section');panel.className='panel';panel.id='desktop-updates';panel.innerHTML='<h2>Версия и обновления</h2><p class="update-version"></p><p class="update-status" role="status"></p><div class="actions"><button class="btn" data-update-action="check">Проверить обновления</button><button class="btn primary" data-update-action="install" hidden>Перезапустить и обновить</button></div><p>Новые версии загружаются в фоне и устанавливаются при закрытии приложения. Дела и отметки сохраняются.</p>';main.insertBefore(panel,main.querySelector('footer'));
    }
    const panel=document.querySelector('#desktop-updates');
    if(panel){panel.querySelector('.update-version').textContent='Ритм '+update.currentVersion;panel.querySelector('.update-status').textContent=labels[update.status]+(update.status==='downloading'?' · '+update.percent+'%':'')+(update.version?' · '+update.version:'');panel.querySelector('[data-update-action="check"]').disabled=['checking','downloading','ready','installing','disabled'].includes(update.status);panel.querySelector('[data-update-action="install"]').hidden=update.status!=='ready';}
    let banner=document.querySelector('#desktop-update-banner');
    if(!banner){banner=document.createElement('aside');banner.id='desktop-update-banner';banner.className='update-banner';banner.setAttribute('aria-live','polite');banner.innerHTML='<span></span><button class="btn primary" data-update-action="install">Перезапустить и обновить</button>';document.body.append(banner);}
    banner.hidden=!['downloading','ready','installing'].includes(update.status);
    banner.querySelector('span').textContent=update.status==='downloading'?'Обновление '+update.version+' · '+update.percent+'%':update.status==='ready'?'Версия '+update.version+' готова. Ваши дела сохранятся.':'Устанавливаем обновление…';
    banner.querySelector('button').hidden=update.status!=='ready';
  }
  document.addEventListener('ritm:render',draw);
  document.addEventListener('click',async event=>{const action=event.target.closest('[data-update-action]')?.dataset.updateAction;if(!action)return;try{if(action==='check'){update=await api.checkForUpdates();draw();}if(action==='install'){if(document.querySelector('dialog[open]')){if(typeof toast==='function')toast('Сначала закройте открытое окно.');return;}await api.installUpdate();}}catch{update={...update,status:'error'};draw();}});
  api.onUpdateState(state=>{update=state;draw();});
  api.getUpdateState().then(state=>{update=state;draw();}).catch(()=>{});
})();
