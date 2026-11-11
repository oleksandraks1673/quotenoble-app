/* Geometry is stored in inches, independent of viewport, zoom and display units. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.QNPlanModel=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const MAX=120000,clone=v=>JSON.parse(JSON.stringify(v));
  const finite=(v,fallback=0)=>Number.isFinite(Number(v))?Math.max(-MAX,Math.min(MAX,Number(v))):fallback;
  const factor=unit=>unit==='cm'?1/2.54:unit==='ft'?12:1;
  function length(value,unit){const n=Number(String(value).trim());if(!String(value).trim()||!Number.isFinite(n)||n<=0||n*factor(unit)>MAX)throw Error('Enter a positive size within 10,000 ft.');return n*factor(unit);}
  function format(n,unit='ft'){if(unit==='cm')return +(n*2.54).toFixed(1)+' cm';if(unit==='in')return +n.toFixed(2)+' in';let inches=Math.round(n*16)/16,ft=Math.floor(inches/12);inches=+(inches-ft*12).toFixed(4);return (ft?ft+'′ ':'')+inches+'″';}
  function normalize(raw={}){
    const shapes=(Array.isArray(raw.shapes)?raw.shapes:[]).slice(0,400).filter(s=>s&&['line','rect','dimension'].includes(s.type)).map((s,i)=>({id:String(s.id||'shape-'+i).slice(0,80),type:s.type,x:finite(s.x),y:finite(s.y),...(s.type==='rect'?{w:Math.max(.01,finite(s.w,24)),h:Math.max(.01,finite(s.h,48)),kind:['roof','skylight','other'].includes(s.kind)?s.kind:'roof',pitch:s.pitch!==null&&s.pitch!==undefined&&Number.isFinite(Number(s.pitch))&&Number(s.pitch)>=0&&Number(s.pitch)<=36?Number(s.pitch):null}:{x2:finite(s.x2),y2:finite(s.y2)}),label:String(s.label||'').slice(0,80)}));
    const image=typeof raw.photo==='string'&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(raw.photo)&&raw.photo.length<550000?raw.photo:'';
    return {version:1,unit:['ft','in','cm'].includes(raw.unit)?raw.unit:'ft',snap:raw.snap!==false,shapes,address:String(raw.address||'').slice(0,500),notes:String(raw.notes||'').slice(0,6000),photo:image,updatedAt:String(raw.updatedAt||''),view:{x:finite(raw.view?.x,-48),y:finite(raw.view?.y,-36),width:Math.max(24,Math.min(24000,finite(raw.view?.width,480)))}};
  }
  const size=s=>s.type==='rect'?{a:s.w,b:s.h}:{a:Math.hypot(s.x2-s.x,s.y2-s.y),b:Math.atan2(s.y2-s.y,s.x2-s.x)*180/Math.PI};
  function resize(s,a,b,unit){const out=clone(s),n=length(a,unit);if(s.type==='rect'){out.w=n;out.h=length(b,unit);}else{const degrees=Number(b);if(!String(b).trim()||!Number.isFinite(degrees))throw Error('Enter an angle in degrees.');const rad=degrees*Math.PI/180;out.x2=out.x+n*Math.cos(rad);out.y2=out.y+n*Math.sin(rad);}return out;}
  const world=(x,y,view,width=900,height=600)=>({x:view.x+x*view.width/width,y:view.y+y*view.width/width});
  const screen=(x,y,view,width=900)=>({x:(x-view.x)*width/view.width,y:(y-view.y)*width/view.width});
  const snap=(p,unit,enabled=true)=>{const step=unit==='cm'?10/2.54:6;return enabled?{x:Math.round(p.x/step)*step,y:Math.round(p.y/step)*step}:p;};
  function distance(p,a,b){const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);}
  function hit(s,p,tolerance){if(s.type==='rect')return p.x>=s.x-tolerance&&p.x<=s.x+s.w+tolerance&&p.y>=s.y-tolerance&&p.y<=s.y+s.h+tolerance;return distance(p,s,{x:s.x2,y:s.y2})<=tolerance;}
  function fit(shapes){if(!shapes.length)return {x:-48,y:-36,width:480};const xs=[],ys=[];shapes.forEach(s=>{xs.push(s.x,s.type==='rect'?s.x+s.w:s.x2);ys.push(s.y,s.type==='rect'?s.y+s.h:s.y2);});const x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y,width=Math.max(72,w*1.3,h*1.95);return {x:x+w/2-width/2,y:y+h/2-width/3,width};}
  function pitch(value,mode='ratio'){if(String(value).trim()==='')return null;let n=Number(value);if(!Number.isFinite(n)||n<0||(mode==='degrees'&&n>=90))throw Error('Enter a valid non-negative roof slope.');if(mode==='degrees')n=Math.tan(n*Math.PI/180)*12;if(n>36)throw Error('Supported slope range is 0:12 to 36:12 (about 71.56°).');return n;}
  function roof(s){if(s.type!=='rect'||s.kind!=='roof'||s.pitch===null||s.pitch===undefined)return null;const factor=Math.hypot(1,s.pitch/12),flat=s.w*s.h;return {factor,degrees:Math.atan(s.pitch/12)*180/Math.PI,flatSqFt:flat/144,surfaceSqFt:flat*factor/144,surfaceSqM:flat*factor*.00064516};}
  return {pitch,roof,clone,factor,length,format,normalize,size,resize,world,screen,snap,hit,fit};
});
