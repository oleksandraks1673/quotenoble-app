/* Local-time greeting; business names remain user data and are never translated. */
(()=>{
 'use strict';
 const labels={en:['Good morning','Good afternoon','Good evening'],ru:['Доброе утро','Добрый день','Добрый вечер'],uk:['Доброго ранку','Добрий день','Добрий вечір'],fr:['Bonjour','Bon après-midi','Bonsoir'],es:['Buenos días','Buenas tardes','Buenas noches'],pt:['Bom dia','Boa tarde','Boa noite'],it:['Buongiorno','Buon pomeriggio','Buonasera'],de:['Guten Morgen','Guten Tag','Guten Abend'],pl:['Dzień dobry','Dzień dobry','Dobry wieczór'],ar:['صباح الخير','مساء الخير','مساء الخير'],hi:['सुप्रभात','शुभ दोपहर','शुभ संध्या'],zh:['早上好','下午好','晚上好'],pa:['ਸ਼ੁਭ ਸਵੇਰ','ਸ਼ੁਭ ਦੁਪਹਿਰ','ਸ਼ੁਭ ਸ਼ਾਮ'],ko:['좋은 아침입니다','좋은 오후입니다','좋은 저녁입니다'],ja:['おはようございます','こんにちは','こんばんは']};
 const company=document.getElementById('qn-home-company'),greeting=document.getElementById('qn-home-greeting-text'),icon=document.querySelector('.qn-day-icon');
 if(!company||!greeting)return;
 function fit(){if(!company.clientWidth)return;company.style.fontSize='24px';const width=company.clientWidth,needed=company.scrollWidth;if(needed>width)company.style.fontSize=Math.max(12,Math.floor(24*width/needed*10)/10)+'px';}
 function update(name){if(typeof name==='string'&&company.textContent!==name)company.textContent=name;const hour=new Date().getHours(),period=hour<12?0:hour<18?1:2;const value=(labels[window.qnLanguage?.get()]||labels.en)[period];if(greeting.textContent!==value)greeting.textContent=value;if(icon)icon.textContent=period===2?'☾':'☀';fit();}
 window.qnUpdateHomeWelcome=update;
 update(typeof DB!=='undefined'?String(DB.profile?.businessName||'').trim():'');
 document.addEventListener('qn-language-changed',()=>update());document.addEventListener('visibilitychange',()=>{if(!document.hidden)update();});
 window.addEventListener('resize',fit);if(window.ResizeObserver)new ResizeObserver(fit).observe(company);setInterval(()=>update(),60000);
})();
