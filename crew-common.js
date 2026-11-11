(function(){
 'use strict';
 const C=window.QNCrew=window.QNCrew||{};
 C.esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 C.money=n=>new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format((Number(n)||0)/100);
 C.normalizeInvitePhone=value=>{
  const raw=String(value||'').trim();
  if(!raw||!/^[+0-9().\s-]+$/.test(raw)||(raw.match(/\+/g)||[]).length>1||(raw.includes('+')&&!raw.startsWith('+')))throw Error('Enter a valid mobile number, including the country code for numbers outside Canada or the US.');
  const digits=raw.replace(/\D/g,'');
  if(raw.startsWith('+')&&/^[1-9]\d{7,14}$/.test(digits))return '+'+digits;
  if(/^[2-9]\d{2}[2-9]\d{6}$/.test(digits))return '+1'+digits;
  if(/^1[2-9]\d{2}[2-9]\d{6}$/.test(digits))return '+'+digits;
  throw Error('Enter a 10-digit Canadian or US mobile number, or include + and the country code.');
 };
 C.inviteSMSURL=(phone,member)=>{
  const number=C.normalizeInvitePhone(phone),url=new URL(member.inviteLink,location.origin);
  if(![location.origin,'','https://quotenoble.com'].includes(url.origin)||url.pathname!=='/crew.html'||!/^#invite=[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/.test(url.hash))throw Error('This crew invitation link is unavailable. Refresh Crew and try again.');
  const text='Hi '+String(member.name||'')+', join my crew on Quote.Noble: '+url.href;
  return 'sms:'+number+(/iPad|iPhone|iPod/.test(navigator.userAgent)?'&':'?')+'body='+encodeURIComponent(text);
 };

 C.api=async body=>{
  const client=C.client||window.qnApprovalSession?.client;
  const {data}=client?await client.auth.getSession():{data:{}};
  if(!data.session?.access_token)throw Object.assign(Error('Please sign in again.'),{status:401});
  const r=await fetch('/api/crew',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify(body),signal:AbortSignal.timeout(35000)});
  const result=await r.json();
  const latest=await client.auth.getSession();
  if(!latest.data.session||latest.data.session.user.id!==data.session.user.id)throw Object.assign(Error('Your account changed. Please sign in again.'),{status:401});
  if(!r.ok)throw Object.assign(Error(result.error||'Crew could not be loaded. Please try again.'),{status:r.status});return result;
 };
 C.photoData=async file=>{
  if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>20000000)throw Error('Choose a JPG, PNG or WebP photo under 20 MB.');
  const url=URL.createObjectURL(file),img=new Image();
  try{
   await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('This photo could not be read.'));img.src=url;});
   const canvas=document.createElement('canvas');let size=1280,quality=.8,data;
   for(let n=0;n<8;n++){
    const scale=Math.min(1,size/Math.max(img.naturalWidth,img.naturalHeight));canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
    canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);data=canvas.toDataURL('image/jpeg',quality);
    if(data.length<=215000)return data;quality=Math.max(.45,quality-.1);size=Math.round(size*.85);
   }
   throw Error('This photo is too large. Try a smaller image.');
  }finally{URL.revokeObjectURL(url);}
 };
 let photoDialog;
 C.closePhoto=()=>{photoDialog?.close();photoDialog?.remove();photoDialog=null;};
 C.viewPhoto=async(id,button)=>{
  if(button)button.disabled=true;
  try{
   const data=await C.api({action:'photo',photoId:id});C.closePhoto();
   const dialog=document.createElement('dialog');photoDialog=dialog;dialog.className='qn-crew-photo-dialog';dialog.setAttribute('aria-label','Job photo');
   const top=document.createElement('div'),close=document.createElement('button'),img=document.createElement('img');top.className='qn-crew-actions';close.className='qn-crew-btn';close.textContent='Close';close.onclick=C.closePhoto;top.appendChild(close);img.alt=data.name||'Job photo';img.src=data.data;dialog.append(top,img);document.body.appendChild(dialog);dialog.addEventListener('cancel',e=>{e.preventDefault();C.closePhoto();});dialog.showModal();window.qnTrackDialog?.(dialog);close.focus();
  }finally{if(button?.isConnected)button.disabled=false;}
 };
 C.gallery=async(parent,ownerId,jobId)=>{
  parent.textContent='Loading photos…';
  try{
   const data=await C.api({action:'photos',ownerId,jobId});if(!parent.isConnected)return;
   parent.innerHTML=data.photos.length?'<div class="qn-crew-photo-list">'+data.photos.map(p=>'<div class="qn-crew-photo-row"><div><strong>'+C.esc(p.category[0].toUpperCase()+p.category.slice(1))+'</strong><small>'+C.esc(p.name)+' · '+new Date(p.createdAt).toLocaleDateString()+'</small></div><button type="button" class="qn-crew-btn" data-photo="'+p.id+'">View</button>'+(p.canDelete?'<button type="button" class="qn-crew-btn" data-delete-photo="'+p.id+'" aria-label="Remove '+C.esc(p.name)+'">Remove</button>':'')+'</div>').join('')+'</div>':'<p class="qn-crew-muted">No crew photos yet.</p>';
   const error=document.createElement('p');error.setAttribute('role','status');error.className='qn-crew-message';parent.appendChild(error);
   parent.querySelectorAll('[data-photo]').forEach(b=>b.onclick=()=>C.viewPhoto(b.dataset.photo,b).catch(e=>{error.textContent=e.message;}));
   parent.querySelectorAll('[data-delete-photo]').forEach(b=>b.onclick=async()=>{if(!await qnConfirm('Remove this crew photo?'))return;b.disabled=true;try{await C.api({action:'delete_photo',photoId:b.dataset.deletePhoto});await C.gallery(parent,ownerId,jobId);}catch(e){error.textContent=e.message;b.disabled=false;}});
  }catch(e){if(parent.isConnected)parent.textContent=e.message;}
 };
})();
