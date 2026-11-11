(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.QNPhotoModel=factory();})(typeof window==='undefined'?globalThis:window,function(){
 'use strict';
 const stages=['before','progress','after'],colors=['#e53935','#e78a17','#15805b','#ffffff'];
 function annotations(value){
  if(!Array.isArray(value)||value.length>80)throw Error('Use up to 80 marks per photo.');
  const point=p=>{if(!Array.isArray(p)||p.length!==2||p.some(n=>!Number.isFinite(n)||n<0||n>1))throw Error('Invalid mark coordinates.');return p.map(n=>Math.round(n*100000)/100000);};
  return value.map(a=>{if(!a||!['arrow','ellipse','rect','pen','text'].includes(a.type)||!colors.includes(a.color))throw Error('Invalid photo mark.');const out={type:a.type,color:a.color};
   if(a.type==='pen'){if(!Array.isArray(a.points)||a.points.length<2||a.points.length>250)throw Error('Invalid drawing.');out.points=a.points.map(point);}
   else {out.from=point(a.from);if(a.type==='text'){if(typeof a.text!=='string'||!a.text.trim()||a.text.length>80)throw Error('Use a label up to 80 characters.');out.text=a.text.trim();}else out.to=point(a.to);}
   return out;
  });
 }
 function edit(value){if(!stages.includes(value.stage)||typeof value.caption!=='string'||value.caption.length>1000||typeof value.include!=='boolean')throw Error('Check the photo description and stage.');return {stage:value.stage,caption:value.caption.trim(),include:value.include,annotations:annotations(value.annotations)};}
 return{stages,colors,annotations,edit};
});
