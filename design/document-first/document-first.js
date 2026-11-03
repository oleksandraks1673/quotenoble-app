/* Document-first navigation and progressive disclosure. No record writes. */
(() => {
 'use strict';
 if(window.qnDocumentFirstInitialized)return;
 window.qnDocumentFirstInitialized=true;
 const copy={ru:{'Send':'Отправить','More options':'Дополнительные действия','Quote options':'Действия со сметой','Invoice options':'Действия со счётом','Approvals & photos':'Подтверждения и фото','More project tools':'Дополнительные инструменты','More tools':'Дополнительные инструменты','Edit':'Изменить','More':'Ещё','Record payment':'Записать оплату','View quote':'Открыть смету','View invoice':'Открыть счёт'},uk:{'Send':'Надіслати','More options':'Додаткові дії','Quote options':'Дії з кошторисом','Invoice options':'Дії з рахунком','Approvals & photos':'Підтвердження та фото','More project tools':'Додаткові інструменти','More tools':'Додаткові інструменти','Edit':'Змінити','More':'Ще','Record payment':'Записати оплату','View quote':'Відкрити кошторис','View invoice':'Відкрити рахунок'}};
 const text=s=>copy[window.qnLanguage?.get?.()]?.[s]||window.qnLanguage?.translate?.(s)||s;
 function label(el,s){el.dataset.docfirstLabel=s;const value=text(s);if(el.textContent!==value)el.textContent=value;return el;}
 const scope=()=>[typeof LS_KEY==='undefined'?'':LS_KEY,window.qnApprovalSession?.user?.id||'',window.qnCompanySession?.ownerId||''].join('|');
 function button(s,go){const b=label(document.createElement('button'),s);b.type='button';b.className='btn btn-outline';const account=scope();b.onclick=()=>{if(scope()===account&&document.body.classList.contains('qn-authenticated'))go();};return b;}
 function disclosure(parent,key,title){
  let d=parent.querySelector(':scope > details[data-docfirst-section="'+key+'"]');
  if(!d){d=document.createElement('details');d.className='qn-document-options';d.dataset.docfirstSection=key;d.append(label(document.createElement('summary'),title));const content=document.createElement('div');content.className='qn-document-options-body';d.append(content);parent.append(d);}
  return {details:d,body:d.querySelector(':scope > .qn-document-options-body')};
 }
 function moveInto(group,el){if(!el||el===group.details||group.details.contains(el)||el.contains(group.details))return;const row=el.parentElement;group.body.append(el);if(row?.classList.contains('btn-row')&&!row.children.length)row.remove();}
 function tidyModal(){
  const body=document.getElementById('modal-body');if(!body)return;
  const isDocument=!!body.querySelector('#q-view,#i-view');
  const isJob=!!body.querySelector('#j-edit');if(!isDocument&&!isJob)return;
  const candidates=[...body.querySelectorAll('.qn-materials,.qn-flow-link,[data-extra-work-context],[data-qn-approval],[data-project-link],.qn-simple-section,[data-request-deposit],#q-to-job,#qn-quote-send,#qn-invoice-send')];
  candidates.push(body.querySelector('[data-qstat]')?.closest('.field'),...body.querySelectorAll('.qn-followup,#q-invoice,#i-quote,#q-del,#i-del,#j-delete'));
  if(isJob)candidates.push(...body.querySelectorAll('#j-invoice,#j-report,#j-edit-quote,#qn-photo-manager'));
  const extras=candidates.filter(el=>el&&!el.closest('[data-docfirst-section]'));
  if(extras.length){const group=disclosure(body,'record-options','More options');for(const el of extras)moveInto(group,el);}
  const view=body.querySelector('#q-view,#i-view');if(view)label(view,view.id==='q-view'?'View quote':'View invoice');
 }
 function tidyProject(page){
  if(!page)return;const main=page.querySelector(':scope > .card');
  const extras=[...page.children].filter(el=>el!==main&&!el.classList.contains('qn-project-documents')&&el.classList.contains('card'));
  extras.push(...page.querySelectorAll('.qn-workspace-actions:not([data-docfirst-moved])'));
  extras.forEach(el=>{if(el.classList.contains('qn-workspace-actions'))el.dataset.docfirstMoved='';});
  if(extras.length){const group=disclosure(page,'project-tools','More project tools');for(const el of extras)moveInto(group,el);}
 }
 function tidyHome(){
  const home=document.getElementById('view-home');if(!home)return;
  const extras=[...home.querySelectorAll(':scope > .qn-simple-shortcuts,:scope > .qn-simple-section')];
  const priorities=home.querySelector(':scope > #qn-home-priorities');if(priorities?.children.length)extras.unshift(priorities);
  if(extras.length){const group=disclosure(home,'home-tools','More tools');for(const el of extras)moveInto(group,el);}
 }
 function tidyDocumentExtras(){
  const root=document.getElementById('doc-root'),content=root?.querySelector('.qn-document-content'),body=root?.querySelector('.doc-body');
  if(!content||!body)return;
  const extras=[...body.querySelectorAll(':scope > .qn-roof-box')];
  if(extras.length){const group=disclosure(content,'document-extras','More tools');for(const el of extras)moveInto(group,el);}
 }
 function tidyDocument(kind,id){
  const root=document.getElementById('doc-root'),back=root?.querySelector('.doc-back'),actions=root?.querySelector('.doc-actions');
  if(!back||!actions)return;
  back.classList.add('qn-document-first');
  let menu=actions.querySelector('.qn-doc-more');
  if(!menu){menu=document.createElement('details');menu.className='qn-doc-more';const content=document.createElement('div');content.className='qn-doc-action-list';menu.append(label(document.createElement('summary'),'More'),content);actions.append(menu);}
  const list=menu.querySelector('.qn-doc-action-list');if(!list)return;
  const share=root.querySelector('#doc-share');if(share)label(share,'Send');
  const edit=root.querySelector('#doc-edit');if(edit){label(edit,'Edit');actions.insertBefore(edit,menu);}
  const pdf=root.querySelector('#doc-pdf');if(pdf&&!list.contains(pdf))list.prepend(pdf);
  if(!list.querySelector('[data-docfirst-manage]')){
   const manage=button(kind==='q'?'Quote options':'Invoice options',()=>kind==='q'?window.openQuoteDetail(id):window.openInvoiceDetail(id));manage.dataset.docfirstManage='';list.append(manage);
  }
  if(kind==='i'&&!list.querySelector('[data-docfirst-payment]')){
   const inv=typeof DB==='undefined'?null:DB.invoices.find(x=>x.id===id);
   if(inv&&invoiceTotals(inv).balance>0){const pay=button('Record payment',()=>{window.openInvoiceDetail(id);document.getElementById('i-pay')?.click();});pay.dataset.docfirstPayment='';list.prepend(pay);}
  }
  let content=back.querySelector(':scope > .qn-document-content');
  if(!content){content=document.createElement('div');content.className='qn-document-content';back.insertBefore(content,actions);}
  const doc=back.querySelector('.doc');if(doc&&doc.parentElement!==content)content.append(doc);
  const previousExtras=back.querySelector(':scope > [data-docfirst-section="document-extras"]');if(previousExtras)content.append(previousExtras);
  const extras=[...root.querySelectorAll('.doc-body > details.qn-form-details,.doc-body > details.qn-simple-section')];
  const panels=[...root.querySelectorAll('.doc-body > [data-qn-approval]')];
  if(extras.length||panels.length){const group=disclosure(content,'document-extras','More tools');for(const el of [...extras,...panels])moveInto(group,el);if(doc)doc.after(group.details);}
  const customer=root.querySelector('.qn-document-customer');
  if(customer)for(const node of [...customer.childNodes])if(node.nodeName==='BR'&&node.previousSibling?.nodeName==='BR')node.remove();
  tidyDocumentExtras();
  const heading=root.querySelector('.doc-title-row h2');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}
 }
 const originalDocument=window.openDocument;
 window.openDocument=function(kind,id){const result=originalDocument.apply(this,arguments);tidyDocument(kind,id);return result;};
 window.qnRenderSavedDocument=window.openDocument;
 // Normal record taps show the document. Task-specific payment/approval flows
 // keep using the existing detail functions and their original event handlers.
 document.addEventListener('click',event=>{
  const row=event.target instanceof Element?event.target.closest('[data-open-doc]'):null;
  if(!row||!document.body.classList.contains('qn-authenticated'))return;
  const raw=row.dataset.openDoc||'',separator=raw.indexOf(':'),kind=raw.slice(0,separator),id=raw.slice(separator+1);
  if(separator<1||!['q','i'].includes(kind)||!id)return;
  event.preventDefault();event.stopImmediatePropagation();window.openDocument(kind,id);
 },true);
 for(const name of ['openQuoteDetail','openInvoiceDetail','qnOpenJobDetail']){
  const original=window[name];if(typeof original!=='function')continue;
  window[name]=function(){const result=original.apply(this,arguments);tidyModal();return result;};
 }
 if(window.QNSimpleUI?.project){const original=window.QNSimpleUI.project;window.QNSimpleUI.project=function(page){const result=original.apply(this,arguments);tidyProject(page);return result;};}
 let queued=false;
 const observer=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;tidyModal();tidyProject(document.getElementById('view-project'));tidyHome();tidyDocumentExtras();});});
 for(const id of ['modal-root','view-project','view-home','doc-root']){const el=document.getElementById(id);if(el)observer.observe(el,{childList:true,subtree:true});}
 document.addEventListener('qn-language-changed',()=>{document.querySelectorAll('[data-docfirst-label]').forEach(el=>{const value=text(el.dataset.docfirstLabel);if(el.textContent!==value)el.textContent=value;});});
 const init=()=>{tidyHome();tidyModal();tidyProject(document.getElementById('view-project'));};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
