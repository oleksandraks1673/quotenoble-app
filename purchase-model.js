(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.QNPurchaseModel=factory();})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const units=['pcs','bundles','rolls','boxes','sheets','ft','m','other'];
 const fail=message=>{throw Object.assign(Error(message),{status:400});};
 function str(v,max,label,required=false){if(v!==undefined&&typeof v!=='string')fail('Check '+label+'.');const s=(v||'').trim();if(s.length>max||required&&!s)fail('Check '+label+'.');return s;}
 function date(v,required=false){const s=str(v,10,'the date',required);if(s&&(!/^\d{4}-\d{2}-\d{2}$/.test(s)||!Number.isFinite(Date.parse(s))||new Date(s).toISOString().slice(0,10)!==s))fail('Choose a valid date.');return s;}
 function source(r){return{jobId:str(r.jobId,150,'the job'),jobTitle:str(r.jobTitle,250,'the job title')};}
 function order(r){
  if(!r||typeof r!=='object')fail('Check the order.');
  if(!Array.isArray(r.items)||r.items.length<1||r.items.length>100)fail('Add between 1 and 100 material items.');
  const items=r.items.map(i=>{if(!i||typeof i!=='object')fail('Check the material items.');const name=str(i.name,250,'each material name',true),qty=i.qty,unit=str(i.unit,20,'the unit',true);if(!Number.isFinite(qty)||qty<=0||qty>1000000||Math.abs(qty*100-Math.round(qty*100))>.00001||!units.includes(unit))fail('Use positive quantities with up to two decimal places.');return{name,qty,unit};});
  const supplierEmail=str(r.supplierEmail,254,'the supplier email');if(supplierEmail&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(supplierEmail))fail('Check the supplier email.');
  if(!['Pickup','Delivery'].includes(r.fulfillment))fail('Choose pickup or delivery.');
  return{...source(r),supplier:str(r.supplier,150,'the supplier name',true),supplierEmail,quoteId:str(r.quoteId,150,'the quote'),quoteNumber:str(r.quoteNumber,80,'the quote number'),neededBy:date(r.neededBy),fulfillment:r.fulfillment,address:r.fulfillment==='Delivery'?str(r.address,600,'the delivery address',true):'',notes:str(r.notes,2000,'the order notes'),items,status:'Draft'};
 }
 function receipt(r){
  if(!r||typeof r!=='object')fail('Check the receipt.');
  if(!Number.isSafeInteger(r.total)||r.total<1||r.total>100000000||!Number.isSafeInteger(r.tax)||r.tax<0||r.tax>r.total)fail('Enter a valid total and included tax.');
  if(!['Materials','Supplies','Subcontractors','Wages','Fuel','Vehicle','Equipment','Rent','Insurance','Advertising','Software','Phone & internet','Bank fees','Other'].includes(r.category))fail('Choose an expense category.');
  const orderId=str(r.orderId,36,'the linked order');if(orderId&&!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(orderId))fail('Choose a valid order.');
  return{...source(r),orderId,supplier:str(r.supplier,150,'the store or supplier',true),date:date(r.date,true),total:r.total,tax:r.tax,category:r.category,reference:str(r.reference,100,'the receipt reference'),notes:str(r.notes,2000,'the receipt notes')};
 }
 function cents(value){const s=String(value).trim();if(!/^\d+(?:\.\d{1,2})?$/.test(s))return null;const n=Math.round(Number(s)*100);return Number.isSafeInteger(n)?n:null;}
 function extract(text){
  const lines=String(text||'').replace(/\r/g,'').split('\n').map(x=>x.trim()).filter(Boolean),warnings=[];
  const amount=line=>{const matches=[...line.matchAll(/(?:\$\s*)?(\d{1,3}(?:,\d{3})*|\d+)[.,](\d{2})(?!\d)/g)];const valid=matches.filter(m=>!line.slice(m.index+m[0].length).trim().startsWith('%'));if(!valid.length)return null;const m=valid.at(-1);return cents(m[1].replace(/,/g,'')+'.'+m[2]);};
  const totals=lines.filter(l=>/^(grand\s+total|total(?:\s+(?:paid|due))?|amount\s+(?:due|paid)|balance\s+due)\s*[:=-]?\s*(?:CAD\s*)?\$?\s*\d/i.test(l)).map(amount).filter(n=>n!==null);
  const distinct=[...new Set(totals)];let total=distinct.length===1?distinct[0]:null;if(total===null)warnings.push('Enter or confirm the receipt total.');
  let tax=null;const taxes=lines.filter(l=>/^(HST|GST|PST|QST|TAX|TOTAL\s+TAX)\b/i.test(l)).map(amount).filter(n=>n!==null);
  if(taxes.length===1)tax=taxes[0];else if(taxes.length>1){const combined=lines.find(l=>/^(TAX|TOTAL\s+TAX)\b/i.test(l));tax=combined?amount(combined):taxes.reduce((s,n)=>s+n,0);}
  if(tax!==null&&total!==null&&tax>total){tax=null;warnings.push('Check the included tax.');}
  let foundDate='';for(const line of lines){const m=line.match(/\b(20\d{2})[-/](\d{2})[-/](\d{2})\b/);if(m){try{foundDate=date(m.slice(1).join('-'));break;}catch{}}}
  if(!foundDate)warnings.push('Choose the purchase date.');
  const supplier=(lines.find(l=>/[A-Za-z]{3}/.test(l)&&!/^(receipt|invoice|welcome|thank|tax|total|date|cashier|tel|phone)\b/i.test(l)&&!/^\d/.test(l))||'').slice(0,150);
  return{supplier,date:foundDate,total,tax,warnings};
 }
 function orderText(o){return [o.business?.name||'Business','SUPPLIER ORDER '+o.number,'Status: '+o.status,'Supplier: '+o.supplier,o.supplierEmail?'Supplier email: '+o.supplierEmail:'',o.jobTitle?'Job: '+o.jobTitle:'',o.neededBy?'Needed by: '+o.neededBy:'',o.fulfillment+(o.address?' — '+o.address:''),'',...o.items.map(i=>i.qty+' '+i.unit+' — '+i.name),o.notes?'\nNotes: '+o.notes:'','\nPlease confirm availability, pricing and '+o.fulfillment.toLowerCase()+' arrangements.',o.business?.phone?'Phone: '+o.business.phone:'',o.business?.email?'Email: '+o.business.email:''].filter((s,i,a)=>s||a[i-1]).join('\n');}
 return{units,order,receipt,cents,extract,orderText,date};
});
