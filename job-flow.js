/* Job work state is independent of an invoice prepared in advance. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.QNJobFlow=api;})(typeof window==='object'?window:globalThis,function(){
 'use strict';
 const active=['Scheduled','In Progress','On Hold','Cancelled'];
 function completed(j){return !!j&&(['Completed','Invoiced'].includes(j.status)||(!active.includes(j.status)&&['Completed','Invoiced'].includes(j.flowStage||j.status)));}
 function label(j,i){if(!j)return '';return completed(j)?(i?'Invoiced':'Completed'):j.status||(['Completed','Invoiced'].includes(j.flowStage)?'Completed':j.flowStage)||'Scheduled';}
 function next(j){if(!j||['Cancelled','On Hold'].includes(j.status)||completed(j))return null;if(j.status==='In Progress')return 'complete';return j.date?'start':'schedule';}
 function transition(j,status,persist){
  if(!['In Progress','Completed'].includes(status)||next(j)!==(status==='Completed'?'complete':'start'))throw Error('This job changed. Reopen it before updating.');
  const keys=['status','flowStage','updatedAtTime'],before=keys.map(k=>[k,Object.prototype.hasOwnProperty.call(j,k),j[k]]);
  try{Object.assign(j,{status,flowStage:status,updatedAtTime:new Date().toISOString()});persist();}catch(error){for(const [k,had,value] of before){if(had)j[k]=value;else delete j[k];}throw error;}
 }
 const normal=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 function search(db,query){
  const terms=normal(query).trim().split(/\s+/).filter(Boolean);if(!terms.length)return [];
  const clients=new Map((db.clients||[]).map(c=>[c.id,c]));const found=[];
  for(const [kind,key] of [['customer','clients'],['quote','quotes'],['job','jobs'],['invoice','invoices']])for(const r of db[key]||[]){
   if(r.deletedAt)continue;const c=kind==='customer'?r:clients.get(r.clientId)||r.clientSnapshot||{};
   const title=kind==='customer'?r.name:kind==='job'?r.title:r.number;
   const detail=[c.name,r.client,kind==='job'?label(r):r.status].filter(Boolean).join(' · ');
   const text=normal([title,detail,c.email,c.phone,c.address,r.notes,...(r.items||[]).flatMap(x=>[x.service,x.desc,x.description])].filter(Boolean).join(' '));
   if(terms.every(t=>text.includes(t)))found.push({kind,id:r.id,title:title||kind,detail,time:Date.parse(r.updatedAtTime||r.createdAtTime||r.createdAt)||0,exact:normal(title)===normal(query).trim()});
  }
  return found.sort((a,b)=>Number(b.exact)-Number(a.exact)||b.time-a.time||String(a.title).localeCompare(String(b.title)));
 }
 return {completed,label,next,transition,search};
});
