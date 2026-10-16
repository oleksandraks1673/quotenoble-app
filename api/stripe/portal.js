const {stripe,auth,customer,error}=require('./_common');
module.exports=async(req,res)=>{
  if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
  try{
    const u=await auth(req);
    const st=stripe();
    const c=await customer(st,u);
    if(!c)return res.status(404).json({error:'No billing account found'});
    const host=String(req.headers['x-forwarded-host']||req.headers.host||'').toLowerCase();
    const allowed=host==='www.quotenoble.com'||host==='quotenoble.com'||/^quotenoblev13stripeintegrationpreview-[a-z0-9-]+\.vercel\.app$/.test(host);
    if(!allowed)return res.status(400).json({error:'Invalid billing return host'});
    const returnUrl='https://'+host+'/?billing=return';
    const portalArgs={customer:c.id,return_url:returnUrl};
    if(req.body?.action==='change_plan'){
      const subs=await st.subscriptions.list({customer:c.id,status:'all',limit:100});
      const active=subs.data.find(x=>['active','trialing'].includes(x.status));
      if(!active)return res.status(404).json({error:'No active subscription to change'});
      const item=active.items?.data?.[0];
      const monthly=process.env.STRIPE_PRICE_MONTHLY,yearly=process.env.STRIPE_PRICE_YEARLY;
      if(!monthly||!yearly)return res.status(503).json({error:'Subscription prices are not configured'});
      const next=item?.price?.id===monthly?yearly:item?.price?.id===yearly?monthly:null;
      if(!next)return res.status(409).json({error:'Your plan cannot be changed automatically. Please contact support.'});
      portalArgs.flow_data={type:'subscription_update_confirm',subscription_update_confirm:{subscription:active.id,items:[{id:item.id,price:next,quantity:item.quantity||1}]},after_completion:{type:'redirect',redirect:{return_url:returnUrl}}};
    }
    const s=await st.billingPortal.sessions.create(portalArgs);
    return res.status(200).json({url:s.url});
  }catch(e){console.error('Stripe portal error:',e.message);return error(res,e)}
};
