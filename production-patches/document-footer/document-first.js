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

/* Compact document toolbar. Preserve all existing action elements and handlers. */
(()=>{
 'use strict';
 const root=document.getElementById('doc-root');if(!root)return;
 const style=document.createElement('style');style.textContent=`
 body #doc-root .doc-actions.qn-footer-organized{display:grid!important;grid-template-columns:minmax(0,1fr) 76px 76px!important;align-items:stretch;gap:8px!important;padding:12px 16px calc(12px + env(safe-area-inset-bottom))!important;background:#fff;border-top:1px solid #e5e7eb;box-shadow:0 -4px 20px #11182708;position:relative!important;overflow:visible;isolation:isolate}
 body #doc-root .qn-footer-organized> :is(.btn,.qn-doc-more){width:auto!important;min-width:0!important;max-width:none!important;margin:0!important;grid-row:1;flex:none!important}
 body #doc-root .qn-footer-organized>#doc-share{grid-column:1;background:#eb6a0a!important;color:#fff!important;border:1px solid #eb6a0a!important}
 body #doc-root .qn-footer-organized>#doc-edit{grid-column:2}
 body #doc-root .qn-footer-organized>.qn-doc-more{grid-column:3;position:static!important}
 body #doc-root .qn-footer-organized>:is(.btn,.qn-doc-more)>summary,body #doc-root .qn-footer-organized>.btn{box-sizing:border-box;display:flex;align-items:center;justify-content:center;min-height:50px!important;height:auto!important;padding:10px 8px!important;border-radius:10px!important;font-size:15px!important;font-weight:650;line-height:1.3;white-space:normal!important;box-shadow:none!important;text-align:center}
 body #doc-root .qn-footer-organized>.qn-doc-more>summary{border:1px solid #d8dde3;background:#fff;list-style:none}
 body #doc-root .qn-footer-organized>.qn-doc-more>summary::after{content:none}
 body #doc-root .qn-footer-organized .qn-doc-action-list{position:absolute!important;inset:auto 16px calc(100% + 8px) 16px!important;width:auto!important;max-width:none!important;max-height:55dvh;overflow:auto;overscroll-behavior:contain;box-sizing:border-box;padding:6px;border:1px solid #e5e7eb;border-radius:14px;background:#fff;box-shadow:0 8px 32px #11182720;z-index:2}
 body #doc-root .qn-footer-organized .qn-doc-action-list>.btn{display:block;width:100%;min-height:48px;margin:0!important;padding:13px 14px!important;border:0!important;border-radius:8px!important;background:#fff!important;color:#344054!important;text-align:left;font-size:15px!important;box-shadow:none!important}
 body #doc-root .qn-footer-organized .qn-doc-action-list>.btn:hover{background:#f3f4f6!important}
 body #doc-root .qn-footer-organized .qn-document-options{margin:0!important;padding:0!important;border:0!important}
 body #doc-root .qn-footer-organized .qn-document-options>summary{padding:13px 14px;min-height:48px;box-sizing:border-box;font-size:15px;font-weight:650}
 body #doc-root .qn-footer-organized :is(button,summary):focus-visible{outline:3px solid #f59e0b;outline-offset:2px}
 @media(min-width:700px){body #doc-root .doc-actions.qn-footer-organized{grid-template-columns:minmax(160px,240px) 100px 100px!important;justify-content:end}body #doc-root .qn-footer-organized .qn-doc-action-list{left:auto!important;width:320px!important}}
 @media print{body #doc-root .doc-actions.qn-footer-organized{display:none!important}}
 `;document.head.append(style);
 let queued=false;
 function organize(){
  const actions=root.querySelector('.doc-actions'),menu=actions?.querySelector('.qn-doc-more'),list=menu?.querySelector('.qn-doc-action-list'),send=root.querySelector('#doc-share'),edit=root.querySelector('#doc-edit');
  if(!actions||!menu||!list||!send||!edit)return;
  actions.classList.add('qn-footer-organized');
  for(const el of [...actions.children])if(el!==send&&el!==edit&&el!==menu){el.classList.remove('btn-primary');el.classList.add('btn-outline');list.prepend(el);}
  for(const extra of [...root.querySelectorAll('[data-docfirst-section="document-extras"]')])if(!list.contains(extra))list.append(extra);
 }
 new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;organize();});}).observe(root,{childList:true,subtree:true});
 document.addEventListener('click',e=>{for(const menu of root.querySelectorAll('.qn-footer-organized .qn-doc-more[open]'))if(!menu.contains(e.target))menu.open=false;});
 root.addEventListener('keydown',e=>{if(e.key!=='Escape')return;const menu=root.querySelector('.qn-footer-organized .qn-doc-more[open]');if(menu){e.preventDefault();e.stopPropagation();menu.open=false;menu.querySelector('summary')?.focus();}},true);
 organize();
})();
