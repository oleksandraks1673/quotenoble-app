(function(){
 'use strict';
 const P=window.QNPurchases={},M=window.QNPurchaseModel,E=window.QNCrew.esc;
 P.esc=E;P.money=window.QNCrew.money;P.today=()=>{const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
 let kind='order',jobFilter='',search='',rows=[],listEpoch=0,plan=null,planUser=null,planAt=0;
 const section=document.getElementById('view-purchases');
 P.api=async body=>{
  const client=window.qnApprovalSession?.client;if(!client)throw Object.assign(Error('Please sign in again.'),{status:401});
  const {data}=await client.auth.getSession();if(!data.session?.access_token)throw Object.assign(Error('Please sign in again.'),{status:401});
  const response=await fetch('/api/purchases',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify(body),signal:AbortSignal.timeout(35000)});
  const result=await response.json(),latest=await client.auth.getSession();
  if(!latest.data.session||latest.data.session.user.id!==data.session.user.id)throw Object.assign(Error('Your account changed. Please sign in again.'),{status:401});
  if(!response.ok)throw Object.assign(Error(result.error||'Unable to load purchases.'),{status:response.status});return result;
 };
 P.message=(body,message)=>{const n=body.querySelector('[data-p-message]');if(n)n.textContent=message;};
 P.footer=()=>'<p data-p-message class="qn-p-message" role="status" aria-live="polite"></p><button type="button" class="btn btn-outline" id="modal-cancel">Close</button>';
 P.jobs=(selected='')=>'<option value="">No linked job</option>'+((DB.jobs||[]).some(j=>j.id===selected)?'':selected?'<option value="'+E(selected)+'" selected>Previously linked job</option>':'')+(DB.jobs||[]).map(j=>'<option value="'+E(j.id)+'"'+(j.id===selected?' selected':'')+'>'+E(j.title||'Untitled job')+'</option>').join('');
 P.access=async()=>{
  const user=window.qnApprovalSession?.user?.id;
  if(!plan||planUser!==user||Date.now()-planAt>60000){plan=await P.api({action:'list',kind:'order'});planUser=user;planAt=Date.now();}
  if(plan.pro)return true;
  const body=openModal('Purchases with Pro','<div class="qn-p-wrap"><p>Prepare supplier orders and keep receipt photos with your jobs.</p><p>'+(plan.planError?'Your plan could not be checked. Please refresh and try again.':'Included in your existing Pro plan.')+'</p><button type="button" class="btn btn-primary" data-p-plans>View Pro plans</button></div>'+P.footer());body.querySelector('[data-p-plans]').onclick=()=>{closeModal();showView('plans');};return false;
 };
 P.refresh=()=>{planAt=0;if(section.classList.contains('active'))render();};
 const oldShow=showView;showView=function(name){oldShow(name);if(name==='purchases')render();};
 P.navigationKind=()=>kind;
 P.restoreNavigationKind=value=>{kind=value==='receipt'?'receipt':'order';};
 P.open=(next='order',jobId='')=>{kind=next;jobFilter=jobId;search='';closeModal();showView('purchases');};
 async function render(){
  const my=++listEpoch;rows=[];
  section.innerHTML='<div class="qn-page-intro"><h2>Purchases</h2><p>Material orders and receipts, connected to your jobs</p></div><div class="qn-p-tabs" role="group" aria-label="Purchase type"><button type="button" data-kind="order" aria-pressed="'+(kind==='order')+'">Supplier orders</button><button type="button" data-kind="receipt" aria-pressed="'+(kind==='receipt')+'">Receipts</button></div><div class="qn-p-toolbar"><button type="button" class="btn btn-primary" data-p-new>'+ (kind==='order'?'+ New supplier order':'+ Capture receipt')+'</button><label>Job<select data-p-job>'+P.jobs(jobFilter).replace('No linked job','All jobs')+'</select></label><label>Search<input type="search" maxlength="120" data-p-search placeholder="Supplier or job" value="'+E(search)+'"></label></div><p class="qn-p-muted" data-p-plan></p><div data-p-totals></div><p class="qn-p-message" data-p-error role="status"></p><div data-p-list>Loading…</div><button type="button" class="btn btn-outline" data-p-more hidden>Load more</button>';
  section.querySelectorAll('[data-kind]').forEach(b=>b.onclick=()=>{kind=b.dataset.kind;search='';render();window.qnNavigationChanged?.();});
  section.querySelector('[data-p-new]').onclick=()=>kind==='order'?P.newOrder({jobId:jobFilter}):P.receiptForm({jobId:jobFilter});
  section.querySelector('[data-p-job]').onchange=e=>{jobFilter=e.target.value;render();};
  let timer;section.querySelector('[data-p-search]').oninput=e=>{search=e.target.value;clearTimeout(timer);timer=setTimeout(()=>{if(my===listEpoch){rows=[];load(false);}},300);};
  section.querySelector('[data-p-more]').onclick=()=>load(true);
  let request=0;
  async function load(append){
   const req=++request,k=kind,button=section.querySelector('[data-p-more]');button.disabled=true;
   try{
    const data=await P.api({action:'list',kind:k,jobId:jobFilter,search,offset:append?rows.length:0});if(my!==listEpoch||req!==request)return;
    plan=data;planUser=window.qnApprovalSession?.user?.id;planAt=Date.now();rows=append?[...rows,...data.rows]:data.rows;
    section.querySelector('[data-p-plan]').textContent=data.planError?'Plan status unavailable. Existing records can be viewed.':data.pro?'Included with Pro':'View saved records. Upgrade to Pro to create orders and capture receipts.';
    section.querySelector('[data-p-totals]').innerHTML=k==='receipt'&&data.count?'<div class="qn-p-summary"><strong>'+P.money(data.total)+' in receipts</strong><span>Includes '+P.money(data.tax)+' in entered tax · '+data.count+' receipts</span></div>':'';
    section.querySelector('[data-p-list]').innerHTML=rows.length?rows.map(r=>'<button type="button" class="qn-p-list-row" data-p-record="'+r.id+'"><span><strong>'+E(k==='order'?r.number+' · '+r.supplier:r.supplier)+'</strong><small>'+E(r.jobTitle||'No linked job')+' · '+E(k==='order'?(r.neededBy||'Date not set'):r.date)+'</small></span><span class="qn-p-tag">'+E(k==='order'?r.status:P.money(r.total))+'</span></button>').join(''):'<div class="empty">'+(search?'No matching records.':k==='order'?'No supplier orders yet. Create one from a quote’s materials list or a job.':'No receipts yet. Take a photo and review the purchase details.')+'</div>';
    section.querySelectorAll('[data-p-record]').forEach(b=>b.onclick=()=>k==='order'?P.orderDetail(b.dataset.pRecord):P.receiptDetail(b.dataset.pRecord));button.hidden=rows.length>=data.count;section.querySelector('[data-p-error]').textContent='';
   }catch(e){if(my===listEpoch&&req===request){section.querySelector('[data-p-error]').textContent=e.message;if(!rows.length)section.querySelector('[data-p-list]').textContent='';}}finally{if(my===listEpoch)button.disabled=false;}
  }
  load(false);
 }
 function materialRows(items){return items.map(i=>'<div class="qn-p-item"><label>Material<input data-name maxlength="250" required value="'+E(i.name||'')+'"></label><label>Quantity<input data-qty type="number" min="0.01" max="1000000" step="0.01" required value="'+E(i.qty??1)+'"></label><label>Unit<select data-unit>'+M.units.map(u=>'<option'+(u===i.unit?' selected':'')+'>'+u+'</option>').join('')+'</select></label><button type="button" class="btn btn-outline" data-remove aria-label="Remove material">×</button></div>').join('');}
 function readItems(body){return [...body.querySelectorAll('.qn-p-item')].map(n=>({name:n.querySelector('[data-name]').value,qty:Number(n.querySelector('[data-qty]').value),unit:n.querySelector('[data-unit]').value}));}
 P.newOrder=async(seed={})=>{
  try{if(!await P.access())return;const job=DB.jobs?.find(j=>j.id===seed.jobId),quote=DB.quotes?.find(q=>q.id===(seed.quoteId||job?.quoteId));orderForm({id:crypto.randomUUID(),jobId:job?.id||'',jobTitle:job?.title||'',quoteId:quote?.id||'',quoteNumber:quote?.number||'',supplier:'',supplierEmail:'',neededBy:'',fulfillment:'Pickup',address:'',notes:quote?.materialNotes||'',items:quote?.materials?.length?structuredClone(quote.materials):[{name:'',qty:1,unit:'pcs'}]});}catch(e){qnAlert(e.message);}
 };
 function orderForm(o){
  const body=openModal(o.version?'Edit '+o.number:'New supplier order','<form class="qn-p-wrap" data-order-form><p class="qn-p-muted">Review these details before sharing with your supplier.</p><label>Supplier name<input data-supplier required maxlength="150" value="'+E(o.supplier)+'"></label><label>Supplier email <small>(optional)</small><input type="email" data-email maxlength="254" value="'+E(o.supplierEmail||'')+'"></label><label>Job<select data-job>'+P.jobs(o.jobId)+'</select></label><button type="button" class="btn btn-outline btn-small" data-import>Use linked job’s materials</button><div class="qn-p-grid"><label>Needed by<input type="date" data-date value="'+E(o.neededBy||'')+'"></label><label>Collection<select data-fulfillment><option'+(o.fulfillment==='Pickup'?' selected':'')+'>Pickup</option><option'+(o.fulfillment==='Delivery'?' selected':'')+'>Delivery</option></select></label></div><label data-address-label>Delivery address<textarea data-address rows="2" maxlength="600">'+E(o.address||'')+'</textarea></label><h3>Materials</h3><div data-items>'+materialRows(o.items)+'</div><button type="button" class="btn btn-outline" data-add>+ Add material</button><label>Notes for supplier<textarea data-notes rows="3" maxlength="2000">'+E(o.notes||'')+'</textarea></label><button type="submit" class="btn btn-primary">Save order</button></form>'+P.footer());
  const form=body.querySelector('[data-order-form]'),wrap=body.querySelector('[data-items]');
  const collection=()=>{const delivery=body.querySelector('[data-fulfillment]').value==='Delivery';body.querySelector('[data-address-label]').hidden=!delivery;body.querySelector('[data-address]').required=delivery;};collection();body.querySelector('[data-fulfillment]').onchange=collection;
  wrap.onclick=e=>{const b=e.target.closest('[data-remove]');if(b)b.closest('.qn-p-item').remove();};
  body.querySelector('[data-add]').onclick=()=>{const items=readItems(body);if(items.length>=100)return P.message(body,'An order can have up to 100 items.');wrap.innerHTML=materialRows([...items,{name:'',qty:1,unit:'pcs'}]);};
  body.querySelector('[data-import]').onclick=async()=>{const j=DB.jobs?.find(j=>j.id===body.querySelector('[data-job]').value),q=DB.quotes?.find(q=>q.id===j?.quoteId);if(!q?.materials?.length)return P.message(body,'This job has no quote materials. Add the items below.');if(readItems(body).some(i=>i.name.trim())&&!await qnConfirm('Replace the current items with this job’s quote materials?'))return;wrap.innerHTML=materialRows(q.materials);o.quoteId=q.id;o.quoteNumber=q.number;P.message(body,'Materials copied. Check quantities and specifications.');};
  form.onsubmit=async e=>{
   e.preventDefault();const button=form.querySelector('[type=submit]');button.disabled=true;
   try{
    const j=DB.jobs?.find(j=>j.id===body.querySelector('[data-job]').value),record=M.order({...o,supplier:body.querySelector('[data-supplier]').value,supplierEmail:body.querySelector('[data-email]').value,jobId:body.querySelector('[data-job]').value,jobTitle:j?.title||((o.jobId===body.querySelector('[data-job]').value)?o.jobTitle:''),neededBy:body.querySelector('[data-date]').value,fulfillment:body.querySelector('[data-fulfillment]').value,address:body.querySelector('[data-address]').value,items:readItems(body),notes:body.querySelector('[data-notes]').value});
    P.message(body,'Saving order…');await window.qnCloudFlush();const saved=await P.api({action:'save',kind:'order',id:o.id,...(o.version?{version:o.version}:{}),record});P.refresh();if(body.isConnected)P.orderDetail(saved.record.id);
   }catch(err){P.message(body,err.message);}finally{if(button.isConnected)button.disabled=false;}
  };
 }
 P.orderDetail=async id=>{
  const body=openModal('Supplier order','<p>Loading order…</p>'+P.footer(),{key:'order:'+id,reopen:()=>P.orderDetail(id)});
  try{
   const {record:o}=await P.api({action:'get',id});if(!body.isConnected)return;
   if(o.kind!=='order')throw Error('Order not found.');
   body.innerHTML='<div class="qn-p-wrap"><div class="qn-p-row"><h3>'+E(o.number)+'</h3><span class="qn-p-tag">'+E(o.status)+'</span></div><h3>'+E(o.supplier)+'</h3>'+(o.jobTitle?'<p>Job: '+E(o.jobTitle)+'</p>':'')+'<p>'+E(o.fulfillment)+(o.neededBy?' · '+E(o.neededBy):'')+'</p>'+(o.address?'<p class="qn-p-preserve">'+E(o.address)+'</p>':'')+'<div class="qn-p-order-items">'+o.items.map(i=>'<div><strong>'+E(i.qty+' '+i.unit)+'</strong><span>'+E(i.name)+'</span></div>').join('')+(o.notes?'<p class="qn-p-preserve">'+E(o.notes)+'</p>':'')+'</div><div class="btn-row"><button class="btn btn-primary" data-share>Share order</button><button class="btn btn-outline" data-pdf>Download PDF</button><button class="btn btn-outline" data-copy>Copy order</button></div><p class="qn-p-muted">Review and send using your chosen app. Update the status after arranging the order with your supplier.</p><div class="btn-row">'+(o.status==='Draft'?'<button class="btn btn-outline" data-edit>Edit</button><button class="btn btn-outline" data-status="Ordered">Mark ordered</button>':'')+(o.status==='Ordered'?'<button class="btn btn-primary" data-status="Received">Mark received</button>':'')+(['Draft','Ordered'].includes(o.status)?'<button class="btn btn-outline" data-status="Cancelled">Cancel order</button>':'')+'<button class="btn btn-outline" data-duplicate>Duplicate</button><button class="btn btn-outline" data-receipt>+ Capture receipt</button>'+(['Draft','Cancelled','Received'].includes(o.status)?'<button class="btn btn-outline" data-delete>Remove</button>':'')+'</div></div>'+P.footer();
   const pdf=()=>window.QNPurchasePDF(o,window.jspdf?.jsPDF),filename='QuoteNoble-'+o.number+'.pdf';
   body.querySelector('[data-pdf]').onclick=()=>{try{pdf().save(filename);}catch(e){P.message(body,e.message);}};
   body.querySelector('[data-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(M.orderText(o));P.message(body,'Order copied. Paste it into your message to the supplier.');}catch{qnCopyText('Copy this supplier order:',M.orderText(o));}};
   body.querySelector('[data-share]').onclick=async()=>{try{const file=new File([pdf().output('blob')],filename,{type:'application/pdf'});if(navigator.canShare?.({files:[file]}))await navigator.share({files:[file],title:o.number});else if(navigator.share)await navigator.share({title:o.number,text:M.orderText(o)});else{pdf().save(filename);P.message(body,'PDF downloaded. Attach it to your message to the supplier.');}}catch(e){if(e.name!=='AbortError')P.message(body,'Sharing was unavailable. Use Download PDF or Copy order.');}};
   body.querySelector('[data-edit]')?.addEventListener('click',async()=>{try{if(await P.access()&&body.isConnected)orderForm(o);}catch(e){P.message(body,e.message);}});
   body.querySelector('[data-duplicate]').onclick=async()=>{try{if(await P.access()&&body.isConnected)orderForm({...o,id:crypto.randomUUID(),version:undefined,number:undefined,status:'Draft',...(!DB.jobs?.some(j=>j.id===o.jobId)?{jobId:'',jobTitle:''}:{}),...(!DB.quotes?.some(q=>q.id===o.quoteId)?{quoteId:'',quoteNumber:''}:{})});}catch(e){P.message(body,e.message);}};
   body.querySelector('[data-receipt]').onclick=()=>P.receiptForm({jobId:o.jobId,jobTitle:o.jobTitle,supplier:o.supplier,orderId:o.id});
   body.querySelectorAll('[data-status]').forEach(b=>b.onclick=async()=>{const status=b.dataset.status;if(!await qnConfirm(status==='Cancelled'?'Mark this order cancelled? Contact your supplier separately to cancel any placed order.':status==='Ordered'?'Mark this order as placed with your supplier?':'Mark these materials as received?'))return;b.disabled=true;try{await P.api({action:'status',id:o.id,version:o.version,status});P.refresh();if(body.isConnected)P.orderDetail(o.id);}catch(e){P.message(body,e.message);b.disabled=false;}});
   body.querySelector('[data-delete]')?.addEventListener('click',async e=>{const button=e.currentTarget;if(!await qnConfirm('Remove '+o.number+' from your orders?'))return;button.disabled=true;try{await P.api({action:'delete',id:o.id,version:o.version});closeModal();P.refresh();}catch(err){P.message(body,err.message);button.disabled=false;}});
  }catch(e){if(body.isConnected)body.innerHTML='<p>'+E(e.message)+'</p>'+P.footer();}
 };
 window.qnPurchasesMount=(body,job)=>{
  body.querySelectorAll('.qn-p-job').forEach(previous=>previous.remove());
  const area=document.createElement('section');area.className='qn-p-job';area.innerHTML='<h3>Materials &amp; purchases</h3><div class="btn-row"><button class="btn btn-outline" data-new-order>Supplier order</button><button class="btn btn-outline" data-new-receipt>Capture receipt</button><button class="btn btn-outline" data-view-orders>View orders</button><button class="btn btn-outline" data-view-receipts>View receipts</button></div><div data-receipt-summary></div>';body.appendChild(area);
  area.querySelector('[data-new-order]').onclick=()=>P.newOrder({jobId:job.id});area.querySelector('[data-new-receipt]').onclick=()=>P.receiptForm({jobId:job.id});area.querySelector('[data-view-orders]').onclick=()=>P.open('order',job.id);area.querySelector('[data-view-receipts]').onclick=()=>P.open('receipt',job.id);
  P.api({action:'list',kind:'receipt',jobId:job.id}).then(data=>{if(!area.isConnected||!data.count)return;const target=area.querySelector('[data-receipt-summary]');target.innerHTML='<p class="qn-p-muted">Receipts logged: <strong>'+P.money(data.total)+'</strong> ('+data.count+')</p>'+(data.pro&&data.materials>0?'<button class="btn btn-outline btn-small" data-use-cost>Apply '+P.money(data.materials)+' to material cost</button><p class="qn-p-muted">Uses Materials receipts, excluding entered tax. Replaces the current material cost.</p>':'');target.querySelector('[data-use-cost]')?.addEventListener('click',async()=>{if(!await qnConfirm('Replace the current material cost of '+P.money(job.materialCost||0)+' with '+P.money(data.materials)+' from receipts?'))return;job.materialCost=data.materials;job.updatedAtTime=new Date().toISOString();save();closeModal();showView('jobs');});}).catch(()=>{});
 };
 document.addEventListener('click',e=>{const b=e.target.closest('[data-qn-order-quote]');if(b)P.newOrder({quoteId:b.dataset.qnOrderQuote});});
 if(section.classList.contains('active')&&window.qnApprovalSession?.user)render();
})();
