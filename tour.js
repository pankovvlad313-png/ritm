(function(){
  'use strict';
  const key='ritm-guide-v1',days=['Пн','Вт','Ср','Чт','Пт','Сб','Вс'];
  const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let step=0,practice,dialog,previousFocus;
  const headings=['Познакомимся с вашим ритмом','Первое небольшое дело','Задайте свой темп','Пусть неделя соберётся сама','Оставьте важное на месте','Отмечайте маленькие победы','Теперь — ваш собственный ритм'];
  function begin(){
    if(document.querySelector('#ritm-guide[open]'))return;
    if(document.querySelector('dialog[open]')){if(typeof toast==='function')toast('Закройте открытое окно и запустите обучение ещё раз.');return;}
    previousFocus=document.activeElement;step=0;practice=RitmTourModel.createPractice(Planner,Planner.dateKey(new Date()));
    dialog=document.querySelector('#ritm-guide')||document.createElement('dialog');dialog.id='ritm-guide';dialog.className='guide';dialog.setAttribute('aria-labelledby','guide-heading');
    if(!dialog.isConnected){document.body.append(dialog);dialog.addEventListener('cancel',event=>{event.preventDefault();finish('skipped');});}
    paint();dialog.showModal();
  }
  function finish(status){try{localStorage.setItem(key,status);}catch{}dialog.close();previousFocus?.focus?.();}
  function grid(kind){return `<div class="guide-week">${days.map((day,i)=>{const entry=practice.entries.find(e=>e.date===Planner.add(practice.week,i));return `<div class="guide-day"><span>${day}</span>${entry?`<div class="guide-demo-card ${entry.done?'guide-done':''}"><strong>${escape(practice.task.title)}</strong><small>${practice.task.duration} мин</small>${kind==='pin'?`<button data-guide="pin" data-id="${entry.id}" aria-pressed="${entry.pinned}" aria-label="Закрепить учебное дело на ${day}">${entry.pinned?'◆ Закреплено':'◇ Закрепить'}</button>`:kind==='complete'?`<button data-guide="complete" data-id="${entry.id}" aria-pressed="${entry.done}" aria-label="Отметить учебное дело на ${day}">${entry.done?'✓ Готово':'○ Выполнить'}</button>`:''}${entry.pinned&&kind!=='pin'?'<small>◆ Закреплено</small>':''}</div>`:'<div class="guide-free">Свободно</div>'}</div>`;}).join('')}</div>`;}
  function content(){const task=practice.task;switch(step){
    case 0:return '<div class="guide-art" aria-hidden="true"><span>Пн<br><i></i><i></i></span><span>Ср<br><i></i></span><span>Пт<br><i></i><i></i></span><b>✦</b></div><p>Пять небольших действий — и вы умеете собирать расписание под себя.</p><div class="guide-safe">Это отдельная учебная неделя. Ваши дела, расписание и отметки останутся как есть.</div>';
    case 1:return `<p>Начните с того, чему хочется уделять время. Для практики придумайте любое дело.</p><div class="field"><label for="guide-title">Название учебного дела</label><input id="guide-title" maxlength="100" value="${escape(task.title)}" placeholder="Например, играть на гитаре"></div><div class="field"><label for="guide-duration">Сколько минут нужно?</label><input id="guide-duration" type="number" min="5" max="600" value="${task.duration}"></div><div class="guide-safe">В настоящем приложении эта форма открывается кнопкой «Добавить дело».</div>`;
    case 2:return `<p>Ритм учитывает частоту, подходящие дни и перерывы. Попробуйте настроить их.</p><div class="field-row"><div class="field"><label for="guide-frequency">Раз в неделю</label><select id="guide-frequency">${[1,2,3,4,5,6,7].map(n=>`<option value="${n}" ${n===task.frequency?'selected':''}>${n}${n===7?' — каждый день':''}</option>`).join('')}</select></div><div class="field"><label for="guide-gap">Перерыв, полных дней</label><select id="guide-gap">${[0,1,2,3].map(n=>`<option value="${n}" ${n===task.gap?'selected':''}>${n}${n===1?' — не подряд':''}</option>`).join('')}</select></div></div><div class="field"><span class="field-label">Подходящие дни</span><div class="day-picker">${days.map((d,i)=>`<button data-guide="day" data-day="${i}" class="${task.days.includes(i)?'selected':''}" aria-pressed="${task.days.includes(i)}">${d}</button>`).join('')}</div></div><p class="guide-small">Для редких дел в настоящем конструкторе есть режим «Каждые N дней».</p>`;
    case 3:return `<p>Нажмите «Собрать учебную неделю». Приложение выберет дни по вашим правилам.</p><button class="btn primary" data-guide="generate">Собрать учебную неделю</button>${practice.entries.length?grid('view'):''}${practice.issues.length?'<div class="issue">Все повторы не помещаются в выбранные дни с таким перерывом. Вернитесь назад и измените правила.</div>':practice.entries.length?'<div class="guide-success">✓ Частота и перерывы соблюдены. Это пример — у вас будут свои дни.</div>':''}`;
    case 4:return `<p>Закрепите любой повтор, затем перемешайте неделю. Закреплённое дело останется на своём дне.</p>${grid('pin')}<button class="btn" data-guide="shuffle" ${practice.entries.some(e=>e.pinned)?'':'disabled'}>↝ Перемешать учебную неделю</button>${practice.shuffled?'<div class="guide-success">✓ Закреплённый день сохранился. Выполненные дела тоже не перемещаются.</div>':''}`;
    case 5:return `<p>Отметьте любое дело выполненным. Не нужно заканчивать всю неделю за один день.</p>${grid('complete')}<div class="guide-progress-copy">${practice.completed} из ${practice.entries.length} выполнено</div>${practice.completed?'<div class="guide-success">✓ В настоящем расписании отметка сразу сохраняется, а прогресс появляется в статистике.</div>':''}`;
    case 6:return '<div class="guide-finish-mark">✓</div><p>Вы уже умеете создавать дела, настраивать повторы, собирать неделю и сохранять важное на месте.</p><div class="guide-tips"><div><strong>Мои дела</strong><span>Добавьте свои привычки и занятия.</span></div><div><strong>Сегодня</strong><span>Сосредоточьтесь на одном дне.</span></div><div><strong>Настройки</strong><span>Выберите нагрузку и скачайте резервную копию.</span></div></div><div class="guide-safe">Обучение можно повторить кнопкой «Обучение» в меню. Учебная неделя не добавлена в ваши дела.</div>';
  }}
  function canNext(){return step===3?practice.entries.length>0&&!practice.issues.length:step===4?practice.shuffled:step===5?practice.completed>0:true;}
  function paint(){
    dialog.innerHTML=`<div class="guide-header"><span>БЫСТРЫЙ СТАРТ · ${step+1} / 7</span><button class="close" data-guide="skip" aria-label="Закрыть обучение">×</button></div><div class="guide-track" aria-label="Шаг ${step+1} из 7">${headings.map((_,i)=>`<i class="${i<=step?'active':''}"></i>`).join('')}</div><h2 id="guide-heading">${headings[step]}</h2><div class="guide-content">${content()}</div><p id="guide-error" class="error" role="alert"></p><div class="guide-actions"><button class="btn" data-guide="${step?'back':'skip'}">${step?'Назад':'Позже'}</button><button class="btn primary" data-guide="next" ${canNext()?'':'disabled'}>${step===0?'Попробовать':step===6?'Перейти к моим делам':'Далее →'}</button></div>`;
    dialog.scrollTop=0;dialog.querySelector(step===1?'#guide-title':'[data-guide="next"]')?.focus();
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-guide]');if(!button)return;const action=button.dataset.guide;
    if(action==='start'){begin();return;}if(!dialog?.open)return;
    if(action==='skip'){finish('skipped');return;}
    if(action==='back'){step--;paint();return;}
    if(action==='day'){const i=+button.dataset.day,selected=practice.task.days;practice.set({days:selected.includes(i)?selected.filter(n=>n!==i):[...selected,i]});paint();return;}
    if(action==='generate'){practice.generate();paint();return;}
    if(action==='pin'){practice.pin(button.dataset.id);paint();return;}
    if(action==='shuffle'){practice.shuffle();paint();return;}
    if(action==='complete'){practice.complete(button.dataset.id);paint();return;}
    if(action==='next'){
      if(step===1){const title=dialog.querySelector('#guide-title').value.trim(),duration=+dialog.querySelector('#guide-duration').value;if(!title||duration<5||duration>600||!Number.isInteger(duration)){dialog.querySelector('#guide-error').textContent='Введите название и длительность от 5 до 600 минут.';return;}practice.set({title,duration});}
      if(step===2&&!practice.task.days.length){dialog.querySelector('#guide-error').textContent='Выберите хотя бы один подходящий день.';return;}
      if(!canNext())return;
      if(step===6){finish('completed');if(typeof render==='function'){view='tasks';render();}return;}step++;paint();
    }
  });
  document.addEventListener('change',event=>{if(event.target.id==='guide-frequency')practice.set({frequency:+event.target.value});if(event.target.id==='guide-gap')practice.set({gap:+event.target.value});});
  function inject(){
    const nav=document.querySelector('.nav');if(nav&&!nav.querySelector('[data-guide="start"]')){const button=document.createElement('button');button.dataset.guide='start';button.innerHTML='<span aria-hidden="true">✦</span> Обучение';button.className='guide-launch';nav.append(button);}
    const main=document.querySelector('main');if(main&&document.querySelector('#settings-form')&&!document.querySelector('#guide-settings')){const panel=document.createElement('section');panel.id='guide-settings';panel.className='panel';panel.innerHTML='<h2>Освоиться в Ритме</h2><p>Пройдите короткую практику: частота дел, распределение, закрепление и отметки выполнения.</p><button class="btn" data-guide="start">Пройти обучение</button>';main.insertBefore(panel,main.querySelector('footer'));}
  }
  document.addEventListener('ritm:render',inject);inject();
  window.RitmGuide={begin};
  let seen=false;try{seen=!!localStorage.getItem(key);}catch{seen=true;}
  if(!seen)setTimeout(()=>{try{seen=!!localStorage.getItem(key);}catch{seen=true;}if(!seen&&!document.querySelector('dialog[open]'))begin();},700);
})();
