/* Sending and copying are separate actions, including in Android WebView. */
(function(root){
  'use strict';
  function channels(customer,subject,text){
    const phone=String(customer?.phone||'').replace(/[^+\d]/g,''),email=String(customer?.email||'').replace(/[\r\n]/g,'');
    const enc=encodeURIComponent;
    return {
      sms:'sms:'+phone+'?body='+enc(text),
      email:'mailto:'+enc(email)+'?subject='+enc(subject)+'&body='+enc(text),
      whatsapp:'https://wa.me/'+phone.replace(/\D/g,'')+'?text='+enc(text)
    };
  }
  if(typeof module==='object'&&module.exports){module.exports={channels};return;}
  root.qnSendApprovalLink=async function(q,record){
    const title=(root.QNExtraWork?.isExtra(q)?'Extra work ':'Estimate ')+q.number;
    const text='Please review and approve '+title+' from '+(DB.profile.businessName||'your contractor')+'.\n'+record.link;
    if(typeof navigator.share==='function'){
      try{await navigator.share({title,text:text.slice(0,text.lastIndexOf('\n')),url:record.link});return true;}
      catch(error){if(error.name==='AbortError')return false;}
    }
    const urls=channels(getClient(q.clientId),title,text);
    const body=openModal('Send link','<p>Choose how to send this approval to your customer.</p><div class="btn-row"><a class="btn btn-primary" data-send-channel="sms">SMS / Messages</a><a class="btn btn-outline" data-send-channel="email">Email</a><a class="btn btn-outline" data-send-channel="whatsapp" rel="noopener noreferrer">WhatsApp</a></div><p class="hint" role="status" id="send-link-status">Your messaging app will open with the link ready. Tap Send there to deliver it.</p><button type="button" class="btn btn-outline" id="send-link-back">Back to approval</button>');
    body.querySelectorAll('[data-send-channel]').forEach(link=>{
      link.href=urls[link.dataset.sendChannel];
      link.onclick=()=>{body.querySelector('#send-link-status').textContent='Finish sending in your messaging app. Then return to the approval and tap “I’ve sent the link”.';};
    });
    body.querySelector('#send-link-back').onclick=()=>root.QNExtraWork?.isExtra(q)?root.qnExtraWorkOpen(q.id):openQuoteDetail(q.id);
    return true;
  };
  root.qnCopyApprovalLink=async function(link){
    if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(link);return;}catch(error){/* Use the device clipboard fallback. */}}
    const input=document.createElement('textarea');input.value=link;input.setAttribute('readonly','');input.style.cssText='position:fixed;top:0;left:0;opacity:0';
    document.body.appendChild(input);input.focus();input.select();
    try{if(!document.execCommand('copy'))throw Error('Copy is unavailable on this device. Select the approval link and copy it manually.');}
    finally{input.remove();}
  };
})(typeof window==='undefined'?globalThis:window);
