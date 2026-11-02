'use strict';
const fail=(status,message)=>Object.assign(new Error(message),{status});
const trades=['Eavestrough & gutters','Roofing repairs'];
function input(body){
  if(!body||!trades.includes(body.trade))throw fail(400,'Choose a supported trade.');
  if(typeof body.notes!=='string'||body.notes.length>4000)throw fail(400,'Keep job notes under 4,000 characters.');
  if(!Array.isArray(body.photos)||body.photos.length<1||body.photos.length>6)throw fail(400,'Add between 1 and 6 job photos.');
  let size=0;
  for(const image of body.photos){
    if(typeof image!=='string'||!/^data:image\/jpeg;base64,[A-Za-z0-9+/]+=*$/.test(image))throw fail(400,'Use JPEG job photos.');
    const bytes=Buffer.from(image.split(',')[1],'base64');
    if(bytes.length<4||bytes[0]!==255||bytes[1]!==216||bytes[2]!==255)throw fail(400,'A photo is not a valid JPEG.');
    size+=image.length;
  }
  if(size>3000000)throw fail(413,'Photos are too large. Use fewer photos.');
  return {trade:body.trade,notes:body.notes.trim(),photos:body.photos};
}
const schema={type:'object',additionalProperties:false,required:['items','questions','observations'],properties:{
  items:{type:'array',maxItems:12,items:{type:'object',additionalProperties:false,required:['service','scope'],properties:{service:{type:'string',maxLength:100},scope:{type:'string',maxLength:800}}}},
  questions:{type:'array',maxItems:8,items:{type:'string',maxLength:300}},
  observations:{type:'array',maxItems:8,items:{type:'string',maxLength:300}}
}};
function clean(raw){
  if(!raw||!Array.isArray(raw.items)||raw.items.length>12||!Array.isArray(raw.questions)||!Array.isArray(raw.observations))throw fail(502,'The photo draft could not be read. Please retry.');
  const items=raw.items.map(it=>{
    if(!it||typeof it.service!=='string'||!it.service.trim()||it.service.length>100||typeof it.scope!=='string'||it.scope.length>800)throw fail(502,'The photo draft contained an invalid item.');
    return {service:it.service.trim(),desc:it.scope.trim(),qty:null,price:null};
  });
  const list=value=>{if(value.length>8||value.some(s=>typeof s!=='string'||s.length>300))throw fail(502,'The photo draft contained invalid notes.');return value;};
  return {items,questions:list(raw.questions),observations:list(raw.observations)};
}
// A suggested service name never sets a price. Only an exact saved-rate match
// may prefill it, and the contractor still confirms every line before saving.
function applyRates(items,rates){
  return items.map(item=>{const matches=rates.filter(r=>r.service.trim().toLowerCase()===item.service.trim().toLowerCase());
    const prices=[...new Set(matches.map(r=>r.price).filter(p=>Number.isSafeInteger(p)&&p>=0))];
    return {...item,price:prices.length===1?prices[0]:null};
  });
}
module.exports={input,clean,schema,applyRates,fail};
