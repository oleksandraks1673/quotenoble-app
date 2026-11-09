(function(){
 'use strict';
 const C=window.QNCrew,E=C.esc,$=id=>document.getElementById(id),URL_BASE='https://jssfjaggsjtwppokjpns.supabase.co';
 let user=null,mode='login',teams=[],jobs=[],selected=null,readOnly=false,busy=false,epoch=0,pendingPhoto=null;
 const say=text=>{$('crew-message').textContent=text;};
 const entry=window.qnCrewEntry;
 let invite=entry?.get()||'';
 if(!window.supabase?.createClient){say('Sign-in could not load. Check your connection and refresh.');return;}
 const sb=C.client=window.supabase.createClient(URL_BASE,'sb_publishable_9Nr32yruSbg_VXyZiowqJA_BynvkOCt');
 function setMode(next){
  mode=next;const signup=mode==='signup',reset=mode==='reset',password=mode==='password';
  $('crew-auth-title').textContent=signup?'Create your crew login':reset?'Reset password':password?'Choose a new password':'Sign in to your crew';
  $('crew-auth-submit').textContent=signup?'Create account':reset?'Send reset email':password?'Update password':'Sign in';
  $('crew-auth-email').disabled=password;$('crew-auth-email').required=!password;
  $('crew-auth-password').disabled=reset;$('crew-auth-password').required=!reset;$('crew-auth-password').autocomplete=signup||password?'new-password':'current-password';
  $('crew-auth-switch').textContent=mode==='login'?'New here? Create an account':'Back to sign in';$('crew-auth-reset').hidden=mode!=='login';
  $('crew-auth-switch').hidden=password;say('');
 }
 function clearWork(){$('crew-business-name').textContent='Crew workspace';$('crew-workspace-title').textContent='Your work';epoch++;jobs=[];teams=[];selected=null;pendingPhoto=null;$('crew-jobs').replaceChildren();$('crew-job-detail').replaceChildren();$('crew-job-detail').hidden=true;$('crew-workspace').hidden=true;C.closePhoto();}
 async function loadTeams(){
  if(!user)return;const request=++epoch;
  try{
   const data=await C.api({action:'teams'});if(request!==epoch)return;
   teams=data.teams;const previous=$('crew-team').value;
   $('crew-team').innerHTML=teams.map(t=>'<option value="'+t.id+'">'+E(t.name)+'</option>').join('');
   if(teams.some(t=>t.id===previous))$('crew-team').value=previous;
   $('crew-workspace').hidden=!teams.length;$('crew-invitation').hidden=!invite;
   if(!teams.length){jobs=[];$('crew-jobs').replaceChildren();$('crew-job-detail').hidden=true;say(invite?'Ready to join your crew.':'No active crew yet. Ask your business owner for an invitation link.');return;}
   await loadJobs();
  }catch(e){if(request===epoch){clearWork();say(e.message);}}
 }
 async function loadJobs(){
  const ownerId=$('crew-team').value;if(!ownerId||!user)return;
  const request=++epoch;
  try{
   const data=await C.api({action:'jobs',ownerId});if(request!==epoch)return;
   const previous=JSON.stringify(jobs.find(j=>j.id===selected)),previousReadOnly=readOnly;
   $('crew-business-name').textContent=data.businessName||teams.find(t=>t.id===ownerId)?.name||'Crew workspace';
   $('crew-workspace-title').textContent=data.businessName||'Your work';
   jobs=data.jobs;readOnly=data.readOnly;$('crew-readonly').hidden=!readOnly;
   $('crew-readonly').textContent=data.planError?'Plan status is unavailable. Work can be viewed; refresh before making updates.':'This workspace is read-only until the owner’s Pro plan is active.';
   $('crew-jobs').innerHTML=jobs.length?jobs.map(j=>'<button type="button" class="qn-crew-job-card" data-job="'+E(j.id)+'"><span><strong>'+E(j.title)+'</strong><small>'+E(j.customer.name||'Customer')+' · '+E(j.date||'Date not set')+'</small></span><span class="qn-crew-tag">'+E(j.status)+'</span></button>').join(''):'<div class="qn-crew-card"><h2>No jobs assigned yet</h2><p>Your owner can assign work from the Jobs section.</p></div>';
   $('crew-jobs').querySelectorAll('[data-job]').forEach(b=>b.onclick=()=>{selected=b.dataset.job;pendingPhoto=null;drawJob();$('crew-job-detail').scrollIntoView({behavior:'smooth',block:'start'});});
   if(selected&&jobs.some(j=>j.id===selected)){if(previous!==JSON.stringify(jobs.find(j=>j.id===selected))||previousReadOnly!==readOnly)drawJob();}else{$('crew-job-detail').hidden=true;selected=null;C.closePhoto();}
   say('');
  }catch(e){if(request!==epoch)return;if([401,403,404].includes(e.status)){jobs=[];selected=null;$('crew-jobs').replaceChildren();$('crew-job-detail').replaceChildren();$('crew-job-detail').hidden=true;C.closePhoto();}say(e.message);}
 }
 function drawJob(){
  const job=jobs.find(j=>j.id===selected);if(!job)return;
  const root=$('crew-job-detail');root.hidden=false;
  root.innerHTML='<div class="qn-crew-row"><h2>'+E(job.title)+'</h2><button type="button" class="qn-crew-btn" data-close-job>Close</button></div><p>'+E(job.customer.name)+'</p>'+(job.customer.address?'<p class="qn-crew-address">'+E(job.customer.address)+'</p>':'')+(job.customer.phone?'<p>Phone: '+E(job.customer.phone)+'</p>':'')+'<p><strong>Scheduled:</strong> '+E(job.date||'To be confirmed')+'</p><p><strong>Your progress:</strong> '+E(job.status)+'</p>'+
   (job.instructions?'<div class="qn-crew-note"><strong>Crew instructions</strong><p class="qn-crew-preserve">'+E(job.instructions)+'</p></div>':'')+
   (job.items.length?'<h3>Scope of work</h3>'+job.items.map(i=>'<div class="qn-crew-scope"><strong>'+E(i.service||'Work item')+'</strong><p class="qn-crew-preserve">'+E(i.description)+'</p><small>Quantity: '+E(i.quantity)+(Object.hasOwn(i,'price')?' · '+C.money(i.price)+' each':'')+'</small></div>').join(''):'')+
   (job.pricing?'<div class="qn-crew-note"><strong>Job price: '+(job.pricing.total===null?'Not set':C.money(job.pricing.total))+'</strong><p>'+E(job.pricing.taxLabel)+' '+E(job.pricing.taxRate)+'%</p></div>':'')+
   (job.costs?'<details><summary>Internal costs</summary><p>Materials: '+C.money(job.costs.materials)+'</p><p>Labour and other costs: '+C.money(job.costs.labour)+'</p></details>':'')+
   (!readOnly&&!job.closed?'<div class="qn-crew-actions">'+(job.status!=='In Progress'?'<button type="button" class="qn-crew-btn'+(job.status==='Scheduled'?' primary':'')+'" data-work="In Progress">'+(job.status==='Completed'?'Reopen my work':'Start work')+'</button>':'')+(job.status!=='Completed'?'<button type="button" class="qn-crew-btn primary" data-work="Completed">Mark my work complete</button>':'')+'</div>':job.closed?'<p class="qn-crew-muted">The owner has closed this job.</p>':'')+
   '<p class="qn-crew-message" data-job-message role="status"></p><h3>Job photos</h3><div data-gallery></div>'+
   (!readOnly?'<details class="qn-crew-invite"><summary>Add job photo</summary><label for="crew-photo-kind">Photo type</label><select id="crew-photo-kind"><option value="progress">Progress</option><option value="before">Before</option><option value="after">After</option></select><label for="crew-photo-file">Choose a photo</label><input id="crew-photo-file" type="file" accept="image/jpeg,image/png,image/webp"><p class="qn-crew-muted">Photos are compressed for mobile use. Up to 6 per assignment, 20 per job.</p><button type="button" class="qn-crew-btn primary" data-upload disabled>Upload photo</button></details>':'');
  const message=text=>{if(root.isConnected)root.querySelector('[data-job-message]').textContent=text;};
  root.querySelector('[data-close-job]').onclick=()=>{selected=null;pendingPhoto=null;root.hidden=true;};
  C.gallery(root.querySelector('[data-gallery]'),$('crew-team').value,job.id);
  root.querySelectorAll('[data-work]').forEach(b=>b.onclick=async()=>{
   if(busy)return;busy=true;root.querySelectorAll('[data-work]').forEach(x=>x.disabled=true);
   try{await C.api({action:'work',ownerId:$('crew-team').value,assignmentId:job.assignmentId,status:b.dataset.work,expectedAt:job.updatedAt});await loadJobs();}
   catch(e){message(e.message);root.querySelectorAll('[data-work]').forEach(x=>x.disabled=false);if([401,403].includes(e.status))await loadJobs();}finally{busy=false;}
  });
  const file=root.querySelector('#crew-photo-file'),upload=root.querySelector('[data-upload]');
  if(file){file.onchange=()=>{pendingPhoto=null;upload.disabled=!file.files?.length;};upload.onclick=async()=>{
   if(busy)return;busy=true;upload.disabled=true;message('Preparing photo…');
   const ownerId=$('crew-team').value,request=epoch;
   try{
    if(!pendingPhoto){const f=file.files?.[0];if(!f)throw Error('Choose a photo first.');pendingPhoto={action:'add_photo',ownerId,assignmentId:job.assignmentId,photoId:crypto.randomUUID(),name:f.name,category:root.querySelector('#crew-photo-kind').value,data:await C.photoData(f)};}
    if(request!==epoch||selected!==job.id||!user){pendingPhoto=null;return;}
    await C.api(pendingPhoto);if(request!==epoch||selected!==job.id||$('crew-team').value!==ownerId)return;pendingPhoto=null;file.value='';message('Photo uploaded. Your owner can now view it.');await C.gallery(root.querySelector('[data-gallery]'),ownerId,job.id);
   }catch(e){if(request===epoch){message(e.message);upload.textContent='Retry upload';upload.disabled=false;if([401,403].includes(e.status))await loadJobs();}}finally{busy=false;}
  };}
 }
 async function signedIn(next){
  user=next;entry?.remember(user.id);$('crew-auth').hidden=true;$('crew-signout').hidden=false;$('crew-person').textContent=user.email||'';
  let invitationError='';
  if(invite){try{const data=await C.api({action:'invitation',token:invite});if(user?.id!==next.id)return;$('crew-invitation-title').textContent='Join '+data.businessName;$('crew-business-name').textContent=data.businessName;$('crew-join').textContent='Join '+data.businessName;}catch(e){invitationError=e.message;}}
  await loadTeams();if(invitationError)say(invitationError);
 }
 $('crew-auth-switch').onclick=()=>setMode(mode==='login'?'signup':'login');$('crew-auth-reset').onclick=()=>setMode('reset');
 $('crew-show-password').onclick=()=>{const field=$('crew-auth-password'),show=field.type==='password';field.type=show?'text':'password';$('crew-show-password').textContent=show?'Hide':'Show';$('crew-show-password').setAttribute('aria-label',show?'Hide password':'Show password');};
 $('crew-auth-form').onsubmit=async e=>{
  e.preventDefault();const b=$('crew-auth-submit');b.disabled=true;say('Please wait…');const email=$('crew-auth-email').value.trim(),password=$('crew-auth-password').value;
  try{
   if(mode==='reset'){const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:entry.authReturn()});if(error)throw error;say('Check your email for the reset link. After resetting, return to this crew page to sign in.');return;}
   if(mode==='password'){if(password.length<8)throw Error('Use at least 8 characters.');const{error}=await sb.auth.updateUser({password});if(error)throw error;setMode('login');const{data}=await sb.auth.getUser();if(data.user)await signedIn(data.user);return;}
   if(mode==='signup'&&password.length<8)throw Error('Use at least 8 characters.');
   const result=mode==='signup'?await sb.auth.signUp({email,password,options:{emailRedirectTo:entry.authReturn(),data:{qn_entry:'crew'}}}):await sb.auth.signInWithPassword({email,password});
   if(result.error)throw result.error;
   if(result.data.session&&result.data.user)await signedIn(result.data.user);else say('Confirm your email to return to your crew invitation. If the email opens another browser, reopen the original text invitation and sign in.');
  }catch(err){say(err.message);}finally{b.disabled=false;}
 };
 $('crew-join').onclick=async()=>{const b=$('crew-join');b.disabled=true;try{const data=await C.api({action:'accept',token:invite});invite='';entry?.clear();$('crew-invitation').hidden=true;await loadTeams();if(teams.some(t=>t.id===data.ownerId)){$('crew-team').value=data.ownerId;await loadJobs();}}catch(e){say(e.message);}finally{b.disabled=false;}};
 $('crew-signout').onclick=async()=>{clearWork();user=null;const{error}=await sb.auth.signOut();if(error){$('crew-auth').hidden=false;say(error.message);return;}$('crew-signout').hidden=true;$('crew-invitation').hidden=true;$('crew-auth').hidden=false;setMode('login');};
 $('crew-team').onchange=()=>{selected=null;pendingPhoto=null;C.closePhoto();loadJobs();};$('crew-refresh').onclick=()=>loadTeams();
 sb.auth.onAuthStateChange((event,session)=>{if(event==='PASSWORD_RECOVERY'){clearWork();$('crew-auth').hidden=false;setMode('password');}else if(event==='SIGNED_OUT'){clearWork();user=null;$('crew-auth').hidden=false;$('crew-signout').hidden=true;$('crew-invitation').hidden=true;}else if(event==='SIGNED_IN'&&session?.user&&!user)setTimeout(()=>{if(mode!=='password'&&!user)signedIn(session.user);},0);});
 sb.auth.getUser().then(({data})=>{if(data.user){if(mode!=='password')signedIn(data.user);}else{$('crew-auth').hidden=false;setMode('login');}}).catch(()=>{$('crew-auth').hidden=false;say('Unable to check your session. Sign in or refresh.');});
 setInterval(()=>{if(user&&!busy&&!document.hidden&&$('crew-team').value)loadJobs();},45000);
 document.addEventListener('visibilitychange',()=>{if(user&&!busy&&!document.hidden)loadTeams();});
})();
