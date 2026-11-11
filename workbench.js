/* Fast record lookup and project context. No new copies of company data are stored. */
(() => {
 'use strict';
 const M=window.QNJobFlow;
 const words={ru:{'Find a customer, quote, job or invoice':'Найти клиента, смету, работу или счёт','Search records':'Поиск записей','Search by name, number, phone or service':'Имя, номер, телефон или услуга','Type to search your company records.':'Начните вводить для поиска в компании.','No matching records. Try another name or number.':'Ничего не найдено. Попробуйте другое имя или номер.','Customer':'Клиент','Quote':'Смета','Job':'Работа','Invoice':'Счёт','Project workspace':'Обзор проекта','Add photo':'Добавить фото','Add extra work':'Добавить допработы','Project history':'История проекта','Recorded documents, job updates and payments.':'Сохранённые документы, изменения работ и платежи.','Load photo history':'Загрузить историю фото','Loading photos…':'Загрузка фото…','View all photos':'Все фотографии','Quote created':'Создана смета','Invoice prepared':'Подготовлен счёт','Job created':'Создана работа','Job updated':'Работа обновлена','Payment recorded':'Платёж записан','Extra work requested':'Запрошены допработы','Photo added':'Добавлено фото','No dated activity yet.':'Датированных событий пока нет.','Your account changed. Reopen search.':'Аккаунт изменился. Откройте поиск заново.','More results available. Refine your search.':'Есть другие результаты. Уточните запрос.','Showing the latest 20 entries.':'Показаны последние 20 записей.','Try again':'Повторить'},uk:{'Find a customer, quote, job or invoice':'Знайти клієнта, кошторис, роботу або рахунок','Search records':'Пошук записів','Search by name, number, phone or service':'Ім’я, номер, телефон або послуга','Type to search your company records.':'Почніть вводити для пошуку в компанії.','No matching records. Try another name or number.':'Нічого не знайдено. Спробуйте інше ім’я або номер.','Customer':'Клієнт','Quote':'Кошторис','Job':'Робота','Invoice':'Рахунок','Project workspace':'Огляд проєкту','Add photo':'Додати фото','Add extra work':'Додати допроботи','Project history':'Історія проєкту','Recorded documents, job updates and payments.':'Збережені документи, зміни робіт і платежі.','Load photo history':'Завантажити історію фото','Loading photos…':'Завантаження фото…','View all photos':'Усі фотографії','Quote created':'Створено кошторис','Invoice prepared':'Підготовлено рахунок','Job created':'Створено роботу','Job updated':'Роботу оновлено','Payment recorded':'Платіж записано','Extra work requested':'Запитані допроботи','Photo added':'Додано фото','No dated activity yet.':'Датованих подій поки немає.','Your account changed. Reopen search.':'Акаунт змінився. Відкрийте пошук знову.','More results available. Refine your search.':'Є інші результати. Уточніть запит.','Showing the latest 20 entries.':'Показано останні 20 записів.','Try again':'Повторити'}};
 const T=s=>words[window.qnLanguage?.get()]?.[s]||s;
 const scope=()=>[LS_KEY,window.qnApprovalSession?.user?.id||'',window.qnCompanySession?.ownerId||''].join('|');
 const signed=()=>document.body.classList.contains('qn-authenticated');
 const valid=account=>signed()&&scope()===account;
 function node(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;}
 function action(label,go,cls='btn btn-outline'){const b=node('button',cls,T(label));b.type='button';const account=scope();b.onclick=()=>{if(valid(account))go();};return b;}
 function openRecord(r){closeModal();if(r.kind==='customer'){showView('clients');openClientDetail(r.id);}else if(r.kind==='quote'){showView('quotes');openDocument('q',r.id);}else if(r.kind==='invoice'){showView('invoices');openDocument('i',r.id);}else window.qnOpenProject('job',r.id);}
 function search(){
  if(!signed())return;const account=scope();
  const body=openModal(T('Search records'),'');
  const label=node('label','qn-find-label',T('Search by name, number, phone or service'));label.htmlFor='qn-find-input';
  const input=node('input');input.type='search';input.id='qn-find-input';input.autocomplete='off';input.maxLength=160;
  const status=node('p','qn-find-status',T('Type to search your company records.'));status.setAttribute('role','status');status.setAttribute('aria-live','polite');
  const results=node('div','qn-find-results');body.append(label,input,status,results);
  const draw=()=>{
   results.replaceChildren();if(!valid(account)){input.disabled=true;input.value='';status.textContent=T('Your account changed. Reopen search.');return;}
   const rows=M.search(DB,input.value);status.textContent=!input.value.trim()?T('Type to search your company records.'):!rows.length?T('No matching records. Try another name or number.'):rows.length+' '+(window.qnLanguage?.get()==='ru'?'результатов':window.qnLanguage?.get()==='uk'?'результатів':'results');
   for(const r of rows.slice(0,30)){const b=action('',()=>openRecord(r),'qn-find-result');const copy=node('span');copy.setAttribute('data-qn-no-translate','');copy.append(node('strong','',String(r.title)),node('small','',r.detail));const kind=node('span','qn-find-kind',T({customer:'Customer',quote:'Quote',job:'Job',invoice:'Invoice'}[r.kind]));b.append(copy,kind);results.append(b);}
   if(rows.length>30)results.append(node('p','hint',T('More results available. Refine your search.')));
  };
  input.addEventListener('input',draw);input.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();results.querySelector('button')?.click();}});
  queueMicrotask(()=>{if(body.isConnected&&valid(account))input.focus();});
 }
 function mount(){
  const home=document.querySelector('#view-home');
  if(home&&!home.querySelector('[data-qn-find]')){const b=action('Find a customer, quote, job or invoice',search,'qn-find-launch');b.dataset.qnFind='';b.setAttribute('aria-keyshortcuts','Control+k Meta+k');const icon=node('span','qn-find-icon','⌕');icon.setAttribute('aria-hidden','true');b.prepend(icon);(home.querySelector('.qn-home-actions')||home.firstElementChild)?.after(b);}
  const more=document.querySelector('#view-more .qn-more-menu');if(more&&!more.querySelector('[data-qn-find]')){const b=action('Search records',search,'btn btn-outline qn-more-item');b.dataset.qnFind='';more.prepend(b);}
 }
 function project(page,p){
  if(page.querySelector('[data-workbench]'))return;const top=page.querySelector('.card');if(!top)return;
  const account=scope(),route=JSON.stringify(window.qnProjectRoute),j=p.job,q=p.quote,i=p.invoice;
  top.dataset.workbench='';top.classList.add('qn-workspace-hero');top.prepend(node('p','qn-workspace-eyebrow',T('Project workspace')));
  const strip=top.querySelector('.qn-project-steps');if(strip){strip.querySelectorAll('li').forEach((li,index)=>{if(j?.status==='Cancelled'||j?.status==='On Hold'){li.className=index===2?'current':'';}li.querySelector('button')?.setAttribute('aria-current',li.classList.contains('current')?'step':'false');});}
  if(j){const quick=node('div','qn-workspace-actions');quick.append(action('Add photo',()=>window.QNPhotoJournal.capture(j.id)),action('Add extra work',()=>{if(!DB.jobs.some(x=>x.id===j.id))return;window.qnOpenJobDetail(j.id);[...document.querySelectorAll('#modal-body [data-extra-work-context]')].find(panel=>panel.dataset.extraWorkContext==='job:'+j.id)?.querySelector('[data-new-extra]')?.click();}));top.append(quick);}
  const history=node('section','card qn-project-history');history.append(node('h2','',T('Project history')),node('p','hint',T('Recorded documents, job updates and payments.')));
  const list=node('ol','qn-history-list'),status=node('p','hint');status.setAttribute('role','status');history.append(list,status);page.append(history);
  const entries=[];
  const add=(label,when,detail,go)=>{const dateOnly=/^\d{4}-\d{2}-\d{2}$/.test(String(when)),time=Date.parse(dateOnly?when+'T12:00:00':when);if(Number.isFinite(time))entries.push({label,time,detail,go,dateOnly});};
  if(q)add('Quote created',q.createdAtTime||q.createdAt,q.number,()=>openDocument('q',q.id));
  if(j){add('Job created',j.createdAtTime||j.createdAt,j.title,()=>window.qnOpenJobDetail(j.id));if(j.updatedAtTime&&j.updatedAtTime!==j.createdAtTime)add('Job updated',j.updatedAtTime,M.label(j),()=>window.qnOpenJobDetail(j.id));}
  if(i)add('Invoice prepared',i.createdAtTime||i.createdAt,i.number,()=>openDocument('i',i.id));
  const payments=i?(i.payments||[]):j?(window.qnJobDepositEntries?.(j)||[]):[];
  for(const pay of payments)add('Payment recorded',pay.date,typeof money==='function'?money(pay.amount):'',i?()=>openDocument('i',i.id):()=>window.qnOpenJobDetail(j.id));
  for(const x of window.QNExtraWork?.requestsFor(DB,{jobId:j?.id,quoteId:q?.id,invoiceId:i?.id})||[])add('Extra work requested',x.createdAtTime||x.createdAt,x.number,()=>openDocument('q',x.id));
  function draw(){list.replaceChildren();const rows=entries.slice().sort((a,b)=>b.time-a.time);status.textContent=rows.length>20?T('Showing the latest 20 entries.'):!rows.length?T('No dated activity yet.'):'';for(const e of rows.slice(0,20)){const li=node('li');const b=action(e.label,e.go,'qn-history-entry');const date=node('time','',new Date(e.time).toLocaleString(window.qnLanguage?.locale?.()||'en-CA',e.dateOnly?{dateStyle:'medium'}:{dateStyle:'medium',timeStyle:'short'}));date.dateTime=new Date(e.time).toISOString();const detail=node('span','',e.detail||'');detail.setAttribute('data-qn-no-translate','');b.append(detail,date);li.append(b);list.append(li);}}
  draw();
  if(j){const load=action('Load photo history',async()=>{
    load.disabled=true;load.textContent=T('Loading photos…');
    try{const data=await window.QNPhotoJournal.api({action:'list',jobId:j.id});if(!valid(account)||!history.isConnected||JSON.stringify(window.qnProjectRoute)!==route)return;
     for(const photo of data.photos||[])add('Photo added',photo.created_at,photo.caption||window.QNPhotoJournal.phase(photo.stage),()=>window.QNPhotoJournal.editPhoto(photo));draw();load.remove();history.append(action('View all photos',()=>window.QNPhotoJournal.open(j.id)));
    }catch(e){if(valid(account)&&history.isConnected){status.textContent=e.message;load.textContent=T('Try again');load.disabled=false;}}
   });history.append(load);}
 }
 const original=window.QNSimpleUI.project;window.QNSimpleUI.project=function(page,p){original.call(this,page,p);project(page,p);};
 document.addEventListener('keydown',e=>{if((e.ctrlKey||e.metaKey)&&!e.altKey&&e.key.toLowerCase()==='k'&&signed()){e.preventDefault();search();}});
 // Buttons can mount while signed out; their click handlers check the active account afresh.
 mount();document.querySelectorAll('[data-qn-find]').forEach(b=>b.onclick=search);
 document.addEventListener('qn-language-changed',()=>{document.querySelectorAll('[data-qn-find]').forEach(b=>{const label=b.closest('#view-home')?'Find a customer, quote, job or invoice':'Search records';b.textContent=T(label);});if(signed()&&document.getElementById('view-project')?.classList.contains('active'))window.qnRenderProject?.();});
 window.QNWorkbench={search,mount};
})();
