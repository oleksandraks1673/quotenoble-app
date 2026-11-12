const {stripe,auth,customer,error}=require('./_common');
const Plans=require('../../plans');
const OWNER_USER_IDS=new Set(['3065d5e7-42d8-4ea0-bf18-adc6062edbc7']);
module.exports=async(req,res)=>{
 if(req.method!=='POST')return res.status(405).end();
 try{
  const u=await auth(req);
  res.setHeader('Cache-Control','private, no-store');
  if(OWNER_USER_IDS.has(u.id))return res.json({pro:true,ultimate:true,plan:'ultimate',tier:'ultimate',paid:true,companyPartner:false,cancel_at_period_end:false,status:'active',complimentary:true});
  const st=stripe(),c=await customer(st,u);
  if(!c)return res.json({pro:false,tier:'free',paid:false,companyPartner:false,cancel_at_period_end:false,status:'none'});
  const subs=await st.subscriptions.list({customer:c.id,status:'all',limit:50});
  const best=Plans.best(subs.data);
  const tier=best?Plans.subscriptionTier(best):'free';
  // companyPartner stays false here: partner membership lives in the company
  // backend, which this branch does not contain (see audit §2/§6). The field
  // is included because the billing UI reads it from this response.
  res.json({pro:Plans.allows(tier,'pro'),tier,paid:!!best,companyPartner:false,cancel_at_period_end:!!best?.cancel_at_period_end,status:best?.status||'inactive',current_period_end:best?.current_period_end||null});
 }catch(e){error(res,e)}
};
