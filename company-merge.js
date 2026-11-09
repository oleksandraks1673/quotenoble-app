/* Three-way merge: unrelated edits combine; competing edits need review. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.qnMergeCompanyCopies=factory();})(typeof window!=='undefined'?window:globalThis,()=>{
 const recordLists=['clients','quotes','invoices','jobs','smartTemplates','expenses','inspections','roofDesigns'];
 const missing=Symbol('missing'),clone=x=>x===missing?missing:JSON.parse(JSON.stringify(x));
 const stable=x=>x===missing?'__MISSING__':Array.isArray(x)?'['+x.map(stable).join(',')+']':x&&typeof x==='object'?'{'+Object.keys(x).sort().map(k=>JSON.stringify(k)+':'+stable(x[k])).join(',')+'}':JSON.stringify(x);
 return (base,local,remote)=>{
  try{
   const withoutBaseline=!base;if(withoutBaseline)base={};
   function merge(b,l,r,path=[]){
    if(path.length===1&&path[0]==='formDrafts'&&b===missing)b={};
    if(path.length===1&&(withoutBaseline?recordLists:['expenses','inspections','roofDesigns']).includes(path[0])&&b===missing)b=[];
    // Without a shared baseline, combine only matching record shapes; competing values still stop the merge.
    if(withoutBaseline&&b===missing&&l&&r&&typeof l==='object'&&typeof r==='object'&&!Array.isArray(l)&&!Array.isArray(r)){
     const keys=x=>Object.keys(x).filter(k=>k!=='updatedAtTime').sort().join('|');
     if(path.length===1&&['photos','reports','formDrafts','seq'].includes(path[0])||path.length===2&&recordLists.includes(path[0])&&keys(l)===keys(r)||path.length===1&&path[0]==='profile'&&keys(l)===keys(r))b={};
    }
    if(path.length===3&&recordLists.includes(path[0])&&path[2]==='updatedAtTime'&&typeof l==='string'&&typeof r==='string'&&Number.isFinite(Date.parse(l))&&Number.isFinite(Date.parse(r)))return Date.parse(l)>=Date.parse(r)?l:r;
    if(path.length===1&&path[0]==='deletedRecords'){
     const out={};for(const source of [b,l,r])if(source!==missing&&source&&typeof source==='object')for(const [k,v] of Object.entries(source)){if(!out[k]||String(v.deletedAt)>String(out[k].deletedAt))out[k]=clone(v);}return out;
    }
    if(stable(l)===stable(r))return clone(l);if(stable(b)===stable(l))return clone(r);if(stable(b)===stable(r))return clone(l);
    if(path[0]==='seq'&&[l,r].every(x=>typeof x==='number'))return Math.max(b===missing?0:b,l,r);
    if(Array.isArray(l)&&Array.isArray(r)&&Array.isArray(b)){
     if(path[0]==='documentUsageByMonth'&&[...b,...l,...r].every(x=>typeof x==='string'))return [...new Set([...b,...l,...r])];
     if(path.length===1&&recordLists.includes(path[0])&&[...b,...l,...r].every(x=>x&&typeof x.id==='string')){
      const maps=[b,l,r].map(a=>new Map(a.map(x=>[x.id,x])));if(maps.some((m,i)=>m.size!==[b,l,r][i].length))throw Error('Duplicate id');
      const ids=new Set([...l,...r,...b].map(x=>x.id)),out=[];
      for(const id of ids){const value=merge(...maps.map(m=>m.has(id)?m.get(id):missing),[...path,id]);if(value!==missing)out.push(value);}return out;
     }
     throw Error('Competing list changes');
    }
    if([b,l,r].every(x=>x!==missing&&x&&typeof x==='object'&&!Array.isArray(x))){
     const out={};for(const k of new Set([...Object.keys(b),...Object.keys(l),...Object.keys(r)])){const value=merge(...[b,l,r].map(x=>Object.hasOwn(x,k)?x[k]:missing),[...path,k]);if(value!==missing)out[k]=value;}return out;
    }
    throw Error('Competing changes');
   }
   const result=merge(base,local,remote);
   for(const kind of ['clients','quotes','invoices','jobs'])result[kind]=(result[kind]||[]).filter(doc=>!result.deletedRecords?.[kind+':'+doc.id]);
   for(const kind of ['quotes','invoices']){const numbers=new Set();for(const doc of result[kind]||[]){if(doc.number&&numbers.has(doc.number))return null;numbers.add(doc.number);}}
   return result;
  }catch{return null;}
 };
});

