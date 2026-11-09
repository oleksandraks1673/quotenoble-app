(function(){
 'use strict';
 const M=window.QNPhotoModel;
 const image=data=>new Promise((resolve,reject)=>{if(!/^data:image\/(jpeg|png|webp);base64,/.test(data))return reject(Error('Unsupported photo.'));const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('This photo could not be read.'));im.src=data;});
 function draw(ctx,im,marks){
  const w=ctx.canvas.width,h=ctx.canvas.height;ctx.clearRect(0,0,w,h);ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(im,0,0,w,h);
  for(const a of marks){ctx.save();ctx.strokeStyle=a.color;ctx.fillStyle=a.color;ctx.lineWidth=Math.max(3,w*.0045);ctx.lineCap='round';ctx.lineJoin='round';
   const xy=p=>[p[0]*w,p[1]*h];ctx.beginPath();
   if(a.type==='pen'){a.points.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](...xy(p)));ctx.stroke();}
   else if(a.type==='text'){ctx.font='bold '+Math.max(18,w*.032)+'px Arial';ctx.strokeStyle=a.color==='#ffffff'?'#202834':'#ffffff';ctx.lineWidth=Math.max(2,w*.003);const [x,y]=xy(a.from);ctx.strokeText(a.text,x,y);ctx.fillText(a.text,x,y);}
   else {const [x1,y1]=xy(a.from),[x2,y2]=xy(a.to);
    if(a.type==='arrow'){ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.stroke();const angle=Math.atan2(y2-y1,x2-x1),n=Math.max(12,w*.022);ctx.beginPath();ctx.moveTo(x2,y2);ctx.lineTo(x2-n*Math.cos(angle-.45),y2-n*Math.sin(angle-.45));ctx.lineTo(x2-n*Math.cos(angle+.45),y2-n*Math.sin(angle+.45));ctx.closePath();ctx.fill();}
    else if(a.type==='rect'){ctx.strokeRect(Math.min(x1,x2),Math.min(y1,y2),Math.abs(x2-x1),Math.abs(y2-y1));}
    else {const rx=Math.abs(x2-x1)/2,ry=Math.abs(y2-y1)/2;if(rx>0&&ry>0){ctx.ellipse((x1+x2)/2,(y1+y2)/2,rx,ry,0,0,Math.PI*2);ctx.stroke();}}
   }ctx.restore();
  }
 }
 async function render(data,marks=[],maxSide=Infinity){const im=await image(data),canvas=document.createElement('canvas');const scale=Math.min(1,maxSide/Math.max(im.naturalWidth,im.naturalHeight));canvas.width=Math.max(1,Math.round(im.naturalWidth*scale));canvas.height=Math.max(1,Math.round(im.naturalHeight*scale));draw(canvas.getContext('2d'),im,M.annotations(marks));return canvas;}
 async function prepare(file){if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>25000000)throw Error('Choose a JPG, PNG or WebP photo under 25 MB.');const reader=new FileReader(),data=await new Promise((resolve,reject)=>{reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);}),im=await image(data);let side=2200,quality=.88;
  for(let n=0;n<10;n++){const scale=Math.min(1,side/Math.max(im.naturalWidth,im.naturalHeight)),c=document.createElement('canvas');c.width=Math.round(im.naturalWidth*scale)||1;c.height=Math.round(im.naturalHeight*scale)||1;const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(im,0,0,c.width,c.height);const out=c.toDataURL('image/jpeg',quality);if(out.length<=480000)return out;quality=Math.max(.55,quality-.05);side*=.9;}throw Error('This photo is too large. Try a smaller image.');
 }
 function attach(canvas,im,initial,onChange,onError){let marks=structuredClone(initial),tool='arrow',color='#e53935',text='',active=null,showOriginal=false;
  canvas.width=im.naturalWidth;canvas.height=im.naturalHeight;const ctx=canvas.getContext('2d');
  const paint=()=>draw(ctx,im,showOriginal?[]:active?[...marks,active]:marks);
  const point=e=>{const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))];};
  const down=e=>{if(e.button!==0||showOriginal)return;if(marks.length>=80)return onError('Use up to 80 marks per photo.');if(tool==='text'&&!text.trim())return onError('Type a label, then tap the photo.');e.preventDefault();canvas.setPointerCapture(e.pointerId);const p=point(e);active=tool==='pen'?{type:tool,color,points:[p]}:{type:tool,color,from:p,...(tool==='text'?{text:text.trim().slice(0,80)}:{to:p})};paint();};
  const move=e=>{if(!active)return;e.preventDefault();const p=point(e);if(active.type==='pen'){if(active.points.length<250)active.points.push(p);}else if(active.type!=='text')active.to=p;paint();};
  const finish=e=>{if(!active)return;if(e.type==='pointercancel'){active=null;paint();return;}const a=active;active=null;if(a.type==='pen'&&a.points.length<2||a.to&&Math.hypot(a.to[0]-a.from[0],a.to[1]-a.from[1])<.005){paint();return;}marks=M.annotations([...marks,a]);onChange(marks);paint();};
  canvas.addEventListener('pointerdown',down);canvas.addEventListener('pointermove',move);canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);paint();
  return {get:()=>structuredClone(marks),setTool:v=>{tool=v;active=null;showOriginal=false;paint();},setColor:v=>{color=v;},setText:v=>{text=v;},undo:()=>{active=null;marks.pop();onChange(marks);paint();},clear:()=>{active=null;marks=[];onChange(marks);paint();},original:v=>{showOriginal=v;active=null;paint();},dispose:()=>{canvas.removeEventListener('pointerdown',down);canvas.removeEventListener('pointermove',move);canvas.removeEventListener('pointerup',finish);canvas.removeEventListener('pointercancel',finish);}};
 }
 window.QNPhotoEditor={image,draw,render,prepare,attach};
})();
