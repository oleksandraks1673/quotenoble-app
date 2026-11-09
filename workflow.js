/* Unified project navigation. Existing records and approval/payment handlers remain authoritative. */
(() => {
  'use strict';
  if(window.qnWorkflowInitialized)return;
  window.qnWorkflowInitialized=true;
  const byId=(records,id)=>(records||[]).find(x=>x.id===id);
  function project(kind,id){
    let job=kind==='job'?byId(DB.jobs,id):null;
    let invoice=kind==='invoice'?byId(DB.invoices,id):null;
    let quote=kind==='quote'?byId(DB.quotes,id):null;
    if(invoice&&window.QNExtraWork?.isExtra(byId(DB.quotes,invoice.quoteId)))quote=byId(DB.quotes,invoice.quoteId);
    if(window.QNExtraWork?.isExtra(quote)){
      const extra=quote;
      job=byId(DB.jobs,extra.extraWorkJobId);
      invoice=byId(DB.invoices,extra.extraWorkParentInvoiceId)||invoice;
      quote=byId(DB.quotes,extra.extraWorkParentQuoteId)||byId(DB.quotes,invoice?.quoteId)||extra;
    }
    if(invoice?.extraWorkJobId)job=byId(DB.jobs,invoice.extraWorkJobId)||job;
    if(invoice)job=job||byId(DB.jobs,invoice.jobId)||(DB.jobs||[]).find(j=>j.invoiceId===invoice.id||(invoice.quoteId&&j.quoteId===invoice.quoteId));
    if(quote&&!job)job=(DB.jobs||[]).find(j=>j.quoteId===quote.id);
    if(job){quote=byId(DB.quotes,job.quoteId)||quote;invoice=byId(DB.invoices,job.invoiceId)||(DB.invoices||[]).find(i=>i.jobId===job.id||(job.quoteId&&i.quoteId===job.quoteId))||invoice;}
    if(invoice&&!quote)quote=byId(DB.quotes,invoice.quoteId);
    if(quote&&!invoice)invoice=DB.invoices.find(i=>i.quoteId===quote.id||i.id===quote.sourceInvoiceId);
    return {job,quote,invoice};
  }
  const exists=p=>p.job||p.quote||p.invoice;
  function next(p){
    const {job:j,quote:q,invoice:i}=p;
    if(j){
      if(j.status==='Cancelled')return ['View cancelled job',()=>window.qnOpenJobDetail(j.id)];
      if(j.status==='On Hold')return ['Review held job',()=>window.qnOpenJobDetail(j.id)];
      const step=QNJobFlow.next(j);
      if(step==='schedule')return ['Schedule job',()=>{window.qnOpenJobDetail(j.id);document.getElementById('j-edit')?.click();document.getElementById('qn-j-date')?.focus();}];
      if(step==='complete')return ['Mark work completed',()=>advance(j,'Completed')];
      if(step==='start')return ['Start work',()=>advance(j,'In Progress')];
      if(!i)return ['Create invoice',()=>qnCreateInvoiceFromJob(j.id)];
    }
    if(!j&&q?.status==='accepted')return ['Schedule job',()=>{qnConvertQuoteToJob(q.id);const linked=(DB.jobs||[]).find(j=>j.quoteId===q.id);if(linked){window.qnOpenJobDetail(linked.id);document.getElementById('j-edit')?.click();document.getElementById('qn-j-date')?.focus();}}];
    if(i)return invoiceTotals(i).balance>0?['Record payment',()=>{openInvoiceDetail(i.id);document.getElementById('i-pay')?.click();}]:['View paid invoice',()=>openInvoiceDetail(i.id)];
    if(q?.status==='declined')return ['Review declined quote',()=>openQuoteDetail(q.id)];
    if(q?.status==='sent')return ['Review customer approval',()=>openQuoteDetail(q.id)];
    return ['Send quote',()=>send('q',q.id)];
  }
  function advance(job,status){if(!window.qnRequirePro?.('Project management')||!DB.jobs.includes(job))return;
    try{QNJobFlow.transition(job,status,save);openProject('job',job.id);}catch(error){qnAlert(error.message);}
  }
  function send(kind,id){
    const doc=(kind==='q'?DB.quotes:DB.invoices).find(x=>x.id===id);if(!doc)return;
    const body=openModal('Send to customer','<p data-qn-i18n>Choose what your customer receives.</p><div id="qn-send-options"></div>');
    const options=body.querySelector('#qn-send-options');
    if(kind==='q'&&!doc.sourceInvoiceId&&['draft','sent'].includes(doc.status))options.append(button('Send for approval · Pro',()=>{ /* The authenticated approvals API checks the current plan when creating a link. Opening this panel must not depend on an expiring browser billing cache. */ openQuoteDetail(id);const panel=document.querySelector('#modal-body [data-qn-approval], #doc-root [data-qn-approval]');const disclosure=panel?.closest('details');if(disclosure)disclosure.open=true;panel?.scrollIntoView({block:'nearest'});panel?.querySelector('[data-approval-action="share"], [data-approval-action="create"]')?.focus();},true));
    options.append(button('Send document',()=>shareDocument(kind,id),kind!=='q'));
  }
  function button(label,handler,primary=false){const b=document.createElement('button');b.type='button';b.className='btn '+(primary?'btn-primary':'btn-outline');b.textContent=label;const account=[LS_KEY,window.qnApprovalSession?.user?.id,window.qnCompanySession?.ownerId].join('|');b.onclick=()=>{if(!document.body.classList.contains('qn-authenticated')||account!==[LS_KEY,window.qnApprovalSession?.user?.id,window.qnCompanySession?.ownerId].join('|'))return;handler();};return b;}
  function card(title){const c=document.createElement('section');c.className='card';const h=document.createElement('h2');h.textContent=title;c.append(h);return c;}
  function line(root,label,value){const r=document.createElement('div');r.className='kv';const l=document.createElement('span');l.textContent=label;const v=document.createElement('strong');v.textContent=value;r.append(l,v);root.append(r);}
  const pages=[...document.querySelectorAll('#view-project')];
  const page=pages.shift()||document.createElement('section');
  pages.forEach(duplicate=>duplicate.remove());
  page.id='view-project';page.classList.add('view');
  if(!page.isConnected)document.querySelector('main').append(page);

  function openProject(kind,id){
    const p=project(kind,id);if(!exists(p))return;
    window.qnProjectRoute={kind,id};showView('project');
  }
  function renderProject(){
    const route=window.qnProjectRoute;page.replaceChildren();
    const p=route?project(route.kind,route.id):{};
    if(!exists(p)){page.append(card('Choose a project from a quote, job or invoice.'));return;}
    const {job:j,quote:q,invoice:i}=p;
    const top=card(j?.title||q?.items?.[0]?.service||'Project');
    line(top,'Customer',getClient(i?.clientId||q?.clientId||j?.clientId)?.name||j?.client||'No customer');
    line(top,'Progress',j&&!QNJobFlow.completed(j)?QNJobFlow.label(j):i&&(j||!q||q.status!=='accepted')?(invoiceTotals(i).balance<=0?'Paid':'Invoiced'):j?QNJobFlow.label(j):STATUS_LABEL[q?.status]||'Draft');
    if(j)line(top,'Scheduled',j.date?fmtDate(j.date):'Not scheduled');
    const action=next(p);top.append(button(action[0],action[1],true));page.append(top);
    const docs=card('Quote, approvals & invoice');docs.classList.add('qn-project-documents');
    if(q){const link=button('Quote '+q.number+' · '+(STATUS_LABEL[q.status]||q.status),()=>openDocument('q',q.id));link.dataset.qnDocumentLink='';docs.append(link);docs.append(button('Edit quote',()=>openQuoteForm(q)));docs.append(button('Send quote to customer',()=>send('q',q.id)));}
    if(j)docs.append(button('Job details',()=>window.qnOpenJobDetail(j.id)));
    if(i){const link=button('Invoice '+i.number,()=>openDocument('i',i.id));link.dataset.qnDocumentLink='';docs.append(link);docs.append(button('Send invoice to customer',()=>send('i',i.id)));}
    page.append(docs);
    if(j)window.qnPhotoJournalMount?.(page,j);
    const extras=window.QNExtraWork?.requestsFor(DB,{jobId:j?.id,quoteId:q?.id,invoiceId:i?.id})||[];
    const extraIds=new Set(extras.map(x=>x.id));
    const otherInvoices=DB.invoices.filter(x=>x.id!==i?.id&&((j&&x.jobId===j.id)||extraIds.has(x.quoteId)||(x.items||[]).some(item=>extraIds.has(item.extraWorkId))));
    otherInvoices.forEach(x=>docs.append(button('Extra-work invoice '+x.number,()=>openDocument('i',x.id))));
    if(extras.length){const c=card('Extra work & approvals');extras.forEach(x=>c.append(button(x.number+' · '+(STATUS_LABEL[x.status]||x.status),()=>openQuoteDetail(x.id))));page.append(c);}
    const payments=card('Payments');
    if(i){const t=invoiceTotals(i);line(payments,'Invoice total',money(t.total));line(payments,'Paid, including deposits',money(t.paid));line(payments,'Balance due',money(t.balance));(i.payments||[]).forEach(x=>line(payments,fmtDate(x.date),money(x.amount)));}
    else if(j){const m=qnJobMoney(j);line(payments,'Deposits received',money(m.paid));if(m.balance!==null)line(payments,'Remaining balance',money(m.balance));qnJobDepositEntries(j).forEach(x=>line(payments,fmtDate(x.date)+' · '+(x.method||'Payment'),money(x.amount)));}
    else line(payments,'Received',money(0));
    otherInvoices.forEach(x=>{const t=invoiceTotals(x);line(payments,'Extra-work invoice '+x.number,money(t.total));line(payments,'Paid on '+x.number,money(t.paid));line(payments,'Balance on '+x.number,money(t.balance));if(t.balance>0)payments.append(button('Record payment · '+x.number,()=>{openInvoiceDetail(x.id);document.getElementById('i-pay')?.click();}));});
    page.append(payments);
    window.QNSimpleUI?.project(page,p);
    page.append(button('Back to '+(j?'Jobs':i?'Invoices':'Quotes'),()=>showView(j?'jobs':i?'invoices':'quotes')));
  }
  window.qnOpenProject=openProject;
  window.qnRenderProject=renderProject;
  window.qnMountProjectLink=(root,kind,id)=>{if(!root||root.querySelector('[data-project-link]'))return;const b=button('Open project overview',()=>openProject(kind,id));b.dataset.projectLink='';root.prepend(b);};
  const nav=document.querySelector('#tabbar [data-view="clients"]');
  if(nav){nav.dataset.view='jobs';nav.innerHTML='<span class="ico" aria-hidden="true">▣</span>Jobs';}
  const menu=document.querySelector('#view-more .qn-more-menu');
  if(menu){
    const existing=[...document.querySelectorAll('#view-more [data-customers-link]')];
    const b=button('Customers',()=>showView('clients'));b.classList.add('qn-more-item');b.dataset.customersLink='';
    if(existing.length){existing[0].replaceWith(b);existing.slice(1).forEach(duplicate=>duplicate.remove());}else menu.prepend(b);
  }
  const oldShow=showView;
  showView=function(name){oldShow(name);if(name==='project')renderProject();if(name==='jobs'||name==='project'||name==='clients'){const target=name==='project'?'jobs':name==='clients'?'more':'jobs';document.querySelectorAll('#tabbar [data-view]').forEach(b=>{const active=b.dataset.view===target;b.classList.toggle('active',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});}};
  const priorityCopies=[...document.querySelectorAll('#qn-home-priorities')];
  const priorities=priorityCopies.shift()||document.createElement('div');priorityCopies.forEach(duplicate=>duplicate.remove());
  priorities.id='qn-home-priorities';if(!priorities.isConnected)document.querySelector('.qn-recent-documents').before(priorities);
  function renderPriorities(){
    priorities.replaceChildren();
    const rows=DB.quotes.filter(q=>q.status==='sent');
    const c=card('Awaiting approval ('+rows.length+')');
    rows.slice(0,4).forEach(q=>c.append(button(q.number+' · '+clientName(q.clientId),()=>openProject('quote',q.id))));
    if(!rows.length){return;}
    if(rows.length>4)c.append(button('View all',()=>showView('quotes')));
    priorities.append(c);
  }
  const oldDashboard=renderDashboard;renderDashboard=function(){oldDashboard();renderPriorities();};
  const actionStyle=document.createElement('style');
  actionStyle.textContent=`
    #doc-root .doc-actions.qn-compact-actions{align-items:center;gap:10px;padding:10px 16px calc(10px + env(safe-area-inset-bottom));box-shadow:0 -3px 16px #18223008}
    #doc-root .qn-compact-actions>#doc-share{flex:1;min-width:0;min-height:48px;height:auto;margin:0;padding:12px 16px;font-size:15px;line-height:1.4;border-radius:12px;white-space:normal}
    #doc-root .qn-doc-more{position:relative;flex:0 0 100px;min-width:0;margin:0;border:0;background:transparent}
    #doc-root .qn-doc-more>summary{display:flex;align-items:center;justify-content:center;gap:8px;box-sizing:border-box;min-height:48px;padding:12px;border:1px solid #d8dde3;border-radius:12px;background:#fff;font-size:15px;line-height:1.4;list-style:none;cursor:pointer}
    #doc-root .qn-doc-more>summary::-webkit-details-marker{display:none}
    #doc-root .qn-doc-more>summary::after{content:'⋯';font-size:20px;line-height:1}
    #doc-root .qn-doc-more[open]>summary{background:#fff6e8;border-color:#d7830c}
    #doc-root .qn-doc-action-list{position:absolute;right:0;bottom:calc(100% + 10px);width:240px;max-width:calc(100vw - 32px);max-height:60dvh;overflow:auto;padding:6px;border:1px solid #e4e7ec;border-radius:14px;background:#fff;box-shadow:0 8px 32px #18223024}
    #doc-root .qn-doc-action-list>.btn{display:block;width:100%;min-height:48px;height:auto;flex:none;margin:0;padding:12px 14px;border:0;border-radius:8px;box-shadow:none;background:#fff;color:#344054;text-align:left;font-size:15px;line-height:1.4;white-space:normal}
    #doc-root .qn-doc-action-list>.btn:hover{background:#fff6e8}
    #doc-root .qn-doc-more>summary:focus-visible,#doc-root .qn-doc-action-list>.btn:focus-visible{outline:3px solid #f59e0b;outline-offset:2px}
  `;
  document.head.append(actionStyle);
  document.addEventListener('click',event=>{document.querySelectorAll('.qn-doc-more[open]').forEach(menu=>{if(!menu.contains(event.target))menu.open=false;});});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('.qn-doc-more[open]').forEach(menu=>{menu.open=false;menu.querySelector('summary').focus();event.stopPropagation();});},true);
  const oldDocument=openDocument;
  openDocument=function(kind,id){
    oldDocument(kind,id);
    const root=document.getElementById('doc-root');const actions=root.querySelector('.doc-actions');if(!actions)return;
    const share=root.querySelector('#doc-share');if(share){const replacement=share.cloneNode(true);replacement.textContent='Send to customer';replacement.onclick=()=>send(kind,id);share.replaceWith(replacement);}
    actions.classList.add('qn-compact-actions');
    const more=document.createElement('details');more.className='qn-form-details qn-doc-more';const summary=document.createElement('summary');summary.textContent='More';
    const list=document.createElement('div');list.className='qn-doc-action-list';more.append(summary,list);
    const approval=root.querySelector('[data-qn-approval]');if(approval){const details=document.createElement('details');details.className='qn-form-details';const summary=document.createElement('summary');summary.textContent='Customer approval';details.append(summary,approval);root.querySelector('.doc-body')?.append(details);}
    const pdf=root.querySelector('#doc-pdf');if(pdf){pdf.textContent='Download PDF';list.append(pdf);}
    const edit=root.querySelector('#doc-edit');if(edit)list.append(edit);
    list.append(button('Project overview',()=>openProject(kind==='q'?'quote':'invoice',id)));
    const reuse=root.querySelector('#doc-reuse');if(reuse){const oldMore=reuse.closest('details');list.append(reuse);oldMore?.remove();}
    list.addEventListener('click',event=>{if(event.target.closest('button'))more.open=false;});
    actions.append(more);
  };
  window.qnRenderSavedDocument=openDocument;
  renderPriorities();
  window.QNWorkflow={project,next,send,refresh:renderPriorities};
})();


