(function(){
'use strict';
function append(pdf,photos,doc,profile){
 const W=pdf.internal.pageSize.getWidth(),H=pdf.internal.pageSize.getHeight(),M=36,gap=16,ink=[28,48,62],muted=[105,117,128],gold=[172,116,52];pdf.qnPhotoTargets=pdf.qnPhotoTargets||[];
 function text(value,x,y,size=10,bold=false,color=ink,opts){pdf.setFont('helvetica',bold?'bold':'normal');pdf.setFontSize(size);pdf.setTextColor(...color);pdf.text(String(value||''),x,y,opts);}
 for(let offset=0;offset<photos.length;offset+=4){const batch=photos.slice(offset,offset+4);pdf.addPage();const page=pdf.getNumberOfPages();
  text(profile?.businessName||'Your contractor',M,33,10,true);text((doc.number||'')+' · MATERIAL REFERENCES',W-M,33,8,false,muted,{align:'right'});pdf.setDrawColor(225,230,233);pdf.line(M,46,W-M,46);
  text('Materials & installation details',M,79,21,true);text('A closer look at the products and details proposed for your project.',M,100,10,false,muted);
  const single=batch.length===1,columns=single?1:2,rows=Math.ceil(batch.length/columns),cardW=(W-2*M-gap*(columns-1))/columns,cardH=single?515:rows===1?402:286,top=124;
  for(let i=0;i<batch.length;i++){const photo=batch[i],x=M+(i%columns)*(cardW+gap),y=top+Math.floor(i/columns)*(cardH+gap),number=offset+i+1;
   pdf.setFillColor(255,255,255);pdf.setDrawColor(224,229,233);pdf.setLineWidth(.7);pdf.roundedRect(x,y,cardW,cardH,10,10,'FD');
   const imageX=x+12,imageY=y+12,imageW=cardW-24,imageH=cardH-96;pdf.setFillColor(247,249,250);pdf.roundedRect(imageX,imageY,imageW,imageH,6,6,'F');
   const props=pdf.getImageProperties(photo.data),scale=Math.min((imageW-14)/props.width,(imageH-14)/props.height),w=props.width*scale,h=props.height*scale;pdf.addImage(photo.data,'JPEG',imageX+(imageW-w)/2,imageY+(imageH-h)/2,w,h);
   text(String(number).padStart(2,'0')+'  MATERIAL / DETAIL',x+15,y+cardH-63,8,true,gold);
   pdf.setFont('helvetica','bold');pdf.setFontSize(12);const caption=pdf.splitTextToSize(photo.caption||'Material reference',cardW-30);pdf.setTextColor(...ink);pdf.text(caption.slice(0,2),x+15,y+cardH-44);
   pdf.setFont('helvetica','normal');pdf.setFontSize(8.5);const service=pdf.splitTextToSize(photo.service||'Proposed work',cardW-30);pdf.setTextColor(...muted);pdf.text(service.slice(0,1),x+15,y+cardH-15);
   pdf.qnPhotoTargets.push({page,x:imageX,y:imageY,width:imageW,height:imageH,label:'Material '+number,caption:photo.caption||'Material reference',image:photo.data});
  }
 }
}
function finalize(pdf){const W=pdf.internal.pageSize.getWidth(),H=pdf.internal.pageSize.getHeight(),count=pdf.getNumberOfPages();for(let i=1;i<=count;i++){pdf.setPage(i);pdf.setFillColor(255,255,255);pdf.rect(0,H-38,W,38,'F');pdf.setDrawColor(229,233,236);pdf.setLineWidth(.5);pdf.line(36,H-31,W-36,H-31);pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.setTextColor(108,119,129);pdf.text('Quote.Noble  |  All amounts in CAD',36,H-15);pdf.text('Page '+i+' of '+count,W-36,H-15,{align:'right'});}pdf.setPage(1);}
function install(){if(window.qnMaterialPresentationInstalled||typeof buildPDF!=='function')return;window.qnMaterialPresentationInstalled=true;const original=buildPDF;buildPDF=function(kind,id,snapshot){const source=snapshot||(typeof qnDocumentSnapshot==='function'?qnDocumentSnapshot(kind,id):null);if(!source?.doc)return original.apply(this,arguments);const photos=(source.doc.items||[]).flatMap(item=>item.showMaterialPhotos===false?[]:(window.QNMaterialPhotos?.clean(item.materialPhotos)||[]).map(p=>({...p,service:item.service||'Proposed work'})));const copy=JSON.parse(JSON.stringify(source));for(const item of copy.doc.items||[])item.materialPhotos=[];const result=original.call(this,kind,id,copy);if(result?.pdf){append(result.pdf,photos,source.doc,source.profile);finalize(result.pdf);}return result;};}
window.QNMaterialPresentation={append,finalize,install};
})();

