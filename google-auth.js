/* Uses the existing Supabase client and company-invitation return path. */
(() => {
 'use strict';
 const labels={en:['Continue with Google','or continue with email','Connecting to Google…','Google sign-in could not start. Please try again or use email.','Google sign-in was cancelled. Try again or use email.'],ru:['Продолжить с Google','или через электронную почту','Подключение к Google…','Не удалось войти через Google. Повторите попытку или используйте почту.','Вход через Google отменён. Повторите попытку или используйте почту.'],uk:['Продовжити з Google','або через електронну пошту','Підключення до Google…','Не вдалося увійти через Google. Спробуйте ще раз або використайте пошту.','Вхід через Google скасовано. Спробуйте ще раз або використайте пошту.']};
 const text=()=>labels[window.qnLanguage?.get()]||labels.en;
 function mount({client,url,key,message,returnTo,mode='signup'}){
  const form=document.getElementById('qn-auth-form');if(!form)return null;
  let enabled=false,busy=false,currentMode=mode;
  const existingGroup=document.querySelector('#qn-auth-screen .qn-google-auth');
  if(existingGroup){existingGroup.querySelector('#qn-auth-google')?.remove();existingGroup.remove();}
  const group=document.createElement('div');group.className='qn-google-auth';group.hidden=true;
  const button=document.createElement('button');button.id='qn-auth-google';button.type='button';button.className='qn-google-button';
  // Official multicolour G mark. Labels use textContent, including errors.
  button.innerHTML='<svg aria-hidden="true" focusable="false" viewBox="0 0 48 48" width="20" height="20"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6C44.4 38.03 46.98 31.85 46.98 24.55z"/><path fill="#FBBC05" d="M10.53 28.59A14.41 14.41 0 0 1 9.75 24c0-1.59.27-3.13.75-4.59l-7.98-6.19A23.87 23.87 0 0 0 0 24c0 3.87.93 7.53 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6C30.02 37.65 27.23 38.5 24 38.5c-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>';
  const caption=document.createElement('span'),divider=document.createElement('p');divider.className='qn-google-divider';button.append(caption);group.append(button,divider);form.before(group);
  function render(){group.hidden=!enabled||!['login','signup'].includes(currentMode);caption.textContent=text()[busy?2:0];divider.textContent=text()[1];button.disabled=busy;button.setAttribute('aria-busy',String(busy));}
  async function check(){try{const r=await fetch(url+'/auth/v1/settings',{headers:{apikey:key},cache:'no-store',signal:AbortSignal.timeout(10000)});if(!r.ok)return;const settings=await r.json();enabled=settings.external?.google===true;}catch{}finally{render();}}
  button.onclick=async()=>{
   if(busy||!enabled||!['login','signup'].includes(currentMode))return;
   busy=true;render();message('');
   try{
    const redirect=returnTo();const parsed=new URL(redirect);
    if(parsed.origin!==''||parsed.pathname!=='/app.html')throw Error('Invalid return path');
    const {error}=await client.auth.signInWithOAuth({provider:'google',options:{redirectTo:redirect,queryParams:{prompt:'select_account'}}});
    if(error)throw error;
   }catch{message(text()[3]);}finally{busy=false;render();}
  };
  const onLanguage=()=>render();document.addEventListener('qn-language-changed',onLanguage);
  // Navigation back from an OAuth provider must not leave a stale disabled button.
  window.addEventListener('pageshow',()=>{busy=false;render();});
  const ready=check();
  return {ready,setMode(value){currentMode=value;render();},callbackError(){const u=new URL(location.href),hash=new URLSearchParams(u.hash.slice(1));const code=u.searchParams.get('error')||hash.get('error');if(code)message(text()[code==='access_denied'?4:3]);}};
 }
 window.QNGoogleAuth={mount};
})();
