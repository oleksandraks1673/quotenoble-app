(()=>{'use strict';if(window.QNEstimatorBridge)return;window.QNEstimatorBridge=true;
const KEY='qn_roof_estimate_pending_v1';let done=false,attempts=0;const load=()=>{try{return JSON.parse(sessionStorage.getItem(KEY)||'null')}catch(e){return null}};
function tryOpen(){if(done)return;const draft=load();if(!draft?.qnRoofEstimatorDraft||!Array.isArray(draft.items)||!draft.items.length)return;
 if(new URLSearchParams(location.search).get('roof-estimate')!=='review')return;
 if(!document.body?.classList.contains('qn-authenticated')||typeof openQuoteForm!=='function')return;
 try{
  if(!Array.isArray(DB?.clients))return;
  const legacy=draft.moneyUnit!=='cents';
  const items=draft.items.map(it=>({...it,qty:1,price:legacy?Math.round(Number(it.price)*100):Number(it.price)}));
  const taxRate=legacy?Math.round(Number(draft.taxRate)*100):Number(draft.taxRate);
  if(items.some(it=>!Number.isSafeInteger(it.price)||it.price<0)||!Number.isFinite(taxRate)||taxRate<0||taxRate>100)throw new Error('Invalid roof estimate amounts');
  const clientId=DB.clients.some(c=>c.id===draft.clientId)?draft.clientId:'';
  done=true;openQuoteForm(null,clientId,{...draft,items,taxRate,clientId,status:'draft',moneyUnit:'cents',estimateVersion:2});
  const body=document.getElementById('modal-body');
  if(body){const note=document.createElement('p');note.className='note';note.setAttribute('role','status');note.textContent='From Roof Design: each line is a complete project allowance (Qty 1), not a price per sq ft. Your entered markup is included. Check the customer, scope and totals before saving.';body.prepend(note);}
  sessionStorage.removeItem(KEY);
  const url=new URL(location.href);url.searchParams.delete('roof-estimate');history.replaceState(history.state,'',url.pathname+url.search+url.hash);
 }
 catch(e){done=false;console.error('Roof estimator quote handoff:',e)}
}
document.addEventListener('DOMContentLoaded',tryOpen);window.addEventListener('pageshow',tryOpen);
const timer=setInterval(()=>{attempts++;if(done||attempts>=50)clearInterval(timer);else tryOpen()},400);
})();
