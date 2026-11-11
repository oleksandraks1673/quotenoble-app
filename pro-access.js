/* Verified per-account tiers; remote operations independently enforce access. */
(()=>{'use strict';let verified=null;const P=window.QNPlans,user=()=>window.qnApprovalSession?.user?.id,signed=()=>document.body.classList.contains('qn-authenticated');
 const valid=()=>signed()&&user()&&verified?.userId===user()&&Date.now()-verified.at<300000;
 window.qnTier=()=>valid()?verified.tier:null;
 window.qnHasTier=tier=>valid()&&P.allows(verified.tier,tier);
 window.qnHasPro=()=>window.qnHasTier('pro');
 window.qnRequirePro=feature=>{const tier=P.requirement(feature);if(window.qnHasTier(tier))return true;const l=window.qnLanguage?.get(),name=P.tiers[tier].name;const message=valid()?(l==='ru'?feature+' входит в тариф '+name+'. Откройте «Ещё → Тарифы».':l==='uk'?feature+' входить до тарифу '+name+'. Відкрийте «Ще → Тарифи».':feature+' is included with '+name+'. Open More → Plans to upgrade.'):(l==='ru'?'Проверяю вашу подписку. Повторите через несколько секунд.':l==='uk'?'Перевіряю вашу підписку. Спробуйте за кілька секунд.':'Your subscription is being checked. Please try again shortly.');if(!valid())document.dispatchEvent(new Event('qn-billing-refresh'));qnAlert(message);return false;};
 document.addEventListener('qn-billing-status-checking',()=>{verified=null});
 document.addEventListener('qn-billing-status-loaded',e=>{const id=e.detail?.userId,tier=e.detail?.tier||(e.detail?.pro?'legacy':'free');verified=id===user()&&P.tiers[tier]?{userId:id,tier,at:Date.now()}:null;});
 new MutationObserver(()=>{if(!signed())verified=null}).observe(document.body,{attributes:true,attributeFilter:['class']});
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&signed()&&!valid())document.dispatchEvent(new Event('qn-billing-refresh'));});
 document.addEventListener('click',e=>{const input=e.target.closest?.('input.optional');if(input?.checked&&!window.qnRequirePro('Optional services')){e.preventDefault();e.stopImmediatePropagation();}},true);
})();
