const {stripe,auth,customer,error}=require('./_common');
const OWNER_USER_IDS=new Set(['3065d5e7-42d8-4ea0-bf18-adc6062edbc7']);
module.exports=async(req,res)=>{
 if(req.method!=='POST')return res.status(405).end();
 try{
  const u=await auth(req);
  res.setHeader('Cache-Control','private, no-store');
  if(OWNER_USER_IDS.has(u.id))return res.json({pro:true,ultimate:true,plan:'ultimate',status:'active',complimentary:true});
  const st=stripe(),c=await customer(st,u);
  if(!c)return res.json({pro:false,status:'none'});
  const subs=await st.subscriptions.list({customer:c.id,status:'all',limit:50});
  const active=subs.data.find(s=>['active','trialing'].includes(s.status));
  res.json({pro:!!active,status:active?.status||'inactive',current_period_end:active?.current_period_end||null});
 }catch(e){error(res,e)}
};
