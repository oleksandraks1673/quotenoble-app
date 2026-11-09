(function(){
 'use strict';
 let current=null;
 const mic='<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8"/></svg>';
 async function api(body){
   const client=window.qnApprovalSession?.client;
   const session=client?await client.auth.getSession():null;
   const token=session?.data?.session?.access_token;
   if(!token)throw Error('Please sign in again to use Voice-to-Quote.');
   const response=await fetch('/api/voice-quote',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token},body:JSON.stringify(body),signal:AbortSignal.timeout(30000)});
   const data=await response.json();
   if(!response.ok)throw Object.assign(Error(data.error||'Unable to prepare your draft. Try again.'),{status:response.status,data});
   return data;
 }
 const allowance=data=>data.pro?'Included with Pro':'Voice-to-Quote requires Pro';
 function open(target){
   if(current)return;
   const origin=document.activeElement,dialog=document.createElement('dialog');dialog.className='qn-voice-dialog';dialog.setAttribute('aria-labelledby','qn-voice-title');
   dialog.innerHTML='<div class="qn-voice-heading"><div><span class="qn-voice-eyebrow">TALK. REVIEW. SAVE.</span><h2 id="qn-voice-title">Voice-to-Quote</h2></div><button type="button" class="btn btn-outline" data-close aria-label="Close Voice-to-Quote">×</button></div><p>Say the customer, work and prices. You’ll check every detail before saving.</p><p class="qn-voice-example">“Quote for Sarah. Gutter cleaning 350 dollars. Downspout repairs 120 dollars. Add 13 percent HST.”</p><p class="hint" data-allowance role="status">Checking your plan…</p><button type="button" class="btn btn-primary qn-voice-record" data-record disabled>'+mic+' <span>Start speaking</span></button><p class="hint" data-support>Your browser may process speech online. Quote.Noble does not store audio.</p><label for="qn-voice-text">Your spoken text <span class="hint">· English · editable</span></label><textarea id="qn-voice-text" rows="6" maxlength="4000" placeholder="Describe the work and say “dollars” after each price."></textarea><p class="qn-voice-status" data-status role="status" aria-live="polite"></p><div class="qn-voice-actions"><button type="button" class="btn btn-primary" data-build disabled>Review quote</button><button type="button" class="btn btn-outline" data-close>Cancel</button><button type="button" class="btn btn-primary" data-upgrade hidden>See Pro plans</button></div><p class="hint" data-trial>Voice-to-Quote is included with Pro.</p>';
   document.body.appendChild(dialog);current=dialog;
   const text=dialog.querySelector('textarea'),record=dialog.querySelector('[data-record]'),build=dialog.querySelector('[data-build]'),status=dialog.querySelector('[data-status]');
   let recognition=null,listening=false,disposed=false,busy=false,allowed=false,timer=null,requestId=null,lastText='';
   const alive=()=>!disposed&&dialog.isConnected&&document.body.classList.contains('qn-authenticated');
   const sync=()=>{record.disabled=!allowed||busy||!Speech;build.disabled=!allowed||busy||listening||text.value.trim().length<4;text.readOnly=listening||busy;record.querySelector('span').textContent=listening?'Stop recording':'Start speaking';record.setAttribute('aria-pressed',String(listening));dialog.classList.toggle('is-listening',listening);};
   const stop=abort=>{clearTimeout(timer);if(recognition){try{abort?recognition.abort():recognition.stop();}catch{}}};
   function close(){if(disposed)return;disposed=true;stop(true);document.removeEventListener('visibilitychange',onVisibility);observer.disconnect();dialog.close();dialog.remove();current=null;origin?.focus();}
   function onVisibility(){if(document.hidden)stop(true);}
   const observer=new MutationObserver(()=>{if(!document.body.classList.contains('qn-authenticated'))close();});observer.observe(document.body,{attributes:true,attributeFilter:['class']});
   document.addEventListener('visibilitychange',onVisibility);
   dialog.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
   dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
   dialog.querySelector('[data-upgrade]').onclick=()=>{close();closeModal();showView('plans');};
   const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;
   // Android continuous mode can label cumulative partial phrases as separate final
   // results. Use one utterance per recording; a later tap appends a new utterance.
   const singleUtterance=/Android/i.test(window.navigator?.userAgent||'')||window.navigator?.userAgentData?.platform==='Android';
   if(!Speech)dialog.querySelector('[data-support]').textContent='Direct microphone access is unavailable in this browser. Use the microphone on your phone keyboard in the text box, or type your quote.';
   text.addEventListener('input',()=>{status.textContent='';sync();});
   record.onclick=()=>{
     if(!alive()||!allowed||busy||!Speech)return;
     if(listening){stop(false);return;}
     try{
       const session=new Speech();recognition=session;session.lang='en-CA';session.continuous=!singleUtterance;session.interimResults=true;session.maxAlternatives=1;
       const baseText=text.value.trim();listening=true;status.textContent=singleUtterance?'Listening… Say the work and price. Recording may stop when you pause.':'Listening… Say each service and its price, then tap Stop recording.';sync();
       session.onresult=e=>{
         if(!alive()||recognition!==session||!listening)return;
         const results=Array.from(e.results||[]);
         // Rebuild from the current snapshot, never append each partial update.
         // A one-utterance session uses only its latest hypothesis, even if the
         // device returns older cumulative copies in extra result slots.
         const spoken=(singleUtterance?results.slice(-1):results).map(r=>r[0]?.transcript?.trim()||'').filter(Boolean).join(' ');
         text.value=[baseText,spoken].filter(Boolean).join(' ').slice(0,4000);
       };
       session.onerror=e=>{if(!alive()||recognition!==session)return;const messages={'not-allowed':'Microphone permission was denied. Enable it in browser settings, or use your keyboard microphone.','service-not-allowed':'Voice recognition is unavailable. Use your keyboard microphone or type the quote.','audio-capture':'No microphone is available. Use your keyboard microphone or type the quote.','network':'Voice recognition lost its connection. Your captured text is kept; try again.','no-speech':'No speech was detected. Tap Start speaking to try again.'};status.textContent=messages[e.error]||'Recording stopped. Review the captured text or try again.';};
       session.onend=()=>{if(recognition!==session)return;clearTimeout(timer);recognition=null;listening=false;if(!alive())return;sync();if(status.textContent.startsWith('Listening'))status.textContent=text.value.trim()?'Recording stopped. Tap Start speaking to add more, or check the text and tap Review quote.':'No speech captured. Try again or use your keyboard microphone.';};
       session.start();timer=setTimeout(()=>{if(recognition===session)stop(false);},90000);
     }catch{recognition=null;listening=false;status.textContent='The microphone could not start. Use your keyboard microphone or type your quote.';sync();}
   };
   build.onclick=async()=>{
     if(!allowed||busy||listening)return;
     const transcript=text.value.trim();if(transcript!==lastText){lastText=transcript;requestId=crypto.randomUUID();}
     busy=true;sync();status.textContent='Preparing your quote…';
     try{
       const data=await api({action:'draft',requestId,transcript});if(!alive())return;
       let body=target?.isConnected?target:null;
       close();if(!body){openQuoteForm(null);body=document.getElementById('modal-body');}
       fill(body,data.draft,data);
     }catch(e){if(!alive())return;status.textContent=e.message;if(e.status===402){allowed=false;dialog.querySelector('[data-upgrade]').hidden=false;dialog.querySelector('[data-allowance]').textContent='Voice-to-Quote requires Pro.';}}
     finally{busy=false;if(alive())sync();}
   };
   dialog.showModal();window.qnTrackDialog?.(dialog,()=>open(target));text.focus();
   api({action:'status'}).then(data=>{if(!alive())return;allowed=data.allowed===true&&data.pro===true;dialog.querySelector('[data-allowance]').textContent=allowance(data);dialog.querySelector('[data-trial]').hidden=data.pro;sync();}).catch(e=>{if(!alive())return;status.textContent=e.message;if(e.status===402){dialog.querySelector('[data-upgrade]').hidden=false;dialog.querySelector('[data-allowance]').textContent='Voice-to-Quote requires Pro.';dialog.querySelector('[data-trial]').hidden=true;}sync();});
 }
 function fill(body,draft,access){
   const currentItems=readItems(body),wrap=body.querySelector('#items-wrap');
   wrap.innerHTML=itemRowsHTML([...currentItems,...draft.items.map(it=>({...it,price:it.price??0}))],true);
   [...wrap.querySelectorAll('.item-row')].slice(currentItems.length).forEach((row,i)=>{const input=row.querySelector('.price');input.setAttribute('aria-label','Price for '+draft.items[i].service);if(draft.items[i].price===null){input.value='';input.placeholder='Price needed';input.dataset.voiceRequired='true';input.required=true;row.classList.add('qn-voice-needs-price');}});
   const alerts=[...draft.warnings];
   if(draft.taxRate===null)alerts.push('No tax rate was specified. Check the business tax setting shown below.');
   const existingName=body.querySelector('#qn-customer-name').value.trim();
   if(draft.customerName&&!existingName&&body.querySelector('#qn-customer-fields').hidden===false){
     const matches=DB.clients.filter(c=>c.name.trim().toLocaleLowerCase()===draft.customerName.toLocaleLowerCase());
     if(matches.length===1){qnToggleDocumentCustomer(body,false);body.querySelector('#f-client').value=matches[0].id;}
     else{body.querySelector('#qn-customer-name').value=draft.customerName;if(matches.length>1)alerts.push('More than one saved customer has that name. Choose the correct existing customer.');}
   }else if(draft.customerName)alerts.push('Customer heard: '+draft.customerName+'. Your current customer selection was kept.');
   const notes=body.querySelector('#f-notes');if(draft.notes)notes.value=[notes.value,draft.notes].filter(Boolean).join('\n');
   body.querySelector('[data-voice-review]')?.remove();
   const review=document.createElement('section');review.className='qn-voice-review';review.dataset.voiceReview='true';
   const tax=body.qnTaxInfo||qnDocumentTax({});
   const rate=currentItems.length?tax.rate:(draft.taxRate??tax.rate),label=currentItems.length?tax.label:(draft.taxLabel||tax.label);
   if(currentItems.length&&draft.taxRate!==null&&draft.taxRate!==tax.rate)alerts.push('Your existing tax rate was kept. Confirm it below.');
   review.innerHTML='<h3>Review your voice draft</h3><p>Check the customer, services, prices and tax. Nothing has been saved or sent.</p>'+(alerts.length?'<ul>'+alerts.map(a=>'<li>'+esc(a)+'</li>').join('')+'</ul>':'')+'<div class="qn-voice-tax"><div class="field"><label for="qn-voice-tax-label">Tax name</label><input id="qn-voice-tax-label" maxlength="30" value="'+esc(label)+'"></div><div class="field"><label for="qn-voice-tax-rate">Tax (%)</label><input id="qn-voice-tax-rate" required type="number" min="0" max="100" step="0.01" value="'+rate+'"></div></div><details><summary>Your spoken text</summary><p class="qn-voice-original">'+esc(draft.transcript)+'</p></details><p class="hint">'+esc(allowance(access))+'</p><label class="qn-voice-confirm"><input type="checkbox" data-voice-confirm> I checked the customer, work, prices and tax.</label>';
   body.prepend(review);
   const updateTax=()=>{const r=Number(review.querySelector('#qn-voice-tax-rate').value);body.qnTaxInfo={rate:Number.isFinite(r)&&r>=0&&r<=100?r:0,label:review.querySelector('#qn-voice-tax-label').value.trim()||'Tax'};updateLiveTotals(body);};
   review.addEventListener('input',updateTax);updateTax();
   body.qnVoiceDraft=true;
   body.addEventListener('input',e=>{if(!e.target.matches('[data-voice-confirm]'))body.querySelector('[data-voice-confirm]').checked=false;});
   // Capture validation precedes the existing save handler; never silently turn a missing price into $0.
   if(!body.qnVoiceValidation){body.qnVoiceValidation=true;body.querySelector('#f-save').addEventListener('click',e=>{
     let invalid=[...body.querySelectorAll('.price')].find(n=>!n.value.trim()||!n.checkValidity());
     invalid=invalid||body.querySelector('#qn-voice-tax-rate:not(:valid)');
     const checked=body.querySelector('[data-voice-confirm]');
     if(invalid||!checked?.checked){e.stopImmediatePropagation();qnAlert(invalid?'Enter the missing price or correct the tax rate before saving.':'Check the draft and tick the review confirmation before saving.');(invalid||checked)?.focus();}
   },true);}
   body.querySelector('#f-save').textContent='Save reviewed quote';
   review.scrollIntoView({block:'start',behavior:'smooth'});review.querySelector('h3').tabIndex=-1;review.querySelector('h3').focus();
 }
 window.qnVoiceOpen=open;
 window.qnVoiceMount=body=>{const button=body.querySelector('[data-voice-form]');if(button)button.onclick=()=>open(body);};
 document.addEventListener('click',e=>{const button=e.target.closest('[data-qn-voice]');if(button){document.getElementById('qn-create-menu')?.setAttribute('hidden','');open(null);}});
})();
