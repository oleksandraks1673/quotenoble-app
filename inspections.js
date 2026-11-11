/* Standalone inspection records. No quote, invoice or job is required. */
(()=>{
 'use strict';
 if(window.qnInspectionsInitialized)return;
 window.qnInspectionsInitialized=true;
 const M=window.QNInspectionModel,E=window.QNPhotoEditor,copy=M.clone;
 const language=()=>window.qnLanguage?.get?.()||'en';
 const T=(en,ru,uk)=>language()==='ru'?ru||en:language()==='uk'?uk||ru||en:window.qnLanguage?.translate?.(en)||en;
 const text={
  'Enter the customer name.':['Введите имя клиента.','Введіть ім’я клієнта.'],
  'Enter the inspection address.':['Введите адрес осмотра.','Введіть адресу огляду.'],
  'Choose an inspection date.':['Укажите дату осмотра.','Вкажіть дату огляду.'],
  'Add at least one finding.':['Добавьте хотя бы один результат осмотра.','Додайте хоча б один результат огляду.'],
  'Describe each finding.':['Добавьте описание каждого результата.','Додайте опис кожного результату.'],
  'This inspection changed on another device. Reopen it before editing.':['Осмотр изменён на другом устройстве. Откройте его заново.','Огляд змінено на іншому пристрої. Відкрийте його знову.']
 };
 const message=e=>T(e.message,...(text[e.message]||[]));
 const label=()=>T('Inspections','Осмотры','Огляди');
 const status=s=>s==='complete'?T('Completed','Завершён','Завершено'):T('Draft','Черновик','Чернетка');
 const severity=s=>s==='urgent'?T('Urgent','Срочно','Терміново'):s==='repair'?T('Repair needed','Нужен ремонт','Потрібен ремонт'):T('Good condition','Всё хорошо','Усе добре');
 const node=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=value;return n;};
 const button=(value,fn,primary=false)=>{const b=node('button','btn '+(primary?'btn-primary':'btn-outline'),value);b.type='button';b.addEventListener('click',event=>{event.preventDefault();try{const result=fn();if(result?.catch)result.catch(error=>{console.error('Inspection action failed',error);window.alert('Inspection action failed. Please try again.');});}catch(error){console.error('Inspection action failed',error);window.alert('Could not open inspection. Please refresh the page and try again.');}});return b;};
 // A published HTML shell can contain a rendered section without its event listeners.
 // Reuse that section so navigation always reaches the newly bound controls.
 const existing=[...document.querySelectorAll('#view-inspections')];
 const page=existing.shift()||node('section','view');page.id='view-inspections';page.classList.add('view');
 for(const duplicate of existing)duplicate.remove();
 if(!page.isConnected)document.querySelector('main').append(page);
 let query='',filter='all',draft=null,expected,workspace,timer,dirty=false,busy=0,saveNode,actionStatus,editorRevision=0,expandedFinding=null;
 const records=()=>Array.isArray(DB.inspections)?DB.inspections:[];
 const checkScope=()=>{if(workspace!==LS_KEY)throw Error(T('Your account changed. Reopen the inspection.','Аккаунт изменился. Откройте осмотр заново.','Обліковий запис змінився. Відкрийте огляд знову.'));};
 function notice(value,error=false){for(const target of [saveNode,actionStatus])if(target?.isConnected){target.textContent=value;target.dataset.error=String(error);}}
 function askDelete(title,description){
  const result=window.qnConfirmDocumentDeletion('',T('inspection','осмотр','огляд'),description);
  const dialog=[...document.querySelectorAll('.qn-delete-dialog')].at(-1);
  if(dialog){dialog.querySelector('#qn-delete-title').textContent=title;dialog.querySelector('.qn-delete-cancel').textContent=T('Cancel','Отмена','Скасувати');dialog.querySelector('.qn-delete-accept').textContent=T('Delete','Удалить','Видалити');}
  return result;
 }
 function persist(){
  clearTimeout(timer);if(!draft||!dirty)return true;
  try{
   checkScope();const next=M.put(records(),draft,expected),before=DB.inspections;DB.inspections=next.records;
   try{save();if(window.qnSaveFailed)throw Error('Changes could not be saved.');}catch(e){if(before===undefined)delete DB.inspections;else DB.inspections=before;throw e;}
   draft.updatedAtTime=next.record.updatedAtTime;expected=draft.updatedAtTime;dirty=false;notice(T('Saved on this device. Check cloud save status before changing devices.','Сохранено на устройстве. Перед сменой устройства проверьте статус сохранения в облаке.','Збережено на пристрої. Перед зміною пристрою перевірте стан збереження в хмарі.'));return true;
  }catch(e){notice(message(e),true);return false;}
 }
 function changed(){dirty=true;notice(T('Saving…','Сохранение…','Збереження…'));clearTimeout(timer);timer=setTimeout(persist,450);}
 function field(parent,title,key,value,opts={}){
  const wrap=node('div','ins-field'),l=node('label','',title),input=node(opts.multiline?'textarea':'input');input.id='ins-'+key;l.htmlFor=input.id;input.value=value||'';
  if(!opts.multiline)input.type=opts.type||'text';if(opts.max)input.maxLength=opts.max;
  input.oninput=()=>{opts.set(input.value);changed();};input.onchange=()=>{opts.set(input.value);changed();};wrap.append(l,input);parent.append(wrap);return input;
 }
 function select(parent,title,key,options,value,set){
  const wrap=node('div','ins-field'),l=node('label','',title),s=node('select');s.id='ins-'+key;l.htmlFor=s.id;
  for(const [v,t] of options){const o=node('option','',t);o.value=v;s.append(o);}s.value=value;s.onchange=()=>{set(s.value);changed();};wrap.append(l,s);parent.append(wrap);return s;
 }
 function renderList(){
  clearTimeout(timer);page.replaceChildren();draft=null;dirty=false;editorRevision++;const top=node('div','card');top.append(node('h2','',label()),node('p','',T('Create a report for any customer, at any stage.','Создайте отчёт для любого клиента на любом этапе.','Створіть звіт для будь-якого клієнта на будь-якому етапі.')),button(T('+ New inspection','+ Новый осмотр','+ Новий огляд'),()=>edit(),true));page.append(top);
  const tools=node('div','ins-toolbar'),search=node('input'),s=node('select');search.type='search';search.placeholder=T('Search by customer, address or report number','Поиск по клиенту, адресу или номеру отчёта','Пошук за клієнтом, адресою або номером звіту');search.setAttribute('aria-label',search.placeholder);search.value=query;
  for(const [v,t] of [['all',T('All inspections','Все осмотры','Усі огляди')],['draft',status('draft')],['complete',status('complete')]]){const o=node('option','',t);o.value=v;s.append(o);}s.value=filter;s.setAttribute('aria-label',T('Filter inspections','Фильтр осмотров','Фільтр оглядів'));
  tools.append(search,s);page.append(tools);const list=node('div');page.append(list);
  function draw(){list.replaceChildren();for(const r of M.matching(records(),query,filter)){
    const row=node('article','ins-list-row'),info=node('div');info.append(node('h3','',r.title||r.number),node('p','',r.client.name||T('Customer details not entered','Клиент не указан','Клієнта не вказано')),node('p','',r.address||T('Address not entered','Адрес не указан','Адресу не вказано')),node('p','',r.number+' · '+r.date),node('span','ins-badge',status(r.status)));
    if(r.findings.some(f=>f.severity==='urgent'))info.append(node('span','ins-badge ins-urgent',severity('urgent')));
    row.append(info,button(T('Open inspection','Открыть осмотр','Відкрити огляд'),()=>edit(r.id)));list.append(row);
   }if(!list.children.length)list.append(node('div','card',T('No inspections found. Create your first inspection above.','Осмотры не найдены. Создайте осмотр кнопкой выше.','Огляди не знайдено. Створіть огляд кнопкою вище.')));
  }search.oninput=()=>{query=search.value;draw();};s.onchange=()=>{filter=s.value;draw();};draw();
 }
 function open(){showView('inspections');}
 function edit(id){
  if(busy)return;if(draft&&dirty&&!persist())return;
  workspace=LS_KEY;const old=records().find(r=>r.id===id&&!r.deletedAt);if(id&&!old)return;
  const ident=uid('inspection');draft=old?copy(old):{id:ident,number:'INS-'+ident.slice(11).toUpperCase(),title:'',client:{name:'',email:'',phone:''},address:'',date:todayStr(),inspector:DB.profile?.name||'',summary:'',status:'draft',findings:[],createdAtTime:new Date().toISOString()};
  expandedFinding=draft.findings[0]?.id||null;expected=old?.updatedAtTime;dirty=!old;try{renderEditor();if(!old)persist();window.scrollTo(0,0);}catch(error){console.error('Inspection editor failed',error);draft=null;dirty=false;renderList();const issue=node('p','ins-status',T('Could not open the inspection form. Please refresh and retry.','Не удалось открыть форму осмотра. Обновите страницу.','Не вдалося відкрити форму огляду. Оновіть сторінку.'));issue.dataset.error='true';page.prepend(issue);}
 }
 function renderEditor(){
  editorRevision++;page.replaceChildren();const top=node('div','card'),back=button(T('← All inspections','← Все осмотры','← Усі огляди'),()=>{if(!busy&&persist())renderList();});top.append(back,node('h2','',T('Inspection Report','Отчёт об осмотре','Звіт про огляд')),node('p','',draft.number+' · '+status(draft.status)));page.append(top);
  saveNode=node('p','ins-status');saveNode.setAttribute('role','status');saveNode.setAttribute('aria-live','polite');top.append(saveNode);
  field(top,T('Report title','Название отчёта','Назва звіту'),'title',draft.title,{max:150,set:v=>draft.title=v});
  const grid=node('div','ins-fields');top.append(grid);
  const customer=select(grid,T('Use a saved customer (optional)','Выбрать сохранённого клиента (необязательно)','Вибрати збереженого клієнта (необов’язково)'),'customer',[['',T('Enter customer details below','Введите данные клиента ниже','Введіть дані клієнта нижче')],...(Array.isArray(DB.clients)?DB.clients:[]).filter(c=>c&&c.id).map(c=>[String(c.id),c.name||'Customer'])],draft.clientId?String(draft.clientId):'',id=>{
   if(!id){delete draft.clientId;changed();return;}
   const c=(Array.isArray(DB.clients)?DB.clients:[]).find(c=>c&&String(c.id)===id);if(!c)return;draft.client={name:c.name||'',email:c.email||'',phone:c.phone||''};draft.address=c.address||draft.address;draft.clientId=c.id;changed();renderEditor();
  });customer.dataset.insCustomer='';
  field(grid,T('Inspection date','Дата осмотра','Дата огляду'),'date',draft.date,{type:'date',set:v=>draft.date=v});
  field(grid,T('Customer name (optional)','Имя клиента (необязательно)','Ім’я клієнта (необов’язково)'),'name',draft.client.name,{max:150,set:v=>{draft.client.name=v;delete draft.clientId;customer.value='';}});
  field(grid,T('Phone','Телефон','Телефон'),'phone',draft.client.phone,{type:'tel',max:80,set:v=>draft.client.phone=v});
  field(grid,T('Email','Эл. почта','Ел. пошта'),'email',draft.client.email,{type:'email',max:200,set:v=>draft.client.email=v});
  field(grid,T('Inspector','Кто проводил осмотр','Хто проводив огляд'),'inspector',draft.inspector,{max:150,set:v=>draft.inspector=v});
  field(top,T('Inspection address *','Адрес осмотра *','Адреса огляду *'),'address',draft.address,{max:400,set:v=>draft.address=v});
  field(top,T('Overall summary','Общее заключение','Загальний висновок'),'summary',draft.summary,{multiline:true,max:6000,set:v=>draft.summary=v});
  const findings=node('div','card');findings.append(node('h3','',T('Findings & photos','Проблемы и фото','Проблеми й фото')+' ('+draft.findings.length+')'));page.append(findings);
  if(!draft.findings.length)findings.append(node('p','ins-help',T('Add a finding, describe what you see, and attach photos.','Добавьте проблему, опишите её и прикрепите фото.','Додайте проблему, опишіть її та прикріпіть фото.')));
  for(const f of draft.findings)renderFinding(findings,f);
  findings.append(button(T('+ Add finding','+ Добавить результат','+ Додати результат'),()=>{if(busy)return;const id=uid('finding');draft.findings.push({id,title:'',description:'',severity:'repair',recommendation:'',photos:[]});expandedFinding=id;changed();renderEditor();const input=document.getElementById('ins-'+id+'-description');input?.focus({preventScroll:true});input?.scrollIntoView?.({block:'center',behavior:'smooth'});},true));
  const actions=node('div','ins-actions');page.append(actions);actionStatus=node('p','ins-status');actionStatus.setAttribute('role','status');actionStatus.setAttribute('aria-live','polite');page.append(actionStatus);
  actions.append(button(T('Save & close','Сохранить и закрыть','Зберегти й закрити'),()=>{if(!busy&&persist())renderList();},true),button(draft.status==='complete'?T('Reopen as draft','Вернуть в черновики','Повернути в чернетки'):T('Complete report','Завершить отчёт','Завершити звіт'),()=>{
   if(busy)return;try{if(draft.status!=='complete')M.validate(draft);draft.status=draft.status==='complete'?'draft':'complete';dirty=true;if(persist())renderEditor();}catch(e){notice(message(e),true);}
  }),button(T('Preview / Share PDF','Посмотреть / отправить PDF','Переглянути / надіслати PDF'),preview));
  const danger=button(T('Delete inspection','Удалить осмотр','Видалити огляд'),async()=>{
   if(busy)return;const current=draft,scope=workspace,version=editorRevision;busy++;danger.disabled=true;
   try{
    if(!await askDelete(T('Delete inspection?','Удалить осмотр?','Видалити огляд?'),T('This inspection and its photos will be removed. This cannot be undone.','Осмотр и его фотографии будут удалены. Это действие нельзя отменить.','Огляд і його фотографії буде видалено. Цю дію неможливо скасувати.')))return;
    if(scope!==LS_KEY||draft!==current||version!==editorRevision)return;
    const previous=copy(draft),wasDirty=dirty;draft.deletedAt=new Date().toISOString();draft.findings=[];dirty=true;
    if(persist())renderList();else{const feedback=saveNode?.textContent;draft=previous;dirty=wasDirty;renderEditor();notice(feedback,true);}
   }catch(e){notice(message(e),true);}finally{busy=Math.max(0,busy-1);danger.disabled=false;}
  });danger.classList.add('ins-danger');page.append(danger);
  if(dirty)changed();else notice(expected?T('Saved','Сохранено','Збережено'):T('Start the inspection now. Add customer details later.','Начните осмотр сейчас. Клиента можно добавить позже.','Почніть огляд зараз. Дані клієнта можна додати пізніше.'));
 }
 function renderFinding(parent,f){
  const card=node('details','ins-finding');card.dataset.findingId=f.id;card.open=expandedFinding===f.id;parent.append(card);
  const summary=node('summary','ins-finding-summary'),heading=node('span','ins-finding-heading'),number=node('strong','',T('Finding','Проблема','Проблема')+' '+(draft.findings.indexOf(f)+1)),snippet=node('span','ins-finding-snippet'),meta=node('span','ins-finding-meta');
  const updateSummary=()=>{snippet.textContent=f.title||f.description.trim().split('\n')[0]||T('New finding','Новая проблема','Нова проблема');meta.textContent=f.photos.length+' '+T('photos','фото','фото')+(f.severity==='urgent'?' · '+severity(f.severity):'');};updateSummary();
  heading.append(number,snippet,meta);summary.append(heading);card.append(summary);
  card.addEventListener('toggle',()=>{if(card.open){expandedFinding=f.id;for(const other of parent.querySelectorAll('.ins-finding'))if(other!==card)other.open=false;}else if(expandedFinding===f.id)expandedFinding=null;});
  const body=node('div','ins-finding-body');card.append(body);
  const description=field(body,T('What did you find? *','В чём проблема? *','У чому проблема? *'),f.id+'-description',f.description,{multiline:true,max:6000,set:v=>{f.description=v;updateSummary();}});description.placeholder=T('e.g. Damaged ridge caps above the garage','Например: повреждены коньковые элементы над гаражом','Наприклад: пошкоджено конькові елементи над гаражем');
  const gallery=node('div','ins-photo-grid');for(const [index,p] of f.photos.entries()){
   const tile=node('article','ins-photo-card'),b=button('',()=>photo(f.id,p.id)),img=node('img');img.src=p.image;img.alt=p.caption||f.title||T('Inspection photo','Фото осмотра','Фото огляду');
   b.append(img,node('span','',T('View photo','Посмотреть фото','Переглянути фото')));tile.append(b);
   const label=node('label','ins-photo-caption-label',T('Description','Описание','Опис')+' '+(index+1)),caption=node('textarea','ins-photo-caption');caption.id='ins-photo-caption-'+p.id;label.htmlFor=caption.id;caption.rows=3;caption.maxLength=1000;caption.value=p.caption||'';caption.placeholder=T('Add a description (optional)','Добавьте описание, если нужно','Додайте опис за потреби');
   caption.oninput=()=>{try{checkScope();if(!draft?.findings.find(item=>item.id===f.id)?.photos.includes(p))return;p.caption=caption.value;img.alt=p.caption||f.title||T('Inspection photo','Фото осмотра','Фото огляду');changed();}catch(e){notice(message(e),true);}};
   tile.append(label,caption);gallery.append(tile);
  }body.append(gallery);
  const input=node('input','ins-hidden-file');input.type='file';input.accept='image/jpeg,image/png,image/webp';input.multiple=true;body.append(input);
  const add=button(T('+ Add photos','+ Добавить фото','+ Додати фото'),()=>input.click());body.append(add);
  field(body,T('What needs to be done? (optional)','Что нужно сделать? (необязательно)','Що потрібно зробити? (необов’язково)'),f.id+'-recommendation',f.recommendation,{multiline:true,max:6000,set:v=>f.recommendation=v});
  const details=node('details','ins-finding-options');details.append(node('summary','',T('More details','Подробнее','Докладніше')));body.append(details);
  field(details,T('Area / issue (optional)','Участок / проблема (необязательно)','Ділянка / проблема (необов’язково)'),f.id+'-title',f.title,{max:180,set:v=>{f.title=v;updateSummary();}});
  select(details,T('Condition / urgency','Состояние / срочность','Стан / терміновість'),f.id+'-severity',['good','repair','urgent'].map(v=>[v,severity(v)]),f.severity,v=>{f.severity=v;updateSummary();});
  input.onchange=async()=>{
   if(busy)return;const scope=workspace,id=draft.id,version=editorRevision,files=[...input.files];input.value='';busy++;add.disabled=true;notice(T('Preparing photos…','Подготовка фотографий…','Підготовка фотографій…'));
   try{
    if(files.length+draft.findings.reduce((n,f)=>n+f.photos.length,0)>12)throw Error(T('Use up to 12 photos per inspection.','Не более 12 фото в одном осмотре.','Не більше 12 фото в одному огляді.'));
    const prepared=[];for(const file of files){const data=await E.prepare(file),im=await E.image(data),canvas=document.createElement('canvas'),scale=Math.min(1,1200/Math.max(im.width,im.height));canvas.width=Math.round(im.width*scale);canvas.height=Math.round(im.height*scale);canvas.getContext('2d').drawImage(im,0,0,canvas.width,canvas.height);prepared.push({id:uid('photo'),image:canvas.toDataURL('image/jpeg',.72),caption:'',annotations:[]});}
    checkScope();if(scope!==LS_KEY||draft?.id!==id||version!==editorRevision)throw Error(T('Reopen this inspection to add photos.','Откройте осмотр заново для добавления фото.','Відкрийте огляд знову для додавання фото.'));
    // Commit image bytes before saving compact references in the report.
    await window.QNInspectionPhotos.prepare({inspections:[{id:draft.id,findings:[{id:f.id,photos:prepared}]}]},scope);
    checkScope();if(draft?.id!==id||version!==editorRevision)throw Error('Reopen this inspection to add photos.');
    f.photos.push(...prepared);dirty=true;const ok=persist(),feedback=saveNode?.textContent;renderEditor();if(!ok)notice(feedback,true);
   }catch(e){notice(message(e),true);}finally{busy--;add.disabled=false;}
  };
  const remove=button(T('Remove finding','Удалить результат','Видалити результат'),async()=>{
   if(busy)return;const current=draft,scope=workspace,version=editorRevision;busy++;remove.disabled=true;
   try{if(!await askDelete(T('Delete finding?','Удалить результат?','Видалити результат?'),T('This finding and its photos will be removed.','Результат и его фотографии будут удалены.','Результат і його фотографії буде видалено.')))return;
    if(scope!==LS_KEY||draft!==current||version!==editorRevision)return;
    const previous=draft.findings,wasDirty=dirty;draft.findings=previous.filter(x=>x.id!==f.id);dirty=true;
    if(!persist()){const feedback=saveNode?.textContent;draft.findings=previous;dirty=wasDirty;renderEditor();notice(feedback,true);}else renderEditor();
   }catch(e){notice(message(e),true);}finally{busy=Math.max(0,busy-1);remove.disabled=false;}
  });remove.classList.add('ins-danger');details.append(remove);
 }
 async function photo(findingId,photoId){
  if(!persist())return;const id=draft.id,scope=workspace,record=()=>draft?.id===id&&scope===LS_KEY&&draft.findings.find(f=>f.id===findingId)?.photos.find(p=>p.id===photoId);
  const p=record();if(!p)return;const dialog=node('dialog','ins-photo-dialog'),title=node('h3','',T('View photo','Просмотр фото','Перегляд фото')),img=node('img');img.src=p.image;img.alt=p.caption||T('Inspection photo','Фото осмотра','Фото огляду');dialog.append(title,img);
  const bar=node('div','ins-actions'),error=node('p','ins-status');error.setAttribute('role','status');dialog.append(bar,error);let editor,canvas,marks=copy(p.annotations),editing=false;
  const close=()=>{editor?.dispose();dialog.close();dialog.remove();};
  const edit=button(T('Edit / mark photo','Редактировать / отметить','Редагувати / позначити'),async()=>{
   if(editing)return;editing=true;edit.disabled=true;
   try{const image=await E.image(p.image);if(!dialog.open)return;canvas=node('canvas');canvas.setAttribute('aria-label',T('Photo annotation canvas','Поле отметок на фото','Поле позначок на фото'));img.hidden=true;img.after(canvas);editor=E.attach(canvas,image,marks,v=>marks=v,m=>error.textContent=m);
    const toolbox=node('div','ins-toolbox'),tool=node('select'),color=node('select'),label=node('input');label.placeholder=T('Label text, then tap photo','Текст, затем нажмите на фото','Текст, потім натисніть на фото');label.maxLength=80;label.setAttribute('aria-label',label.placeholder);
    for(const [v,t] of [['arrow',T('Arrow','Стрелка','Стрілка')],['ellipse',T('Circle','Круг','Коло')],['rect',T('Rectangle','Рамка','Рамка')],['pen',T('Draw','Рисовать','Малювати')],['text',T('Text','Текст','Текст')]]){const o=node('option','',t);o.value=v;tool.append(o);}tool.setAttribute('aria-label',T('Drawing tool','Инструмент рисования','Інструмент малювання'));tool.onchange=()=>editor.setTool(tool.value);
    ['#e53935','#e78a17','#15805b','#ffffff'].forEach((v,i)=>{const o=node('option','',[T('Red','Красный','Червоний'),T('Orange','Оранжевый','Помаранчевий'),T('Green','Зелёный','Зелений'),T('White','Белый','Білий')][i]);o.value=v;color.append(o);});color.setAttribute('aria-label',T('Colour','Цвет','Колір'));color.onchange=()=>editor.setColor(color.value);label.oninput=()=>editor.setText(label.value);
    toolbox.append(tool,color,label,button(T('Undo','Отменить отметку','Скасувати позначку'),()=>editor.undo()),button(T('Clear marks','Убрать отметки','Прибрати позначки'),()=>editor.clear()));canvas.before(toolbox);bar.replaceChildren();
    const caption=node('input');caption.value=p.caption||'';caption.maxLength=1000;caption.placeholder=T('Photo description','Описание фото','Опис фото');caption.setAttribute('aria-label',caption.placeholder);toolbox.after(caption);
    bar.append(button(T('Save photo','Сохранить фото','Зберегти фото'),()=>{const target=record();if(!target){error.textContent=T('Reopen this inspection.','Откройте осмотр заново.','Відкрийте огляд знову.');return;}target.annotations=copy(marks);target.caption=caption.value.trim();dirty=true;if(persist()){close();renderEditor();}else error.textContent=saveNode.textContent;},true),button(T('Cancel','Отмена','Скасувати'),close));
   }catch(e){editing=false;edit.disabled=false;error.textContent=message(e);}
  },true);
  bar.append(edit,button(T('Close','Закрыть','Закрити'),close),button(T('Delete photo','Удалить фото','Видалити фото'),async()=>{
   if(busy)return;busy++;
   try{if(!await askDelete(T('Delete photo?','Удалить фото?','Видалити фото?'),T('This photo will be removed from the inspection.','Фото будет удалено из осмотра.','Фото буде видалено з огляду.')))return;
    if(!dialog.isConnected||!record())return;const f=draft.findings.find(f=>f.id===findingId),previous=f.photos,wasDirty=dirty;f.photos=previous.filter(x=>x.id!==photoId);dirty=true;
    if(persist()){close();renderEditor();}else{f.photos=previous;dirty=wasDirty;error.textContent=saveNode?.textContent;}
   }catch(e){error.textContent=message(e);}finally{busy=Math.max(0,busy-1);}
  }));document.body.append(dialog);dialog.showModal();window.qnTrackDialog?.(dialog,()=>photo(findingId,photoId));dialog.addEventListener('cancel',()=>{editor?.dispose();});dialog.addEventListener('close',()=>dialog.remove());
 }
 async function preview(){
  if(busy)return;
  // Acquire before validation so every early return releases the same lock.
  busy++;const scope=workspace;
  try{
   M.validate(draft);if(!persist())return;const snapshot=copy(draft);
   notice(T('Preparing PDF…','Подготовка PDF…','Підготовка PDF…'));
   const pdf=await window.QNInspectionPDF.build(snapshot,copy(DB.profile||{}),language());
   if(scope!==LS_KEY)throw Error('Your account changed.');
   const filename='QuoteNoble-Inspection-'+snapshot.number.replace(/[^A-Za-z0-9_-]/g,'')+'.pdf';
   await window.openPDFPreview('inspection',snapshot.id,{inspectionPDF:{pdf,filename},doc:{number:snapshot.number}});
   notice(T('PDF ready','PDF готов','PDF готовий'));
  }catch(e){
   notice(message(e),true);
   const target=e.message==='Enter the inspection address.'?page.querySelector('#ins-address'):
    e.message==='Choose an inspection date.'?page.querySelector('#ins-date'):
    e.message==='Describe each finding.'?[...page.querySelectorAll('textarea[id$="-description"]')].find(el=>!el.value.trim()):null;
   if(target){const finding=target.closest('.ins-finding');if(finding){expandedFinding=finding.dataset.findingId;finding.open=true;}target.focus({preventScroll:true});target.scrollIntoView?.({block:'center',behavior:'smooth'});}
   else actionStatus?.scrollIntoView?.({block:'center',behavior:'smooth'});
  }finally{busy=Math.max(0,busy-1);}
 }
 const originalShow=window.showView;
 window.showView=function(name){
  const active=page.classList.contains('active');if(draft&&workspace!==LS_KEY){clearTimeout(timer);draft=null;dirty=false;busy=0;page.replaceChildren();}if(active&&name!=='inspections'&&(busy||!persist()))return;
  const result=originalShow.apply(this,arguments);if(name==='inspections'){
   if(!active||!draft)renderList();else if(workspace!==LS_KEY){draft=null;dirty=false;renderList();}
   document.querySelectorAll('#tabbar button').forEach(b=>{const active=b.dataset.view==='more';b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
  }return result;
 };
 // Rebind exported HTML controls and keep one action per entry point.
 function mountOne(parent,selector,fresh,prepend=false){
  if(!parent)return;
  const copies=[...parent.querySelectorAll(selector)];
  if(copies.length){copies[0].replaceWith(fresh);copies.slice(1).forEach(copy=>copy.remove());}
  else if(prepend)parent.prepend(fresh);else parent.append(fresh);
 }
 function init(){
  const home=document.querySelector('#view-home .qn-simple-shortcuts')||document.querySelector('#view-home .qn-home-actions');
  if(home){
   const b=button(label(),open);b.classList.add('ins-home-entry');b.dataset.inspectionsOpen='';mountOne(home,'[data-inspections-open]',b);
   const job=button(T('Extra work','Допработы','Додаткові роботи'),()=>window.qnExtraWorkShortcut());job.dataset.extraWorkShortcut='';mountOne(home,'[data-extra-work-shortcut]',job);
  }
  const menu=document.querySelector('#view-more .qn-more-menu');
  if(menu){const b=button('',open);b.className='qn-more-item';b.dataset.inspectionsOpen='';b.append(node('span','qn-more-item-icon','▧'));const names=node('span');names.append(node('strong','',label()),node('small','',T('Standalone customer reports','Отчёты для клиентов','Звіти для клієнтів')));b.append(names,node('b','','›'));mountOne(menu,'[data-inspections-open]',b,true);}
  const create=document.getElementById('qn-create-menu');
  if(create){const b=button(T('New inspection','Новый осмотр','Новий огляд'),()=>{create.hidden=true;document.getElementById('qn-create-toggle')?.setAttribute('aria-expanded','false');open();edit();});b.dataset.inspectionCreate='';mountOne(create,'[data-inspection-create]',b);}
  renderList();
 }
 document.addEventListener('qn-language-changed',()=>{document.querySelectorAll('[data-inspections-open]').forEach(b=>{const strong=b.querySelector('strong');if(strong)strong.textContent=label();else b.textContent=label();});const c=document.querySelector('[data-inspection-create]');if(c)c.textContent=T('New inspection','Новый осмотр','Новий огляд');if(page.classList.contains('active')){if(draft){if(persist())renderEditor();}else renderList();}});
 document.addEventListener('qn-language-changed',()=>{document.querySelectorAll('[data-extra-work-shortcut]').forEach(b=>{b.textContent=T('Extra work','Допработы','Додаткові роботи');});});
 window.addEventListener('beforeunload',()=>persist());
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')persist();});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
 window.QNInspections={open,edit,flush:persist,isEditing:()=>!!draft&&page.classList.contains('active')};
})();
