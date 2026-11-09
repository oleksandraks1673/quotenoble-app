(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.QNExtraWork=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const isExtra=q=>!!(q?.isExtraWork||q?.extraWorkJobId||q?.extraWorkParentQuoteId||q?.extraWorkParentInvoiceId||q?.extraWorkTitle);
  function context(db,kind,id){
    const jobs=db.jobs||[],quotes=db.quotes||[],invoices=db.invoices||[];
    let j=null,q=null,i=null,source;
    if(kind==='job'){j=jobs.find(x=>x.id===id);source=j;}
    if(kind==='quote'){q=quotes.find(x=>x.id===id);source=q;}
    if(kind==='invoice'){i=invoices.find(x=>x.id===id);source=i;}
    if(!source)return null;
    if(isExtra(q)){
      j=jobs.find(x=>x.id===q.extraWorkJobId)||null;
      i=invoices.find(x=>x.id===q.extraWorkParentInvoiceId)||null;
      q=quotes.find(x=>x.id===q.extraWorkParentQuoteId)||null;
    }
    if(!q&&i){const linked=quotes.find(x=>x.id===i.quoteId);q=isExtra(linked)?quotes.find(x=>x.id===linked.extraWorkParentQuoteId)||null:linked||null;}
    if(!j)j=jobs.find(x=>x.id===i?.jobId||x.id===i?.extraWorkJobId||(i&&x.invoiceId===i.id)||(q&&x.quoteId===q.id))||null;
    if(!q&&j)q=quotes.find(x=>x.id===j.quoteId)||null;
    if(!i)i=invoices.find(x=>(j&&(x.id===j.invoiceId||x.jobId===j.id))||(q&&x.quoteId===q.id))||null;
    return {kind,id,jobId:j?.id||null,quoteId:q?.id||(isExtra(source)?source.id:null),invoiceId:i?.id||null,
      title:j?.title||source.number||q?.number||i?.number||'Extra work',clientId:source.clientId||j?.clientId||q?.clientId||i?.clientId,
      taxRate:source.taxRate??j?.taxRate??q?.taxRate??i?.taxRate??db.profile?.taxRate??0,
      taxLabel:source.taxLabel||j?.taxLabel||q?.taxLabel||i?.taxLabel||db.profile?.taxLabel||'Tax'};
  }
  function requestsFor(db,c){
    if(!c)return [];
    return (db.quotes||[]).filter(q=>isExtra(q)&&((c.jobId&&q.extraWorkJobId===c.jobId)||(c.quoteId&&q.extraWorkParentQuoteId===c.quoteId)||(c.invoiceId&&q.extraWorkParentInvoiceId===c.invoiceId)));
  }
  const requests=(db,id)=>requestsFor(db,context(db,'job',id));
  const approved=q=>!!(isExtra(q)&&q.customerDecisionId&&q.customerApprovedSnapshot?.acceptance&&['accepted','invoiced'].includes(q.status));
  const billed=(db,q)=>(db.invoices||[]).find(i=>i.quoteId===q.id||(i.items||[]).some(it=>it.extraWorkId===q.id));
  const total=(db,id)=>requests(db,id).filter(approved).reduce((n,q)=>n+q.customerApprovedSnapshot.total,0);
  function lines(q){if(!approved(q))return [];return q.customerApprovedSnapshot.items.map(it=>({service:'Extra work '+q.number+' — '+(it.service||'Service'),desc:it.desc||'',qty:it.qty,price:it.price,extraWorkId:q.id,extraWorkDecisionId:q.customerDecisionId,extraWorkTaxRate:q.customerApprovedSnapshot.taxRate}));}
  function invoiceItemsFor(db,c,base){const items=base.map(it=>({...it}));for(const q of requestsFor(db,c))if(approved(q)&&!billed(db,q)&&!items.some(it=>it.extraWorkId===q.id))items.push(...lines(q));return items;}
  const invoiceItems=(db,id,base)=>invoiceItemsFor(db,context(db,'job',id),base);
  function tax(items,rate){let base=0;const groups=new Map();for(const it of items||[]){const sub=Math.round(Number(it.qty)*Number(it.price));if(it.extraWorkId&&Number.isFinite(it.extraWorkTaxRate)){const key=it.extraWorkId+'|'+it.extraWorkTaxRate,g=groups.get(key)||{sub:0,rate:it.extraWorkTaxRate};g.sub+=sub;groups.set(key,g);}else base+=sub;}return Math.round(base*rate/100)+[...groups.values()].reduce((s,g)=>s+Math.round(g.sub*g.rate/100),0);}
  return {isExtra,context,requestsFor,requests,approved,billed,total,lines,invoiceItemsFor,invoiceItems,tax};
});
