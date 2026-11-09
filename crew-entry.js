/* Invitation persistence and workspace routing only. Crew access is always checked by the server. */
(function(root){
 'use strict';
 const KEY='qn_crew_invite',BACKUP='qn_crew_invite_pending_v2',TTL=7*86400000;
 const valid=t=>typeof t==='string'&&/^[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/.test(t);
 let pending=null;
 function set(token){if(!valid(token))return false;pending=token;try{sessionStorage.setItem(KEY,token);}catch{}try{localStorage.setItem(BACKUP,JSON.stringify({token,until:Date.now()+TTL}));}catch{}return true;}
 function get(){if(valid(pending))return pending;try{const t=sessionStorage.getItem(KEY);if(valid(t)){pending=t;return t;}}catch{}try{const s=JSON.parse(localStorage.getItem(BACKUP)||'null');if(s?.until>Date.now()&&valid(s.token)){pending=s.token;return pending;}}catch{}return null;}
 function clear(){pending=null;try{sessionStorage.removeItem(KEY);}catch{}try{localStorage.removeItem(BACKUP);}catch{}}
 function remember(id,value='crew'){if(id)try{localStorage.setItem('qn_entry_workspace_'+id,value);}catch{}}
 function preference(id){try{return localStorage.getItem('qn_entry_workspace_'+id);}catch{return null;}}
 function authReturn(){const url=new URL('/app.html'),t=get();url.searchParams.set('workspace','crew');if(t)url.searchParams.set('crew_invite',t);return url.href;}
 function redirect(){const url=new URL('/crew.html',location.origin),t=get();if(t)url.searchParams.set('crew_invite',t);for(const key of ['code','error','error_code','error_description','type']){const value=new URL(location.href).searchParams.get(key);if(value)url.searchParams.set(key,value);}if(location.hash&&!location.hash.startsWith('#invite='))url.hash=location.hash;root.qnCrewRedirecting=true;location.replace(url.href);return true;}
 async function routeUser(client,user){
  if(root.qnCompanyInvitation?.get())return false;
  if(new URL(location.href).searchParams.get('workspace')==='business'){remember(user.id,'business');return false;}
  if(get()||preference(user.id)==='crew'||(preference(user.id)!=='business'&&user.user_metadata?.qn_entry==='crew'))return redirect();
  // Also recover staff accounts created before the crew routing hint existed.
  try{const{data}=await client.auth.getSession();if(data.session?.user?.id!==user.id)return false;
   const r=await fetch('/api/crew',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify({action:'teams'}),cache:'no-store',signal:AbortSignal.timeout(8000)});
   if(!r.ok)return false;const result=await r.json();if(result.teams?.length){remember(user.id);return redirect();}
  }catch{}return false;
 }
 root.qnCrewEntry={valid,set,get,clear,remember,authReturn,routeUser};
 try{const url=new URL(location.href);if(url.searchParams.get('workspace')==='business')clear();const t=url.searchParams.get('crew_invite')||(url.pathname==='/crew.html'&&url.hash.startsWith('#invite=')?url.hash.slice(8):null);if(set(t)){url.searchParams.delete('crew_invite');if(url.hash.startsWith('#invite='))url.hash='';history.replaceState(history.state,'',url.href);}
  if(['/','/index.html','/app.html'].includes(url.pathname)&&url.searchParams.get('workspace')!=='business'&&!url.searchParams.has('company_invite')&&(get()||url.searchParams.get('workspace')==='crew'))redirect();
 }catch{}
})(window);