/* Quote.Noble Roof Designer: save to customer or quote. */
(function(){
'use strict';
if(window.QNRoofLibraryLoaded)return;window.QNRoofLibraryLoaded=true;
const PENDING='qn_roof_pending_v1',LAUNCH='qn_roof_launch_v1';
const FIELDS=['total','depth','side','front','slope','direction','material','materialProfile','materialColor','soffit','soffitStyle','soffitColor','fascia','fasciaMaterial','fasciaColor','fasciaCustomColor','fasciaSize','fasciaCustomSize','wallFlashing','wallFlashingType','wallFlashingColor','dripEdge','dripProfile','dripMaterial','dripColor','gutter','gutterStyle','gutterColor','downspout','pipeSide','pipeSize'];
const controls=()=>[...document.querySelectorAll('main input[id],main select[id],main textarea[id]')].filter(x=>!['qn-roof-design-name'].includes(x.id)&&!['button','submit','reset','file'].includes(x.type));
function captureGeometry(){
 const geometry={};for(const field of controls())geometry[field.id]=field.type==='checkbox'?field.checked:field.value;
 return geometry;
}
function applyGeometry(geometry){
 if(!geometry||typeof geometry!=='object')return;
 for(const field of controls()){if(!Object.prototype.hasOwnProperty.call(geometry,field.id))continue;
  const value=geometry[field.id];if(field.type==='checkbox')field.checked=!!value;else if(value!==null&&value!==undefined)field.value=String(value);
 }
}

const el=id=>document.getElementById(id), node=(type,text,cls)=>{const x=document.createElement(type);if(text!==undefined)x.textContent=text;if(cls)x.className=cls;return x};
const state=key=>{try{return JSON.parse(sessionStorage.getItem(key)||'null')}catch(_){return null}};
const persist=(key,v)=>{try{sessionStorage.setItem(key,JSON.stringify(v));return true}catch(_){return false}};
const data=()=>{try{return typeof DB==='object'?DB:null}catch(_){return null}};
const designs=()=>Array.isArray(data()?.roofDesigns)?data().roofDesigns:[];
const button=(txt,fn,cls)=>{const b=node('button',txt,cls||'btn btn-outline');b.type='button';b.addEventListener('click',fn);return b};
function openDesigner(from){if(!persist(LAUNCH,from||{})){alert('Please allow browser storage to link your design.');return}location.assign('/roof-designer.html')}
function initDesigner(){
 const area=document.querySelector('section.card:not(.editor)')||document.querySelector('main');
 if(!area||window.QNRoofDesignerSavePanelReady)return;
 window.QNRoofDesignerSavePanelReady=true;
 // Old deployments embedded a nonfunctional save panel directly in the HTML.
 // Always replace it with active controls, even when the old panel was already present.
 const old=[...area.querySelectorAll('[data-qn-roof-save-panel],section')].filter(x=>
  x.matches('[data-qn-roof-save-panel]')||
  x.querySelector('h2')?.textContent?.trim()==='Save to Customer / Quote'&&
  x.querySelector('input[id="qn-roof-design-name"]')
 );
 const oldName=old.map(x=>x.querySelector('#qn-roof-design-name')?.value).filter(Boolean).pop();
 old.forEach(x=>x.remove());
 const launch=state(LAUNCH)||{};
 const editor=document.querySelector('section.card.editor');
 const box=node('section');box.dataset.qnRoofSavePanel='1';box.className='qn-roof-active-save';
 box.style.cssText='margin:16px 0;padding:16px;background:#fff9f0;border:1px solid #eedecb;border-radius:13px';
 const title=node('h2',launch.existingId?'Edit saved roof design':'Save to Customer / Quote');
 const help=node('p',launch.existingId?
  'Change the measurements, materials or finishes above. Update the existing design or save a separate copy.':
  'Choose a customer and job address when saving your finished drawing.');
 help.style.cssText='font-size:13px;color:#667586';
 const label=node('label','Design name');label.htmlFor='qn-roof-design-name';label.style.display='block';
 const name=node('input');name.id='qn-roof-design-name';name.maxLength=100;name.placeholder='Front porch roof';
 name.style.cssText='display:block;width:100%;padding:11px;margin:8px 0;border:1px solid #ccd7e2;border-radius:9px;font:inherit';
 // The roofing-material script initialized its dependent options already.
 // Restore all fields, then trigger one coherent redraw after the full design is loaded.
 if(launch.geometry){
  applyGeometry(launch.geometry);
  const material=el('material'),type=el('materialProfile'),colour=el('materialColor');
  if(material){material.dispatchEvent(new Event('change',{bubbles:true}));
   if(type&&launch.geometry.materialProfile!==undefined)type.value=String(launch.geometry.materialProfile);
   if(colour&&launch.geometry.materialColor!==undefined)colour.value=String(launch.geometry.materialColor);
  }
  for(const k of ['fascia','dripEdge','soffit','gutter','downspout','total'])el(k)?.dispatchEvent(new Event('input',{bubbles:true}));
  applyGeometry(launch.geometry);
  window.dispatchEvent(new Event('qn-roof-loaded-design'));
  applyGeometry(launch.geometry);
  el('total')?.dispatchEvent(new Event('input',{bubbles:true}));
 }
 name.value=launch.title||oldName||(launch.existingId?'Saved roof design':'New roof design');
 let transferring=false;
 async function transfer(mode){
  if(transferring)return;transferring=true;
  const geometry=captureGeometry();
  let drawings;try{drawings=await captureDrawings();}catch(e){transferring=false;alert(e.message);return;}
  const values={geometry,drawings,title:name.value.trim()||'Roof design',existingId:launch.existingId||'',
   clientId:launch.clientId||'',quoteId:launch.quoteId||'',siteAddress:launch.siteAddress||'',
   saveMode:mode,timestamp:Date.now()};
  if(!persist(PENDING,values)){transferring=false;alert('Unable to prepare this design for saving. Please check browser storage.');return}
  const status=el('status');if(status)status.textContent=mode==='new'?'Ready to save a new copy. Select the customer and confirm.':'Ready to update the existing design. Confirm the customer and save.';
  let ref=null;try{ref=new URL(document.referrer)}catch(_){}
  if(ref&&ref.origin===location.origin&&(ref.pathname==='/'||ref.pathname==='/index.html')&&history.length>1){
   history.back();
  }else location.assign('/?roof-design=save');
 }
 const primary=button(launch.existingId?'Update existing design':'Save to Customer / Quote',
  ()=>transfer(launch.existingId?'update':'new'),'button primary');
 primary.dataset.qnRoofSaveAction='1';
 box.append(title,help,label,name,primary);
 if(launch.existingId){
  const copy=button('Save as new copy',()=>transfer('new'),'button');
  copy.dataset.qnRoofSaveAction='1';
  copy.style.cssText='margin-top:9px;margin-left:8px';
  const note=node('p','Changes are saved after you confirm the customer / quote in Quote.Noble.');
  note.style.cssText='font-size:12px;color:#667586';
  box.append(copy,note);
  const remove=button('Delete this saved design',()=>{
   if(!persist('qn_roof_delete_pending_v1',{id:launch.existingId})){alert('Cannot transfer deletion request. Enable browser storage.');return}
   sessionStorage.removeItem(PENDING);location.assign('/?roof-design=delete');
  },'button');
  remove.style.cssText='display:block;margin-top:12px;border-color:#c85e52;color:#a33932';
  box.append(remove);
 }
 area.append(box);
 const stateNotice=editor?.querySelector('.qn-roof-edit-indicator');
 if(stateNotice)stateNotice.remove();
 if(launch.existingId&&editor){
  const banner=node('p','Editing saved design: '+(launch.title||'Roof design'),'qn-roof-edit-indicator');
  banner.style.cssText='padding:12px;background:#eff7f0;border-radius:9px;color:#365c46;font-weight:650;margin:12px 0';
  editor.querySelector('h2')?.after(banner);
 }
}
function styles(){const css=node('style','.qn-roof-box{padding:14px;border:1px solid #e8dcca;border-radius:12px;background:#fffbf6;margin:12px 0}.qn-roof-box h3{font-size:15px;margin:0 0 10px}.qn-roof-item{padding:9px;background:white;border:1px solid #ece5dc;border-radius:9px;margin:7px 0;display:flex;align-items:center;justify-content:space-between;gap:8px}.qn-roof-item strong{font-size:13px;display:block}.qn-roof-item small{display:block;font-size:11px;color:#6d7c89}.qn-roof-modal{max-width:470px;width:92vw;max-height:85vh;overflow:auto;border:1px solid #e1e5e9;border-radius:17px;background:white;padding:22px;color:#293847}.qn-roof-modal::backdrop{background:#1024369c}.qn-roof-modal h2{margin:0;font-size:21px}.qn-roof-modal label{display:block;font-size:13px;font-weight:700;margin:13px 0 4px}.qn-roof-modal select,.qn-roof-modal input{display:block;width:100%;padding:11px;border-radius:9px;border:1px solid #cbd6df;font:inherit}.qn-roof-modal .row{display:flex;gap:9px;flex-wrap:wrap;margin-top:18px}.qn-roof-modal p{font-size:13px;color:#687685}');
 css.textContent+='.qn-roof-drawing-attachment{padding:12px;margin:12px 0;background:white;border:1px solid #e3ded6;border-radius:12px}.qn-roof-drawing-preview{display:block;width:100%;padding:8px;margin:10px 0;border:1px solid #e4ded5;border-radius:10px;background:white;color:#293847;cursor:pointer}.qn-roof-drawing-preview img{display:block;width:100%;max-height:260px;object-fit:contain}.qn-roof-drawing-preview span{display:block;font-size:12px}.qn-roof-drawing-attachment small{display:block;color:#687685;margin:8px 0}';
 css.textContent+=' .qn-roof-item-actions{display:flex;gap:7px;justify-content:flex-end;flex-wrap:wrap;flex-shrink:0}.qn-roof-delete-btn{border-color:#dba9a4!important;color:#9b3531!important}.qn-roof-delete-confirm .btn-danger{background:#b83b32;color:white;border-color:#b83b32}';document.head.append(css)}
function listView(items,title,context){
 const section=node('section',undefined,'qn-roof-box');section.append(node('h3',title));
 for(const d of items){const line=node('div',undefined,'qn-roof-item'),left=node('div');left.append(node('strong',d.title||'Roof design'));if(d.siteAddress)left.append(node('small',d.siteAddress));
 const actions=node('div',undefined,'qn-roof-item-actions');actions.append(button('Edit design',()=>openDesigner({existingId:d.id,clientId:d.clientId,quoteId:d.quoteId,title:d.title,siteAddress:d.siteAddress,geometry:d.geometry}),'btn btn-outline btn-small'),button('Delete',()=>showDeleteDialog(d,()=>{section.replaceWith(listView(designs().filter(r=>r.id!==d.id).filter(r=>title==='Your designs'||(title==='Roof designs for this customer'?r.clientId===context?.clientId:r.quoteId===context?.quoteId)),title,context))}),'btn btn-outline btn-small qn-roof-delete-btn'));line.append(left,actions);section.append(line)}
 if(!items.length)section.append(node('p','No saved designs yet.'));
 if(context)section.append(button('+ New roof design',()=>openDesigner(context),'btn btn-outline'));
 return section;
}
function showDeleteDialog(record,onDeleted){
 if(document.querySelector('dialog.qn-roof-delete-confirm'))return;
 const existing=designs().find(d=>d.id===record.id);
 if(!existing){alert('This design is no longer saved. Reopen your roof designs.');return}
 const dialog=node('dialog',undefined,'qn-roof-modal qn-roof-delete-confirm');
 dialog.setAttribute('aria-label','Confirm roof design deletion');
 const title=node('h2','Delete roof design?');
 const message=node('p','Delete "'+(existing.title||'Roof design')+'"? It will be removed from the customer and any linked quote. Neither the customer nor the quote will be deleted.');
 const hint=node('p','This action cannot be undone.');hint.style.cssText='font-weight:750;color:#a83a31';
 const status=node('p','');status.setAttribute('role','alert');
 const actions=node('div',undefined,'row');
 const cancel=button('Cancel',()=>dialog.close(),'btn btn-outline');
 const del=button('Delete design',()=>{
  const store=data(),records=store?.roofDesigns;if(!store||!Array.isArray(records)){status.textContent='The designs are not loaded. Please sign in again.';return}
  if(!records.some(r=>r.id===existing.id)){status.textContent='This design has already been removed. Reopen the list.';return}
  const markersBefore=store.deletedRecords;
  store.roofDesigns=records.filter(r=>r.id!==existing.id);
  store.deletedRecords={...(markersBefore||{}),['roofDesigns:'+existing.id]:new Date().toISOString()};
  try{save()}catch(e){store.roofDesigns=records;store.deletedRecords=markersBefore;status.textContent=e.message||'Unable to save the deletion. Please retry.';return}
  dialog.close();if(typeof onDeleted==='function')onDeleted();
 },'btn btn-danger');
 actions.append(cancel,del);dialog.append(title,message,hint,status,actions);
 document.body.appendChild(dialog);
 dialog.addEventListener('close',()=>{try{if(state('qn_roof_delete_pending_v1')?.id===existing.id)sessionStorage.removeItem('qn_roof_delete_pending_v1')}catch(_){ }dialog.remove()},{once:true});
 dialog.showModal();
}
function displayForCustomer(id){const container=el('modal-body');if(container&&!container.querySelector('.qn-roof-box'))container.append(listView(designs().filter(d=>d.clientId===id),'Roof designs for this customer',{clientId:id}))}
function displayForQuote(kind,id){const doc=kind==='q'?data()?.quotes?.find(q=>q.id===id):data()?.invoices?.find(i=>i.id===id);
 if(!doc)return;const linkedId=kind==='q'?id:doc.quoteId;
 const box=document.querySelector('#doc-root .doc-body');if(!box||box.querySelector('.qn-roof-box'))return;
 const section=listView(designs().filter(d=>linkedId&&d.quoteId===linkedId),'Roof designs linked to '+(kind==='q'?'quote':'invoice'),{clientId:doc.clientId,quoteId:linkedId||''});
 addDrawingAttachments(section,kind,doc);
 const table=box.querySelector('.doc-table');if(table)table.before(section);else box.append(section)
}
function showLibrary(){const dialog=node('dialog',undefined,'qn-roof-modal');dialog.append(node('h2','Saved roof designs'),node('p','Open a saved roof or start a new one.'),listView(designs(),'Your designs',{}));
 dialog.append(button('Close',()=>dialog.close()));document.body.append(dialog);dialog.addEventListener('close',()=>dialog.remove(),{once:true});dialog.showModal()}
function more(){const menu=document.querySelector('#view-more .qn-more-menu');if(!menu)return;
 let btn=document.querySelector('#view-more [data-roof-saved]');
 if(!btn){btn=node('button',undefined,'qn-more-item');btn.type='button';btn.dataset.roofSaved='1';
 const inner=node('span');inner.append(node('strong','Saved Roof Designs'),node('small','Drawings linked to customers and quotes'));
 btn.append(node('span','▱','qn-more-item-icon'),inner,node('b','›'));menu.append(btn)}
 btn.onclick=showLibrary;}
function saveDialog(pending){
 if(!document.body.classList.contains('qn-authenticated')||!data()||document.querySelector('dialog.qn-roof-save'))return;
 const users=data().clients||[],quotes=data().quotes||[];
 const dia=node('dialog',undefined,'qn-roof-modal qn-roof-save');dia.append(node('h2',pending.existingId?'Update roof design':'Save roof design'));
 if(!users.length){dia.append(node('p','Create a customer in Quote.Noble first, then return to this design.'),button('Close',()=>dia.close()));document.body.append(dia);dia.addEventListener('close',()=>dia.remove(),{once:true});dia.showModal();return}
 dia.append(node('p','Choose the customer and optionally a quote. Edited drawings can be updated or saved as a new copy.'));
 const title=node('input');title.value=pending.title||'Roof design';title.maxLength=100;
 const client=node('select');for(const c of users){const o=node('option',c.name||'Customer');o.value=c.id;client.append(o)}client.value=users.some(c=>c.id===pending.clientId)?pending.clientId:users[0].id;
 const quote=node('select'),site=node('input');site.placeholder='Job site address (optional)';site.maxLength=500;
 function fillQuote(reset){quote.replaceChildren();const none=node('option','Save under customer only');none.value='';quote.append(none);for(const q of quotes.filter(q=>q.clientId===client.value)){const o=node('option',q.number||'Quote');o.value=q.id;quote.append(o)}
 if(!reset&&pending.quoteId&&[...quote.options].some(o=>o.value===pending.quoteId))quote.value=pending.quoteId;
 const matched=quotes.find(q=>q.id===quote.value);if(matched?.siteAddress&&!site.value)site.value=matched.siteAddress}
 client.addEventListener('change',()=>{site.value='';fillQuote(true)});quote.addEventListener('change',()=>{const q=quotes.find(q=>q.id===quote.value);if(q?.siteAddress)site.value=q.siteAddress});fillQuote(false);site.value=pending.siteAddress||site.value;
 const add=(label,x)=>{const l=node('label',label);dia.append(l,x)};add('Design name',title);add('Customer',client);add('Attach to Quote (optional)',quote);add('Job site address (optional)',site);
 const status=node('p','');status.setAttribute('role','status');dia.append(status);
 const actions=node('div',undefined,'row');
 const mode=node('select');mode.setAttribute('aria-label','How to save roof design');
 if(pending.existingId){const update=node('option','Update existing design');update.value='update';mode.append(update);const copy=node('option','Save as new design');copy.value='new';mode.append(copy);mode.value=pending.saveMode==='new'?'new':'update';const label=node('label','Save action');dia.append(label,mode)}
 actions.append(button('Cancel',()=>dia.close()),button(pending.existingId?'Save changes':'Save design',()=>{
   const c=users.find(c=>c.id===client.value),q=quotes.find(q=>q.id===quote.value);if(!c||(quote.value&&q?.clientId!==c.id)){status.textContent='Choose a valid customer and quote.';return}
   const db=data(),before=db.roofDesigns,arr=[...designs()],wantsUpdate=pending.existingId&&mode.value!=='new',idx=wantsUpdate?arr.findIndex(d=>d.id===pending.existingId):-1,now=new Date().toISOString();
   if(wantsUpdate&&idx<0){status.textContent='Original design was not found. Select Save as new design instead.';return}
   const record={id:idx>=0?arr[idx].id:'roof_'+Date.now()+'_'+Math.random().toString(36).slice(2,9),title:title.value.trim()||'Roof design',clientId:c.id,quoteId:q?.id||null,siteAddress:site.value.trim(),geometry:pending.geometry,drawings:pending.drawings||arr[idx]?.drawings||[],createdAt:idx>=0?arr[idx].createdAt:now,updatedAt:now};
   if(idx>=0)arr[idx]=record;else arr.push(record);db.roofDesigns=arr;
   const drawingsBefore=q?.roofDrawings;if(q&&record.drawings.length){q.roofDrawings=[...(q.roofDrawings||[]).filter(d=>d.designId!==record.id),{designId:record.id,title:record.title,views:structuredClone(record.drawings),attachedAt:now}];}
   try{save();if(window.qnSaveFailed)throw Error('Unable to save the drawing. Please retry.');}catch(e){if(q)q.roofDrawings=drawingsBefore;db.roofDesigns=before;status.textContent=e.message||'Saving failed';return}
   sessionStorage.removeItem(PENDING);sessionStorage.removeItem(LAUNCH);dia.close();
   if(q)openDocument('q',q.id);else openClientDetail(c.id);
 },'btn btn-primary'));dia.append(actions);
 document.body.append(dia);dia.addEventListener('close',()=>dia.remove(),{once:true});dia.showModal()
}

async function captureDrawings(){
 if(!(Number(el('total')?.value)>0)||!(Number(el('depth')?.value)>0))throw Error('Enter the roof width and depth before attaching a drawing.');
 await new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 const result=[];
 for(const [id,title] of [['iso','Roof concept'],['plan','Top view and measurements'],['sideView','Side section']]){
  const original=el(id);if(!original)throw Error('Roof drawing is not ready. Please retry.');
  const svg=original.cloneNode(true),view=original.viewBox.baseVal,w=1400,h=Math.round(w*view.height/view.width);
  svg.setAttribute('xmlns','http://www.w3.org/2000/svg');svg.setAttribute('width',String(w));svg.setAttribute('height',String(h));svg.style.fontFamily='Arial,sans-serif';
  const url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml'}));
  try{const image=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Drawing could not be prepared. Please retry.'));im.src=url;});
   const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(image,0,0,w,h);result.push({title,image:canvas.toDataURL('image/jpeg',.88),width:w,height:h});canvas.width=canvas.height=1;
  }finally{URL.revokeObjectURL(url);}
 }
 return result;
}
function prepareUploadedDrawing(file){
 return new Promise((resolve,reject)=>{
  if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>25000000)return reject(Error('Choose a JPG, PNG or WebP image under 25 MB.'));
  const url=URL.createObjectURL(file),im=new Image();im.onerror=()=>{URL.revokeObjectURL(url);reject(Error('This image could not be opened. Please try another image.'));};im.onload=()=>{try{const ratio=Math.min(1,2000/Math.max(im.naturalWidth,im.naturalHeight)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(im.naturalWidth*ratio));canvas.height=Math.max(1,Math.round(im.naturalHeight*ratio));const ctx=canvas.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(im,0,0,canvas.width,canvas.height);let image=canvas.toDataURL('image/jpeg',.88);if(image.length>1300000)image=canvas.toDataURL('image/jpeg',.7);if(image.length>1800000)throw Error('This image is too large to save reliably. Choose a smaller copy.');resolve({designId:'upload_'+Date.now()+'_'+Math.random().toString(36).slice(2,9),uploaded:true,title:file.name.replace(/\.[^.]+$/,'').slice(0,100)||'Drawing / report',views:[{title:'Uploaded drawing / report',image,width:canvas.width,height:canvas.height}],attachedAt:new Date().toISOString()});canvas.width=canvas.height=1;}catch(e){reject(e);}finally{URL.revokeObjectURL(url);}};im.src=url;
 });
}
function drawingUploadControl(getItems,onChange,onDone){
 const account=[LS_KEY,window.qnApprovalSession?.user?.id||'',window.qnCompanySession?.ownerId||''].join('|');
 const wrap=node('div'),input=node('input'),message=node('p','');input.type='file';input.accept='image/jpeg,image/png,image/webp';input.multiple=true;input.hidden=true;message.className='hint';message.setAttribute('role','status');
 const add=button('+ Upload drawing / report image',()=>{input.value='';input.click();},'btn btn-primary');
 input.onchange=async()=>{const files=[...input.files||[]];if(!files.length)return;add.disabled=true;let added=0;try{for(const file of files){message.textContent='Preparing '+(added+1)+' / '+files.length+'…';const item=await prepareUploadedDrawing(file);if(!wrap.isConnected)return;if(account!==[LS_KEY,window.qnApprovalSession?.user?.id||'',window.qnCompanySession?.ownerId||''].join('|'))throw Error('Your account or company changed. Reopen the quote.');if(getItems().some(a=>(a.views||[]).some(v=>v.image===item.views[0].image))){message.textContent='This image is already attached.';continue;}await onChange([...getItems(),item]);added++;}message.textContent=added?added+' '+(added===1?'image attached.':'images attached.'):'Selected images are already attached.';if(onDone)onDone();}catch(e){message.textContent=e.message+(added?' · '+added+' already attached.':'');}finally{add.disabled=false;input.value='';}};
 wrap.append(add,input,node('p','JPG, PNG or WebP. The image will be included in the customer PDF.','hint'),message);return wrap;
}
function mountDrawingUploadForm(body,record){
 if(!body?.querySelector('#f-valid')||body.querySelector('[data-drawing-upload-form]'))return;
 const account=typeof LS_KEY==='string'?LS_KEY:'',section=node('section',undefined,'qn-roof-box');section.dataset.drawingUploadForm='';body.qnDrawingUploadRecord=record||null;body.qnDrawingUploadAccount=account;body.qnDrawingUploadDraft=structuredClone(record?.roofDrawings||[]);
 section.append(node('h3','Drawings & report images'));const list=node('div');
 function draw(){list.replaceChildren();for(const item of body.qnDrawingUploadDraft){const row=node('div',undefined,'qn-roof-item');row.append(node('strong',item.title||'Drawing'));row.append(button('Remove',()=>{body.qnDrawingUploadDraft=body.qnDrawingUploadDraft.filter(x=>x!==item);draw();body.dispatchEvent(new Event('input',{bubbles:true}));},'btn btn-outline btn-small'));list.append(row);}if(!body.qnDrawingUploadDraft.length)list.append(node('p','Attach a finished drawing or report image from your phone.','hint'));}
 section.append(drawingUploadControl(()=>body.qnDrawingUploadDraft,async items=>{if(account!==LS_KEY)throw Error('Your account changed. Reopen the quote.');body.qnDrawingUploadDraft=items;draw();body.dispatchEvent(new Event('input',{bubbles:true}));}),list,node('p','Attachments are kept when you save this quote.','hint'));
 (body.querySelector('.qn-template-picker')||body.querySelector('#items-wrap').closest('.field')).after(section);draw();
}
function installDrawingUploadForm(){
 const open=window.openQuoteForm;if(typeof open==='function')window.openQuoteForm=function(existing){const result=open.apply(this,arguments);if(!window.QNExtraWork?.isExtra(existing))mountDrawingUploadForm(document.getElementById('modal-body'),existing||null);return result;};
 const read=window.qnReadDocumentCustomer;if(typeof read==='function')window.qnReadDocumentCustomer=function(body){const id=read.apply(this,arguments);if(id&&body?.qnDrawingUploadDraft)body.qnDrawingUploadCommit=true;return id;};
 const original=window.save;if(typeof original==='function')window.save=function(){const body=document.getElementById('modal-body');if(body?.qnDrawingUploadCommit){body.qnDrawingUploadCommit=false;const doc=body.qnPendingDocument||body.qnDrawingUploadRecord;if(doc&&body.qnDrawingUploadAccount===LS_KEY)doc.roofDrawings=structuredClone(body.qnDrawingUploadDraft);}return original.apply(this,arguments);};
}

function drawingViews(item){return (Array.isArray(item.views)?item.views:[]).filter(v=>v&&typeof v.image==='string'&&/^data:image\/(jpeg|png);base64,[A-Za-z0-9+/]+={0,2}$/.test(v.image));}
function addDrawingAttachments(section,kind,doc){
 const attached=(doc.roofDrawings||[]).filter(d=>drawingViews(d).length);
 section.append(drawingUploadControl(()=>doc.roofDrawings||[],async items=>{const before=doc.roofDrawings,beforeTime=doc.updatedAtTime;doc.roofDrawings=items;doc.updatedAtTime=new Date().toISOString();try{save();if(window.qnSaveFailed)throw Error('The attachment could not be saved. Please retry.');}catch(e){doc.roofDrawings=before;doc.updatedAtTime=beforeTime;throw e;}},()=>openDocument(kind,doc.id)));
 const title=node('h3','Drawings included with this '+(kind==='q'?'quote':'invoice'));section.append(title);
 if(!attached.length)section.append(node('p','No drawing attached yet. Add a saved design or create a new roof design.'));
 for(const item of attached){const card=node('div',undefined,'qn-roof-drawing-attachment');card.append(node('strong',item.title||'Roof design'));
  const views=drawingViews(item);for(const [i,v]of views.entries()){const b=button('',()=>{if(window.QNPhotoViewer)window.QNPhotoViewer.open({photos:views,index:i,title:item.title||'Roof design',load:async v=>({image:v.image,caption:v.title,annotations:[]})});},'qn-roof-drawing-preview');const img=node('img');img.src=v.image;img.alt=v.title||'Roof drawing';img.loading='lazy';b.append(img,node('span',v.title));card.append(b);}
  card.append(node('small','Concept drawing · Included in the quote PDF'));
  card.append(button('Remove from '+(kind==='q'?'quote':'invoice'),()=>{const prev=doc.roofDrawings;doc.roofDrawings=(prev||[]).filter(d=>d!==item);try{save();if(window.qnSaveFailed)throw Error('Saving failed.');}catch(e){doc.roofDrawings=prev;alert(e.message);return;}openDocument(kind,doc.id);},'btn btn-outline btn-small'));section.append(card);
 }
 if(kind==='q')section.append(button('+ Attach saved roof drawing',()=>{
  const choices=designs().filter(d=>d.clientId===doc.clientId&&d.drawings?.length&&!attached.some(a=>a.designId===d.id));
  const dia=node('dialog',undefined,'qn-roof-modal');dia.setAttribute('aria-label','Attach roof drawing');dia.append(node('h2','Attach roof drawing'));
  if(!choices.length)dia.append(node('p','No unattached drawings for this customer. Open a saved design, then choose Save to Customer / Quote to prepare its drawing.'));
  for(const d of choices)dia.append(button(d.title||'Roof design',()=>{const prev=doc.roofDrawings;doc.roofDrawings=[...(prev||[]),{designId:d.id,title:d.title,views:structuredClone(d.drawings),attachedAt:new Date().toISOString()}];try{save();if(window.qnSaveFailed)throw Error('Saving failed.');}catch(e){doc.roofDrawings=prev;alert(e.message);return;}dia.close();openDocument(kind,doc.id);},'btn btn-outline'));
  dia.append(button('Close',()=>dia.close()));dia.addEventListener('close',()=>dia.remove(),{once:true});document.body.append(dia);dia.showModal();
 },'btn btn-primary'));
}
function installDrawingPDF(){
 if(typeof buildPDF!=='function'||window.qnRoofDrawingPDFInstalled)return;window.qnRoofDrawingPDFInstalled=true;
 const original=buildPDF;buildPDF=function(kind,id,snapshot){
  const doc=snapshot?.doc||(kind==='q'?data()?.quotes:data()?.invoices)?.find(d=>d.id===id),result=original.apply(this,arguments);if(!result?.pdf||!doc)return result;
  const pdf=result.pdf;
  for(const item of doc.roofDrawings||[]){const views=drawingViews(item);if(!views.length)continue;pdf.addPage();const W=pdf.internal.pageSize.getWidth(),H=pdf.internal.pageSize.getHeight(),margin=36;pdf.setFont('helvetica','bold');pdf.setFontSize(17);pdf.setTextColor(31,41,55);pdf.text((item.uploaded?'DRAWING / REPORT · ':'ROOF DESIGN · ')+String(doc.number||''),margin,40);pdf.setFontSize(11);pdf.text(pdf.splitTextToSize(item.title||'Roof design',W-2*margin)[0],margin,61);pdf.setFont('helvetica','normal');pdf.setFontSize(9);pdf.text(item.uploaded?'Customer attachment · '+String(item.title||'Drawing / report').slice(0,70):'Concept drawing. Verify dimensions and structural requirements before installation.',margin,78);
   const slot=(H-120)/views.length;for(const [i,v]of views.entries()){const top=98+i*slot;pdf.setFontSize(10);pdf.text(v.title||'Roof drawing',margin,top);const props=pdf.getImageProperties(v.image),scale=Math.min((W-2*margin)/props.width,(slot-28)/props.height),w=props.width*scale,h=props.height*scale;pdf.addImage(v.image,v.image.startsWith('data:image/png')?'PNG':'JPEG',(W-w)/2,top+10,w,h);}
  }return result;
 };
}

function app(){
 if(typeof openClientDetail!=='function'||typeof openDocument!=='function')return;
 styles();installDrawingPDF();window.QNMaterialPresentation.install();installDrawingUploadForm();const oldClient=openClientDetail;window.openClientDetail=function(id){const v=oldClient.apply(this,arguments);displayForCustomer(id);return v};
 const oldDoc=openDocument;window.openDocument=function(kind,id){const v=oldDoc.apply(this,arguments);displayForQuote(kind,id);return v};window.qnRenderSavedDocument=window.openDocument;
 more();const pending=state(PENDING);
 const deletePending=state('qn_roof_delete_pending_v1');
 if(deletePending?.id){
  const openDelete=()=>{
   if(!document.body.classList.contains('qn-authenticated'))return;
   const record=designs().find(d=>d.id===deletePending.id);
   if(!record){sessionStorage.removeItem('qn_roof_delete_pending_v1');return}
   setTimeout(()=>showDeleteDialog(record,()=>showLibrary()),120);
  };
  openDelete();const obsDelete=new MutationObserver(openDelete);obsDelete.observe(document.body,{attributes:true,attributeFilter:['class']});
  window.addEventListener('pagehide',()=>obsDelete.disconnect(),{once:true});
 }
 if(pending?.geometry){const tryOpen=()=>{if(document.body.classList.contains('qn-authenticated'))setTimeout(()=>saveDialog(pending),120)};
 tryOpen();const observer=new MutationObserver(tryOpen);observer.observe(document.body,{attributes:true,attributeFilter:['class']});window.addEventListener('pagehide',()=>observer.disconnect(),{once:true})}
}
function start(){if(location.pathname.endsWith('/roof-designer.html'))initDesigner();else app()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
if(!location.pathname.endsWith('/roof-designer.html'))window.addEventListener('pageshow',()=>{
 const pending=state(PENDING);if(!pending?.geometry)return;
 const resume=()=>{if(!document.body.classList.contains('qn-authenticated')||!data())return false;saveDialog(state(PENDING));return true};
 if(resume())return;
 let attempts=0;const timer=setInterval(()=>{attempts++;if(resume()||attempts>=24)clearInterval(timer)},500);
});
})();
