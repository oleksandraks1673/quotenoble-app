const {stripe,auth,customer,error}=require('./_common');
module.exports=async(req,res)=>{
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 res.setHeader('Cache-Control','no-store');
 try{
  const user=await auth(req),st=stripe(),c=await customer(st,user);
  if(!c)return res.json({pro:false,status:'none',plan:null,current_period_end:null,cancel_at_period_end:false});
  const subs=await st.subscriptions.list({customer:c.id,status:'all',limit:100});
  const active=subs.data.find(s=>['active','trialing'].includes(s.status));
  if(!active)return res.json({pro:false,status:'inactive',plan:null,current_period_end:null,cancel_at_period_end:false});
  const interval=active.items?.data?.[0]?.price?.recurring?.interval;
  return res.json({pro:true,status:active.status,plan:interval==='month'?'monthly':interval==='year'?'yearly':null,current_period_end:active.current_period_end||null,cancel_at_period_end:!!active.cancel_at_period_end});
 }catch(e){return error(res,e)}
};