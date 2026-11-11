(function(){
 'use strict';
 const P=window.QNPurchases,M=window.QNPurchaseModel,E=P.esc;
 let enginePromise;
 function engine(){
  if(window.Tesseract)return Promise.resolve(window.Tesseract);if(enginePromise)return enginePromise;
  enginePromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js';script.async=true;const timer=setTimeout(()=>{script.remove();reject(Error('The scanner could not load. Enter the details manually or try again.'));},45000);script.onload=()=>{clearTimeout(timer);window.Tesseract?resolve(window.Tesseract):reject(Error('The scanner could not load.'));};script.onerror=()=>{clearTimeout(timer);script.remove();reject(Error('The scanner needs an internet connection. You can enter the details manually.'));};document.head.appendChild(script);}).catch(e=>{enginePromise=null;throw e;});return enginePromise;
 }
 async function imageData(file){
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>20000000)throw Error('Choose a JPG, PNG or WebP receipt photo under 20 MB.');
  const url=URL.createObjectURL(file),img=new Image();
  try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('This photo could not be read. Try a JPG image.'));img.src=url;});let longSide=2800,quality=.88;
   for(let n=0;n<9;n++){const scale=Math.min(1,longSide/Math.max(img.naturalWidth,img.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(img,0,0,canvas.width,canvas.height);const data=canvas.toDataURL('image/jpeg',quality);if(data.length<=490000)return data;quality=Math.max(.5,quality-.06);longSide=Math.round(longSide*.88);}throw Error('This image is too large. Crop to the receipt and try again.');
  }finally{URL.revokeObjectURL(url);}
 }
 P.prepareReceiptImage=imageData;
 function imageDialog(data){const d=document.createElement('dialog');d.className='qn-crew-photo-dialog';d.setAttribute('aria-label','Receipt photo');const b=document.createElement('button'),img=document.createElement('img');b.type='button';b.className='qn-crew-btn';b.textContent='Close';img.src=data;img.alt='Saved receipt';const close=()=>{d.close();d.remove();observer.disconnect();};b.onclick=close;d.append(b,img);document.body.appendChild(d);d.addEventListener('cancel',e=>{e.preventDefault();close();});const id=window.qnApprovalSession?.user?.id,observer=new MutationObserver(()=>{if(window.qnApprovalSession?.user?.id!==id)close();});observer.observe(document.body,{childList:true,subtree:true});d.showModal();window.qnTrackDialog?.(d,()=>imageDialog(data));b.focus();}
 P.receiptForm=async(seed={},existingImage='')=>{
  try{if(!await P.access())return;form(seed,existingImage);}catch(e){qnAlert(e.message);}
 };
 function form(seed,existingImage){
  const r={id:crypto.randomUUID(),supplier:'',date:'',total:null,tax:0,category:'Materials',jobId:'',jobTitle:'',orderId:'',reference:'',notes:'',...seed};let photo=existingImage,newImage=null,fileEpoch=0,activeTask=null,busyPhoto=false;
  const body=openModal(r.version?'Edit receipt':'Capture receipt','<form class="qn-p-wrap" data-receipt-form><p class="qn-p-muted">Take a clear photo, then check the details before saving.</p><div class="btn-row"><button type="button" class="btn btn-primary" data-camera>Take photo</button><button type="button" class="btn btn-outline" data-choose>Choose image</button></div><input type="file" data-camera-input accept="image/jpeg,image/png,image/webp" capture="environment" hidden><input type="file" data-file-input accept="image/jpeg,image/png,image/webp" hidden><div class="qn-p-receipt-preview" data-preview></div><div class="btn-row"><button type="button" class="btn btn-outline" data-scan disabled>Read receipt details</button><button type="button" class="btn btn-outline" data-stop hidden>Stop scanning</button></div><p class="qn-p-muted" data-scan-message role="status">Scanning runs on your device. You can also enter every detail yourself.</p><label>Store or supplier<input data-supplier maxlength="150" required value="'+E(r.supplier)+'"></label><div class="qn-p-grid"><label>Purchase date<input data-date type="date" required value="'+E(r.date)+'"></label><label>Category<select data-category>'+(window.QNMoneyModel?.categories||['Materials','Equipment','Fuel','Other']).map(c=>'<option'+(r.category===c?' selected':'')+'>'+c+'</option>').join('')+'</select></label><label>Total paid (CAD)<input data-total type="number" min="0.01" max="1000000" step="0.01" inputmode="decimal" required value="'+(r.total===null?'':(r.total/100).toFixed(2))+'"></label><label>Tax included (CAD)<input data-tax type="number" min="0" max="1000000" step="0.01" inputmode="decimal" required value="'+((r.tax||0)/100).toFixed(2)+'"></label></div><label>Job<select data-job>'+P.jobs(r.jobId)+'</select></label>'+(r.orderId?'<p class="qn-p-muted">Linked to the supplier order. Changing the job removes this order link.</p>':'')+'<details><summary>More details</summary><label>Receipt reference<input data-reference maxlength="100" value="'+E(r.reference||'')+'"></label><label>Private notes<textarea data-notes maxlength="2000" rows="3">'+E(r.notes||'')+'</textarea></label></details><label class="qn-p-review"><input type="checkbox" data-reviewed required> I checked the photo, date, total and included tax.</label><p class="qn-p-muted">The saved photo is compressed. Check that the full receipt is readable.</p><button type="submit" class="btn btn-primary" data-save>Save receipt</button></form>'+P.footer());
  const scanner=body.querySelector('[data-scan]'),scanMessage=body.querySelector('[data-scan-message]'),saveButton=body.querySelector('[data-save]');
  const stop=()=>{if(activeTask){activeTask.cancelled=true;activeTask.worker?.terminate().catch(()=>{});}activeTask=null;scanner.disabled=!photo;body.querySelector('[data-stop]').hidden=true;saveButton.disabled=busyPhoto;};
  const observer=new MutationObserver(()=>{if(!body.isConnected){stop();observer.disconnect();}});observer.observe(document.getElementById('modal-root'),{childList:true,subtree:true});
  function preview(){const root=body.querySelector('[data-preview]');root.replaceChildren();if(photo){const img=document.createElement('img');img.src=photo;img.alt='Receipt preview';root.appendChild(img);const zoom=document.createElement('button');zoom.type='button';zoom.className='btn btn-outline btn-small';zoom.textContent='View full photo';zoom.onclick=()=>imageDialog(photo);root.appendChild(zoom);}scanner.disabled=!photo;}
  preview();body.querySelector('[data-camera]').onclick=()=>body.querySelector('[data-camera-input]').click();body.querySelector('[data-choose]').onclick=()=>body.querySelector('[data-file-input]').click();
  async function chosen(e){const f=e.target.files?.[0];if(!f)return;stop();const gen=++fileEpoch;busyPhoto=true;saveButton.disabled=true;scanner.disabled=true;P.message(body,'Preparing receipt photo…');
   try{const data=await imageData(f);if(gen!==fileEpoch||!body.isConnected)return;photo=data;newImage=data;preview();body.querySelector('[data-reviewed]').checked=false;P.message(body,'Photo ready. Read the details or enter them below.');}catch(err){if(body.isConnected&&gen===fileEpoch)P.message(body,err.message);}finally{if(gen===fileEpoch&&body.isConnected){busyPhoto=false;saveButton.disabled=false;scanner.disabled=!photo;}e.target.value='';}
  }
  body.querySelector('[data-camera-input]').onchange=chosen;body.querySelector('[data-file-input]').onchange=chosen;
  body.querySelector('[data-job]').onchange=()=>{if(body.querySelector('[data-job]').value!==r.jobId)r.orderId='';};
  body.querySelector('[data-stop]').onclick=()=>{stop();scanMessage.textContent='Scanning stopped. Enter the receipt details below.';};
  body.addEventListener('input',e=>{if(!e.target.matches('[data-reviewed]'))body.querySelector('[data-reviewed]').checked=false;});
  scanner.onclick=async()=>{
   if(!photo||activeTask)return;
   if([body.querySelector('[data-supplier]').value,body.querySelector('[data-date]').value,body.querySelector('[data-total]').value].some(Boolean)&&!await qnConfirm('Read this photo and replace any detected supplier, date, total and tax fields? You can edit them afterward.'))return;
   const task=activeTask={cancelled:false,worker:null};scanner.disabled=true;saveButton.disabled=true;body.querySelector('[data-stop]').hidden=false;scanMessage.textContent='Loading scanner… First use may take a moment.';
   const timer=setTimeout(()=>{if(activeTask===task){stop();scanMessage.textContent='Scanning took too long. Enter the details manually or try a clearer photo.';}},90000);
   try{
    const T=await engine();if(task.cancelled||!body.isConnected)return;
    task.worker=await T.createWorker('eng',1,{workerPath:'https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/worker.min.js',corePath:'https://cdn.jsdelivr.net/npm/tesseract.js-core@6.0.0',langPath:'https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng@1.0.0/4.0.0_best_int',logger:m=>{if(!task.cancelled&&body.isConnected)scanMessage.textContent=m.status==='recognizing text'?'Reading receipt… '+Math.round(m.progress*100)+'%':'Preparing scanner…';}});
    if(task.cancelled||!body.isConnected)return;
    const result=await task.worker.recognize(photo);if(task.cancelled||!body.isConnected)return;
    const guess=M.extract(result.data.text);if(guess.supplier)body.querySelector('[data-supplier]').value=guess.supplier;if(guess.date)body.querySelector('[data-date]').value=guess.date;if(guess.total!==null)body.querySelector('[data-total]').value=(guess.total/100).toFixed(2);if(guess.tax!==null)body.querySelector('[data-tax]').value=(guess.tax/100).toFixed(2);
    body.querySelector('[data-reviewed]').checked=false;scanMessage.textContent='Suggested details filled. Check each field against the photo. '+guess.warnings.join(' ');
   }catch(err){if(!task.cancelled&&body.isConnected)scanMessage.textContent='Could not read this photo. Enter the details manually or try a clearer image.';}
   finally{clearTimeout(timer);if(task.worker)await task.worker.terminate().catch(()=>{});if(activeTask===task){activeTask=null;if(body.isConnected){scanner.disabled=!photo;saveButton.disabled=busyPhoto;body.querySelector('[data-stop]').hidden=true;}}}
  };
  body.querySelector('[data-receipt-form]').onsubmit=async e=>{
   e.preventDefault();if(busyPhoto||activeTask)return;saveButton.disabled=true;
   try{
    if(!photo)throw Error('Add a readable receipt photo.');if(!body.querySelector('[data-reviewed]').checked)throw Error('Check the receipt details and confirm before saving.');
    const jobId=body.querySelector('[data-job]').value,j=DB.jobs?.find(j=>j.id===jobId),record=M.receipt({...r,supplier:body.querySelector('[data-supplier]').value,date:body.querySelector('[data-date]').value,total:M.cents(body.querySelector('[data-total]').value),tax:M.cents(body.querySelector('[data-tax]').value),category:body.querySelector('[data-category]').value,jobId,jobTitle:j?.title||(jobId===r.jobId?r.jobTitle:''),reference:body.querySelector('[data-reference]').value,notes:body.querySelector('[data-notes]').value});
    P.message(body,'Saving receipt…');if(jobId)await window.qnCloudFlush();const result=await P.api({action:'save',kind:'receipt',id:r.id,...(r.version?{version:r.version}:{}),record,reviewed:true,...(newImage?{image:newImage}:{})});P.refresh();if(body.isConnected)P.receiptDetail(result.record.id);
   }catch(err){P.message(body,err.message);}finally{if(saveButton.isConnected)saveButton.disabled=false;}
  };
 }
 P.receiptDetail=async id=>{
  const body=openModal('Receipt','<p>Loading receipt…</p>'+P.footer(),{key:'receipt:'+id,reopen:()=>P.receiptDetail(id)});
  try{
   const {record:r,image}=await P.api({action:'get',id});if(!body.isConnected)return;if(r.kind!=='receipt')throw Error('Receipt not found.');
   body.innerHTML='<div class="qn-p-wrap"><h3>'+E(r.supplier)+'</h3><p>'+E(r.date)+' · '+E(r.category)+'</p><div class="qn-p-summary"><strong>'+P.money(r.total)+'</strong><span>Tax included: '+P.money(r.tax)+'</span></div><p>Job: '+E(r.jobTitle||'Not linked')+'</p>'+(r.reference?'<p>Reference: '+E(r.reference)+'</p>':'')+(r.notes?'<p class="qn-p-preserve">'+E(r.notes)+'</p>':'')+'<div class="qn-p-receipt-preview"><img src="'+image+'" alt="Saved receipt"></div><div class="btn-row"><button type="button" class="btn btn-primary" data-full>View full photo</button><button type="button" class="btn btn-outline" data-download>Download photo</button><button type="button" class="btn btn-outline" data-edit>Edit details</button>'+(r.orderId?'<button type="button" class="btn btn-outline" data-order>View supplier order</button>':'')+'<button type="button" class="btn btn-outline" data-delete>Remove receipt</button></div></div>'+P.footer();
   body.querySelector('[data-full]').onclick=()=>imageDialog(image);body.querySelector('[data-edit]').onclick=()=>P.receiptForm(r,image);body.querySelector('[data-order]')?.addEventListener('click',()=>P.orderDetail(r.orderId));
   body.querySelector('[data-download]').onclick=()=>{const a=document.createElement('a');a.href=image;a.download='Receipt-'+r.date+'-'+r.id.slice(0,8)+'.jpg';document.body.appendChild(a);a.click();a.remove();};
   body.querySelector('[data-delete]').onclick=async e=>{const b=e.currentTarget;if(!await qnConfirm('Remove this receipt and its saved photo? Any material cost you already applied to a job stays as entered.'))return;b.disabled=true;try{await P.api({action:'delete',id:r.id,version:r.version});closeModal();P.refresh();}catch(err){P.message(body,err.message);b.disabled=false;}};
  }catch(e){if(body.isConnected)body.innerHTML='<p>'+E(e.message)+'</p>'+P.footer();}
 };
})();

