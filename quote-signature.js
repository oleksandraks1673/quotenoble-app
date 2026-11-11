(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.QNSignature=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const statement='By signing, I accept the services, selected extras, total and terms shown in this quote.';
  const escape=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function validate(value,name){
    if(value?.type==='typed'){
      const text=String(value.text||'').trim();
      if(text.length<2||text.length>120||(name!==undefined&&text!==name))throw Error('Type your full name exactly as entered above.');
      return {type:'typed',text};
    }
    if(value?.type!=='drawn'||!Array.isArray(value.strokes)||!value.strokes.length||value.strokes.length>80)throw Error('Please add your signature before accepting.');
    let count=0,distance=0;
    const strokes=value.strokes.map(stroke=>{
      if(!Array.isArray(stroke)||stroke.length<2)throw Error('Please draw your signature again.');
      return stroke.map((p,i)=>{
        if(++count>1800||!Array.isArray(p)||p.length!==2||p.some(n=>typeof n!=='number'||!Number.isFinite(n)||n<0||n>1))throw Error('Please clear the signature and sign again.');
        if(i)distance+=Math.hypot(p[0]-stroke[i-1][0],p[1]-stroke[i-1][1]);
        return p.map(n=>Math.round(n*10000)/10000);
      });
    });
    if(count<3||distance<0.03)throw Error('Please draw your signature before accepting.');
    return {type:'drawn',strokes};
  }
  function svg(value){
    const s=validate(value);
    if(s.type==='typed')return '<div class="qn-typed-signature">'+escape(s.text)+'</div>';
    const paths=s.strokes.map(line=>'<path d="'+line.map((p,i)=>(i?'L':'M')+(p[0]*600).toFixed(2)+' '+(p[1]*200).toFixed(2)).join(' ')+'"/>').join('');
    return '<svg class="qn-signed-mark" viewBox="0 0 600 200" role="img" aria-label="Customer signature" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#222b35" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">'+paths+'</g></svg>';
  }
  function signedHTML(a){
    if(!a?.signature)return '';
    try{return '<section class="qn-signed-acceptance"><h3>Signed acceptance</h3>'+svg(a.signature)+'<p><strong>'+escape(a.name)+'</strong><br>'+escape(new Date(a.signedAt).toLocaleString('en-CA',{timeZoneName:'short'}))+'</p><p class="qn-signature-terms">'+escape(a.statement)+'</p></section>';}catch{return '';}
  }
  function mount(canvas,clear,mode,typed,onChange){
    let strokes=[],active=null,points=0;
    const ctx=canvas.getContext('2d');
    // A stable 3:1 drawing surface keeps the signature intact after rotation.
    canvas.width=1200;canvas.height=400;
    function paint(){ctx.clearRect(0,0,1200,400);ctx.strokeStyle='#222b35';ctx.lineWidth=6;ctx.lineCap='round';ctx.lineJoin='round';for(const line of strokes){ctx.beginPath();line.forEach((p,i)=>ctx[i?'lineTo':'moveTo'](p[0]*1200,p[1]*400));ctx.stroke();}}
    function changed(){onChange?.();}
    function position(e){const r=canvas.getBoundingClientRect();return [Math.max(0,Math.min(1,(e.clientX-r.left)/r.width)),Math.max(0,Math.min(1,(e.clientY-r.top)/r.height))].map(n=>Math.round(n*10000)/10000);}
    canvas.addEventListener('pointerdown',e=>{if(active||strokes.length>=80||points>=1800||e.button>0)return;e.preventDefault();active={id:e.pointerId,line:[position(e)]};strokes.push(active.line);points++;canvas.setPointerCapture(e.pointerId);changed();});
    canvas.addEventListener('pointermove',e=>{if(active?.id!==e.pointerId||points>=1800)return;e.preventDefault();const p=position(e),last=active.line.at(-1);if(Math.hypot(p[0]-last[0],p[1]-last[1])<.002)return;active.line.push(p);points++;paint();});
    function end(e){if(active?.id!==e.pointerId)return;if(active.line.length<2){points-=active.line.length;strokes.pop();}active=null;paint();changed();}
    ['pointerup','pointercancel','lostpointercapture'].forEach(event=>canvas.addEventListener(event,end));
    clear.onclick=()=>{strokes=[];active=null;points=0;paint();changed();};
    mode.onchange=()=>{canvas.hidden=clear.hidden=mode.value==='typed';typed.hidden=mode.value!=='typed';changed();};
    typed.addEventListener('input',changed);
    return {value:()=>validate(mode.value==='typed'?{type:'typed',text:typed.value}:{type:'drawn',strokes}),clear:()=>clear.onclick()};
  }
  function drawPDF(pdf,signature,x,y,width,height){
    const s=validate(signature);
    pdf.setDrawColor(34,43,53);pdf.setLineWidth(1.4);
    if(s.type==='typed'){pdf.setFont('times','italic');pdf.setFontSize(20);pdf.text(pdf.splitTextToSize(s.text,width),x,y+25);return;}
    for(const line of s.strokes)for(let i=1;i<line.length;i++)pdf.line(x+line[i-1][0]*width,y+line[i-1][1]*height,x+line[i][0]*width,y+line[i][1]*height);
  }
  return {statement,validate,svg,signedHTML,mount,drawPDF};
});
