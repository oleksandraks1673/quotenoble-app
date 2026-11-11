/* Shared catalogue and entitlement rules: browser and server use the same tiers. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.QNPlans=factory();})(globalThis,function(){
 'use strict';
 const tiers={free:{name:'Free',rank:0},basic:{name:'Basic',rank:1,amount:1499,lookup:'qn_basic_monthly_v1'},pro:{name:'Pro',rank:2,amount:2999,lookup:'qn_pro_monthly_v1'},ultimate:{name:'Ultimate',rank:3,amount:4999,lookup:'qn_ultimate_monthly_v1'},legacy:{name:'Legacy Pro',rank:3}};
 const legacyPrices=new Set(['price_1UQrAhQ2ijRuSuN5cyNWA39l','price_1UQrDxQ2ijRuSuN5BVKDAMA6']);
 function priceTier(price){if(!price||typeof price!=='object')return 'free';for(const [tier,c]of Object.entries(tiers))if(c.lookup&&price.lookup_key===c.lookup&&price.currency==='cad'&&price.unit_amount===c.amount&&price.recurring?.interval==='month'&&(price.recurring.interval_count||1)===1)return tier;return legacyPrices.has(price.id)?'legacy':'free';}
 function subscriptionTier(sub){return sub&&['active','trialing'].includes(sub.status)?priceTier(sub.items?.data?.[0]?.price):'free';}
 const allows=(tier,required='pro')=>(tiers[tier]?.rank||0)>=(tiers[required]?.rank||2);
 function best(subs=[]){return subs.reduce((best,sub)=>allows(subscriptionTier(sub),'basic')&&(!best||(tiers[subscriptionTier(sub)]?.rank||0)>(tiers[subscriptionTier(best)]?.rank||0))?sub:best,null);}
 const requirement=feature=>['Company partners','Crew','Team management'].includes(feature)?'ultimate':['Reuse a quote','Job deposits','Quotes','Invoices','Payments','Customers'].includes(feature)?'basic':'pro';
 return {tiers,priceTier,subscriptionTier,allows,best,requirement};
});
