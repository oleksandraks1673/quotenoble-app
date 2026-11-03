/* Clear navigation and progressive disclosure. Records and business actions stay in their original handlers. */
(() => {
 'use strict';
 if(window.qnSimpleNavigationInitialized)return;
 window.qnSimpleNavigationInitialized=true;
 const T=s=>window.qnLanguage?.translate?.(s)||s;
 const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text){el.textContent=text;el.dataset.qnI18n='';}return el;};
 const action=(label,fn,primary=false)=>{const b=node('button','btn '+(primary?'btn-primary':'btn-outline'),label);b.type='button';b.onclick=fn;return b;};
 function disclosure(parent,label,elements){
  const items=elements.filter(Boolean);if(!items.length)return;
  // Saved HTML may already contain this disclosure. Reuse it on every mount.
  const sections=[...parent.querySelectorAll(':scope > .qn-simple-section')].filter(el=>el.dataset.qnSection===label);
  const d=sections[0]||node('details','qn-simple-section');
  d.dataset.qnSection=label;
  let summary=d.querySelector(':scope > summary');
  if(!summary){summary=node('summary','',label);d.prepend(summary);}
  let content=d.querySelector(':scope > .qn-simple-section-body');
  if(!content){content=node('div','qn-simple-section-body');d.append(content);}
  for(const duplicate of sections.slice(1)){
   const body=duplicate.querySelector(':scope > .qn-simple-section-body');
   if(body)while(body.firstChild)content.append(body.firstChild);
   duplicate.remove();
  }
  for(const item of items){
   if(item===d||item.contains(d)||item.parentElement===content)continue;
   const row=item.parentElement;content.append(item);
   if(row?.classList.contains('btn-row')&&!row.children.length)row.remove();
  }
  if(!d.isConnected)parent.append(d);return d;
 }
 function mainActions(body,ids,primary){
  const bar=node('div','qn-simple-main-actions');
  for(const id of ids){const b=body.querySelector('#'+id);if(!b)continue;const row=b.parentElement;bar.append(b);b.classList.remove('btn-blue','btn-primary');b.classList.add('btn-outline');if(b===primary){b.classList.remove('btn-outline');b.classList.add('btn-primary');}if(row?.classList.contains('btn-row')&&!row.children.length)row.remove();}
  body.querySelectorAll('.kv > .k').forEach(label=>label.dataset.qnI18n='');
  const link=body.querySelector('[data-project-link]');if(link)link.after(bar);else body.prepend(bar);return bar;
 }
 let dialogSerial=0;
 const open=window.openModal;
 window.openModal=function(...args){
  const body=open.apply(this,args);if(!body)return body;
  const dialog=body.closest('[role="dialog"]'),heading=dialog?.querySelector(':scope > h2');
  if(heading){const top=node('div','qn-dialog-top');heading.id='qn-dialog-title-'+(++dialogSerial);heading.tabIndex=-1;heading.dataset.qnI18n='';dialog.setAttribute('aria-labelledby',heading.id);const back=action('Back',()=>window.closeModal());back.className='qn-simple-back';back.setAttribute('aria-label',T('Back'));heading.before(top);top.append(back,heading);}
  return body;
 };
 function tidyQuote(){
  const body=document.getElementById('modal-body'),edit=body?.querySelector('#q-edit');if(!edit)return;
  const job=body.querySelector('#q-to-job'),send=action('Send to customer',()=>window.QNWorkflow.send('q',body.dataset.simpleQuote));send.id='qn-quote-send';body.append(send);
  mainActions(body,['q-to-job','qn-quote-send','q-edit','q-view'],job||send);
  const quick=body.querySelector('[data-qstat]')?.closest('.field');disclosure(body,'Status & other options',[quick,body.querySelector('#q-invoice')]);
  disclosure(body,'Delete quote',[body.querySelector('#q-del')])?.classList.add('qn-simple-danger');
 }
 const quote=window.openQuoteDetail;
 window.openQuoteDetail=function(id){const result=quote.apply(this,arguments);const body=document.getElementById('modal-body');if(body?.querySelector('#q-edit')){body.dataset.simpleQuote=id;tidyQuote();}return result;};
 const invoice=window.openInvoiceDetail;
 window.openInvoiceDetail=function(id){
  const result=invoice.apply(this,arguments),body=document.getElementById('modal-body');if(!body?.querySelector('#i-edit'))return result;
  const pay=body.querySelector('#i-pay'),preview=body.querySelector('#i-view'),send=action('Send to customer',()=>window.QNWorkflow.send('i',id));send.id='qn-invoice-send';body.append(send);
  mainActions(body,['i-pay','qn-invoice-send','i-edit','i-view'],pay&&!pay.disabled?pay:send);
  if(pay?.disabled)pay.hidden=true;
  disclosure(body,'Extra work & approvals',[body.querySelector('[data-extra-work-context]')]);
  disclosure(body,'Reminder & linked quote',[body.querySelector('.qn-followup'),body.querySelector('#i-quote')]);
  disclosure(body,'Delete invoice',[body.querySelector('#i-del')])?.classList.add('qn-simple-danger');return result;
 };
 function tidyJob(body){
  if(!body?.querySelector('#j-edit')||body.dataset.simpleJob)return;body.dataset.simpleJob='true';
  mainActions(body,['j-next','j-invoice','j-report','j-edit-quote','j-edit'],body.querySelector('#j-next')||body.querySelector('#j-invoice'));
  disclosure(body,'Deposits & payments',[body.querySelector('.qn-job-deposits')]);
  disclosure(body,'Extra work & approvals',[body.querySelector('[data-extra-work-context]')]);
  disclosure(body,'Materials & supplier orders',[body.querySelector('[data-purchases-job]'),body.querySelector('.qn-p-job')]);
  disclosure(body,'Crew & assignments',[body.querySelector('[data-crew-job]')]);
  disclosure(body,'More job tools',[body.querySelector('#j-quote'),body.querySelector('#j-plan')]);
  disclosure(body,'Delete job',[body.querySelector('#j-delete')])?.classList.add('qn-simple-danger');
 }
 const job=window.qnOpenJobDetail;
 window.qnOpenJobDetail=function(id){const result=job.apply(this,arguments);tidyJob(document.getElementById('modal-body'));return result;};
 for(const name of ['openQuoteForm','openInvoiceForm']){
  const original=window[name];window[name]=function(){const result=original.apply(this,arguments),body=document.getElementById('modal-body');if(!body?.querySelector('#f-save')||body.querySelector('.qn-form-step'))return result;
   const customer=body.querySelector('.qn-document-customer'),work=body.querySelector('#items-wrap')?.closest('.field');
   if(customer)customer.before(node('h3','qn-form-step','1. Customer'));
   if(work)work.before(node('h3','qn-form-step','2. Work & price'));
   return result;
  };
 }
 const documentView=window.openDocument;
 window.openDocument=function(){const result=documentView.apply(this,arguments),body=document.querySelector('#doc-root .doc-body'),photos=body?.querySelector('#qn-photo-manager');if(photos&&!photos.closest('.qn-simple-section'))disclosure(body,'Document photos',[photos]);return result;};
 window.qnRenderSavedDocument=window.openDocument;
 function secondaryBacks(){for(const id of ['clients','reports','purchases','plans','help']){const view=document.getElementById('view-'+id);if(view&&view.children.length&&!view.querySelector('[data-simple-section-back],.qn-more-back')){const back=action('Back to More',()=>showView('more'));back.className='qn-simple-back';back.dataset.simpleSectionBack='';view.prepend(back);}}}
 function init(){
  const nav=document.getElementById('tabbar');for(const view of ['home','quotes','jobs','invoices','more']){const b=nav.querySelector('[data-view="'+view+'"]');if(b)nav.append(b);}
  const home=document.getElementById('view-home');home.querySelector('.qn-page-intro')?.remove();
  const intro=home.querySelector('.qn-simple-intro')||node('p','qn-simple-intro','Start with a quote. Keep the work and invoice together.');if(!intro.isConnected)home.querySelector('.qn-home-greeting').after(intro);
  const existing=[...home.querySelectorAll('.qn-simple-shortcuts')],shortcuts=existing[0]||node('div','qn-simple-shortcuts');existing.slice(1).forEach(el=>el.remove());
  shortcuts.replaceChildren(action('Customers',()=>showView('clients')),action('Project photos',()=>window.QNPhotoJournal.open()));home.querySelector('.qn-home-actions').after(shortcuts);
  const voice=home.querySelector('[data-qn-voice]');if(voice)disclosure(home,'Create a quote with your voice',[voice]);
  const more=document.getElementById('view-more'),menus=[...more.querySelectorAll(':scope > .qn-more-menu')],business=menus[0];
  const customers=business.querySelector('[data-customers-link]');
  if(customers){customers.className='qn-more-item';customers.innerHTML='<span class="qn-more-item-icon" aria-hidden="true">♙</span><span><strong data-qn-i18n>Customers</strong><small data-qn-i18n>Contact details and document history</small></span><b aria-hidden="true">›</b>';}
  const jobs=business.querySelector('[data-qn-more-go="jobs"]');if(jobs)jobs.remove();
  const reports=[business.querySelector('#qn-report-open'),business.querySelector('[data-qn-more-panel="qn-more-insights"]')].filter(Boolean);if(reports.length){const d=disclosure(more,'Reports & business insights',reports);d.classList.add('qn-simple-reports');business.after(d);}
  // The page already includes its search field; reuse it and remove leftovers from older scripts.
  const searches=[...more.querySelectorAll(':scope > .qn-tools-search')];
  const search=searches[0]||node('div','qn-tools-search');
  searches.slice(1).forEach(el=>el.remove());
  if(!search.isConnected)more.querySelector('.qn-more-header').after(search);
  let input=search.querySelector('input[type="search"]');
  if(!input){input=node('input');input.type='search';input.placeholder=T('Find a tool or setting');search.append(input);}
  input.id='qn-tool-search';
  let empty=search.querySelector('[role="status"]');
  if(!empty){empty=node('p','hint','No matching tools. Try another word.');empty.setAttribute('role','status');search.append(empty);}
  function filter(){
   const q=input.value.toLocaleLowerCase().trim();let count=0;
   more.querySelectorAll('.qn-more-menu>.qn-more-item,.qn-simple-reports .qn-more-item').forEach(b=>{b.hidden=!!q&&!b.textContent.toLocaleLowerCase().includes(q);if(!b.hidden)count++;});
   for(const m of menus){m.hidden=![...m.children].some(b=>!b.hidden);const label=m.previousElementSibling;if(label?.classList.contains('qn-more-section-label'))label.hidden=m.hidden;}
   const reports=more.querySelector('.qn-simple-reports');if(reports){reports.hidden=![...reports.querySelectorAll('.qn-more-item')].some(b=>!b.hidden);if(q)reports.open=!reports.hidden;}
   empty.hidden=!q||count>0;
  }
  input.addEventListener('input',filter);
  document.addEventListener('qn-language-changed',filter);
  filter();
  // Keep one Back to More action per screen even when other navigation modules have added one.
  for(const id of ['clients','reports','purchases','plans','help']){
   const view=document.getElementById('view-'+id);if(!view)continue;
   const existing=[...view.querySelectorAll(':scope > .qn-simple-back,:scope > [data-simple-section-back],:scope > .qn-more-back')];
   existing.slice(1).forEach(el=>el.remove());
   if(existing.length)continue;
   const b=action('Back to More',()=>showView('more'));b.className='qn-simple-back';b.dataset.simpleSectionBack='';view.prepend(b);
  }
  const main=document.querySelector('main');let queued=false;
  const observer=new MutationObserver(()=>{if(queued)return;queued=true;queueMicrotask(()=>{queued=false;decorateLists();});});observer.observe(main,{childList:true,subtree:true});decorateLists();
 }
 const listConfig={quotes:{list:'quote-list',search:'quote-search',label:'Filter quotes',options:[['all','All quotes'],['draft','Draft'],['sent','Awaiting approval'],['accepted','Accepted'],['declined','Declined'],['invoiced','Invoiced']]},invoices:{list:'invoice-list',search:'invoice-search',label:'Filter invoices',options:[['all','All invoices'],['open','Unpaid & partially paid'],['paid','Paid'],['overdue','Overdue']]},jobs:{list:'job-list',search:'job-search',label:'Filter jobs',options:[['all','All jobs'],['active','Active jobs'],['completed','Completed'],['cancelled','Cancelled']]}};
 const selected={quotes:'all',invoices:'all',jobs:'all'};
 function decorateLists(){
  secondaryBacks();
  for(const [kind,c] of Object.entries(listConfig)){
   const list=document.getElementById(c.list),toolbar=document.getElementById(c.search)?.closest('.qn-list-toolbar');if(!list||!toolbar)continue;
   let filter=toolbar.parentElement.querySelector('[data-simple-filter="'+kind+'"]');
   if(!filter){const wrap=node('div','qn-simple-filter'),label=node('label','',c.label);filter=node('select');filter.dataset.simpleFilter=kind;filter.id='qn-filter-'+kind;label.htmlFor=filter.id;for(const [value,text] of c.options){const o=node('option','',text);o.value=value;filter.append(o);}filter.value=selected[kind];wrap.append(label,filter);toolbar.after(wrap);filter.onchange=()=>{selected[kind]=filter.value;applyFilter(kind,list);};}
   applyFilter(kind,list);
  }
 }
 function applyFilter(kind,list){
  const value=selected[kind];let visible=0;const rows=[...list.querySelectorAll(':scope > .list-item')];
  for(const row of rows){const raw=row.dataset.openDoc,jobId=row.dataset.qnOpenJob,id=jobId||raw?.slice(2);let show=true;
   if(kind==='quotes'){const q=DB.quotes.find(q=>q.id===id);show=value==='all'||q?.status===(value==='sent'?'sent':value);}
   if(kind==='invoices'){const i=DB.invoices.find(i=>i.id===id);const status=i?invoiceStatus(i):'';show=value==='all'||(value==='open'?status!=='paid':status===value);}
   if(kind==='jobs'){const j=DB.jobs.find(j=>j.id===id),done=window.QNJobFlow?.completed(j)||false;show=value==='all'||(value==='active'?!done&&j?.status!=='Cancelled':value==='completed'?done:j?.status==='Cancelled');}
   if(row.hidden===show)row.hidden=!show;if(show)visible++;
  }
  let empty=list.parentElement.querySelector('[data-simple-empty="'+kind+'"]');if(!empty){empty=node('p','empty','Nothing in this filter. Choose another filter.');empty.dataset.simpleEmpty=kind;empty.setAttribute('role','status');list.after(empty);}empty.hidden=!rows.length||visible>0;
 }
 window.QNSimpleUI={job:tidyJob,project(page,p){
  const top=page.querySelector('.card');if(!top)return;top.querySelectorAll('.qn-project-steps').forEach(el=>el.remove());const steps=node('ol','qn-project-steps');steps.setAttribute('aria-label',T('Project progress'));
  const quote=p.quote,job=p.job,invoice=p.invoice;let current=job&&!QNJobFlow.completed(job)?2:job&&invoice?3:job?2:quote?.status==='accepted'?1:invoice?3:0;
  [['Quote',quote,()=>openDocument('q',quote.id)],['Approval',quote,()=>openQuoteDetail(quote.id)],['Work',job,()=>window.qnOpenJobDetail(job.id)],['Invoice',invoice,()=>openDocument('i',invoice.id)]].forEach(([label,record,go],i)=>{const li=node('li');li.className=i===current?'current':i<current?'complete':'';if(record){const b=action(label,go);if(i===current)b.setAttribute('aria-current','step');li.append(b);}else li.append(node('span','',label));steps.append(li);});top.querySelector('h2').after(steps);
  const docs=page.querySelector('.qn-project-documents');if(docs){const buttons=[...docs.querySelectorAll(':scope > .btn')];if(buttons.length>3){const extra=buttons.filter(b=>!b.hasAttribute('data-qn-document-link'));disclosure(docs,'Document actions',extra);}}
 }};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
