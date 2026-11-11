/* Gallery presentation only; record dates and PDF order are not modified. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.QNPhotoSort=factory();})(globalThis,function(){
 'use strict';
 const timestamp=p=>{const n=Date.parse(p.created_at);return Number.isFinite(n)?n:null;};
 function day(p){const n=timestamp(p);if(n===null)return '';const d=new Date(n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
 function select(records,{stage='all',order='newest',from='',to=''}={}){
  return records.map((p,i)=>({p,i,t:timestamp(p)})).filter(({p})=>{const key=day(p);return (stage==='all'||p.stage===stage)&&(!from||key&&key>=from)&&(!to||key&&key<=to);}).sort((a,b)=>{
   if(a.t===null||b.t===null)return a.t===b.t?a.i-b.i:a.t===null?1:-1;
   return order==='oldest'?a.t-b.t||a.i-b.i:b.t-a.t||b.i-a.i;
  }).map(({p})=>p);
 }
 function groups(photos){const result=new Map();for(const p of photos){const key=day(p);if(!result.has(key))result.set(key,[]);result.get(key).push(p);}return [...result].map(([day,photos])=>({day,photos}));}
 return {select,groups,day};
});
