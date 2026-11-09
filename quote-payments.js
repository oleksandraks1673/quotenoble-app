/* Accepted quotes create one linked invoice. Deposit requests never record money received. */
(function(root,factory){
 const model=factory();
 if(typeof module==='object'&&module.exports){module.exports=model;return;}
 root.QNQuotePayments=model;
 const T=(en,ru,uk)=>root.qnLanguage?.get?.()==='ru'?ru:root.qnLanguage?.get?.()==='uk'?uk:en;
 const copy=v=>JSON.parse(JSON.stringify(v));
 let reconciling=false;
 function allowed(){
  if(typeof qnProPlanVerified!=='undefined'&&qnProPlanVerified)return true;
  if(typeof qnFreePlanVerified!=='undefined'&&qnFreePlanVerified)return qnDocumentUsage().invoices.length<QN_FREE_DOCUMENT_ALLOWANCE;
  return false;
 }
 function reconcile(){
  if(reconciling)return false;reconciling=true;
  try{return model.reconcile(DB,{allowed,now:todayStr(),stamp:new Date().toISOString(),items:q=>qnBillableItems(q),tax:q=>qnDocumentTax(q),extras:(q,items)=>root.qnExtraInvoiceItemsFor?.('quote',q.id,items)||items,applyDeposits:(j,i)=>qnApplyJobDeposits(j,i)});}finally{reconciling=false;}
 }
 const baseSave=save;
 function snapshot(){return {invoices:DB.invoices.slice(),jobs:(DB.jobs||[]).map(j=>({j,id:j.invoiceId})),quotes:DB.quotes.map(q=>({q,id:q.acceptedInvoiceId})),usage:copy(DB.documentUsageByMonth||{})};}
 function rollback(previous){DB.invoices=previous.invoices;for(const {j,id} of previous.jobs){if(id===undefined)delete j.invoiceId;else j.invoiceId=id;}for(const {q,id} of previous.quotes){if(id===undefined)delete q.acceptedInvoiceId;else q.acceptedInvoiceId=id;}DB.documentUsageByMonth=previous.usage;}
 save=function(){
  const previous=snapshot();
  try{const changed=reconcile(),result=baseSave.apply(this,arguments);if(changed&&document.getElementById('view-invoices')?.classList.contains('active'))queueMicrotask(()=>renderInvoices());return result;}catch(e){rollback(previous);throw e;}
 };
 function catchUp(){const previous=snapshot();try{if(reconcile())baseSave();}catch(e){rollback(previous);throw e;}}
 const render=renderInvoices;
 renderInvoices=function(){catchUp();return render.apply(this,arguments);};
 const show=showView;
 showView=function(name){if(name==='home'||name==='quotes'||name==='invoices'||name==='jobs')catchUp();return show.apply(this,arguments);};
 document.addEventListener('qn-billing-status-loaded',()=>setTimeout(()=>{try{catchUp();if(document.getElementById('view-invoices')?.classList.contains('active'))renderInvoices();}catch(e){console.error(e);}},300));
 function invoiceFor(kind,id){
  if(kind==='invoice')return DB.invoices.find(i=>i.id===id);
  const q=kind==='quote'?DB.quotes.find(q=>q.id===id):null,j=kind==='job'?(DB.jobs||[]).find(j=>j.id===id):null;
  return DB.invoices.find(i=>q?i.quoteId===q.id:j&&(i.id===j.invoiceId||i.jobId===j.id||(j.quoteId&&i.quoteId===j.quoteId)));
 }
 function mount(body,kind,id){
  if(!body||body.querySelector('[data-request-deposit]'))return;
  const inv=invoiceFor(kind,id);if(!inv)return;
  const b=document.createElement('button');b.type='button';b.className='btn btn-outline';b.dataset.requestDeposit='';b.textContent=T('Request deposit','Запросить депозит','Запросити депозит');b.disabled=invoiceTotals(inv).balance<=0;
  b.onclick=()=>requestDeposit(inv.id);
  (body.querySelector('.qn-simple-main-actions')||body).append(b);
 }
 for(const [name,kind]of [['openQuoteDetail','quote'],['openInvoiceDetail','invoice'],['qnOpenJobDetail','job']]){
  const original=root[name];if(!original)continue;
  root[name]=function(id){catchUp();const result=original.apply(this,arguments);mount(document.getElementById('modal-body'),kind,id);return result;};
 }
 function requestDeposit(invoiceId){
  if(!root.qnRequirePro?.('Job deposits'))return;
  const inv=DB.invoices.find(i=>i.id===invoiceId);if(!inv)return;
  const scope=LS_KEY,totals=invoiceTotals(inv);if(totals.balance<=0){qnAlert(T('This invoice is already paid.','Этот счёт уже оплачен.','Цей рахунок уже оплачено.'));return;}
  const body=openModal(T('Request deposit','Запросить депозит','Запросити депозит'),
   '<p>'+esc(clientName(inv.clientId))+' · '+esc(inv.number)+'</p><p>'+esc(T('Remaining balance','Остаток к оплате','Залишок до сплати'))+': '+money(totals.balance)+'</p>'+
   '<div class="field"><label for="dr-type">'+esc(T('Amount type','Тип суммы','Тип суми'))+'</label><select id="dr-type"><option value="amount">CAD ($)</option><option value="percent">%</option></select></div>'+
   '<div class="field"><label for="dr-amount">'+esc(T('Deposit amount','Сумма депозита','Сума депозиту'))+'</label><input id="dr-amount" type="number" inputmode="decimal" min="0.01" step="0.01" value="'+(Math.min(totals.balance,Math.round(totals.total*.25))/100).toFixed(2)+'"></div>'+
   '<div class="field"><label for="dr-due">'+esc(T('Requested by (optional)','Оплатить до (необязательно)','Сплатити до (необов’язково)'))+'</label><input id="dr-due" type="date"></div>'+
   '<div class="field"><label for="dr-instructions">'+esc(T('Payment instructions','Инструкции для оплаты','Інструкції для оплати'))+'</label><textarea id="dr-instructions" maxlength="2000" placeholder="E-transfer email / payment instructions"></textarea></div>'+
   '<p>'+esc(T('Prepare a request to share with your customer. Record the payment only after it arrives.','Подготовьте запрос клиенту. Запишите оплату только после получения денег.','Підготуйте запит клієнту. Запишіть оплату лише після отримання грошей.'))+'</p><p id="dr-error" role="alert"></p>'+modalFooter(T('Prepare request','Подготовить запрос','Підготувати запит'),'dr-save'));
  body.querySelector('#dr-type').onchange=()=>{body.querySelector('#dr-amount').value=body.querySelector('#dr-type').value==='percent'?'25':(Math.min(totals.balance,Math.round(totals.total*.25))/100).toFixed(2);};
  body.querySelector('#dr-save').onclick=()=>{
   const button=body.querySelector('#dr-save');if(button.disabled)return;button.disabled=true;
   try{
    if(scope!==LS_KEY||!DB.invoices.includes(inv))throw Error(T('Your account or invoice changed. Reopen the request.','Аккаунт или счёт изменился. Откройте запрос заново.','Обліковий запис або рахунок змінився. Відкрийте запит знову.'));
    const current=invoiceTotals(inv),amount=model.amount(body.querySelector('#dr-amount').value,body.querySelector('#dr-type').value,current);
    const dueDate=body.querySelector('#dr-due').value;if(dueDate&&!/^\d{4}-\d{2}-\d{2}$/.test(dueDate))throw Error('Choose a valid date.');
    const request={id:uid('deposit-request'),amount,dueDate,instructions:body.querySelector('#dr-instructions').value.trim(),createdAtTime:new Date().toISOString(),status:'prepared'};
    const previous=inv.depositRequests;inv.depositRequests=[...(previous||[]),request];
    try{save();}catch(e){if(previous===undefined)delete inv.depositRequests;else inv.depositRequests=previous;throw e;}
    shareRequest(inv,request,scope);
   }catch(e){body.querySelector('#dr-error').textContent=e.message;button.disabled=false;}
  };
 }
 function requestText(inv,r){const customer=getClient(inv.clientId)||{},p=DB.profile;return [p.businessName||'Payment request','DEPOSIT REQUEST · '+inv.number,customer.name||'', 'Requested deposit: '+money(r.amount),'Invoice total: '+money(invoiceTotals(inv).total),'Remaining invoice balance: '+money(invoiceTotals(inv).balance),r.dueDate?'Please pay by: '+fmtDate(r.dueDate):'',r.instructions,'Please include '+inv.number+' as the payment reference.',p.email||'',p.phone||''].filter(Boolean).join('\n');}
 function shareRequest(inv,r,scope){
  const text=requestText(inv,r),customer=getClient(inv.clientId)||{};
  const body=openModal(T('Deposit request ready','Запрос депозита готов','Запит депозиту готовий'),'<p>'+esc(T('Choose how to send this request.','Выберите способ отправки запроса.','Виберіть спосіб надсилання запиту.'))+'</p><textarea id="dr-message" rows="11" readonly></textarea><div class="btn-row"><button type="button" class="btn btn-primary" id="dr-share">'+esc(T('Share request','Поделиться запросом','Поділитися запитом'))+'</button><a class="btn btn-outline" id="dr-email">Email</a><button type="button" class="btn btn-outline" id="dr-copy">'+esc(T('Copy message','Скопировать текст','Скопіювати текст'))+'</button></div><p id="dr-status" role="status"></p>');
  body.querySelector('#dr-message').value=text;
  body.querySelector('#dr-email').href='mailto:'+encodeURIComponent(String(customer.email||'').replace(/[\r\n]/g,''))+'?subject='+encodeURIComponent('Deposit request · '+inv.number)+'&body='+encodeURIComponent(text);
  const check=()=>{if(scope!==LS_KEY||!DB.invoices.includes(inv))throw Error('Your account or invoice changed. Reopen the request.');};
  body.querySelector('#dr-email').onclick=e=>{try{check();}catch(err){e.preventDefault();body.querySelector('#dr-status').textContent=err.message;}};
  body.querySelector('#dr-copy').onclick=async()=>{try{check();await navigator.clipboard.writeText(text);body.querySelector('#dr-status').textContent=T('Copied','Скопировано','Скопійовано');}catch(e){body.querySelector('#dr-message').select();body.querySelector('#dr-status').textContent=T('Select and copy the message above.','Выделите и скопируйте текст выше.','Виділіть і скопіюйте текст вище.');}};
  body.querySelector('#dr-share').onclick=async()=>{try{check();if(navigator.share){await navigator.share({title:'Deposit request · '+inv.number,text});}else body.querySelector('#dr-email').click();}catch(e){if(e.name!=='AbortError')body.querySelector('#dr-status').textContent=e.message;}};
 }
 function picker(){
  if(!root.qnRequirePro?.('Job deposits'))return;
  catchUp();const scope=LS_KEY,records=DB.invoices.filter(i=>!i.deletedAt&&invoiceTotals(i).balance>0);
  const body=openModal(T('Request deposit','Запросить депозит','Запросити депозит'),records.length?'<div class="field"><label for="dr-invoice">'+esc(T('Choose invoice','Выберите счёт','Виберіть рахунок'))+'</label><select id="dr-invoice"><option value="">'+esc(T('Choose…','Выберите…','Виберіть…'))+'</option>'+records.map((i,n)=>'<option value="'+n+'">'+esc(i.number+' · '+clientName(i.clientId))+'</option>').join('')+'</select></div><p id="dr-picker-error" role="alert"></p>'+modalFooter(T('Continue','Продолжить','Продовжити'),'dr-next'):'<p>'+esc(T('Accept a quote or create an invoice first.','Сначала подтвердите смету или создайте счёт.','Спочатку підтвердьте кошторис або створіть рахунок.'))+'</p>');
  body.querySelector('#dr-next')?.addEventListener('click',()=>{const v=body.querySelector('#dr-invoice').value,i=v===''?null:records[Number(v)];if(scope!==LS_KEY||!i||!DB.invoices.includes(i)){body.querySelector('#dr-picker-error').textContent=T('Choose a current invoice.','Выберите действующий счёт.','Виберіть поточний рахунок.');return;}requestDeposit(i.id);});
 }
 root.qnRequestDeposit=requestDeposit;root.qnRequestDepositPicker=picker;
 function init(){
  const menu=document.getElementById('qn-create-menu');if(!menu)return;let b=menu.querySelector('[data-deposit-create]');if(!b){b=document.createElement('button');b.type='button';b.dataset.depositCreate='';b.textContent=T('Request deposit','Запросить депозит','Запросити депозит');menu.append(b);}
  b.onclick=()=>{menu.hidden=true;document.getElementById('qn-create-toggle')?.setAttribute('aria-expanded','false');picker();};
 }
 document.addEventListener('qn-language-changed',()=>{const b=document.querySelector('[data-deposit-create]');if(b)b.textContent=T('Request deposit','Запросить депозит','Запросити депозит');});
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function reconcile(db,options){
  let changed=false;
  for(const q of db.quotes||[]){
   if(q.status!=='accepted'||q.sample||q.deletedAt||q.sourceInvoiceId||q.isExtraWork||q.extraWorkTitle||q.extraWorkJobId||q.extraWorkParentQuoteId||q.extraWorkParentInvoiceId)continue;
   const id='i_accepted_'+q.id;
   const existing=db.invoices.find(i=>i.quoteId===q.id);if(existing){if(q.acceptedInvoiceId!==existing.id){q.acceptedInvoiceId=existing.id;changed=true;}continue;}
   if(q.acceptedInvoiceId||db.deletedRecords?.['invoices:'+id])continue;
   if(!options.allowed())continue;
   const signed=q.customerDecisionId&&q.customerApprovedSnapshot?.acceptance?q.customerApprovedSnapshot:null,source=signed||q;
   const items=(signed?signed.items:options.items(q)).map(({optional,selected,...it})=>({...it}));if(!items.length||!q.clientId)continue;
   const rate=signed?{rate:signed.taxRate,label:signed.taxLabel}:options.tax(q);
   const stem='INV-'+String(q.number||q.id).replace(/^Q-/,'');
   const number=db.invoices.some(i=>i.number===stem)?stem+'-A-'+q.id:stem;
   const j=(db.jobs||[]).find(j=>j.quoteId===q.id),stamp=options.stamp;
   const inv={id,number,quoteId:q.id,clientId:q.clientId,clientSnapshot:q.clientSnapshot,items:options.extras(q,items),notes:source.notes||'',taxRate:rate.rate,taxLabel:rate.label,discount:source.discount||null,dueDate:'',depositPaid:0,payments:[],createdAt:options.now,createdAtTime:stamp,autoFromAccepted:true};
   if(j){inv.jobId=j.id;options.applyDeposits(j,inv);j.invoiceId=inv.id;}
   db.invoices.push(inv);q.acceptedInvoiceId=inv.id;changed=true;
  }
  return changed;
 }
 function amount(raw,type,totals){
  if(!/^\d+(\.\d{1,2})?$/.test(String(raw)))throw Error('Enter a valid deposit amount with up to two decimal places.');
  const n=Number(raw);if(!Number.isFinite(n)||n<=0||(type==='percent'&&n>100))throw Error('Enter a valid deposit amount or percentage.');
  const cents=Math.round(type==='percent'?totals.total*n/100:n*100);
  if(!Number.isSafeInteger(cents)||cents<=0||cents>totals.balance)throw Error('The deposit must be greater than zero and cannot exceed the remaining balance.');
  return cents;
 }
 return {reconcile,amount};
});
