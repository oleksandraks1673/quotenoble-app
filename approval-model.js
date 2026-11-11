(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.QNApprovalModel=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const str=(v,max=12000)=>String(v||'').slice(0,max);
  // Amounts are integer cents; percentage values allow two decimal places.
  function discountSpec(value,strict=false){
    if(!value||value.type==='none')return null;
    const type=value.type,amount=Number(value.value);
    const valid=['percent','fixed'].includes(type)&&Number.isFinite(amount)&&amount>=0&&(type==='percent'?amount<=100&&Math.abs(amount*100-Math.round(amount*100))<0.000001:Number.isSafeInteger(amount));
    if(!valid){if(strict)throw Error('Enter a discount from 0 to 100%, or a valid dollar amount.');return null;}
    return amount?{type,value:amount}:null;
  }
  function totals(items,rate,discount,strict=false){
    const rows=items||[],subtotal=rows.reduce((sum,i)=>sum+Math.round(Number(i.qty)*Number(i.price)),0);
    // Separately approved extra work keeps its own agreed amount and tax rate.
    const base=rows.filter(i=>!i.extraWorkId).reduce((sum,i)=>sum+Math.round(Number(i.qty)*Number(i.price)),0);
    const spec=discountSpec(discount,strict);
    const requested=spec?(spec.type==='percent'?Math.round(base*spec.value/100):spec.value):0;
    if(strict&&requested>base)throw Error('The discount cannot exceed the included work subtotal.');
    const discountAmount=Math.min(Math.max(0,base),requested);
    const groups=new Map();let ordinary=0;
    for(const it of rows){const amount=Math.round(Number(it.qty)*Number(it.price));if(it.extraWorkId&&Number.isFinite(it.extraWorkTaxRate)){const key=it.extraWorkId+'|'+it.extraWorkTaxRate,g=groups.get(key)||{sub:0,rate:it.extraWorkTaxRate};g.sub+=amount;groups.set(key,g);}else ordinary+=amount;}
    const tax=Math.round((ordinary-discountAmount)*Number(rate||0)/100)+[...groups.values()].reduce((sum,g)=>sum+Math.round(g.sub*g.rate/100),0);
    return {subtotal,discountAmount,tax,total:subtotal-discountAmount+tax};
  }
  function snapshot(db,q){
    const p=db.profile||{},c=(db.clients||[]).find(x=>x.id===q.clientId)||{};
    if((q.items||[]).length>200)throw Error('Use no more than 200 services per quote.');
    const items=(q.items||[]).map(it=>({service:str(it.service,300),desc:str(it.desc),qty:Number(it.qty),price:Number(it.price),...(it.showMaterialPhotos!==false&&Array.isArray(it.materialPhotos)&&it.materialPhotos.length?{materialPhotos:it.materialPhotos.filter(p=>p&&typeof p.data==='string'&&/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(p.data)&&p.data.length<=65000).map(p=>({data:p.data,caption:str(p.caption,160)}))}:{}),...(it.optional===true?{optional:true}:{})}));
    if(!items.length||items.some(i=>!Number.isFinite(i.qty)||i.qty<=0||!Number.isSafeInteger(i.price)||i.price<0))throw Error('Check the quote quantities and prices before sharing.');
    if(!items.some(i=>!i.optional))throw Error('Add at least one included service before sharing.');
    const rate=Number(q.approvalTaxRate??q.taxRate??p.taxRate??0),discount=discountSpec(q.discount,true),t=totals(items.filter(i=>!i.optional),rate,discount,true),sub=t.subtotal,tax=t.tax;
    const maximum=items.reduce((sum,i)=>sum+Math.round(i.qty*i.price),0);
    if(!Number.isFinite(rate)||!Number.isSafeInteger(maximum+Math.round(maximum*rate/100))||rate<0||rate>100)throw Error('Check the quote total and tax rate.');
    return {number:str(q.number,100),date:str(q.createdAt,10),validUntil:str(q.validUntil,10),business:{name:str(p.businessName,200),phone:str(p.phone,80),email:str(p.email,254)},customer:{name:str(c.name,200),address:str(c.address,1000)},items,notes:str(q.notes),taxLabel:str(q.approvalTaxLabel||q.taxLabel||p.taxLabel||'Tax',80),taxRate:rate,subtotal:sub,tax,total:t.total,...(discount?{discount,discountAmount:t.discountAmount}:{}),currency:'CAD',...(q.siteAddress?{siteAddress:str(q.siteAddress,500)}:{})};
  }
  function selection(quote,indices=[]){
    if(!Array.isArray(indices)||indices.length>200||new Set(indices).size!==indices.length||indices.some(i=>!Number.isInteger(i)||i<0||quote.items[i]?.optional!==true))throw Error('Choose only the optional services offered in this quote.');
    const selected=new Set(indices),items=quote.items.filter((it,i)=>!it.optional||selected.has(i));
    const t=totals(items,quote.taxRate,quote.discount,true),subtotal=t.subtotal,tax=t.tax;
    if(!Number.isSafeInteger(subtotal+tax))throw Error('Check the quote total.');
    return {...quote,items,subtotal,tax,total:t.total,...(quote.discount?{discountAmount:t.discountAmount}:{})};
  }
  function canonical(value){if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(k=>JSON.stringify(k)+':'+canonical(value[k])).join(',')+'}';return JSON.stringify(value);}
  return {snapshot,selection,canonical,discountSpec,totals};
});

