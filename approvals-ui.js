(function(){
  'use strict';
  let client,userId,busy=false,records=[],emailReady=false;
  const e=v=>esc(v??'');
  async function api(body){
    if(!client)throw Error('Please sign in to use customer approvals.');
    const {data,error}=await client.auth.getSession();if(error||!data?.session)throw Error('Please sign in again.');
    const r=await fetch('/api/approvals',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify(body),cache:'no-store'});
    const result=await r.json();if(!r.ok)throw Error(result.error||'Customer approvals are unavailable.');return result;
  }
  function same(q,r){try{return QNApprovalModel.canonical(QNApprovalModel.snapshot(DB,q))===QNApprovalModel.canonical(r.snapshot);}catch{return false;}}
  function latest(q){return records.find(r=>r.quoteId===q.id&&!q.approvalHistory?.[r.id]);}
  window.qnApprovalRecord=id=>records.find(r=>r.quoteId===id);
  window.qnRevokeApprovalForDelete=async id=>{
    // Disable the pending link automatically without sending the user to another page.
    if(!client)throw Error('Sign in again to disable the approval link before deleting.');
    if(!records.some(r=>r.quoteId===id&&r.status==='pending'))return;
    await api({action:'revoke',quoteId:id});
    records=records.map(r=>r.quoteId===id&&r.status==='pending'?{...r,status:'revoked'}:r);
  };
  window.qnRefreshApprovals=refresh;
  function message(panel,text,error=false){const msg=panel.querySelector('.qn-approval-message');if(msg){msg.textContent=text;msg.dataset.error=String(error);}}
  async function refresh(){
    if(!client||busy||document.hidden)return;busy=true;const currentUser=userId;
    try{
      const data=await api({action:'list'});if(currentUser!==userId)return;records=data.approvals;emailReady=data.emailReady;
      let changed=false;const seen=new Set();
      for(const r of records){
        if(seen.has(r.quoteId))continue;seen.add(r.quoteId);const q=DB.quotes.find(q=>q.id===r.quoteId);
        if(q&&!q.approvalHistory?.[r.id]&&(same(q,r)||q.customerDecisionId===r.id)&&['accepted','declined'].includes(r.status)&&(q.customerDecisionId!==r.id||(r.approvedSnapshot?.acceptance&&!q.customerApprovedSnapshot?.acceptance))){
          if(q.customerDecisionId!==r.id&&!['accepted','invoiced'].includes(q.status))q.status=r.status;q.items=(q.items||[]).map((it,index)=>it.optional?{...it,selected:r.status==='accepted'&&(r.selectedOptions||[]).includes(index)}:it);if(r.status==='accepted'){q.approvalTaxRate=r.snapshot.taxRate;q.approvalTaxLabel=r.snapshot.taxLabel;}q.customerDecisionId=r.id;q.customerDecisionName=r.acceptedName;q.customerDecisionAt=r.decidedAt;if(r.status==='accepted'){q.customerApprovedSnapshot=r.approvedSnapshot;for(const j of DB.jobs||[])if(j.quoteId===q.id&&!q.extraWorkJobId){j.agreedTotal=r.approvedSnapshot.total;j.updatedAtTime=new Date().toISOString();}}changed=true;
        }
      }
      if(changed){

        save();renderQuotes();renderDashboard();
        const openPanel=document.querySelector('[data-qn-approval]');
        if(openPanel?.closest('.doc-back'))openDocument(openPanel.dataset.approvalKind||'q',openPanel.dataset.approvalDocument||openPanel.dataset.qnApproval);
        else if(openPanel?.closest('#modal-body'))render(openPanel);
      }
      document.querySelectorAll('[data-qn-approval]').forEach(panel=>render(panel));
      window.qnExtraWorkRefresh?.();
    }catch(err){document.querySelectorAll('[data-qn-approval]').forEach(panel=>message(panel,err.message,true));}
    finally{busy=false;}
  }
  function render(panel){
    const q=DB.quotes.find(q=>q.id===panel.dataset.qnApproval);if(!q)return;
    const record=latest(q),current=record&&same(q,record),pending=current&&record.status==='pending'&&Date.parse(record.expiresAt)>Date.now();
    if(panel.dataset.busy==='true')return;
    const ended=current&&['accepted','declined'].includes(record.status),canCreate=['draft','sent','accepted','declined','invoiced'].includes(q.status)&&!q.deletedAt;
    panel.innerHTML='<h3>Customer approval <span class="qn-approval-state">Pro</span></h3>'+(ended?'<p><strong>'+e(STATUS_LABEL[record.status])+'</strong> by '+e(record.acceptedName)+(record.status==='accepted'?' · '+money((record.approvedSnapshot||record.snapshot).total)+' · '+(record.selectedOptions||[]).length+' extra(s)':'')+'<br><span class="qn-approval-muted">'+e(new Date(record.decidedAt).toLocaleString())+'</span></p>':pending?'<p>Awaiting customer decision</p>':'<p>Let your customer review, sign and accept this quote. No account needed.</p>')+(!current&&record?'<p class="qn-approval-muted">The quote has changed. Create a new approval link.</p>':'')+(pending?'<label for="approval-link-'+e(q.id)+'">Approval link</label><input id="approval-link-'+e(q.id)+'" type="url" readonly value="'+e(record.link)+'"><div class="btn-row"><button class="btn btn-primary" data-approval-action="share">Send link</button><button class="btn btn-outline" data-approval-action="copy">Copy link</button><button class="btn btn-outline" data-approval-action="revoke">Disable link</button></div><label class="qn-toggle"><input type="checkbox" data-followup '+(record.followupEnabled?'checked ':'')+(!emailReady?'disabled ':'')+'><span>Send one automatic email follow-up</span></label><label>After <select data-days '+(!emailReady?'disabled':'')+'><option value="3" '+(record.followupDays===3?'selected':'')+'>3 days</option><option value="7" '+(record.followupDays===7?'selected':'')+'>7 days</option></select></label><p class="qn-approval-muted">'+(!emailReady?'Automatic emails are not connected yet. Approval links are ready to share.':'Stops after acceptance, decline, expiry or a quote change.')+'</p><button class="btn btn-outline" data-approval-action="sent">'+(record.sentAt?'Save follow-up setting':'I’ve sent the link')+'</button><p class="qn-approval-muted">'+(record.followupState==='sent'?'Follow-up sent '+e(new Date(record.followupSentAt).toLocaleDateString()):record.followupState==='failed'?'Reminder delivery could not be confirmed. No more reminders will be sent.':record.followupEnabled&&record.followupDue?'One email scheduled on or after '+e(new Date(record.followupDue).toLocaleDateString()):record.sentAt?'Link marked sent. Automatic follow-up is off.':'Mark sent after sharing. This starts the reminder timer.')+'</p>':ended?'<div class="btn-row"><button class="btn btn-primary" data-approval-action="share">'+(record.status==='accepted'?'Send signed link':'Send decision link')+'</button><button class="btn btn-outline" data-approval-action="copy">Copy link</button></div>':canCreate?'<button class="btn btn-primary" data-approval-action="create">Create approval link</button>':'')+'<p class="qn-approval-message" role="status"></p>';
    const versions=new Map(Object.entries(q.approvalHistory||{}));
    for(const r of records)if(r.quoteId===q.id&&r.status==='accepted'&&r.approvedSnapshot?.acceptance)versions.set(r.id,{snapshot:r.approvedSnapshot,decidedAt:r.decidedAt});
    if(versions.size){
      const history=document.createElement('details');history.className='qn-approval-history';
      history.innerHTML='<summary data-qn-i18n>Signed versions</summary>';
      for(const [id,v] of versions){
        if(!v.snapshot?.acceptance)continue;
        const row=document.createElement('div');row.className='btn-row';
        const label=document.createElement('span');label.textContent=new Date(v.decidedAt||v.snapshot.acceptance.signedAt).toLocaleString()+' · '+money(v.snapshot.total);row.appendChild(label);
        const button=document.createElement('button');button.type='button';button.className='btn btn-outline btn-small';button.textContent='View signed version';button.setAttribute('data-qn-i18n','');
        button.onclick=()=>{const s=v.snapshot,doc={...q,number:s.number,createdAt:s.date,validUntil:s.validUntil,notes:s.notes,discount:s.discount||null,items:s.items.map(it=>({...it,...(it.optional?{selected:true}:{})})),customerApprovedSnapshot:s};downloadPDF('q',q.id,{doc,profile:{...DB.profile,businessName:s.business.name,phone:s.business.phone,email:s.business.email,taxRate:s.taxRate,taxLabel:s.taxLabel},client:s.customer,totals:{sub:s.subtotal,discount:s.discountAmount||0,tax:s.tax,total:s.total}});};
        row.appendChild(button);history.appendChild(row);
      }panel.appendChild(history);
    }
    panel.querySelectorAll('[data-approval-action]').forEach(button=>button.onclick=()=>act(panel,q,record,button.dataset.approvalAction));
  }
  async function act(panel,q,record,action){
    if(panel.dataset.busy==='true')return;
    const enabled=panel.querySelector('[data-followup]')?.checked===true,days=Number(panel.querySelector('[data-days]')?.value||3);
    panel.dataset.busy='true';panel.querySelectorAll('button').forEach(b=>b.disabled=true);message(panel,'Working…');
    try{
      if(action==='copy'){await window.qnCopyApprovalLink(record.link);message(panel,'Link copied.');return;}
      if(action==='share'){
        const opened=await window.qnSendApprovalLink(q,record);
        message(panel,opened?'Finish sending in your messaging app, then tap “I’ve sent the link”.':'Sending cancelled.');return;
      }
      await window.qnCloudFlush();
      if(action==='create'){const row=await api({action:'create',quoteId:q.id});records=[row,...records.filter(x=>x.id!==row.id)];}
      if(action==='revoke'){await api({action:'revoke',quoteId:q.id});records=records.map(x=>x.quoteId===q.id&&x.status==='pending'?{...x,status:'revoked'}:x);}
      if(action==='sent'){
        const row=await api({action:'sent',id:record.id,followup:enabled,days});records=records.map(x=>x.id===row.id?row:x);
        if(q.status==='draft'){q.status='sent';save();await window.qnCloudFlush();renderQuotes();}
      }
      panel.dataset.busy='false';render(panel);
    }catch(err){if(err.name!=='AbortError')message(panel,err.message,true);else message(panel,'Sharing cancelled.');}
    finally{panel.dataset.busy='false';panel.querySelectorAll('button').forEach(b=>b.disabled=false);}
  }
  window.qnApprovalMount=function(parent,q,kind,documentId){if(!q||q.deletedAt)return;let panel=parent.querySelector('[data-qn-approval]');if(!panel){panel=document.createElement('section');panel.className='qn-approval-panel';panel.dataset.qnApproval=q.id;parent.appendChild(panel);}if(kind){panel.dataset.approvalKind=kind;panel.dataset.approvalDocument=documentId;}render(panel);refresh();};
  window.qnApprovalBeforeSave=function(q,data){
    const taxChanged=data.taxRate!==undefined&&(Number(data.taxRate)!==Number(qnDocumentTax(q).rate)||(data.taxLabel||'Tax')!==qnDocumentTax(q).label);
    let changed=true;try{changed=taxChanged||QNApprovalModel.canonical(QNApprovalModel.snapshot(DB,q))!==QNApprovalModel.canonical(QNApprovalModel.snapshot(DB,{...q,...data}));}catch{}
    if(changed){
      if(q.customerDecisionId&&q.customerApprovedSnapshot?.acceptance){
        q.approvalHistory={...(q.approvalHistory||{}),[q.customerDecisionId]:{snapshot:JSON.parse(JSON.stringify(q.customerApprovedSnapshot)),decidedAt:q.customerDecisionAt}};
      }

      if(q.customerDecisionId||latest(q)){if(['accepted','sent','declined','invoiced'].includes(data.status))data.status='draft';}
      data.items=(data.items||[]).map(({selected,...it})=>it);
      for(const key of ['customerDecisionId','customerDecisionName','customerDecisionAt','customerApprovedSnapshot','approvalTaxRate','approvalTaxLabel']){delete q[key];delete data[key];}
    }
  };
  const connect=window.qnCloudConnect;
  window.qnCloudConnect=function(sb,user){client=sb;if(userId!==user?.id)records=[];userId=user?.id;const result=connect?.apply(this,arguments);Promise.resolve(result).then(()=>setTimeout(refresh,1200));return result;};
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
  if(window.qnApprovalSession){client=window.qnApprovalSession.client;userId=window.qnApprovalSession.user.id;setTimeout(refresh,1500);}
  setInterval(refresh,45000);
})();

