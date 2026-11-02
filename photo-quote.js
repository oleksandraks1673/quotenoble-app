(function(){
  'use strict';
  let current=null;
  const clone=v=>JSON.parse(JSON.stringify(v));
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function api(data){
    const session=await window.qnApprovalSession?.client?.auth.getSession();
    const token=session?.data?.session?.access_token;
    if(!token)throw Error('Please sign in again to draft from photos.');
    const response=await fetch('/api/photo-quote',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify(data),signal:AbortSignal.timeout(55000)});
    const result=await response.json();if(!response.ok)throw Error(result.error||'Photo analysis is unavailable. Your photos are kept.');return result;
  }
  async function jpeg(file){
    if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>20000000)throw Error('Choose JPG, PNG or WebP photos under 20 MB.');
    const bitmap=await createImageBitmap(file);
    try{
      if(bitmap.width*bitmap.height>50000000)throw Error('This photo is too large. Choose a smaller copy.');
      const scale=Math.min(1,1440/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');
      canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
      const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
      for(const quality of [.82,.65,.45]){const data=canvas.toDataURL('image/jpeg',quality);if(data.length<=450000)return data;}
      throw Error('This photo is too detailed. Choose a smaller copy.');
    }finally{bitmap.close();}
  }
  function rates(){
    return (DB.smartTemplates||[]).flatMap(t=>t.items||[]).filter(i=>i.service&&Number.isSafeInteger(i.price)&&i.price>=0);
  }
  function matchPrice(service){
    const prices=[...new Set(rates().filter(i=>i.service.trim().toLowerCase()===service.trim().toLowerCase()).map(i=>i.price))];
    return prices.length===1?prices[0]:null;
  }
  async function open(){
    if(current||!document.body.classList.contains('qn-authenticated'))return;
    const scope=LS_KEY,key='photo-to-quote:'+scope;
    if(!window.QNInspectionPhotos)throw Error('Photo storage is unavailable. Please reload the app.');
    await QNInspectionPhotos.hydrate(DB,scope);
    if(LS_KEY!==scope||current)return;
    const saved=DB.formDrafts?.[key];
    const state=clone(saved?.photoQuote||{id:crypto.randomUUID(),trade:'Eavestrough & gutters',notes:'',photos:[],draft:null});
    const dialog=document.createElement('dialog');dialog.className='qn-photo-dialog';current=dialog;
    dialog.innerHTML='<header><div><span class="qn-photo-eyebrow">PHOTO TO QUOTE</span><h2>Job photos. Quote draft.</h2></div><button type="button" class="btn btn-outline" data-close aria-label="Close Photo to Quote">×</button></header><p>Add a few angles, then tell us what work the customer wants.</p><div class="qn-photo-gallery" data-gallery></div><div class="qn-photo-actions"><button type="button" class="btn btn-primary" data-camera>Take photo</button><button type="button" class="btn btn-outline" data-gallery-button>Add photos</button></div><input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" data-camera-input hidden><input type="file" accept="image/jpeg,image/png,image/webp" multiple data-gallery-input hidden><p class="hint">Up to 6 photos. Optimized copies save with your draft.</p><label for="qn-photo-trade">Trade</label><select id="qn-photo-trade"><option>Eavestrough &amp; gutters</option><option>Roofing repairs</option></select><label for="qn-photo-notes">Anything the photos don’t show?</label><textarea id="qn-photo-notes" rows="3" maxlength="4000" placeholder="Two-storey house. Rear gutter leaking. Customer wants a repair."></textarea><p class="hint">Use your keyboard microphone to dictate notes. Exact saved service rates can prefill prices; you confirm quantities.</p><p role="status" aria-live="polite" data-save></p><p role="status" aria-live="polite" data-status>Checking photo analysis…</p><section data-review hidden></section><button type="button" class="btn btn-primary qn-photo-build" data-build disabled>Draft my quote</button><p class="hint">Your photos are sent for AI analysis when you tap Draft. Nothing is sent to your customer.</p>';
    document.body.appendChild(dialog);
    const trade=dialog.querySelector('select'),notes=dialog.querySelector('textarea'),build=dialog.querySelector('[data-build]'),status=dialog.querySelector('[data-status]'),saveStatus=dialog.querySelector('[data-save]');
    trade.value=state.trade;notes.value=state.notes;
    let busy=false,ready=false,disposed=false,queue=Promise.resolve();
    const alive=()=>!disposed&&LS_KEY===scope&&document.body.classList.contains('qn-authenticated');
    const sync=()=>{build.disabled=busy||!ready||!state.photos.length;notes.disabled=busy;trade.disabled=busy;dialog.querySelectorAll('[data-camera],[data-gallery-button],[data-remove]').forEach(b=>b.disabled=busy);};
    function persist(){
      const copy=clone(state);saveStatus.textContent='Saving draft…';
      queue=queue.catch(()=>{}).then(async()=>{
        if(LS_KEY!==scope)return;
        DB.formDrafts=DB.formDrafts||{};DB.formDrafts[key]={kind:'photo-quote',savedAt:new Date().toISOString(),photoQuote:copy};
        await QNInspectionPhotos.prepare(DB,scope);if(LS_KEY!==scope)return;
        save();if(alive())saveStatus.textContent='Saved on this device · cloud sync follows your account status.';
      }).catch(error=>{if(alive())saveStatus.textContent=error.message||'Could not save. Keep this screen open.';throw error;});
      // Errors remain visible; a later change or retry starts a fresh save attempt.
      queue.catch(()=>{});return queue;
    }
    function renderPhotos(){
      dialog.querySelector('[data-gallery]').innerHTML=state.photos.map((p,i)=>'<figure><img src="'+p.data+'" alt="Job photo '+(i+1)+'"><button type="button" data-remove="'+i+'" aria-label="Remove photo '+(i+1)+'">×</button></figure>').join('');sync();
    }
    function invalidate(){state.draft=null;dialog.querySelector('[data-review]').hidden=true;}
    notes.oninput=()=>{state.notes=notes.value;invalidate();persist();};trade.onchange=()=>{state.trade=trade.value;invalidate();persist();};
    dialog.querySelector('[data-camera]').onclick=()=>dialog.querySelector('[data-camera-input]').click();
    dialog.querySelector('[data-gallery-button]').onclick=()=>dialog.querySelector('[data-gallery-input]').click();
    for(const input of dialog.querySelectorAll('input[type=file]'))input.onchange=async()=>{
      busy=true;sync();status.textContent='Preparing photos…';
      try{
        const files=[...input.files];if(files.length+state.photos.length>6)throw Error('You can add up to 6 photos.');
        const additions=[];for(const file of files)additions.push({id:crypto.randomUUID(),name:file.name,data:await jpeg(file)});
        if(!alive())return;state.photos.push(...additions);invalidate();await persist();status.textContent='Photos ready. Add notes, then draft your quote.';
      }catch(error){if(alive())status.textContent=error.message;}
      finally{input.value='';busy=false;if(alive())renderPhotos();}
    };
    dialog.querySelector('[data-gallery]').onclick=e=>{const b=e.target.closest('[data-remove]');if(!b||busy)return;state.photos.splice(Number(b.dataset.remove),1);invalidate();renderPhotos();persist();};
    function review(){
      const section=dialog.querySelector('[data-review]');section.hidden=false;
      const d=state.draft;section.innerHTML='<h3>Review the suggested work</h3><p>Confirm the scope, measurements and prices in the quote editor.</p><ul>'+d.items.map(i=>'<li><strong>'+escape(i.service)+'</strong><p>'+escape(i.desc)+'</p></li>').join('')+'</ul>'+(d.observations.length?'<h4>Visible observations</h4><ul>'+d.observations.map(q=>'<li>'+escape(q)+'</li>').join('')+'</ul>':'')+(d.questions.length?'<h4>Details to confirm</h4><ul>'+d.questions.map(q=>'<li>'+escape(q)+'</li>').join('')+'</ul>':'')+'<button type="button" class="btn btn-primary" data-edit>Open quote editor</button>';
      section.querySelector('[data-edit]').onclick=async()=>{
        if(busy||!alive())return;
        busy=true;sync();
        try{
          await persist();if(!alive())return;
          const existing=DB.quotes.find(q=>q.photoQuote?.id===state.id);
          if(existing){close();openQuoteForm(existing);return;}
          const source=clone(state);close();
          openQuoteForm(null);const body=document.getElementById('modal-body');if(!body)return;
          // Keep any existing quote draft. Start only from an empty editor.
          if(readItems(body).length){qnAlert('An unfinished quote was restored. Finish it first, then reopen Photo to Quote. Your photo draft is kept.');return;}
          body.querySelector('#items-wrap').innerHTML=itemRowsHTML(source.draft.items.map(i=>({...i,qty:1,price:matchPrice(i.service)??0})),true);
          const rows=body.querySelectorAll('.item-row');rows.forEach(row=>{row.querySelector('.qty').value='';const price=matchPrice(row.querySelector('.service')?.value||'');row.querySelector('.price').value=price===null?'':String(price/100);});
          body.qnPhotoQuote=source;body.querySelector('#f-notes').value=source.notes;
          window.qnPhotoQuoteMount(body);updateLiveTotals(body);body.dispatchEvent(new Event('input',{bubbles:true}));
        }catch(error){if(alive())status.textContent=error.message;}finally{busy=false;if(alive())sync();}
      };
    }
    build.onclick=async()=>{
      if(busy||!alive())return;busy=true;sync();status.textContent='Reading your photos…';
      try{await persist();const result=await api({trade:state.trade,notes:state.notes,photos:state.photos.map(p=>p.data)});if(!alive())return;state.draft=result.draft;await persist();review();status.textContent='Draft ready. Review it before creating a quote.';}
      catch(error){if(alive())status.textContent=error.message;}
      finally{busy=false;if(alive())sync();}
    };
    function close(){if(disposed)return;disposed=true;observer.disconnect();dialog.close();dialog.remove();current=null;}
    dialog.querySelector('[data-close]').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    const observer=new MutationObserver(()=>{if(!alive())close();});observer.observe(document.body,{attributes:true,attributeFilter:['class']});
    dialog.showModal();renderPhotos();if(state.draft)review();
    api({action:'status'}).then(result=>{if(!alive())return;ready=result.ready;status.textContent=ready?'Ready to draft.':'Photo analysis is not connected yet. You can add photos and notes; your draft is kept.';sync();}).catch(error=>{if(alive())status.textContent=error.message;});
  }
  window.qnPhotoQuoteMount=body=>{
    if(!body||!body.qnPhotoQuote||body.querySelector('[data-photo-confirm]'))return;
    const source=body.qnPhotoQuote,review=document.createElement('section');review.className='qn-photo-review';
    review.innerHTML='<h3>Photo quote · review required</h3><p>Photos do not establish exact dimensions or hidden damage. Confirm every quantity and price.</p><div class="qn-photo-gallery">'+source.photos.map(p=>'<figure><img src="'+p.data+'" alt="Saved job photo"></figure>').join('')+'</div><label><input type="checkbox" data-photo-confirm> I checked the work, quantities, prices and tax.</label>';
    body.prepend(review);
    body.addEventListener('input',event=>{if(!event.target.matches('[data-photo-confirm]'))review.querySelector('input').checked=false;});
    body.querySelector('#f-save').addEventListener('click',event=>{
      const invalid=[...body.querySelectorAll('.qty,.price')].find(el=>!el.value.trim()||!Number.isFinite(Number(el.value))||Number(el.value)<0||el.classList.contains('qty')&&Number(el.value)<=0);
      if(invalid||!review.querySelector('input').checked){event.stopImmediatePropagation();qnAlert(invalid?'Enter a confirmed quantity and price for every item.':'Review the quote and tick the confirmation before saving.');(invalid||review.querySelector('input')).focus();}
    },true);
  };
  window.qnPhotoQuoteOpen=()=>open().catch(error=>qnAlert(error.message));
  function mount(){
    const root=document.getElementById('view-quotes');
    if(root&&!root.querySelector('[data-photo-entry]')){const button=document.createElement('button');button.type='button';button.className='btn btn-outline qn-photo-entry';button.dataset.photoEntry='';button.textContent='Photo to Quote';button.onclick=window.qnPhotoQuoteOpen;root.prepend(button);}
  }
  mount();
})();
