(function(){
  'use strict';
  const M=window.QNExtraWork;
  const job=id=>(DB.jobs||[]).find(j=>j.id===id),request=id=>DB.quotes.find(q=>q.id===id);
  function state(q){if(M.approved(q))return 'Approved';const r=window.qnApprovalRecord?.(q.id);return r?({accepted:'Approved',declined:'Declined',pending:'Pending',revoked:'Link disabled',expired:'Expired'}[r.status]||r.status):q.status==='declined'?'Declined':'Not sent';}
  const currentTotal=j=>Number.isFinite(j.agreedTotal)?j.agreedTotal+M.total(DB,j.id):null;
  window.qnExtraWorkTotal=currentTotal;
  window.qnExtraInvoiceItems=(id,base)=>M.invoiceItems(DB,id,base);
  window.qnExtraInvoiceItemsFor=(kind,id,base)=>M.invoiceItemsFor(DB,M.context(DB,kind,id),base);
  function mount(parent,c){
    if(!c)return;
    let panel=parent.querySelector('[data-extra-work-context]');
    if(!panel){panel=document.createElement('section');panel.className='qn-approval-panel';parent.insertBefore(panel,parent.querySelector('.qn-job-deposits'));}
    panel.dataset.extraWorkContext=c.kind+':'+c.id;
    if(c.jobId)panel.dataset.extraWorkJob=c.jobId;
    const extras=M.requestsFor(DB,c),total=extras.filter(M.approved).reduce((n,q)=>n+q.customerApprovedSnapshot.total,0);
    panel.innerHTML='<h3>Extra-work approvals</h3><p>Add extra work at any stage. Your existing estimate, invoice and job status stay unchanged.</p><div class="kv"><span>Approved extras</span><strong>'+money(total)+'</strong></div><button type="button" class="btn btn-primary" data-new-extra>Add extra work · Pro</button>'+extras.slice().reverse().map(q=>'<div style="padding-top:16px;margin-top:16px;border-top:1px solid var(--border)"><strong>'+esc(q.number)+' · '+esc(q.extraWorkTitle||'Extra work')+'</strong><p>'+esc(state(q))+' · '+money(M.approved(q)?q.customerApprovedSnapshot.total:quoteTotals(q).total)+(M.billed(DB,q)?' · Invoiced':'')+'</p><button type="button" class="btn btn-outline" data-open-extra="'+esc(q.id)+'">View approval</button></div>').join('');
    panel.querySelector('[data-new-extra]').onclick=()=>form(c.id,c.kind);
    panel.querySelectorAll('[data-open-extra]').forEach(b=>b.onclick=()=>open(b.dataset.openExtra));
  }
  window.qnExtraWorkMount=(parent,j)=>mount(parent,M.context(DB,'job',j.id));
  window.qnExtraWorkMountDocument=(parent,kind,doc)=>mount(parent,M.context(DB,kind,doc.id));
  function form(id,kind='job'){
    if(!window.qnRequirePro?.('Extra-work approvals'))return;
    const c=M.context(DB,kind,id);if(!c)return;const scope=LS_KEY;
    const body=openModal('Add extra work','<p>For <strong>'+esc(c.title)+'</strong>. Only the work below will be sent for approval.</p><div class="field"><label for="ew-client">Customer</label><select id="ew-client">'+clientOptionsHTML(c.clientId)+'</select></div><div class="field"><label for="ew-title">Extra-work title</label><input id="ew-title" maxlength="200" placeholder="e.g. Replace damaged roof decking"></div><div class="field"><label for="ew-scope">Scope of extra work</label><textarea id="ew-scope" maxlength="8000" placeholder="Describe the additional work and materials"></textarea></div><div class="field"><label for="ew-price">Additional price before tax (CAD)</label><input id="ew-price" type="number" inputmode="decimal" min="0" step="0.01" placeholder="0.00"></div><p class="hint">'+esc(c.taxLabel)+' '+Number(c.taxRate)+'% will be added.</p><div class="field"><label for="ew-schedule">Schedule change (optional)</label><textarea id="ew-schedule" maxlength="1000" placeholder="e.g. Adds one working day"></textarea></div><p id="ew-error" role="alert"></p>'+modalFooter('Save approval request','ew-save'));
    body.querySelector('#ew-save').onclick=()=>{
      const b=body.querySelector('#ew-save');if(b.disabled)return;b.disabled=true;
      try{
        if(LS_KEY!==scope||!M.context(DB,kind,id))throw Error('Your account or document changed. Reopen it and try again.');
        const title=body.querySelector('#ew-title').value.trim(),desc=body.querySelector('#ew-scope').value.trim(),raw=body.querySelector('#ew-price').value,price=Math.round(Number(raw)*100),selectedClient=body.querySelector('#ew-client').value,schedule=body.querySelector('#ew-schedule').value.trim();
        if(!title||!desc||raw===''||!Number.isSafeInteger(price)||price<0)throw Error('Enter the work title, scope and a valid price.');
        const customer=getClient(selectedClient);if(!customer)throw Error('Choose a customer first.');
        if(!qnCanCreateDocuments({quotes:1}))return;
        const q={id:uid('extra'),number:'Q-'+qnNextDocumentNumber('quote'),isExtraWork:true,extraWorkJobId:c.jobId,extraWorkParentQuoteId:c.quoteId,extraWorkParentInvoiceId:c.invoiceId,extraWorkTitle:title,extraWorkSchedule:schedule,status:'draft',clientId:selectedClient,clientSnapshot:JSON.parse(JSON.stringify(customer)),items:[{service:title,desc,qty:1,price}],notes:'EXTRA-WORK APPROVAL\nFor: '+c.title+'\nThis approval covers only the additional work listed here. The original agreement remains unchanged.'+(schedule?'\nSchedule change: '+schedule:''),taxRate:c.taxRate,taxLabel:c.taxLabel,materials:[],materialNotes:'',validUntil:'',createdAt:todayStr(),createdAtTime:new Date().toISOString()};
        DB.quotes.push(q);save();if(window.qnSaveFailed){DB.quotes=DB.quotes.filter(x=>x.id!==q.id);throw Error('The request could not be saved. Resolve cloud sync and try again.');}renderQuotes();open(q.id);
      }catch(e){body.querySelector('#ew-error').textContent=e.message;}finally{b.disabled=false;}
    };
  }
  function open(id){
    const q=request(id);if(!q)return;const c=M.context(DB,'quote',id),j=job(q.extraWorkJobId),s=M.approved(q)?q.customerApprovedSnapshot:null,inv=M.billed(DB,q);
    const body=openModal('Extra work · '+q.number,'<p><strong>'+esc(q.extraWorkTitle||q.items?.[0]?.service||'Extra work')+'</strong></p><p style="white-space:pre-wrap">'+esc((s?.items||q.items||[]).map(it=>it.desc).join('\n'))+'</p>'+(q.extraWorkSchedule?'<p><strong>Schedule change:</strong> '+esc(q.extraWorkSchedule)+'</p>':'')+'<div class="kv"><span>Total including tax</span><strong>'+money(s?s.total:quoteTotals(q).total)+'</strong></div><p>This is a separate approval. The original quote and job status are unchanged.</p><div class="btn-row"><button type="button" class="btn btn-outline" id="ew-job">Back to job</button><button type="button" class="btn btn-outline" id="ew-document">View document</button></div>'+(M.approved(q)?'<p>Approved extras are included when you create the job’s final invoice. Existing invoices are not changed.</p><button type="button" class="btn btn-outline" id="ew-invoice">'+(inv?'View invoice · '+esc(inv.number):'Create separate extra-work invoice')+'</button>':'')+(c?'<button type="button" class="btn btn-outline" id="ew-another" style="margin-top:12px">Request more extra work</button>':'')+'<button type="button" class="btn btn-outline" id="ew-delete" style="margin-top:12px;color:#b42318">Delete extra work</button>',{key:'extra:'+id,reopen:()=>open(id)});
    body.querySelector('#ew-job').onclick=()=>{if(j)window.qnOpenJobDetail(j.id);else{closeModal();showView('jobs');}};
    body.querySelector('#ew-document').onclick=()=>{closeModal();openDocument('q',q.id);};
    body.querySelector('#ew-another')?.addEventListener('click',()=>form(c.id,c.kind));
    body.querySelector('#ew-invoice')?.addEventListener('click',()=>{if(inv){closeModal();showView('invoices');openInvoiceDetail(inv.id);}else makeInvoice(q.id);});
    body.querySelector('#ew-delete').onclick=event=>window.qnDeleteRecord('quote',id,event.currentTarget);
    window.qnApprovalMount?.(body,q);
  }
  function makeInvoice(id){
    const q=request(id);if(!q||!M.approved(q))return;const existing=M.billed(DB,q);if(existing){openInvoiceDetail(existing.id);return;}
    if(!qnCanCreateDocuments({invoices:1}))return;
    const s=q.customerApprovedSnapshot,inv={id:uid('i'),number:'INV-'+qnNextDocumentNumber('invoice'),quoteId:q.id,extraWorkJobId:q.extraWorkJobId,clientId:q.clientId,items:M.lines(q),taxRate:s.taxRate,taxLabel:s.taxLabel,notes:s.notes,dueDate:'',depositPaid:0,payments:[],createdAt:todayStr(),createdAtTime:new Date().toISOString()};
    DB.invoices.push(inv);save();if(window.qnSaveFailed){DB.invoices=DB.invoices.filter(i=>i.id!==inv.id);qnAlert('Invoice could not be saved. Resolve storage and retry.');return;}closeModal();showView('invoices');openInvoiceForm(inv);
  }
  window.qnExtraWorkOpen=open;window.qnExtraWorkRequest=form;window.qnExtraWorkInvoice=makeInvoice;
  window.qnExtraWorkShortcut=function(){
    const lang=window.qnLanguage?.get?.()||'en';
    const t=(en,ru,uk)=>lang==='ru'?ru:lang==='uk'?uk:en;
    const scope=LS_KEY;
    const choices=[];
    for(const [kind,records,label] of [
      ['job',DB.jobs,t('Job','Работа','Робота')],
      ['quote',DB.quotes,t('Quote','Смета','Кошторис')],
      ['invoice',DB.invoices,t('Invoice','Счёт','Рахунок')]
    ])for(const record of records||[]){
      if(record.deletedAt||M.isExtra(record))continue;
      const c=M.context(DB,kind,record.id);if(!c)continue;
      const customer=(DB.clients||[]).find(x=>x.id===c.clientId);
      choices.push({kind,id:record.id,label:label+' · '+(record.title||record.number||c.title)+(customer?.name||record.client?' · '+(customer?.name||record.client):'')});
    }
    const body=openModal(t('Extra work','Дополнительные работы','Додаткові роботи'),
      '<p>'+esc(t('Choose the job, quote or invoice for the additional work.','Выберите работу, смету или счёт для допработ.','Виберіть роботу, кошторис або рахунок для додаткових робіт.'))+'</p>'+
      (choices.length?'<div class="field"><label for="ew-shortcut-parent">'+esc(t('Job or document','Работа или документ','Робота або документ'))+'</label><select id="ew-shortcut-parent"><option value="">'+esc(t('Choose…','Выберите…','Виберіть…'))+'</option>'+choices.map((c,i)=>'<option value="'+i+'">'+esc(c.label)+'</option>').join('')+'</select></div><p id="ew-shortcut-error" role="alert"></p>'+modalFooter(t('Continue','Продолжить','Продовжити'),'ew-shortcut-next'):
      '<p>'+esc(t('Create a job or quote first, then add extra work here.','Сначала создайте работу или смету, затем добавьте здесь допработы.','Спочатку створіть роботу або кошторис, потім додайте тут додаткові роботи.'))+'</p><button type="button" class="btn btn-primary" id="ew-shortcut-job">'+esc(t('New job','Новая работа','Нова робота'))+'</button>'));
    body.querySelector('#ew-shortcut-job')?.addEventListener('click',()=>{if(LS_KEY!==scope){closeModal();return;}closeModal();showView('jobs');document.getElementById('qn-new-job')?.click();});
    body.querySelector('#ew-shortcut-next')?.addEventListener('click',()=>{
      const error=body.querySelector('#ew-shortcut-error');
      if(LS_KEY!==scope){error.textContent=t('Your account changed. Reopen Extra work.','Аккаунт изменился. Откройте Допработы заново.','Обліковий запис змінився. Відкрийте Додаткові роботи знову.');return;}
      const value=body.querySelector('#ew-shortcut-parent').value;
      const choice=value===''?null:choices[Number(value)];
      if(!choice){error.textContent=t('Choose a job or document first.','Сначала выберите работу или документ.','Спочатку виберіть роботу або документ.');return;}
      const record=(DB[choice.kind==='job'?'jobs':choice.kind==='quote'?'quotes':'invoices']||[]).find(x=>x.id===choice.id&&!x.deletedAt);
      if(!record){error.textContent=t('This record was removed. Reopen Extra work.','Запись удалена. Откройте Допработы заново.','Запис видалено. Відкрийте Додаткові роботи знову.');return;}
      form(choice.id,choice.kind);
    });
  };
  window.qnExtraWorkRefresh=function(){document.querySelectorAll('[data-extra-work-context]').forEach(p=>{const value=p.dataset.extraWorkContext,split=value.indexOf(':');mount(p.parentElement,M.context(DB,value.slice(0,split),value.slice(split+1)));});window.qnCrewRefreshJobs?.();};
})();
