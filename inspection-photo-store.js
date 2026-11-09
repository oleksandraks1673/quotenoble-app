/* Keep inspection image bytes out of the small localStorage document store.
   Cloud payloads and exported backups retain complete, portable images. */
(()=>{
 'use strict';
 const PREFIX='qn-inspection-photo:v1:',cache=new Map();
 const documentPhotoId=(p,i)=>p.id||String(i);
 const documentPhotos=db=>Object.entries(db?.photos||{}).flatMap(([key,list])=>Array.isArray(list)?list.map((source,i)=>({r:{id:'document:'+key},f:{id:'attachments'},p:{id:documentPhotoId(source,i),get image(){return source.data;},set image(value){source.data=value;}}})):[]);
 const embedded=db=>{const result=[];function visit(value,parts){if(!value||typeof value!=='object')return;for(const key of Object.keys(value)){if(!parts.length&&['inspections','photos'].includes(key))continue;const next=[...parts,key],image=value[key];if(typeof image==='string'&&(/^data:image\/(jpeg|png|webp);base64,/.test(image)||image.startsWith(PREFIX)))result.push({r:{id:'embedded'},f:{id:JSON.stringify(next)},p:{id:'image',get image(){return value[key]},set image(v){value[key]=v}}});else if(image&&typeof image==='object')visit(image,next);}}visit(db,[]);return result;};
 const photos=db=>[...(Array.isArray(db?.inspections)?db.inspections.flatMap(r=>(r.findings||[]).flatMap(f=>(f.photos||[]).map(p=>({r,f,p})))):[]),...documentPhotos(db),...embedded(db)];
 const path=(scope,r,f,p)=>JSON.stringify([scope,r.id,f.id,p.id]);
 const inline=value=>typeof value==='string'&&/^data:image\/(jpeg|png|webp);base64,/.test(value);
 const ref=value=>typeof value==='string'&&value.startsWith(PREFIX);
 function keyOf(value,scope){
  const key=value.slice(PREFIX.length);let parts;try{parts=JSON.parse(key);}catch{}
  if(!Array.isArray(parts)||parts.length!==5||parts[0]!==scope)throw Error('This inspection photo belongs to a different workspace.');
  return key;
 }
 function open(){return new Promise((resolve,reject)=>{
  if(!window.indexedDB){reject(Error('Photo storage is unavailable. Keep the inspection open and try a regular browser window.'));return;}
  const request=indexedDB.open('quotenoble-inspection-photos',1);
  request.onupgradeneeded=()=>{request.result.createObjectStore('photos');request.result.createObjectStore('snapshots');};
  request.onsuccess=()=>resolve(request.result);
  request.onerror=()=>reject(Error('Photo storage could not be opened. Keep this page open and retry.'));
  request.onblocked=()=>reject(Error('Photo storage is waiting for another Quote Noble tab. Close that tab and retry.'));
 });}
 async function digest(value){
  const bytes=new TextEncoder().encode(value),hash=await crypto.subtle.digest('SHA-256',bytes);
  return [...new Uint8Array(hash)].map(v=>v.toString(16).padStart(2,'0')).join('');
 }
 async function prepare(db,scope){
  const pending=[];
  for(const item of photos(db)){
   const {r,f,p}=item,id=path(scope,r,f,p),old=cache.get(id);
   if(ref(p.image)){keyOf(p.image,scope);throw Error('A saved photo must be loaded before saving this inspection.');}
   if(!inline(p.image)||old?.image===p.image)continue;
   const key=JSON.stringify([scope,r.id,f.id,p.id,await digest(p.image)]);pending.push({...item,id,key,image:p.image});
  }
  if(!pending.length)return;
  const dbi=await open();
  try{await new Promise((resolve,reject)=>{
   let tx;try{tx=dbi.transaction('photos','readwrite',{durability:'strict'});}catch{tx=dbi.transaction('photos','readwrite');}
   tx.oncomplete=resolve;tx.onerror=()=>reject(Error('Photos could not be saved on this device. Keep this page open and retry.'));tx.onabort=()=>reject(Error('Photo storage is full or unavailable. Keep this page open and retry.'));
   for(const item of pending)tx.objectStore('photos').put(item.image,item.key);
  });}finally{dbi.close();}
  // Register references only after the whole write transaction commits.
  for(const item of pending)cache.set(item.id,{key:item.key,image:item.image});
 }
 function compact(db,scope){
  const out=JSON.parse(JSON.stringify(db));
  for(const {r,f,p} of embedded(out)){const stored=cache.get(path(scope,r,f,p));if(stored?.image===p.image)p.image=PREFIX+stored.key;}

  if(db?.photos)out.photos=Object.fromEntries(Object.entries(db.photos).map(([key,list])=>[key,Array.isArray(list)?list.map((p,i)=>{const stored=cache.get(path(scope,{id:'document:'+key},{id:'attachments'},{id:documentPhotoId(p,i)}));return stored?.image===p.data?{...p,data:PREFIX+stored.key}:p;}):list]));
  if(!Array.isArray(db?.inspections))return out;
  return {...out,inspections:db.inspections.map(r=>({...r,findings:(r.findings||[]).map(f=>({...f,photos:(f.photos||[]).map(p=>{
   const stored=cache.get(path(scope,r,f,p));return stored?.image===p.image?{...p,image:PREFIX+stored.key}:p;
  })}))}))};
 }
 function expand(db,scope){
  for(const {r,f,p} of photos(db))if(ref(p.image)){
   const key=keyOf(p.image,scope),stored=cache.get(path(scope,r,f,p));
   if(!stored||stored.key!==key)throw Error('An inspection photo needs to be loaded again. Keep your saved copy.');p.image=stored.image;
  }
  return db;
 }
 async function hydrate(db,scope){
  const pending=photos(db).filter(({p})=>ref(p.image));
  if(pending.length){
   const keys=pending.map(({p})=>keyOf(p.image,scope)),dbi=await open();let images;
   try{images=await new Promise((resolve,reject)=>{
    const tx=dbi.transaction('photos','readonly'),values=new Array(keys.length);
    keys.forEach((key,i)=>{const req=tx.objectStore('photos').get(key);req.onsuccess=()=>values[i]=req.result;});
    tx.oncomplete=()=>resolve(values);tx.onerror=()=>reject(Error('Saved inspection photos could not be read. Retry without clearing site data.'));tx.onabort=tx.onerror;
   });}finally{dbi.close();}
   if(images.some(value=>!inline(value)))throw Error('An inspection photo is missing on this device. Your report is kept; try cloud sync or your original photo.');
   pending.forEach(({r,f,p},i)=>cache.set(path(scope,r,f,p),{key:keys[i],image:images[i]}));
  }
  expand(db,scope);await prepare(db,scope);return db;
 }
 async function snapshot(key,value,write=false){
  const dbi=await open();try{return await new Promise((resolve,reject)=>{
   const tx=dbi.transaction('snapshots',write?'readwrite':'readonly'),store=tx.objectStore('snapshots');let result;
   const request=write?store.put(value,key):store.get(key);request.onsuccess=()=>result=request.result;
   tx.oncomplete=()=>resolve(write?value:result);tx.onerror=()=>reject(tx.error);tx.onabort=tx.onerror;
  });}finally{dbi.close();}
 }
 window.QNInspectionPhotos={prepare,compact,expand,hydrate,readSnapshot:key=>snapshot(key),writeSnapshot:(key,value)=>snapshot(key,value,true),stringify:(db,scope)=>JSON.stringify(compact(db,scope))};
})();
