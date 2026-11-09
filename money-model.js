(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.QNMoneyModel=factory();})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const categories=['Materials','Supplies','Subcontractors','Wages','Fuel','Vehicle','Equipment','Rent','Insurance','Advertising','Software','Phone & internet','Bank fees','Other'];
 const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s;
 const cents=s=>{s=String(s).trim();if(!/^\d+(\.\d{1,2})?$/.test(s))return null;const n=Math.round(Number(s)*100);return Number.isSafeInteger(n)?n:null;};
 function expense(r){if(!r||typeof r.supplier!=='string'||!r.supplier.trim()||r.supplier.trim().length>150||!validDate(r.date)||!Number.isSafeInteger(r.total)||r.total<=0||r.total>100000000||!Number.isSafeInteger(r.tax)||r.tax<0||r.tax>r.total||!categories.includes(r.category))throw Error('Check the supplier, date, category, total and included tax.');return {supplier:r.supplier.trim(),date:r.date,total:r.total,tax:r.tax,category:r.category,notes:String(r.notes||'').slice(0,2000)};}
 function report(db,receipts,year,totals,jobDeposits=[]){
  const inYear=d=>validDate(d)&&d.slice(0,4)===String(year),warnings=[],sales=[],payments=[],expenses=[];
  const warn=(record,issue)=>warnings.push({record,issue});
  for(const i of db.invoices||[]){
   const label=i.number||i.id,t=totals(i);
   if(!validDate(i.createdAt))warn(label,'Invoice date missing or invalid; excluded from year sales.');
   if(inYear(i.createdAt))sales.push({id:i.id,number:label,date:i.createdAt,customer:(db.clients||[]).find(c=>c.id===i.clientId)?.name||'',subtotal:t.sub-(t.discount||0),tax:t.tax,total:t.total,balance:Math.max(0,t.balance),discount:t.discount||0});
   for(const p of i.payments||[]){if(!validDate(p.date)){warn(label,'Payment date missing or invalid; excluded from year payments.');continue;}if(inYear(p.date))payments.push({source:label,date:p.date,amount:Math.round(Number(p.amount)||0),kind:p.sourceDepositId?'Job deposit transferred to invoice':'Payment'});}
   if(i.depositPaid){warn(label,'Legacy deposit has no separate payment date; excluded from dated payment totals.');}
  }
  for(const p of jobDeposits){if(!validDate(p.date)){warn(p.job?.title||p.id,'Job deposit date missing; excluded from payments.');continue;}if(inYear(p.date))payments.push({source:p.job?.title||p.id,date:p.date,amount:p.amount,kind:'Job deposit'});}
  for(const r of [...(db.expenses||[]).filter(r=>!r.deletedAt&&!receipts.some(p=>p.id===r.id)).map(r=>({...r,source:'Manual',hasImage:false})),...receipts.map(r=>({...r,source:'Receipt'}))]){
   if(!validDate(r.date)){warn(r.supplier||r.id,'Expense date missing or invalid.');continue;}
   if(!inYear(r.date))continue;
   if(!Number.isSafeInteger(r.total)||!Number.isSafeInteger(r.tax)||r.tax<0||r.total<r.tax){warn(r.supplier||r.id,'Invalid expense amount; excluded from totals.');continue;}
   expenses.push(r);if(!r.hasImage)warn(r.supplier||r.id,'Receipt photo missing.');if(r.category==='Other')warn(r.supplier||r.id,'Expense category needs review.');
  }
  const sum=(rows,key)=>rows.reduce((s,r)=>s+r[key],0);
  return {year,sales,payments,expenses,warnings,salesNet:sum(sales,'subtotal'),salesTax:sum(sales,'tax'),salesGross:sum(sales,'total'),received:sum(payments,'amount'),expenseGross:sum(expenses,'total'),expenseTax:sum(expenses,'tax'),expenseNet:expenses.reduce((n,r)=>n+r.total-r.tax,0),outstanding:sum(sales,'balance')};
 }
 const csv=rows=>'\ufeff'+rows.map(row=>row.map(v=>{let s=String(v??'');if(/^[\s]*[=+\-@]/.test(s)||/^[\t\r\n]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';}).join(',')).join('\r\n');
 return {categories,validDate,cents,expense,report,csv};
});
