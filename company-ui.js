/* Separate logins, one selected company's saved workspace. */
(()=>{
 'use strict';
 let actor=null,sb=null,workspaces=[],invitations=[],dialog=null,requestGeneration=0;
 const storageKey=id=>'qn_company_owner_'+id;
 const explicitKey=id=>'qn_company_choice_'+id;
 const localKey=(id,owner)=>'quotenoble_user_'+id+(owner===id?'':'_company_'+owner);
 const uuid=x=>typeof x==='string'&&/^[0-9a-f-]{36}$/i.test(x);
 const read=key=>{try{return localStorage.getItem(key);}catch{return null;}};
 const write=(key,value)=>{try{localStorage.setItem(key,value);}catch{throw Error('Unable to save the selected company on this phone.');}};
 const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const russian={
  'Choose the company you were invited to join.':'Выберите компанию, в которую вас пригласили.',
  'Joining company…':'Подключаемся к компании…',
  'Company joined. Opening your workspace…':'Вы присоединились к компании. Открываем рабочее пространство…',
  'Unable to connect. Try again. Your invitation is kept.':'Не удалось подключиться. Попробуйте снова. Приглашение сохранено.',
  'Company access is temporarily unavailable. Try again. Your invitation is kept.':'Доступ к компании временно недоступен. Попробуйте снова. Приглашение сохранено.',
  'Checking invitation…':'Проверяем приглашение…',
  'Try again':'Попробовать снова',
  'Dismiss invitation':'Скрыть приглашение',
  'Invited email':'Email приглашения',
  'Signed in as':'Вы вошли как',
  'Switch account':'Сменить аккаунт',
  'This invitation is for your partner. Open it using the invited email.':'Это приглашение для партнёра. Откройте его через указанный email.',
  'Sign in with the email address shown on this invitation.':'Войдите через email, указанный в приглашении.',
  'Other companies':'Другие компании',
  'Open company':'Открыть компанию',
  'Your company':'Ваша компания',
  'Use your own login to work together in this company.':'Войдите через свой аккаунт, чтобы работать вместе в этой компании.',
  'Each partner signs in separately. Company quotes, invoices, customers and jobs are shared.':'У каждого партнёра свой логин. Сметы, счета, клиенты и работы компании — общие.',
  'The partner uses their own login and your company’s Ultimate access. Billing stays with the owner.':'Партнёр входит через свой аккаунт и пользуется Ultimate вашей компании. Оплатой управляет владелец.',
  'You have full access to this company’s Ultimate tools. The owner manages billing and partner invitations.':'Вам доступны все Ultimate-инструменты компании. Оплатой и приглашениями партнёров управляет владелец.',
  'Join the shared company with your own account. Your personal company data will stay separate.':'Войдите в общую компанию через свой аккаунт. Ваши личные данные компании останутся отдельно.',
  'Send this link to your partner. It expires in 7 days and only works with the invited email.':'Отправьте ссылку партнёру. Она действует 7 дней и только для указанного email.',
  'Save or close your open form before switching company.':'Сохраните или закройте форму перед переключением компании.',
  'Some changes are saved only on this device. They will remain in this company’s local copy.':'Некоторые изменения пока сохранены только на этом устройстве. Они останутся в локальной копии этой компании.',
  'Company Ultimate access · billing managed by the owner':'Ultimate компании · оплатой управляет владелец',
  'Managed by company owner':'Управляет владелец компании',
  'The company owner needs an active Ultimate subscription.':'Владельцу компании нужна активная подписка Ultimate.',
  'Company partners are included with the owner’s active Ultimate subscription.':'Партнёры компании доступны с активной Ultimate-подпиской владельца.',
  'Loading…':'Загрузка…','Creating invitation…':'Создаём приглашение…','Invitation ready.':'Приглашение готово.',
  'Link copied.':'Ссылка скопирована.','Copy the selected invitation link.':'Скопируйте выделенную ссылку.',
  'Remove this partner’s access to the company?':'Отключить этому партнёру доступ к компании?',
  'Please sign in again.':'Войдите в аккаунт заново.',
  'Invitation expired or revoked.':'Приглашение истекло или было отменено.',
  'Invitation unavailable.':'Приглашение недоступно.',
  'Sign in with the verified email address on this invitation.':'Войдите через указанный в приглашении email и подтвердите этот адрес.',
  'This partner already has access.':'У этого партнёра уже есть доступ.',
  'Verify your email before inviting a partner.':'Подтвердите свой email перед приглашением партнёра.',
  'Enter your partner’s email address.':'Введите email партнёра.',
  'Company access is unavailable or was revoked.':'Доступ к компании недоступен или был отключён.',
  'Company access is temporarily unavailable. Your device copy is kept.':'Доступ к компании временно недоступен. Копия на телефоне сохранена.'
 };
 const T=value=>window.qnLanguage?.get()==='ru'&&russian[value]?russian[value]:window.qnLanguage?.translate(value)||value;
 const api=async body=>{
  if(!sb)throw Error(T('Please sign in again.'));
  const {data,error}=await sb.auth.getSession();if(error||!data?.session?.access_token)throw Error(T('Please sign in again.'));
  let response;
  try{response=await fetch('/api/company',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+data.session.access_token},body:JSON.stringify(body),cache:'no-store',...(typeof AbortSignal!=='undefined'&&AbortSignal.timeout?{signal:AbortSignal.timeout(28000)}:{})});}
  catch(error){throw Error(T(['TimeoutError','AbortError'].includes(error.name)?'Joining is taking longer than expected. Try again. Your invitation is kept.':'Unable to connect. Try again. Your invitation is kept.'));}
  let result;try{result=await response.json();}catch{throw Error(T('Company access is temporarily unavailable. Try again. Your invitation is kept.'));}
  if(!response.ok)throw Object.assign(Error(T(result.error||'Company access is temporarily unavailable.')),{status:response.status,stale:result.stale===true});return result;
 };
 // Add company context only to this app's authenticated feature APIs.
 const originalFetch=window.fetch.bind(window);
 window.fetch=(input,init)=>{
  const url=new URL(typeof input==='string'?input:input.url,location.href);
  const company=window.qnCompanySession;
  if(url.origin===location.origin&&/^\/api\/(approvals|voice-quote|crew|purchases|stripe\/(status|portal|checkout))\/?$/.test(url.pathname)&&company?.ownerId){
   const headers=new Headers(init?.headers||(typeof input==='object'?input.headers:undefined));headers.set('x-qn-company',company.ownerId);return originalFetch(input,{...init,headers});
  }
  return originalFetch(input,init);
 };
 window.qnCompanyResolve=async(client,user)=>{
  sb=client;actor=user;const generation=++requestGeneration;
  const selected=read(storageKey(user.id));
  // Separate local copies before any network request; never seed shared data
  // with the personal company's records, even when this phone is offline.
  const candidate=uuid(selected)?selected:user.id;
  window.qnCompanySession={ownerId:candidate,actorId:user.id,isOwner:candidate===user.id,shared:candidate!==user.id};
  const key='quotenoble_user_'+user.id+(candidate===user.id?'':'_company_'+candidate);
  if(LS_KEY!==key){LS_KEY=key;const loaded=await QNInspectionPhotos.hydrate(storage.load()||seedDB(),LS_KEY);if(generation!==requestGeneration)throw Error('Your account changed.');DB=loaded;if(!storage.save(DB))throw Error('Saved photos could not be opened safely. Retry without clearing site data.');}
  let result;
  try{result=await api({action:'list'});}catch(e){if(candidate!==user.id||pendingInvite())throw e;result={workspaces:[{ownerId:user.id,isOwner:true,name:DB.profile?.businessName||'My own business',shared:false}]};}
  if(generation!==requestGeneration)throw Error('Your account changed.');
  workspaces=result.workspaces;
  invitations=Array.isArray(result.invitations)?result.invitations:[];
  // Invitations belong to this verified login, even when the link was opened
  // in another browser. Acceptance still requires an explicit Join click.
  if(invitations.length===1){
   const current=pendingInvite(),fresh=invitations[0].token;
   if(!current||current.split('.')[0]===String(fresh).split('.')[0])rememberInvite(fresh);
  }
  const joined=workspaces.filter(w=>!w.isOwner);
  // A sole invited company is the default, including on a new phone.
  // An intentional later choice is remembered, never inferred from legacy storage.
  let workspace=workspaces.find(w=>w.ownerId===candidate);
  const explicit=read(explicitKey(user.id));
  if(joined.length===1&&!explicit)workspace=joined[0];
  if(!workspace)workspace=workspaces.find(w=>w.ownerId===user.id);
  if(!workspace)throw Error('Company workspace unavailable.');
  const resolvedKey=localKey(user.id,workspace.ownerId);
  if(LS_KEY!==resolvedKey){LS_KEY=resolvedKey;const loaded=await QNInspectionPhotos.hydrate(storage.load()||seedDB(),LS_KEY);if(generation!==requestGeneration)throw Error('Your account changed.');DB=loaded;if(!storage.save(DB))throw Error('Saved photos could not be opened safely. Retry without clearing site data.');}
  write(storageKey(user.id),workspace.ownerId);
  window.qnCompanySession={...workspace,actorId:user.id};
  return window.qnCompanySession;
 };
 window.qnCompanyRead=async(ownerId,revision=false)=>{
  const data=await api({action:revision?'revision':'read',ownerId});return data.row;
 };
 window.qnCompanyWrite=async(ownerId,payload,expectedAt)=>{
  // Write large shared-company documents directly through a secured RPC.
  // The server enforces actor membership and optimistic concurrency.
  if(!sb||!actor?.id)throw Error('Please sign in again to save this company.');
  const {data,error}=await sb.rpc('qn_company_write_large',{
   p_owner_id:ownerId,p_payload:payload,p_expected_at:expectedAt||null
  });
  if(error){
   if(/QN_DOCUMENT_CONFLICT/.test(error.message||''))throw Error('QN_DOCUMENT_CONFLICT');
   throw Error('Company cloud save failed: '+(error.message||'Unknown error'));
  }
  if(!data?.updated_at)throw Error('Company save was not confirmed. Your device copy is safe.');
  return data;
 };
 function open(title,content){
  dialog?.close();const d=document.createElement('dialog');d.className='qn-company-dialog';
  d.innerHTML='<div class="qn-company-heading"><h2 data-qn-i18n>'+esc(T(title))+'</h2><button class="btn btn-outline" data-company-close type="button">'+esc(T('Close'))+'</button></div>'+content;
  d.querySelector('[data-company-close]').onclick=()=>d.close();
  d.addEventListener('close',()=>{d.remove();if(dialog===d)dialog=null;});document.body.appendChild(d);d.showModal();window.qnTrackDialog?.(d,title==='Company & partners'?manage:undefined);dialog=d;return d;
 }
 async function switchCompany(ownerId){
  if(!workspaces.some(w=>w.ownerId===ownerId)||!actor)throw Error('Company access unavailable.');
  if(document.querySelector('#modal-root .modal'))throw Error(T('Save or close your open form before switching company.'));
  try{await window.qnCloudFlush?.();}catch{qnAlert(T('Some changes are saved only on this device. They will remain in this company’s local copy.'));}
  write(explicitKey(actor.id),ownerId);write(storageKey(actor.id),ownerId);location.reload();
 }
 async function manage(){
  if(!actor){qnAlert(T('Please sign in again.'));return;}
  if(pendingInvite()||invitations.length){await window.qnCompanyAfterConnect({force:true});return;}
  const d=open('Company & partners','<p data-company-message role="status">'+esc(T('Loading…'))+'</p>');
  const generation=requestGeneration;
  const message=value=>{if(d.isConnected)d.querySelector('[data-company-message]').textContent=T(value);};
  try{
   const list=await api({action:'list'});if(generation!==requestGeneration||!d.isConnected)return;workspaces=list.workspaces;
   const current=window.qnCompanySession||{ownerId:actor.id,isOwner:true};
   const members=current.isOwner?await api({action:'members',ownerId:current.ownerId}):{members:[]};
   if(generation!==requestGeneration||!d.isConnected)return;
   d.innerHTML='<div class="qn-company-heading"><h2 data-qn-i18n>'+esc(T('Company & partners'))+'</h2><button class="btn btn-outline" data-company-close>'+esc(T('Close'))+'</button></div><p data-qn-i18n>'+esc(T('Each partner signs in separately. Company quotes, invoices, customers and jobs are shared.'))+'</p><div class="qn-company-current"><strong data-qn-no-translate>'+esc(workspaces.find(w=>w.ownerId===current.ownerId)?.name||DB.profile?.businessName||T('Your company'))+'</strong><small data-qn-i18n>'+esc(T(current.isOwner?'Owner':'Partner'))+'</small></div>'+
   (current.isOwner?'<hr><h3 data-qn-i18n>'+esc(T('Invite partner'))+' <span class="qn-partner-pro">ULTIMATE</span></h3><p data-qn-i18n>'+esc(T('The partner uses their own login and your company’s Ultimate access. Billing stays with the owner.'))+'</p><label for="qn-partner-email" data-qn-i18n>'+esc(T('Partner email'))+'</label><input id="qn-partner-email" type="email" autocomplete="off" placeholder="partner@example.com"><button class="btn btn-primary" data-company-invite>'+esc(T('Create invitation link'))+'</button><div data-company-link></div><h3 data-qn-i18n>'+esc(T('Partners'))+'</h3>'+members.members.map(m=>'<div class="qn-company-member"><div><strong data-qn-no-translate>'+esc(m.email)+'</strong><small>'+esc(T(m.status==='active'?'Active':m.status==='invited'?'Invited':'Revoked'))+'</small></div>'+(m.status!=='revoked'?'<button class="btn btn-outline" data-company-revoke="'+esc(m.id)+'">'+esc(T('Remove access'))+'</button>':'')+'</div>').join(''):'<p data-qn-i18n>'+esc(T('You have full access to this company’s Ultimate tools. The owner manages billing and partner invitations.'))+'</p>')+(workspaces.length>1?'<details class="qn-company-others"><summary data-qn-i18n>'+esc(T('Other companies'))+'</summary><select data-company-select aria-label="'+esc(T('Other companies'))+'">'+workspaces.map(w=>'<option value="'+esc(w.ownerId)+'"'+(w.ownerId===current.ownerId?' selected':'')+'>'+esc(w.name)+'</option>').join('')+'</select><button class="btn btn-outline" data-company-switch>'+esc(T('Open company'))+'</button></details>':'')+'<p data-company-message role="status"></p>';
   d.querySelector('[data-company-close]').onclick=()=>d.close();
   const switchButton=d.querySelector('[data-company-switch]');if(switchButton)switchButton.onclick=async e=>{e.currentTarget.disabled=true;try{await switchCompany(d.querySelector('[data-company-select]').value);}catch(err){message(err.message);e.currentTarget.disabled=false;}};
   d.querySelector('[data-company-invite]')?.addEventListener('click',async e=>{
    if(!window.qnRequirePro?.('Company partners'))return;
    const email=d.querySelector('#qn-partner-email');if(!email.reportValidity()||!email.value.trim())return;const button=e.currentTarget;button.disabled=true;message('Creating invitation…');
    try{const result=await api({action:'invite',ownerId:current.ownerId,email:email.value.trim()});if(generation!==requestGeneration||!d.isConnected)return;
     const box=d.querySelector('[data-company-link]');box.innerHTML='<label data-qn-i18n>'+esc(T('Invitation link'))+'</label><input data-link readonly value="'+esc(result.link)+'"><button class="btn btn-outline" data-copy>'+esc(T('Copy link'))+'</button><p data-qn-i18n>'+esc(T('Send this link to your partner. It expires in 7 days and only works with the invited email.'))+'</p>';
     box.querySelector('[data-copy]').onclick=async()=>{try{await navigator.clipboard.writeText(result.link);message('Link copied.');}catch{box.querySelector('[data-link]').select();message('Copy the selected invitation link.');}};message('Invitation ready.');
    }catch(err){message(err.message);}finally{button.disabled=false;}
   });
   d.querySelectorAll('[data-company-revoke]').forEach(button=>button.onclick=async()=>{
    if(!await qnConfirm(T('Remove this partner’s access to the company?')))return;button.disabled=true;
    try{await api({action:'revoke',ownerId:current.ownerId,id:button.dataset.companyRevoke});await manage();}catch(err){message(err.message);button.disabled=false;}
   });
  }catch(e){message(e.message);}
 }
 const pendingInvite=()=>{try{return window.qnCompanyInvitation?.get()||sessionStorage.getItem('qn_company_invite')||null;}catch{return null;}};
 const rememberInvite=token=>{if(typeof token!=='string'||!/^[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/.test(token))return;if(window.qnCompanyInvitation)window.qnCompanyInvitation.set(token);else{try{sessionStorage.setItem('qn_company_invite',token);}catch{}}};
 const clearInvite=()=>{if(window.qnCompanyInvitation)window.qnCompanyInvitation.clear();else{try{sessionStorage.removeItem('qn_company_invite');}catch{}}};
 let invitationTask=null,lastInvitationKey=null;
 window.qnCompanyAfterConnect=({force=false}={})=>{
  if(!actor)return Promise.resolve();
  const token=pendingInvite();
  if(!token){
   if(invitations.length&& (force||lastInvitationKey!==actor.id+':choose')){
    lastInvitationKey=actor.id+':choose';
    const chooser=open('Join company','<p>'+esc(T('Choose the company you were invited to join.'))+'</p>'+invitations.map((item,index)=>'<button type="button" class="btn btn-primary" data-pending-invitation="'+index+'">'+esc(item.name)+'</button>').join(''));
    chooser.querySelectorAll('[data-pending-invitation]').forEach(button=>button.onclick=()=>{rememberInvite(invitations[Number(button.dataset.pendingInvitation)].token);window.qnCompanyAfterConnect({force:true});});
   }
   return Promise.resolve();
  }
  const key=actor.id+':'+token;
  if(invitationTask?.key===key)return invitationTask.promise;
  if(!force&&lastInvitationKey===key)return Promise.resolve();
  lastInvitationKey=key;
  const generation=requestGeneration,user=actor;
  const d=open('Join company','<p role="status" data-company-message>'+esc(T('Checking invitation…'))+'</p>');
  const renderError=err=>{
   if(generation!==requestGeneration||actor?.id!==user.id)return;
   const terminal=[404,410].includes(err.status);
   if(terminal){clearInvite();invitations=invitations.filter(item=>item.token!==token);}
   const message=err.message;
   if(!d.isConnected||generation!==requestGeneration)return;
   if(terminal&&!force&&workspaces.some(w=>!w.isOwner)){d.close();return;}
   d.innerHTML='<h2>'+esc(T('Join company'))+'</h2><p role="status" data-company-message>'+esc(T(message))+'</p>'+(terminal?'':'<button type="button" class="btn btn-primary" data-invite-retry>'+esc(T('Try again'))+'</button>')+'<button type="button" class="btn btn-outline" data-invite-close>'+esc(T('Close'))+'</button><button type="button" class="btn btn-outline" data-invite-dismiss>'+esc(T('Dismiss invitation'))+'</button>';
   const retry=d.querySelector('[data-invite-retry]');if(retry)retry.onclick=()=>window.qnCompanyAfterConnect({force:true});
   d.querySelector('[data-invite-close]').onclick=()=>d.close();
   d.querySelector('[data-invite-dismiss]').onclick=()=>{clearInvite();lastInvitationKey=null;d.close();};
  };
  const promise=(async()=>{
   try{
    const info=await api({action:'info',token});if(generation!==requestGeneration||!d.isConnected)return;
    if(workspaces.some(w=>!w.isOwner&&w.ownerId===info.ownerId)){clearInvite();invitations=invitations.filter(item=>item.token!==token);d.close();return;}
    const wrongOwner=info.ownerId===user.id;
    const wrongEmail=!!user.email&&String(user.email).trim().toLowerCase()!==String(info.email).toLowerCase();
    const wrong=wrongOwner||wrongEmail;
    d.innerHTML='<div class="qn-company-heading"><h2>'+esc(T('Join company'))+'</h2><button class="btn btn-outline" data-invite-close>'+esc(T('Close'))+'</button></div><h3 data-qn-no-translate>'+esc(info.name)+'</h3><p>'+esc(T('Use your own login to work together in this company.'))+'</p><p>'+esc(T('Invited email'))+': <strong data-qn-no-translate>'+esc(info.email)+'</strong></p>'+(user.email?'<p>'+esc(T('Signed in as'))+': <span data-qn-no-translate>'+esc(user.email)+'</span></p>':'')+
     (wrong?'<p role="status">'+esc(T(wrongOwner?'This invitation is for your partner. Open it using the invited email.':'Sign in with the email address shown on this invitation.'))+'</p><button type="button" class="btn btn-primary" data-invite-account>'+esc(T('Switch account'))+'</button>':'<button type="button" class="btn btn-primary" data-join>'+esc(T('Join company'))+'</button>')+'<p role="status" data-company-message></p><button type="button" class="btn btn-outline" data-invite-dismiss>'+esc(T('Dismiss invitation'))+'</button>';
    d.querySelector('[data-invite-close]').onclick=()=>d.close();
    d.querySelector('[data-invite-dismiss]').onclick=()=>{clearInvite();lastInvitationKey=null;d.close();};
    const switchButton=d.querySelector('[data-invite-account]');
    if(switchButton)switchButton.onclick=async()=>{
     switchButton.disabled=true;
     try{const {error}=await sb.auth.signOut();if(error)throw error;location.assign(window.qnCompanyInvitation?.authReturn()||'/app.html?company_invite='+encodeURIComponent(token));}
     catch(err){d.querySelector('[data-company-message]').textContent=T(err.message);switchButton.disabled=false;}
    };
    const join=d.querySelector('[data-join]');
    if(join)join.onclick=async()=>{
     join.disabled=true;
     d.querySelector('[data-company-message]').textContent=T('Joining company…');
     try{
      const result=await api({action:'accept',token});if(actor?.id!==user.id)return;
      if(!uuid(result.ownerId))throw Error('Company access is temporarily unavailable. Try again.');
      write(explicitKey(user.id),result.ownerId);write(storageKey(user.id),result.ownerId);
      if(d.isConnected)d.querySelector('[data-company-message]').textContent=T('Company joined. Opening your workspace…');
      clearInvite();location.assign('/app.html');
     }catch(err){d.querySelector('[data-company-message]').textContent=T(err.message);join.disabled=false;}
    };
   }catch(err){renderError(err);}
  })().finally(()=>{if(invitationTask?.promise===promise)invitationTask=null;});
  invitationTask={key,promise};return promise;
 };
 const button=document.createElement('button');button.type='button';button.className='qn-more-item';button.dataset.qnCompanyOpen='';button.innerHTML='<span class="qn-more-item-icon">♧</span><span><strong data-qn-i18n>Company & partners</strong><small data-qn-i18n>One company, separate logins</small><span class="qn-partner-pro">ULTIMATE</span></span><b>›</b>';
 if(!document.querySelector('#view-more [data-qn-company-open]'))document.querySelector('#view-more .qn-more-menu')?.appendChild(button);
 document.addEventListener('click',e=>{if(e.target.closest('[data-qn-company-open]'))manage();});
 document.addEventListener('qn-billing-status-loaded',event=>{
  if(!event.detail.companyPartner)return;
  const owner=window.qnCompanySession?.ownerId;
  queueMicrotask(()=>{
   if(owner!==window.qnCompanySession?.ownerId)return;
   const status=document.getElementById('qn-billing-status');if(status)status.textContent=T(event.detail.pro?'Company Ultimate access · billing managed by the owner':'The company owner needs an active Ultimate subscription.');
   const options=document.getElementById('qn-plan-options');if(options){options.hidden=true;options.style.display='none';}
   const action=document.getElementById('qn-plan-continue');if(action){action.textContent=T('Managed by company owner');action.disabled=true;}
  });
 });
})();
