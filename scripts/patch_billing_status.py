from pathlib import Path
for name in ("app.html", "index.html"):
    p=Path(name)
    if not p.exists(): continue
    s=p.read_text(encoding="utf-8")
    s=s.replace("Up to 3 quotes / month","Up to 10 quotes / month").replace("Up to 3 invoices / month","Up to 10 invoices / month").replace("$199.99","$149.99").replace("Save with monthly billing flexibility","Save compared with monthly billing")
    marker="window.qnSubscriptionStatus=()=>request('/api/stripe/status');"
    if marker in s and "window.qnRefreshSubscription=syncPro;" not in s:
        s=s.replace(marker,marker+"""
 let checking=false;
 async function syncPro(){
   if(checking)return;
   checking=true;
   try {
     const result=await request('/api/stripe/status');
     const el=document.getElementById('qn-pro-status');
     if(el)el.textContent=result.pro?'✓ Pro Active ('+result.status+')':'Subscription status: '+result.status;
     document.documentElement.dataset.qnPro=result.pro?'active':'free';
   } catch(e) {
     const el=document.getElementById('qn-pro-status');
     if(el)el.textContent='Subscription check: '+e.message;
   } finally { checking=false; }
 }
 const q=new URLSearchParams(location.search);
 if(q.has('checkout')){
   window.addEventListener('load',()=>setTimeout(syncPro,700));
   q.delete('checkout');q.delete('session_id');
   history.replaceState(history.state,'',location.pathname+(q.toString()?'?'+q:'')+location.hash);
 }
 document.addEventListener('click',e=>{
   if(e.target.closest('#qn-pro-refresh'))return;
   if(e.target.closest('#nav-more,[data-view="more"]'))setTimeout(syncPro,200);
 });
 document.addEventListener('visibilitychange',()=>{
   if(!document.hidden&&document.getElementById('qn-pro-status'))syncPro();
 });
 window.qnRefreshSubscription=syncPro;
""")
    p.write_text(s,encoding="utf-8")
