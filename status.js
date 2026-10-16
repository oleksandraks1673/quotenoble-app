const {stripe,auth,customer,error}=require('./_common');
module.exports=async(req,res)=>{
  if(req.method!=='POST')return res.status(405).end();
  res.setHeader('Cache-Control','no-store, private');
  try{
    const user=await auth(req),st=stripe(),c=await customer(st,user);
    if(!c)return res.json({pro:false,status:'none',plan:null,subscription_id:null,current_period_end:null,cancel_at_period_end:false});
    const subscriptions=await st.subscriptions.list({customer:c.id,status:'all',limit:100});
    const rank={active:0,trialing:1,past_due:2,unpaid:3,incomplete:4,canceled:5};
    const sorted=subscriptions.data.sort((a,b)=>(rank[a.status]??6)-(rank[b.status]??6)||b.created-a.created);
    const s=sorted[0];
    if(!s)return res.json({pro:false,status:'none',plan:null,subscription_id:null,current_period_end:null,cancel_at_period_end:false});
    const interval=s.items?.data?.[0]?.price?.recurring?.interval;
    return res.json({
      pro:['active','trialing'].includes(s.status),
      status:s.status,
      plan:interval==='year'?'yearly':interval==='month'?'monthly':null,
      subscription_id:s.id,
      current_period_end:s.current_period_end||null,
      cancel_at_period_end:!!s.cancel_at_period_end
    });
  }catch(e){error(res,e)}
};