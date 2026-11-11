(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.QNInspectionModel=factory();})(typeof window==='undefined'?globalThis:window,()=>{
 'use strict';
 const clone=x=>JSON.parse(JSON.stringify(x));
 function validate(r){
  if(!r.address?.trim())throw Error('Enter the inspection address.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(r.date||'')||!Number.isFinite(Date.parse(r.date))||new Date(r.date).toISOString().slice(0,10)!==r.date)throw Error('Choose an inspection date.');
  if(!r.findings?.length)throw Error('Add at least one finding.');
  if(r.findings.some(f=>!f.description?.trim()))throw Error('Describe each finding.');
  return r;
 }
 function matching(records,query='',status='all'){
  const q=query.trim().toLocaleLowerCase();return records.filter(r=>!r.deletedAt&&(status==='all'||r.status===status)&&[r.number,r.title,r.address,r.client?.name,r.client?.email,r.client?.phone].join(' ').toLocaleLowerCase().includes(q)).sort((a,b)=>String(b.updatedAtTime).localeCompare(String(a.updatedAtTime)));
 }
 function put(records,record,expected){
  const i=records.findIndex(r=>r.id===record.id),old=records[i];
  if(old?.deletedAt||old&&old.updatedAtTime!==expected||!old&&expected)throw Error('This inspection changed on another device. Reopen it before editing.');
  const out=clone(records),next=clone(record);next.updatedAtTime=new Date(Math.max(Date.now(),Date.parse(old?.updatedAtTime||0)+1||0)).toISOString();
  if(i<0)out.push(next);else out[i]=next;return {records:out,record:next};
 }
 return {clone,validate,matching,put};
});
