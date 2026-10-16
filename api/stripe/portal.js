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
    const s=await st.billingPortal.sessions.create({customer:c.id,return_url:returnUrl});
    return res.status(200).json({url:s.url});
  }catch(e){console.error('Stripe portal error:',e.message);return error(res,e)}
};
