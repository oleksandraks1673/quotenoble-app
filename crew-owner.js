(function(){
 'use strict';
 const C=window.QNCrew,E=C.esc;
 let state=null,userId=null,loading=null;
 const invitePhones=new Map();
 const currentUser=()=>window.qnApprovalSession?.user?.id;
 async function refresh(force=false){
  if(userId!==currentUser()){userId=currentUser();state=null;loading=null;invitePhones.clear();}
  if(!userId)throw Error('Please sign in to manage your crew.');
  if(loading)return loading;if(state&&!force)return state;
  const requestedUser=userId;
  loading=C.api({action:'owner'}).then(data=>{if(requestedUser!==currentUser())throw Error('Your account changed. Reopen Crew.');state=data;return data;}).finally(()=>{loading=null;});return loading;
 }
 function message(node,text){const target=node.querySelector('[data-crew-message]');if(target)target.textContent=text;}
 function footer(){return '<p class="qn-crew-muted">Crew members use <a href="/crew.html" target="_blank" rel="noopener">their staff workspace</a>. Invitations expire after 7 days.</p><button type="button" class="btn btn-outline" id="modal-cancel">Close</button>';}
 async function manage(){
  const body=openModal('Quote.Noble Crew','<p role="status">Loading your crew…</p>'+footer(),{key:'crew',reopen:manage});
  try{const data=await refresh(true);if(body.isConnected)draw(body,data);}catch(e){if(body.isConnected)body.innerHTML='<p role="status">'+E(e.message)+'</p>'+footer();}
 }
 function draw(body,data){
  const account=currentUser();
  for(const member of data.members)if(member.phone&&member.inviteLink)try{invitePhones.set(member.id,C.normalizeInvitePhone(member.phone));}catch{}
  const used=data.members.filter(m=>m.status!=='expired').length;
  body.innerHTML='<div class="qn-crew-owner"><p>Give helpers their own login, assigned jobs and photo uploads.</p><p class="qn-crew-muted">'+used+' of '+data.seatLimit+' crew places · '+(data.tier==='legacy'?'Legacy Pro':'Ultimate · 5 people total, including the owner')+'</p>'+
   (data.planError?'<p class="qn-crew-message">Plan status is unavailable. Refresh to try again.</p>':!data.pro?'<div class="qn-crew-note">Upgrade to Ultimate to invite members and assign work. Existing access can still be removed.<button type="button" class="qn-crew-btn" data-crew-plans>See Ultimate plans</button></div>':'')+
   (data.pro?'<details class="qn-crew-invite"'+(!data.members.length?' open':'')+'><summary>+ Invite crew member</summary><form data-invite-form><div class="field"><label for="crew-name">Name</label><input id="crew-name" maxlength="100" required autocomplete="name"></div><div class="field"><label for="crew-phone">Mobile number</label><input id="crew-phone" required type="tel" inputmode="tel" maxlength="30" autocomplete="tel" placeholder="416 555 0100"><p class="qn-crew-muted">Send their invitation link by text.</p></div><div class="qn-crew-permissions"><label><input type="checkbox" name="prices"> Allow job prices</label><label><input type="checkbox" name="costs"> Allow material and labour costs</label></div><p class="qn-crew-muted">Prices and costs are hidden by default. Members only see assigned jobs.</p><button type="submit" class="btn btn-primary">Create invitation link</button></form></details>':'')+
   '<div data-crew-message class="qn-crew-message" role="status" aria-live="polite"></div><div data-crew-members>'+data.members.map(m=>memberCard(m,data.pro)).join('')+'</div>'+(!data.members.length?'<p class="qn-crew-muted">Your crew list is empty. Start with one helper.</p>':'')+'<button type="button" class="qn-crew-btn" data-crew-refresh>Refresh crew</button></div>'+footer();
  body.querySelector('[data-crew-plans]')?.addEventListener('click',()=>{closeModal();showView('plans');});
  body.querySelector('[data-crew-refresh]').onclick=()=>manage();
  body.querySelector('[data-invite-form]')?.addEventListener('submit',async e=>{
   e.preventDefault();const account=currentUser(),form=e.currentTarget,button=form.querySelector('button');button.disabled=true;message(body,'Creating invitation…');
   try{const phone=C.normalizeInvitePhone(form.querySelector('#crew-phone').value);await C.api({action:'invite',name:form.querySelector('#crew-name').value,phone,prices:form.querySelector('[name=prices]').checked,costs:form.querySelector('[name=costs]').checked});if(account!==currentUser())return;const next=await refresh(true);if(account!==currentUser())return;const member=next.members.find(m=>m.inviteLink&&m.phone===phone);if(phone&&member)invitePhones.set(member.id,phone);if(body.isConnected){draw(body,next);message(body,phone&&member?'Invitation ready. Tap Text invitation, then finish sending in Messages.':'Invitation ready. Text the invitation below.');}}
   catch(err){message(body,err.message);}finally{if(button.isConnected)button.disabled=false;}
  });
  body.querySelectorAll('[data-member]').forEach(card=>{
   const m=data.members.find(x=>x.id===card.dataset.member);
   card.querySelector('[data-text-invite]')?.addEventListener('click',event=>{if(account!==currentUser()){event.preventDefault();message(body,'Your account changed. Reopen Crew.');return;}if(invitePhones.has(m.id)){message(body,'Finish sending the invitation in Messages.');return;}event.preventDefault();textInvitation(m);});
   card.querySelector('[data-save-access]')?.addEventListener('click',async e=>{const b=e.currentTarget;b.disabled=true;try{await C.api({action:'permissions',memberId:m.id,prices:card.querySelector('[name=prices]').checked,costs:card.querySelector('[name=costs]').checked});await refresh(true);message(body,'Permissions saved for '+m.name+'.');}catch(err){message(body,err.message);}finally{b.disabled=false;}});
   card.querySelector('[data-remove-member]').onclick=async e=>{const b=e.currentTarget;if(!await qnConfirm('Remove '+m.name+' from your crew? Their invitations and job access will stop.'))return;b.disabled=true;try{await C.api({action:'revoke',memberId:m.id});const next=await refresh(true);if(body.isConnected){draw(body,next);message(body,'Crew access removed.');}window.qnCrewRefreshJobs?.();}catch(err){message(body,err.message);b.disabled=false;}};
  });
 }
 function memberCard(m,pro){return '<section class="qn-crew-member" data-member="'+m.id+'"><div class="qn-crew-row"><div><h3>'+E(m.name)+'</h3><p>'+E(m.phone||'Crew member')+'</p></div><span class="qn-crew-tag">'+E(m.status)+'</span></div><div class="qn-crew-permissions"><label><input name="prices" type="checkbox" '+(m.prices?'checked ':'')+(!pro?'disabled':'')+'> Job prices</label><label><input name="costs" type="checkbox" '+(m.costs?'checked ':'')+(!pro?'disabled':'')+'> Internal costs</label></div><div class="qn-crew-actions">'+(pro?'<button type="button" class="qn-crew-btn" data-save-access>Save permissions</button>':'')+(m.inviteLink?(invitePhones.has(m.id)?'<a class="qn-crew-btn" data-text-invite href="'+E(C.inviteSMSURL(invitePhones.get(m.id),m))+'">Text invitation</a>':'<button type="button" class="qn-crew-btn" data-text-invite>Text invitation</button>')+'':'')+'<button type="button" class="qn-crew-btn" data-remove-member>Remove</button></div>'+(m.inviteLink?'<input class="qn-crew-link" data-invite-link aria-label="Invitation link" readonly hidden value="'+E(m.inviteLink)+'">':'')+(m.status==='expired'?'<p class="qn-crew-muted">Invite this crew member again to create a fresh link.</p>':'')+'</section>';}
 function textInvitation(member){
  const account=currentUser();
  const body=openModal('Text crew invitation','<p>Send the invitation to <strong>'+E(member.name)+'</strong>.</p><div class="field"><label for="crew-text-phone">Mobile number</label><input id="crew-text-phone" type="tel" inputmode="tel" maxlength="30" autocomplete="tel" placeholder="416 555 0100"></div><a class="btn btn-primary" id="crew-open-messages" aria-disabled="true">Open Messages</a><p class="qn-crew-message" data-crew-message role="status">Enter their mobile number. You will finish sending in Messages.</p><button type="button" class="btn btn-outline" id="crew-text-back">Back to crew</button>');
  const phone=body.querySelector('#crew-text-phone'),link=body.querySelector('#crew-open-messages');
  function update(){try{link.href=C.inviteSMSURL(phone.value,member);link.setAttribute('aria-disabled','false');phone.setCustomValidity('');return true;}catch(error){link.removeAttribute('href');link.setAttribute('aria-disabled','true');phone.setCustomValidity(error.message);return false;}}
  phone.addEventListener('input',update);
  link.onclick=event=>{if(account!==currentUser()){event.preventDefault();message(body,'Your account changed. Reopen Crew.');return;}if(!update()){event.preventDefault();phone.reportValidity();return;}invitePhones.set(member.id,C.normalizeInvitePhone(phone.value));message(body,'Finish sending in Messages, then return to Quote.Noble.');};
  body.querySelector('#crew-text-back').onclick=manage;phone.focus();
 }
 window.qnCrewMount=async(body,job)=>{
  let panel=body.querySelector('[data-crew-job]');if(!panel){panel=document.createElement('section');panel.className='qn-crew-job';panel.dataset.crewJob=job.id;body.appendChild(panel);}
  panel.innerHTML='<h3>Crew</h3><p role="status">Loading assignments…</p>';
  try{
   const data=await refresh(true);if(!panel.isConnected)return;
   const assignments=data.assignments.filter(a=>a.jobId===job.id),members=data.members.filter(m=>['pending','active'].includes(m.status));
   panel.innerHTML='<div class="qn-crew-row"><h3>Crew</h3><button type="button" class="qn-crew-btn" data-manage>Manage crew</button></div>'+
    assignments.map(a=>{const m=data.members.find(m=>m.id===a.memberId);return '<div class="qn-crew-assigned"><span><strong>'+E(m?.name||'Crew member')+'</strong><small>'+E(a.status)+(m?.status==='pending'?' · invitation pending':'')+'</small></span><button type="button" class="qn-crew-btn" data-unassign="'+a.id+'">Unassign</button></div>';}).join('')+
    (data.pro&&members.length?'<details class="qn-crew-invite"><summary>Assign a crew member</summary><label for="crew-assign">Crew member</label><select id="crew-assign">'+members.map(m=>'<option value="'+m.id+'">'+E(m.name)+(m.status==='pending'?' (invited)':'')+'</option>').join('')+'</select><label for="crew-instructions">Crew instructions</label><textarea id="crew-instructions" rows="3" maxlength="2000" placeholder="Access instructions, work details or site reminders"></textarea><p class="qn-crew-muted">Shares job scope and customer contact details. General job notes stay private; prices and costs follow each member’s permissions.</p><button type="button" class="btn btn-primary" data-assign>Save assignment</button></details>':'<p class="qn-crew-muted">'+(data.pro?'Invite a helper in Manage crew to assign this job.':'Pro includes up to 5 crew members.')+'</p>')+
    (assignments.length&&assignments.every(a=>a.status==='Completed')&&!['Completed','Cancelled','Invoiced'].includes(job.status)&&job.flowStage!=='Invoiced'?'<div class="qn-crew-note">All assigned crew have finished.<button type="button" class="btn btn-primary" data-complete-job>Mark job complete</button></div>':'')+
    '<p class="qn-crew-message" data-crew-message role="status"></p><details data-crew-photos><summary>Crew photos</summary><div data-gallery></div></details><button type="button" class="qn-crew-btn" data-reload>Refresh updates</button>';
   panel.querySelector('[data-manage]').onclick=manage;
   panel.querySelector('[data-reload]').onclick=()=>window.qnCrewMount(body,job);
   panel.querySelector('[data-complete-job]')?.addEventListener('click',()=>{job.status='Completed';job.flowStage='Completed';job.updatedAtTime=new Date().toISOString();save();closeModal();showView('jobs');});
   const choice=panel.querySelector('#crew-assign');if(choice){const fill=()=>{panel.querySelector('#crew-instructions').value=assignments.find(a=>a.memberId===choice.value)?.instructions||'';};choice.onchange=fill;fill();}
   panel.querySelector('[data-assign]')?.addEventListener('click',async e=>{const b=e.currentTarget;b.disabled=true;message(panel,'Saving assignment…');try{await window.qnCloudFlush();await C.api({action:'assign',jobId:job.id,memberId:panel.querySelector('#crew-assign').value,instructions:panel.querySelector('#crew-instructions').value});state=null;await window.qnCrewMount(body,job);window.qnCrewRefreshJobs?.();}catch(err){message(panel,err.message);b.disabled=false;}});
   panel.querySelectorAll('[data-unassign]').forEach(b=>b.onclick=async()=>{if(!await qnConfirm('Remove this job assignment?'))return;b.disabled=true;try{await C.api({action:'unassign',assignmentId:b.dataset.unassign});state=null;await window.qnCrewMount(body,job);window.qnCrewRefreshJobs?.();}catch(err){message(panel,err.message);b.disabled=false;}});
   panel.querySelector('[data-crew-photos]').addEventListener('toggle',e=>{if(e.currentTarget.open)C.gallery(panel.querySelector('[data-gallery]'),currentUser(),job.id);});
  }catch(e){if(panel.isConnected)panel.innerHTML='<h3>Crew</h3><p>'+E(e.message)+'</p>';}
 };
 window.qnCrewSummary=id=>{if(userId!==currentUser())return '';const a=state?.assignments.filter(a=>a.jobId===id)||[];return a.length?a.filter(x=>x.status==='Completed').length+'/'+a.length+' crew finished':'';};
 document.addEventListener('click',e=>{if(e.target.closest('[data-qn-crew-open]'))manage();if(e.target.closest('[data-qn-more-go=jobs]'))setTimeout(poll,0);});
 async function poll(){if(document.hidden||!currentUser()||!document.getElementById('view-jobs')?.classList.contains('active'))return;try{await refresh(true);window.qnCrewRefreshJobs?.();}catch{}}
 document.addEventListener('visibilitychange',poll);setInterval(poll,45000);
})();

