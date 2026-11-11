/* App-owned notices and explicit asynchronous confirmations. Never change window.confirm. */
(()=>{
 'use strict';
 const queue=[];let active=null,serial=0;
 const scope=()=>{try{return LS_KEY;}catch{return null;}};
 const T=(en,ru,uk)=>window.qnLanguage?.get?.()==='ru'?ru:window.qnLanguage?.get?.()==='uk'?uk:en;
 function enqueue(kind,message,options={}){
  const account=scope();
  if(kind==='notice'&&[active,...queue].some(x=>x&&x.kind===kind&&x.message===String(message)&&x.account===account))return Promise.resolve(false);
  return new Promise(resolve=>{queue.push({kind,message:String(message??''),options,account,resolve});pump();});
 }
 function pump(){
  if(active||!document.body)return;const task=queue.shift();if(!task)return;
  if(task.account!==null&&task.account!==scope()){task.resolve(false);pump();return;}active=task;
  const {kind,message,options}=task,dialog=document.createElement('dialog'),id='qn-dialog-'+(++serial),previousFocus=document.activeElement,overflow=document.body.style.overflow;
  dialog.className='qn-app-dialog';dialog.setAttribute('role',kind==='copy'?'dialog':'alertdialog');dialog.setAttribute('aria-labelledby',id+'-title');dialog.setAttribute('aria-describedby',id+'-message');
  const content=document.createElement('div');content.className='qn-app-dialog-content';
  const brand=document.createElement('div');brand.className='qn-app-dialog-brand';brand.textContent='QUOTE.NOBLE';
  const title=document.createElement('h2');title.id=id+'-title';title.textContent=options.title||(kind==='confirm'?T('Confirm action','Подтвердите действие','Підтвердьте дію'):kind==='copy'?T('Copy message','Скопировать текст','Скопіювати текст'):T('Message','Сообщение','Повідомлення'));
  const text=document.createElement('p');text.id=id+'-message';text.textContent=window.qnLanguage?.translate?.(message)||message;content.append(brand,title,text);
  if(kind==='copy'){const area=document.createElement('textarea');area.readOnly=true;area.rows=8;area.value=options.value||'';area.setAttribute('aria-label',title.textContent);content.append(area);area.onclick=()=>area.select();}
  const actions=document.createElement('div');actions.className='qn-app-dialog-actions';
  let cancel;if(kind==='confirm'){cancel=document.createElement('button');cancel.type='button';cancel.className='btn btn-outline';cancel.textContent=T('Cancel','Отмена','Скасувати');cancel.dataset.dialogCancel='';actions.append(cancel);}
  const accept=document.createElement('button');accept.type='button';accept.className='btn '+(options.danger?'qn-app-dialog-danger':'btn-primary');accept.textContent=options.acceptLabel||(kind==='confirm'?T('Confirm','Подтвердить','Підтвердити'):T('OK','Понятно','Гаразд'));accept.dataset.dialogAccept='';actions.append(accept);content.append(actions);dialog.append(content);
  let done=false;
  function finish(value){if(done)return;done=true;const result=value&&(task.account===null||task.account===scope());if(dialog.open)dialog.close();dialog.remove();document.body.style.overflow=overflow;if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});active=null;task.resolve(result);queueMicrotask(pump);}
  if(cancel)cancel.onclick=()=>finish(false);accept.onclick=()=>finish(true);
  dialog.addEventListener('cancel',e=>{e.preventDefault();finish(false)});dialog.addEventListener('close',()=>finish(false));
  document.body.append(dialog);document.body.style.overflow='hidden';dialog.showModal();window.qnTrackDialog?.(dialog);(cancel||accept).focus({preventScroll:true});
 }
 window.qnConfirm=(message,options)=>enqueue('confirm',message,options);
 window.qnAlert=message=>{enqueue('notice',message);};
 window.qnCopyText=(message,value)=>enqueue('copy',message,{value:String(value??'')});
 document.addEventListener('DOMContentLoaded',pump,{once:true});
})();
