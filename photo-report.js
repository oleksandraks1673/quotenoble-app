(function(){
 'use strict';let fonts;
 async function loadFonts(){if(!fonts)fonts=Promise.all(['DejaVuSans.ttf','DejaVuSans-Bold.ttf'].map(async name=>{const r=await fetch('/vendor/photo-fonts/'+name,{cache:'force-cache'});if(!r.ok)throw Error('PDF font could not be loaded. Check your connection and retry.');const bytes=new Uint8Array(await r.arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);})).catch(e=>{fonts=null;throw e;});return fonts;}
 async function build({job,photos,profile,summary='',language='en',check=()=>{}}){
  const Ctor=window.jspdf?.jsPDF;if(!Ctor)throw Error('PDF library is not ready. Refresh and retry.');const fontData=await loadFonts();check();
  const ru=language==='ru',uk=language==='uk',tr=(en,r,u)=>ru?r:uk?u||r:en;
  const p=new Ctor({unit:'pt',format:'letter',compress:true});p.addFileToVFS('QNPhotoRegular.ttf',fontData[0]);p.addFont('QNPhotoRegular.ttf','QNPhoto','normal');p.addFileToVFS('QNPhotoBold.ttf',fontData[1]);p.addFont('QNPhotoBold.ttf','QNPhoto','bold');
  const W=612,H=792,L=36,R=576,ink=[32,40,52],muted=[103,115,131],gold=[181,103,23],bottom=738;let y=0,photoNumber=0;
  p.qnPhotoTargets=[];
  const font=(size,bold=false,color=ink)=>{p.setFont('QNPhoto',bold?'bold':'normal');p.setFontSize(size);p.setTextColor(...color);};
  const phase=s=>s==='before'?tr('BEFORE','ДО РАБОТЫ','ДО РОБОТИ'):s==='progress'?tr('DURING','В ПРОЦЕССЕ','У ПРОЦЕСІ'):tr('AFTER','ПОСЛЕ РАБОТЫ','ПІСЛЯ РОБОТИ');
  const header=(stage,continued=false)=>{
   let x=L;
   if(/^data:image\/(png|jpeg|webp);base64,/.test(profile.logo||'')){try{const prop=p.getImageProperties(profile.logo),s=Math.min(56/prop.width,30/prop.height);p.addImage(profile.logo,prop.fileType||'PNG',L,14,prop.width*s,prop.height*s);x=104;}catch{}}
   font(11,true);p.text(p.splitTextToSize(String(profile.businessName||'Quote.Noble'),350).slice(0,2),x,25,{lineHeightFactor:1.2});font(7,false,muted);p.text(tr('PROJECT PHOTO REPORT','ФОТООТЧЁТ ПО ПРОЕКТУ','ФОТОЗВІТ ПРОЄКТУ'),x,48);
   font(7,false,muted);p.text(new Date().toLocaleDateString(ru?'ru-RU':uk?'uk-UA':'en-CA'),R,24,{align:'right'});p.setDrawColor(...gold);p.setLineWidth(1.2);p.line(L,59,R,59);
   font(14,true);const title=p.splitTextToSize(String(job.title||tr('Project','Проект','Проєкт')),R-L);p.text(title.slice(0,2),L,81,{lineHeightFactor:1.2});y=81+(Math.min(2,title.length)-1)*17;
   font(8,false,muted);if(job.client){y+=17;const customer=p.splitTextToSize(tr('Customer: ','Клиент: ','Клієнт: ')+String(job.client),R-L);p.text(customer.slice(0,2),L,y,{lineHeightFactor:1.2});y+=(Math.min(2,customer.length)-1)*10;}
   y+=21;font(9,true,gold);p.text(phase(stage)+(continued?' / '+tr('continued','продолжение','продовження'):''),L,y);y+=16;
  };
  const newPage=(stage,continued=false)=>{p.addPage();header(stage,continued);};
  const textLines=(lines,{size=9,color=ink,leading=12,stage}={})=>{for(const line of lines){if(y+leading>bottom)newPage(stage,true);font(size,false,color);p.text(line,L,y);y+=leading;}};
  const noteX=374,noteWidth=R-noteX,imageWidth=318,gap=20;
  const caption=data=>{font(10.5);return data.caption?.trim()?p.splitTextToSize(data.caption.trim(),noteWidth):[];};
  function card(item,top,height){
   const {data,canvas}=item;photoNumber++;
   const label=tr('Photo ','Фото ','Фото ')+String(photoNumber).padStart(2,'0');
   const imageHeight=height-20,scale=Math.min(imageWidth/canvas.width,imageHeight/canvas.height);
   const w=canvas.width*scale,h=canvas.height*scale,ix=L+(imageWidth-w)/2,iy=top+(imageHeight-h)/2;
   const image=canvas.toDataURL('image/jpeg',.93);p.addImage(image,'JPEG',ix,iy,w,h);
   p.qnPhotoTargets.push({page:p.getNumberOfPages(),x:ix,y:iy,width:w,height:h,image,label,caption:data.caption||''});
   font(10,true);p.text(label,noteX,top+11);
   const stamp=new Date(data.created_at),date=Number.isFinite(stamp.getTime())?stamp.toLocaleString(ru?'ru-RU':uk?'uk-UA':'en-CA',{dateStyle:'short',timeStyle:'short'}):'';
   const who=data.created_by?data.created_by===(window.qnCompanySession?.ownerId||window.qnApprovalSession?.user?.id)?tr('Owner','Владелец','Власник'):tr('Partner','Партнёр','Партнер'):tr('Team','Команда','Команда');
   font(7.5,false,muted);const meta=p.splitTextToSize([date,who].filter(Boolean).join('  ·  '),noteWidth);p.text(meta,noteX,top+26,{lineHeightFactor:1.3});
   const lines=caption(data),textY=top+42+(meta.length-1)*10,leading=14;
   const capacity=Math.max(1,Math.floor((top+imageHeight-textY)/leading)+1);
   const overflowing=lines.length>capacity,shown=overflowing?Math.max(0,capacity-1):capacity;
   font(10.5);if(lines.length)p.text(lines.slice(0,shown),noteX,textY,{lineHeightFactor:leading/10.5});
   if(overflowing){font(8,false,muted);p.text(tr('Additional notes follow','Продолжение описания далее','Продовження опису далі'),noteX,textY+shown*leading,{maxWidth:noteWidth});}
   p.setDrawColor(229,231,235);p.setLineWidth(.5);p.line(L,top+height-9,R,top+height-9);
   return overflowing?{label,lines:lines.slice(shown)}:null;
  }
  let first=true;
  for(const stage of window.QNPhotoModel.stages){const group=photos.filter(r=>r.stage===stage);if(!group.length)continue;
   if(first){header(stage);first=false;if(summary.trim()){font(9);textLines(p.splitTextToSize(summary.trim(),R-L),{color:muted,stage});y+=12;}}else newPage(stage);
   for(let start=0;start<group.length;start+=3){
    check();if(bottom-y<3*176)newPage(stage,true);
    const rowHeight=Math.min(198,Math.floor((bottom-y)/3)),top=y,overflow=[];
    for(const [index,data] of group.slice(start,start+3).entries()){
     const canvas=await window.QNPhotoEditor.render(data.image,data.annotations||[]);check();
     const extra=card({data,canvas},top+index*rowHeight,rowHeight);if(extra)overflow.push(extra);
    }
    for(const extra of overflow){newPage(stage,true);font(10,true);p.text(extra.label+' / '+tr('continued notes','продолжение описания','продовження опису'),L,y);y+=20;
     font(10.5);const continuation=p.splitTextToSize(extra.lines.join(' '),R-L);textLines(continuation,{size:10.5,leading:14,stage});y+=gap;}
    if(start+3<group.length)newPage(stage,true);
   }
  }
  const total=p.getNumberOfPages();for(let i=1;i<=total;i++){p.setPage(i);p.setDrawColor(231,224,214);p.setLineWidth(.5);p.line(L,754,R,754);font(8,false,muted);p.text('Quote.Noble  |  '+tr('Project photo report','Фотоотчёт по проекту','Фотозвіт проєкту'),L,770);p.text(i+' / '+total,R,770,{align:'right'});}
  p.setProperties({title:tr('Photo report - ','Фотоотчёт - ','Фотозвіт - ')+job.title,author:profile.businessName||'Quote.Noble',subject:'Before, during and after project photos'});return p;
 }
 window.QNPhotoReport={build,preview:async args=>{const pdf=await build(args);args.check?.();if(typeof openPDFPreview!=='function')throw Error('PDF preview is not ready. Refresh and retry.');const filename='QuoteNoble-Photo-Report-'+String(args.job.id).replace(/[^A-Za-z0-9_-]/g,'').slice(0,60)+'.pdf';await openPDFPreview('photo-report',args.job.id,{photoPDF:{pdf,filename,check:args.check},title:String(args.job.title||'Project photo report')});},download:async args=>{const pdf=await build(args);args.check?.();pdf.save('QuoteNoble-Photo-Report-'+String(args.job.id).replace(/[^A-Za-z0-9_-]/g,'').slice(0,60)+'.pdf');}};
})();
