from pathlib import Path

START = '<!-- QN BILLING V2 START -->'
END = '<!-- QN BILLING V2 END -->'
BLOCK = r'''<!-- QN BILLING V2 START -->
<script>
(function(){
  let current=null, busy=false;
  function el(id){return document.getElementById(id)}
  function install(){
    const more=el('view-more');
    if(more && !el('qn-billing-open')){
      const item=document.createElement('button');
      item.type='button';item.id='qn-billing-open';item.className='qn-more-item';
      item.style.cssText='width:100%;display:flex;align-items:center;gap:12px;text-align:left';
      item.innerHTML='<span class="qn-more-item-icon">▣</span><span><strong>Billing &amp; Subscription</strong><small>Current plan, status and payments</small></span><b style="margin-left:auto">›</b>';
      const section=more.querySelector('.qn-more-section-label');
      const menu=more.querySelector('.qn-more-menu');
      if(menu)menu.prepend(item);else if(section)section.after(item);else more.prepend(item);
    }
    if(!el('qn-billing-screen')){
      const overlay=document.createElement('div');
      overlay.id='qn-billing-screen';overlay.hidden=true;
      overlay.style.cssText='position:fixed;inset:0;z-index:99999;background:#f8f9fb;overflow:auto;padding:24px 16px 100px;color:#1f2937';
      overlay.innerHTML='<div style="max-width:650px;margin:auto"><button type="button" id="qn-billing-close" style="border:0;background:none;font-size:16px;padding:12px 0;cursor:pointer">← Back to Quote.Noble</button><h1 style="margin:10px 0 20px">Billing &amp; Subscription</h1><div style="background:white;padding:24px;border:1px solid #e5e7eb;border-radius:18px"><div style="font-size:14px;color:#6b7280">CURRENT PLAN</div><h2 id="qn-billing-plan" style="margin:8px 0">Checking subscription…</h2><p id="qn-billing-detail" role="status" aria-live="polite">Contacting Stripe securely</p><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:18px"><button type="button" id="qn-billing-check" class="btn btn-outline">Check Subscription</button><button type="button" id="qn-billing-portal" class="btn btn-primary" hidden>Manage Subscription</button></div></div><p style="color:#6b7280;font-size:13px;margin-top:15px">Subscription status is verified through Stripe. No new payment is needed to check your plan.</p></div>';
      document.body.append(overlay);
    }
  }
  function display(d){
    current=d;
    if(!el('qn-billing-plan'))return;
    const pro=d.pro===true || d.is_pro===true;
    el('qn-billing-plan').textContent=pro?'Pro Active':d.status==='none'?'Free':'Subscription: '+(d.status||'unknown');
    const bits=[pro?(d.plan==='yearly'?'Yearly plan':'Monthly plan'):'Stripe status: '+(d.status||'none')];
    if(d.current_period_end)bits.push('Period ends '+new Date(d.current_period_end*1000).toLocaleDateString());
    if(d.cancel_at_period_end)bits.push('Cancellation scheduled');
    el('qn-billing-detail').textContent=bits.join(' · ');
    el('qn-billing-portal').hidden=!d.subscription_id&&!pro;
  }
  async function check(){
    install();
    if(busy)return;
    busy=true;
    el('qn-billing-detail').textContent='Checking Stripe subscription…';
    try{
      if(typeof window.qnSubscriptionStatus!=='function')throw Error('Billing connection unavailable');
      display(await window.qnSubscriptionStatus());
    }catch(e){
      el('qn-billing-plan').textContent='Unable to verify';
      el('qn-billing-detail').textContent=e.message||'Please sign in and retry';
      el('qn-billing-portal').hidden=true;
    }finally{busy=false}
  }
  function open(){install();el('qn-billing-screen').hidden=false;check()}
  document.addEventListener('click',function(e){
    if(e.target.closest('#qn-billing-open')){e.preventDefault();open()}
    if(e.target.closest('#qn-billing-close')){e.preventDefault();el('qn-billing-screen').hidden=true}
    if(e.target.closest('#qn-billing-check')){e.preventDefault();check()}
    if(e.target.closest('#qn-billing-portal')){
      e.preventDefault();const portal=el('cloud-portal');if(portal)portal.click();else alert('Billing portal unavailable');
    }
  });
  document.addEventListener('DOMContentLoaded',install);
  window.addEventListener('load',install);
  window.qnOpenBilling=open;
  if(new URLSearchParams(location.search).get('checkout')==='success'){
    window.addEventListener('load',()=>setTimeout(open,1200));
  }
})();
</script>
<!-- QN BILLING V2 END -->'''

for name in ('index.html', 'app.html'):
    p=Path(name)
    if not p.exists():continue
    s=p.read_text(encoding='utf-8')
    if START in s and END in s:
        a=s.index(START);b=s.index(END,a)+len(END)
        s=s[:a]+s[b:]
    if '</body>' not in s:raise RuntimeError(name+' missing body closing tag')
    s=s.replace('</body>',BLOCK+'\n</body>')
    p.write_text(s,encoding='utf-8')
