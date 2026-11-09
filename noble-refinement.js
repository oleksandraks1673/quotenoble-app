/* Presentation only. All document actions use the app's existing handlers. */
(() => {
 'use strict';
 const messages={
  en:['Built for contractors','See the problem.','Quote it.','Get it done.','Quotes, jobs, project photos and invoices. Keep the whole job together, from the first visit to the final payment.','Create a clear, professional quote','Keep extra work and approvals together','Document the work. Send the invoice.','Start free · 5 quotes + 5 invoices each month','Create your first quote'],
  ru:['Для подрядчиков','Увидели проблему.','Составьте смету.','Выполните работу.','Сметы, работы, фото проектов и счета. Весь проект в одном месте — от первого визита до последней оплаты.','Создавайте понятные профессиональные сметы','Допработы и согласования в одном месте','Фиксируйте работу. Отправляйте счёт.','Начните бесплатно · 5 смет и 5 счетов в месяц','Создать первую смету'],
  uk:['Для підрядників','Побачили проблему.','Складіть кошторис.','Виконайте роботу.','Кошториси, роботи, фото проєктів і рахунки. Увесь проєкт в одному місці — від першого візиту до останньої оплати.','Створюйте зрозумілі професійні кошториси','Додаткові роботи й погодження в одному місці','Фіксуйте роботу. Надсилайте рахунок.','Почніть безкоштовно · 5 кошторисів і 5 рахунків щомісяця','Створити перший кошторис']
 };
 const screen=document.getElementById('qn-auth-screen');
 if(screen){
  screen.dataset.invitation=String(!!window.qnCompanyInvitation?.get());
  const story=document.createElement('section');story.className='qn-welcome-story';story.setAttribute('aria-labelledby','qn-welcome-heading');story.setAttribute('data-qn-no-translate','');
  const icon=path=>'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+path+'</svg>';
  story.innerHTML='<p class="qn-welcome-eyebrow" data-noble-copy="0"></p><h2 id="qn-welcome-heading"><span data-noble-copy="1" style="color:inherit"></span><br><span data-noble-copy="2"></span><br><span data-noble-copy="3" style="color:inherit"></span></h2><p class="qn-welcome-description" data-noble-copy="4"></p><ul class="qn-welcome-benefits"><li>'+icon('<path d="M14 2H5v20h14V7zM14 2v6h5M8 12h8M8 16h5"/>')+'<span data-noble-copy="5"></span></li><li>'+icon('<path d="M20 11v9H4V4h11M9 10l3 3L22 3"/>')+'<span data-noble-copy="6"></span></li><li>'+icon('<rect x="3" y="5" width="18" height="15" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m3 18 5-4 4 3 4-5 5 6"/>')+'<span data-noble-copy="7"></span></li></ul><p class="qn-welcome-free" data-noble-copy="8"></p>';
  const existing=screen.querySelector('.qn-welcome-story');
  if(existing){story.remove();}else screen.prepend(story);
 }
 function localize(){const copy=messages[window.qnLanguage?.get()]||messages.en;document.querySelectorAll('[data-noble-copy]').forEach(el=>{const text=copy[Number(el.dataset.nobleCopy)];if(el.textContent!==text)el.textContent=text;});}
 function firstQuote(){const recent=document.getElementById('dash-recent');if(!recent)return;const empty=recent.querySelector('.empty');if(empty&&!recent.querySelector('[data-noble-first]')){const b=document.createElement('button');b.type='button';b.className='btn qn-first-quote';b.dataset.action='new-quote';b.dataset.nobleFirst='';b.dataset.nobleCopy='9';b.setAttribute('data-qn-no-translate','');empty.append(b);localize();}}
 localize();firstQuote();document.addEventListener('qn-language-changed',localize);
 const recent=document.getElementById('dash-recent');if(recent)new MutationObserver(firstQuote).observe(recent,{childList:true,subtree:true});
})();

