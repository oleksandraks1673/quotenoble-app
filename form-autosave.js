/* Drafts are account/company scoped. Typing never creates or sends a document. */
(function(){
  'use strict';
  let active=null;
  const clone=value=>JSON.parse(JSON.stringify(value));
  const fields=body=>[...body.querySelectorAll('input,textarea,select')].filter(el=>!['file','password','submit','button'].includes(el.type));
  function bind(body,options){
    const scope=LS_KEY,key=JSON.stringify([scope,options.kind,options.id||'new',options.context||'']);
    const draft=DB.formDrafts?.[key];
    const notice=document.createElement('p');notice.className='qn-draft-status';notice.setAttribute('role','status');notice.setAttribute('aria-live','polite');
    notice.textContent='Your draft saves automatically as you type.';body.prepend(notice);
    const state={body,key,scope,options,notice,timer:null,dirty:false,done:false,hasDraft:false};active=state;
    function applyDraft(){
      if(!draft||draft.completedAt||!draft.fields||LS_KEY!==scope)return;
      const wrap=body.querySelector('#items-wrap');if(wrap&&draft.items)wrap.innerHTML=itemRowsHTML(draft.items,!!body.querySelector('#add-optional'));
      const materials=body.querySelector('#qn-material-wrap');if(materials&&draft.materials)materials.innerHTML=qnMaterialRows(draft.materials);
      const inputs=fields(body);
      for(const field of draft.fields){
        const el=field.id?inputs.find(el=>el.id===field.id):inputs[field.index];
        if(!el||el.tagName!==field.tag||el.type!==field.type||(!field.id&&el.className!==field.className))continue;
        el.value=field.value;if('checked'in el)el.checked=!!field.checked;
        if(el.id==='qn-trade')el.dispatchEvent(new Event('change',{bubbles:true}));
      }
      qnToggleDocumentCustomer(body,!!draft.newCustomer);
      if(draft.taxInfo)body.qnTaxInfo=clone(draft.taxInfo);
      if(draft.voiceDraft)body.qnVoiceDraft=true;
      for(const detail of body.querySelectorAll('details'))if(detail.id)detail.open=!!draft.details?.[detail.id];
      updateLiveTotals(body);
      state.hasDraft=true;notice.textContent='Your saved draft is restored. Continue where you left off.';
    }
    if(draft&&!draft.completedAt&&options.restore!==false){
      if((draft.sourceRevision||'')===(options.revision||''))applyDraft();
      else {notice.textContent='This record has newer changes. Your previous draft is kept. ';const button=document.createElement('button');button.type='button';button.className='btn btn-outline btn-small';button.textContent='Load my draft';button.onclick=applyDraft;notice.appendChild(button);}
    }
    const changed=()=>{
      if(state.done||LS_KEY!==scope)return;
      state.dirty=true;notice.textContent='Saving draft…';clearTimeout(state.timer);
      state.timer=setTimeout(()=>{try{flush(state);}catch(_){}},400);
    };
    body.addEventListener('input',changed);body.addEventListener('change',changed);
    body.addEventListener('click',event=>{if(event.target.closest('[data-rm],#add-item,#add-optional,#qn-add-material,.qn-mat-remove,#qn-apply-template'))changed();});
  }
  function flush(state=active){
    if(!state||state.done||!state.dirty)return;
    clearTimeout(state.timer);state.timer=null;
    if(LS_KEY!==state.scope){state.dirty=false;return;}
    const {body,key,options}=state;
    const items=[...body.querySelectorAll('.item-row')].map(row=>({
      ...QNMaterialPhotos.read(row),service:row.querySelector('.service')?.value||'',desc:row.querySelector('.desc')?.value||'',
      qty:Number(row.querySelector('.qty')?.value)||1,price:Math.round((Number(row.querySelector('.price')?.value)||0)*100),
      optional:!!row.querySelector('.optional')?.checked,selected:row.dataset.selected==='true',
      ...(row.dataset.extraWorkId?{extraWorkId:row.dataset.extraWorkId,extraWorkDecisionId:row.dataset.extraWorkDecisionId,extraWorkTaxRate:Number(row.dataset.extraWorkTaxRate)}:{})
    }));
    const materials=[...body.querySelectorAll('.qn-mat-row')].map(row=>({name:row.querySelector('.qn-mat-name').value,qty:row.querySelector('.qn-mat-qty').value,unit:row.querySelector('.qn-mat-unit').value}));
    DB.formDrafts=DB.formDrafts||{};
    DB.formDrafts[key]={kind:options.kind,sourceRevision:options.revision||'',savedAt:new Date().toISOString(),items,materials,
      fields:fields(body).map((el,index)=>({id:el.id,index,tag:el.tagName,type:el.type,className:el.className,value:el.value,checked:el.checked})),
      newCustomer:!body.querySelector('#qn-customer-fields')?.hidden,taxInfo:body.qnTaxInfo,voiceDraft:!!body.qnVoiceDraft,
      details:Object.fromEntries([...body.querySelectorAll('details[id]')].map(el=>[el.id,el.open]))};
    try {
      save();state.dirty=false;state.hasDraft=true;
      state.notice.textContent=navigator.onLine?'Draft saved on this device · syncing automatically.':'Draft saved on this device · will sync when online.';
    }catch(error){state.notice.textContent='Draft could not be saved on this device. Keep this form open and free some storage.';throw error;}
  }
  function complete(body){
    if(!active||active.body!==body||LS_KEY!==active.scope)return;
    clearTimeout(active.timer);active.timer=null;
    DB.formDrafts=DB.formDrafts||{};
    DB.formDrafts[active.key]={kind:active.options.kind,completedAt:new Date().toISOString(),fields:[]};
  }
  function finish(body){if(active?.body===body){active.done=true;active.dirty=false;clearTimeout(active.timer);active=null;}}
  window.qnFormDraft={bind,flush,complete,finish};
  document.addEventListener('qn-autosave-status',event=>{
    if(active&&active.hasDraft&&!active.dirty&&!active.done&&active.scope===LS_KEY&&event.detail?.state==='saved')active.notice.textContent='Draft saved to your account.';
  });
  window.addEventListener('pagehide',()=>{try{flush();}catch(_){}});
  document.addEventListener('visibilitychange',()=>{if(document.hidden)try{flush();}catch(_){}});
})();
