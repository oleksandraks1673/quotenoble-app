/* Delete one selected record and detach its links in the same saved change. */
(function(root){
  'use strict';
  const collections={job:'jobs',quote:'quotes',invoice:'invoices',customer:'clients'};
  function apply(db,kind,id){
    const key=collections[kind],record=db[key]?.find(x=>x.id===id);
    if(!record)throw Error('This record is no longer available.');
    const now=new Date().toISOString();
    if(kind==='customer'){
      for(const item of [...db.quotes,...db.invoices,...(db.jobs||[]),...Object.values(db.deletedJobPayments||{})])if(item.clientId===id){
        item.clientSnapshot=JSON.parse(JSON.stringify(record));
        if(db.jobs?.includes(item)&&!item.client)item.client=record.name;
      }
    }
    if(kind==='job'){
      // Keep received deposits in accounting even after their job is deleted.
      if((record.deposits||[]).length){
        db.deletedJobPayments=db.deletedJobPayments||{};
        db.deletedJobPayments[id]={id:record.id,title:record.title,client:record.client,clientId:record.clientId,clientSnapshot:record.clientSnapshot,deposits:record.deposits,deletedAt:now};
      }
      for(const q of db.quotes)if(q.extraWorkJobId===id){q.extraWorkJobId=null;q.updatedAtTime=now;}
      for(const i of db.invoices){if(i.jobId===id)i.jobId=null;if(i.extraWorkJobId===id)i.extraWorkJobId=null;}
      if(db.reports)delete db.reports[id];
    }
    if(kind==='quote'){
      for(const q of db.quotes)if(q.extraWorkParentQuoteId===id)q.extraWorkParentQuoteId=null;
      for(const i of db.invoices){if(i.quoteId===id)i.quoteId=null;if(i.extraWorkQuoteId===id)i.extraWorkQuoteId=null;}
      for(const j of db.jobs||[])if(j.quoteId===id)j.quoteId=null;
    }
    if(kind==='invoice'){
      for(const q of db.quotes)if(q.extraWorkParentInvoiceId===id)q.extraWorkParentInvoiceId=null;
      for(const q of db.quotes){
        if(q.sourceInvoiceId===id)delete q.sourceInvoiceId;
        if(q.status==='invoiced'&&q.id===record.quoteId&&!db.invoices.some(i=>i.id!==id&&i.quoteId===q.id)){
          q.status=q.customerApprovedSnapshot?'accepted':'draft';q.updatedAtTime=now;
        }
      }
      for(const j of db.jobs||[])if(j.invoiceId===id||j.id===record.jobId){
        j.invoiceId=null;if(j.flowStage==='Invoiced')j.flowStage='Completed';
      }
    }
    db.deletedRecords=db.deletedRecords||{};
    db.deletedRecords[key+':'+id]={deletedAt:now};
    db[key]=db[key].filter(x=>x.id!==id);
    if(db.photos){const prefix=kind==='quote'?'q:':kind==='invoice'?'i:':kind==='job'?'job:':null;if(prefix)delete db.photos[prefix+id];}
    return db;
  }
  if(typeof module==='object'&&module.exports){module.exports={apply};return;}
  root.qnDeleteRecord=async function(kind,id,button){
    if(button?.disabled)return false;
    if(button)button.disabled=true;
    const scope=LS_KEY;
    try{
      const record=DB[collections[kind]]?.find(x=>x.id===id);if(!record)return false;
      const messages={
        job:'Delete this job? Linked quotes, extra-work approvals, invoices and received deposits stay in your records. No money is refunded.',
        customer:'Delete this customer from your customer list? Existing documents and jobs keep their customer details.',
        quote:'Delete this quote? Linked jobs and invoices stay in your records. Any pending approval link will be disabled.',
        invoice:'Delete this invoice and its invoice payment records? Linked quotes, jobs and job deposits stay in your records. No money is refunded.'
      };
      if(!await qnConfirmDocumentDeletion(record.number||record.title||record.name||'',kind,messages[kind]))return false;
      if(LS_KEY!==scope)throw Error('Your account changed. Reopen the record and try again.');
      if(kind==='quote')await root.qnRevokeApprovalForDelete?.(id);
      if(LS_KEY!==scope)throw Error('Your account changed. Reopen the record and try again.');
      const previous=DB,next=apply(JSON.parse(JSON.stringify(DB)),kind,id);
      DB=next;
      try{
        save();
        if(root.qnSaveFailed)throw Error('The deletion could not be saved. Free some device storage and try again.');
      }catch(error){DB=previous;storage.save(previous);throw error;}
      closeModal();
      const active=document.querySelector('.view.active')?.id?.replace(/^view-/,'');
      if(active)showView(active);
      return true;
    }catch(error){qnAlert(error.message);return false;}
    finally{if(button)button.disabled=false;}
  };
})(typeof window==='undefined'?globalThis:window);
