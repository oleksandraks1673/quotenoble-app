(()=>{
 'use strict';let fonts;
 async function fontData(){if(!fonts)fonts=Promise.all(['DejaVuSans.ttf','DejaVuSans-Bold.ttf'].map(async n=>{const r=await fetch('/vendor/photo-fonts/'+n);if(!r.ok)throw Error('PDF font could not be loaded. Check your connection and retry.');const bytes=new Uint8Array(await r.arrayBuffer());let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);})).catch(e=>{fonts=null;throw e;});return fonts;}
 async function build(report,profile,lang='en'){
  window.QNInspectionModel.validate(report);const T=(en,ru,uk)=>lang==='ru'?ru:lang==='uk'?uk||ru:en;
  const C=window.jspdf?.jsPDF;if(!C)throw Error('PDF library is not ready. Refresh and retry.');const data=await fontData(),p=new C({unit:'pt',format:'letter',compress:true});
  p.addFileToVFS('InspectionRegular.ttf',data[0]);p.addFont('InspectionRegular.ttf','Inspection','normal');p.addFileToVFS('InspectionBold.ttf',data[1]);p.addFont('InspectionBold.ttf','Inspection','bold');
  const L=42,R=570,W=528,B=730;let y=0;const photoItems=[],photoNotes=[];p.qnPhotoTargets=[];
  const font=(size=10,bold=false,color=[36,45,57])=>{p.setFont('Inspection',bold?'bold':'normal');p.setFontSize(size);p.setTextColor(...color);};
  const header=()=>{
   p.setFillColor(247,242,234);p.rect(0,0,612,102,'F');p.setFillColor(156,74,32);p.rect(0,0,8,102,'F');let x=L;
   if(/^data:image\/(png|jpeg|webp);base64,/.test(profile.logo||'')){try{const props=p.getImageProperties(profile.logo),s=Math.min(82/props.width,38/props.height);p.addImage(profile.logo,props.fileType||'PNG',L,22,props.width*s,props.height*s);x=138;}catch{}}
   font(14,true);p.text(p.splitTextToSize(String(profile.businessName||'Quote.Noble'),R-x).slice(0,2),x,34);
   font(10,true);p.text(T('INSPECTION REPORT','ОТЧЁТ ОБ ОСМОТРЕ','ЗВІТ ПРО ОГЛЯД'),L,81);font(8);p.text(report.number,R,81,{align:'right'});p.setDrawColor(184,111,36);p.setLineWidth(2);p.line(L,103,R,103);y=127;
  };
  const newPage=()=>{p.addPage();header();};const room=n=>{if(y+n>B)newPage();};
  function paragraph(value,{size=10,bold=false,color,space=8}={}){font(size,bold,color);const lines=p.splitTextToSize(String(value||'—'),W);for(const line of lines){room(size+6);font(size,bold,color);p.text(line,L,y);y+=size+5;}y+=space;}
  function heading(value){room(54);paragraph(value,{size:13,bold:true,color:[160,87,23],space:5});}
  header();paragraph(report.title||T('Property inspection','Осмотр объекта','Огляд об’єкта'),{size:18,bold:true});
  paragraph(T('Customer: ','Клиент: ','Клієнт: ')+((report.client?.name||'').trim()||T('Not provided','Не указан','Не вказано')),{bold:true});
  paragraph(T('Address: ','Адрес: ','Адреса: ')+report.address);
  if(report.client?.phone)paragraph(T('Phone: ','Телефон: ','Телефон: ')+report.client.phone);
  if(report.client?.email)paragraph('Email: '+report.client.email);
  paragraph(T('Inspection date: ','Дата осмотра: ','Дата огляду: ')+report.date);
  if(report.inspector)paragraph(T('Inspector: ','Осмотр провёл: ','Огляд провів: ')+report.inspector);
  paragraph(T('Status: ','Статус: ','Статус: ')+(report.status==='complete'?T('Completed','Завершён','Завершено'):T('Draft','Черновик','Чернетка')));
  if(report.summary?.trim()){heading(T('Overall summary','Общее заключение','Загальний висновок'));paragraph(report.summary);}
  for(let i=0;i<report.findings.length;i++){
   const f=report.findings[i];room(100);heading((i+1)+'. '+(f.title||T('Finding','Результат осмотра','Результат огляду')));
   paragraph(f.severity==='urgent'?T('URGENT','СРОЧНО','ТЕРМІНОВО'):f.severity==='repair'?T('REPAIR NEEDED','НУЖЕН РЕМОНТ','ПОТРІБЕН РЕМОНТ'):T('GOOD CONDITION','ВСЁ ХОРОШО','УСЕ ДОБРЕ'),{size:9,bold:true,color:f.severity==='urgent'?[170,43,30]:[111,92,67]});
   paragraph(f.description);
   if(f.recommendation?.trim()){heading(T('Recommended work','Рекомендуемые работы','Рекомендовані роботи'));paragraph(f.recommendation);}
   for(const photo of f.photos||[])photoItems.push({photo,finding:i+1,title:f.title||T('Finding','Результат осмотра','Результат огляду')});
  }
  // Dedicated photo sheets keep three pictures together, independent of text length.
  function card(item,x,top,width,height){
   const label=T('Photo ','Фото ','Фото ')+String(item.number).padStart(2,'0');
   const pad=12,imageWidth=280,imageHeight=height-pad*2,textX=x+imageWidth+pad*2,textWidth=width-imageWidth-pad*3;
   p.setFillColor(255,255,255);p.setDrawColor(225,216,203);p.setLineWidth(.7);p.roundedRect(x,top,width,height,7,7,'FD');
   p.setFillColor(246,244,239);p.roundedRect(x+pad,top+pad,imageWidth,imageHeight,4,4,'F');
   const scale=Math.min((imageWidth-8)/item.canvas.width,(imageHeight-8)/item.canvas.height),w=item.canvas.width*scale,h=item.canvas.height*scale;
   const ix=x+pad+(imageWidth-w)/2,iy=top+pad+(imageHeight-h)/2,image=item.canvas.toDataURL('image/jpeg',.93);
   p.addImage(image,'JPEG',ix,iy,w,h);
   p.qnPhotoTargets.push({page:p.getNumberOfPages(),x:ix,y:iy,width:w,height:h,image,label,caption:item.photo.caption||''});
   font(10,true,[160,87,23]);p.text(label,textX,top+23);
   font(9,true);const context=p.splitTextToSize(item.finding+'. '+item.title,textWidth);p.text(context.slice(0,2),textX,top+40,{lineHeightFactor:1.25});
   const captionTop=top+40+Math.min(context.length,2)*12+12;
   font(9.5);const caption=p.splitTextToSize(String(item.photo.caption||'').trim(),textWidth);
   const maxLines=Math.max(1,Math.floor((top+height-22-captionTop)/12)),long=caption.length>maxLines;
   if(caption.length)p.text(caption.slice(0,maxLines),textX,captionTop,{lineHeightFactor:1.26});
   if(long){font(8,false,[160,87,23]);p.text(T('Continued in photo notes','Продолжение в примечаниях','Продовження у примітках'),textX,top+height-12);photoNotes.push({label,caption:item.photo.caption});}
  }
  for(let start=0;start<photoItems.length;start+=3){
   newPage();heading(T('Inspection photos','Фотографии осмотра','Фотографії огляду'));
   const items=photoItems.slice(start,start+3);
   for(let i=0;i<items.length;i++){items[i]={...items[i],number:start+i+1,canvas:await window.QNPhotoEditor.render(items[i].photo.image,items[i].photo.annotations||[])};}
   const top=y,gap=12,height=Math.floor((B-top-gap*2)/3);
   items.forEach((item,index)=>card(item,L,top+index*(height+gap),W,height));
  }
  if(photoNotes.length){newPage();heading(T('Photo notes','Примечания к фотографиям','Примітки до фотографій'));for(const note of photoNotes){heading(note.label);paragraph(note.caption);}}
  const count=p.getNumberOfPages();for(let i=1;i<=count;i++){p.setPage(i);p.setDrawColor(220,212,202);p.setLineWidth(.5);p.line(L,750,R,750);font(8,false,[108,99,87]);p.text('Quote.Noble · '+report.number,L,768);p.text(i+' / '+count,R,768,{align:'right'});}
  p.setProperties({title:T('Inspection Report','Отчёт об осмотре','Звіт про огляд')+' · '+report.number,author:profile.businessName||'Quote.Noble'});return p;
 }
 window.QNInspectionPDF={build};
})();
