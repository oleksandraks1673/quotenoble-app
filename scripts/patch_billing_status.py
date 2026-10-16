from pathlib import Path

PATCH = r"""
<script>
/* Quote.Noble: visible, server-verified billing controls */
(function(){
  let busy=false, last=null;
  function mount(){
    for(const [hostId,panelId] of [['view-plans','qn-plans-billing'],['membership-card','qn-membership-billing']]){
      const host=document.getElementById(hostId);
      if(!host||document.getElementById(panelId))continue;
      const panel=document.createElement('div');
      panel.id=panelId;
      panel.className='card';
      panel.style.cssText='margin:18px 0;padding:20px;border:1px solid #e5e7eb;border-radius:18px;background:#fff;text-align:left';
      panel.innerHTML='<h2 style="margin:0 0 12px">Current subscription</h2><p class="qn-billing-result" role="status" aria-live="polite">Checking subscription…</p><div class="btn-row" style="display:flex;flex-wrap:wrap;gap:10px"><button type="button" class="btn btn-outline qn-billing-refresh">Check Subscription</button><button type="button" class="btn btn-primary qn-billing-manage" style="display:none">Manage Subscription</button></div>';
      if(hostId==='view-plans')host.prepend(panel);else host.append(panel);
    }
    if(last)show(last);
  }
  function show(data){
    last=data;
    const active=data.pro===true;
    const label=active?'Pro Active — '+(data.plan==='yearly'?'Yearly':'Monthly'):(data.status==='none'?'Free plan':'Subscription: '+(data.status||'unknown'));
    const date=data.current_period_end?' · Period ends '+new Date(data.current_period_end*1000).toLocaleDateString():'';
    document.querySelectorAll('.qn-billing-result').forEach(el=>el.textContent=label+date+(data.cancel_at_period_end?' · Cancellation scheduled':''));
    document.querySelectorAll('.qn-billing-manage').forEach(el=>el.style.display=data.subscription_id||active?'inline-flex':'none');
    const start=document.getElementById('qn-pro-start');
    if(start){start.disabled=active;start.textContent=active?'Pro subscription active':'Choose Pro plan';}
  }
  async function refresh(){
    mount();
    if(busy||typeof window.qnSubscriptionStatus!=='function')return;
    busy=true;
    try{show(await window.qnSubscriptionStatus());}
    catch(e){document.querySelectorAll('.qn-billing-result').forEach(el=>el.textContent='Unable to verify subscription: '+e.message);}
    finally{busy=false;}
  }
  document.addEventListener('click',e=>{
    if(e.target.closest('.qn-billing-refresh')){refresh();return;}
    if(e.target.closest('.qn-billing-manage')){document.getElementById('cloud-portal')?.click();return;}
    if(e.target.closest('[data-action="view-plans"],[data-view="more"],[data-qn-more-panel],#qn-more-membership'))setTimeout(refresh,350);
  });
  window.addEventListener('focus',()=>{if(document.querySelector('#view-plans.active,#qn-more-membership:not([hidden])'))refresh();});
  document.addEventListener('DOMContentLoaded',()=>{mount();setTimeout(refresh,1500);});
  if(new URLSearchParams(location.search).has('checkout')){
    window.addEventListener('load',()=>setTimeout(refresh,1700));
    const url=new URL(location.href);url.searchParams.delete('checkout');url.searchParams.delete('session_id');history.replaceState(history.state,'',url.pathname+url.search+url.hash);
  }
  window.qnRefreshSubscription=refresh;
})();
</script>
"""

for name in ('index.html','app.html'):
    p=Path(name)
    if not p.exists():
        continue
    s=p.read_text(encoding='utf-8')
    s=s.replace('Up to 3 quotes / month','Up to 10 quotes / month').replace('Up to 3 invoices / month','Up to 10 invoices / month').replace('$199.99','$149.99')
    if 'qn-plans-billing' not in s and '</body>' in s:
        s=s.replace('</body>',PATCH+'\n</body>')
    p.write_text(s,encoding='utf-8')
