// Scroll the viewport itself rather than the locked background page.
// Pointer capture keeps a drag working over photos and outside their edges.
function qnBindPhotoPan(viewport,isZoomed,onPinch){
  const pointers=new Map();let start=null,pinch=null,moved=false,suppressUntil=0;
  const distance=()=>{const a=[...pointers.values()];return a.length<2?0:Math.hypot(a[1].x-a[0].x,a[1].y-a[0].y);};
  const down=e=>{if(!isZoomed()||e.button>0)return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});viewport.setPointerCapture?.(e.pointerId);if(pointers.size===1){start={x:e.clientX,y:e.clientY,left:viewport.scrollLeft,top:viewport.scrollTop};moved=false;}else if(pointers.size===2){pinch={start:distance(),factor:1};moved=true;}viewport.classList.add('qn-is-panning');};
  const move=e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size>1&&pinch){pinch.factor=distance()/Math.max(1,pinch.start);moved=true;}else if(start&&!pinch){const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.hypot(dx,dy)>4)moved=true;viewport.scrollLeft=start.left-dx;viewport.scrollTop=start.top-dy;}e.preventDefault();};
  const end=e=>{if(!pointers.has(e.pointerId))return;pointers.delete(e.pointerId);if(moved)suppressUntil=Date.now()+350;if(!pointers.size){viewport.classList.remove('qn-is-panning');const factor=pinch?.factor;start=pinch=null;if(e.type!=='pointercancel'&&factor&&Math.abs(factor-1)>.05)onPinch?.(factor);}};
  const click=e=>{if(Date.now()<suppressUntil){e.preventDefault();e.stopImmediatePropagation();}};
  viewport.addEventListener('pointerdown',down);viewport.addEventListener('pointermove',move,{passive:false});viewport.addEventListener('pointerup',end);viewport.addEventListener('pointercancel',end);viewport.addEventListener('click',click,true);
  return ()=>{viewport.removeEventListener('pointerdown',down);viewport.removeEventListener('pointermove',move);viewport.removeEventListener('pointerup',end);viewport.removeEventListener('pointercancel',end);viewport.removeEventListener('click',click,true);pointers.clear();};
}
/* PDF preview stays inside the app, including installed Android apps. */
let qnPdfViewerLibrary;
async function openPDFPreview(kind, id, exportSnapshot) {
  if(document.querySelector('.qn-pdf-preview'))return;
  const previousFocus=document.activeElement;
  const previousOverflow=document.body.style.overflow;
  const dialog=document.createElement('dialog');
  dialog.className='qn-pdf-preview';
  dialog.setAttribute('aria-labelledby','qn-pdf-preview-title');
  dialog.innerHTML='<header class="qn-pdf-top"><strong id="qn-pdf-preview-title">PDF preview</strong><button type="button" class="qn-pdf-close" data-pdf-close aria-label="Close PDF preview">×</button></header>'+
    '<div class="qn-pdf-tools"><div class="qn-pdf-pages"><button type="button" data-pdf-prev aria-label="Previous page" disabled>‹</button><span data-pdf-page aria-live="polite">Loading…</span><button type="button" data-pdf-next aria-label="Next page" disabled>›</button></div><button type="button" data-pdf-larger aria-pressed="false" disabled>Zoom in</button></div>'+
    '<div class="qn-pdf-sheet" tabindex="0" aria-label="PDF page. Scroll to view; drag when zoomed."><p data-pdf-status role="status">Preparing your PDF…</p><div class="qn-pdf-page-wrap"><canvas aria-label="PDF document page" hidden></canvas><div class="qn-pdf-photo-targets"></div></div></div>'+
    '<footer class="qn-pdf-bottom"><button type="button" class="btn btn-primary" data-pdf-download disabled>Download</button><button type="button" class="btn btn-outline" data-pdf-share disabled>Share PDF</button></footer>';
  document.body.appendChild(dialog);
  dialog.showModal();
  document.body.style.overflow='hidden';
  const select=s=>dialog.querySelector(s);
  const status=select('[data-pdf-status]'),sheet=select('.qn-pdf-sheet'),canvas=select('canvas');
  const prev=select('[data-pdf-prev]'),next=select('[data-pdf-next]'),pageLabel=select('[data-pdf-page]');
  const larger=select('[data-pdf-larger]'),photoTargets=select('.qn-pdf-photo-targets');let focusedPhoto=null;
  const pageWrap=select('.qn-pdf-page-wrap');
  let closed=false,loadingTask,pdfDoc,renderTask,built,currentPage=1,zoom=1,renderSerial=0,resizeTimer;
  const stopPan=qnBindPhotoPan(sheet,()=>zoom>1,factor=>{zoom=Math.max(1,Math.min(3,zoom*factor));sheet.classList.toggle('qn-pdf-zoomed',zoom>1);render();});
  function cleanup(){
    if(closed)return;
    closed=true;renderSerial++;stopPan();focusedPhoto?.close();focusedPhoto?.remove();
    clearTimeout(resizeTimer);window.removeEventListener('resize',resize);
    if(renderTask)renderTask.cancel();
    if(loadingTask)Promise.resolve(loadingTask.destroy()).catch(()=>{});
    dialog.remove();document.body.style.overflow=previousOverflow;
    if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
  }
  function close(){dialog.close();cleanup();}
  function fail(error){
    if(closed||error?.name==='RenderingCancelledException')return;
    console.error('PDF preview failed:',error);
    status.hidden=false;
    status.textContent=built?'Preview could not be displayed. You can still download or share this PDF.':'Could not create the PDF. Close this preview and try again.';
  }
  async function render(){
    const serial=++renderSerial;photoTargets.replaceChildren();
    if(renderTask){const previous=renderTask;previous.cancel();try{await previous.promise;}catch(e){}}
    if(closed||serial!==renderSerial||!pdfDoc)return;
    try{
      const page=await pdfDoc.getPage(currentPage);
      if(closed||serial!==renderSerial)return;
      const base=page.getViewport({scale:1});
      const sheetStyle=getComputedStyle(sheet);
      const width=Math.max(260,sheet.clientWidth-parseFloat(sheetStyle.paddingLeft)-parseFloat(sheetStyle.paddingRight));
      const scale=(width/base.width)*zoom;
      const viewport=page.getViewport({scale});
      // Match sharp phone displays instead of capping every device at 2x.
      // Bound zoomed pages to 12 MP and 4096 px per side to limit canvas memory.
      const ratio=Math.min(window.devicePixelRatio||1,
        Math.sqrt(12000000/(viewport.width*viewport.height)),
        4096/Math.max(viewport.width,viewport.height));
      canvas.width=Math.max(1,Math.floor(viewport.width*ratio));
      canvas.height=Math.max(1,Math.floor(viewport.height*ratio));
      canvas.style.width=viewport.width+'px';canvas.style.height=viewport.height+'px';pageWrap.style.width=viewport.width+'px';pageWrap.style.height=viewport.height+'px';
      canvas.hidden=false;
      renderTask=page.render({canvasContext:canvas.getContext('2d'),viewport,
        transform:[canvas.width/viewport.width,0,0,canvas.height/viewport.height,0,0]});
      await renderTask.promise;
      if(closed||serial!==renderSerial)return;
      photoTargets.replaceChildren();
      for(const target of built.pdf.qnPhotoTargets||[]){
        if(target.page!==currentPage)continue;const button=document.createElement('button');button.type='button';button.className='qn-pdf-photo-target';button.setAttribute('aria-label','Enlarge '+target.label+(target.caption?': '+target.caption:''));button.title='Tap to enlarge photo';
        button.style.left=(target.x/base.width*100)+'%';button.style.top=(target.y/base.height*100)+'%';button.style.width=(target.width/base.width*100)+'%';button.style.height=(target.height/base.height*100)+'%';
        button.onclick=()=>{try{built.check?.();showPhoto(target,button);}catch(error){fail(error);}};photoTargets.appendChild(button);
      }
      status.hidden=true;pageLabel.textContent='Page '+currentPage+' of '+pdfDoc.numPages;
      prev.disabled=currentPage===1;next.disabled=currentPage===pdfDoc.numPages;
      prev.hidden=next.hidden=pdfDoc.numPages===1;
      larger.disabled=false;larger.textContent=zoom===1?'Zoom in':'Fit width';
      larger.setAttribute('aria-pressed',String(zoom>1));
    }catch(error){fail(error);}
  }
  function showPhoto(target,trigger){
    if(focusedPhoto)return;const focus=document.createElement('dialog');focus.className='qn-pdf-photo-focus';focus.setAttribute('aria-label','Enlarged report photo');
    const all=built.pdf.qnPhotoTargets||[],bar=document.createElement('header'),label=document.createElement('strong'),previous=document.createElement('button'),nextPhoto=document.createElement('button'),zoomButton=document.createElement('button'),closeButton=document.createElement('button'),area=document.createElement('div'),image=document.createElement('img'),caption=document.createElement('p');
    let index=Math.max(0,all.indexOf(target)),photoZoom=1,active=target;
    for(const b of [previous,nextPhoto,zoomButton,closeButton])b.type='button';previous.textContent='‹';previous.setAttribute('aria-label','Previous photo');nextPhoto.textContent='›';nextPhoto.setAttribute('aria-label','Next photo');closeButton.textContent='×';closeButton.setAttribute('aria-label','Close enlarged photo');area.className='qn-pdf-photo-area';area.tabIndex=0;area.setAttribute('aria-label','Photo. Drag to move when zoomed.');image.decoding='async';image.draggable=false;
    bar.append(previous,label,nextPhoto,zoomButton,closeButton);area.append(image);focus.append(bar,area,caption);document.body.append(focus);focusedPhoto=focus;
    const applyZoom=()=>{const fit=Math.min(area.clientWidth/Math.max(1,image.naturalWidth),area.clientHeight/Math.max(1,image.naturalHeight));image.style.width=Math.round(image.naturalWidth*fit*photoZoom)+'px';image.style.height=Math.round(image.naturalHeight*fit*photoZoom)+'px';focus.classList.toggle('qn-photo-zoomed',photoZoom>1);zoomButton.textContent=photoZoom>1?'Fit photo':'Zoom in';zoomButton.setAttribute('aria-pressed',String(photoZoom>1));};
    const draw=()=>{active=all[index]||target;photoZoom=1;area.scrollLeft=area.scrollTop=0;focus.classList.remove('qn-photo-zoomed');image.style.width=image.style.height='';label.textContent=active.label+' · '+(index+1)+' / '+Math.max(1,all.length);image.alt=active.caption||active.label;image.onload=applyZoom;image.src=active.image;caption.textContent=active.caption||'';caption.hidden=!active.caption;zoomButton.textContent='Zoom in';zoomButton.setAttribute('aria-pressed','false');previous.disabled=index===0;nextPhoto.disabled=index>=all.length-1;};
    const navigate=delta=>{try{built.check?.();const to=index+delta;if(to<0||to>=all.length)return;index=to;draw();}catch(error){fail(error);focus.close();}};
    previous.onclick=()=>navigate(-1);nextPhoto.onclick=()=>navigate(1);
    focus.addEventListener('keydown',e=>{if(e.key==='ArrowLeft'){e.preventDefault();navigate(-1);}if(e.key==='ArrowRight'){e.preventDefault();navigate(1);}});
    const stop=qnBindPhotoPan(area,()=>photoZoom>1,factor=>{photoZoom=Math.max(1,Math.min(4,photoZoom*factor));applyZoom();});
    const resizePhoto=()=>applyZoom();window.addEventListener('resize',resizePhoto);
    closeButton.onclick=()=>focus.close();focus.addEventListener('close',()=>{stop();window.removeEventListener('resize',resizePhoto);focus.remove();focusedPhoto=null;if(trigger.isConnected)trigger.focus({preventScroll:true});},{once:true});
    zoomButton.onclick=()=>{photoZoom=photoZoom===1?2:1;applyZoom();area.scrollLeft=area.scrollTop=0;};image.ondblclick=()=>zoomButton.click();
    focus.showModal();draw();closeButton.focus({preventScroll:true});
  }
  function resize(){clearTimeout(resizeTimer);resizeTimer=setTimeout(render,150);}
  select('[data-pdf-close]').onclick=close;
  dialog.addEventListener('cancel',event=>{event.preventDefault();close();});
  dialog.addEventListener('close',cleanup);
  prev.onclick=()=>{if(currentPage>1){currentPage--;sheet.scrollTop=0;sheet.scrollLeft=0;render();}};
  next.onclick=()=>{if(pdfDoc&&currentPage<pdfDoc.numPages){currentPage++;sheet.scrollTop=0;sheet.scrollLeft=0;render();}};
  larger.onclick=()=>{zoom=zoom===1?1.8:1;sheet.classList.toggle('qn-pdf-zoomed',zoom>1);sheet.scrollLeft=sheet.scrollTop=0;sheet.scrollLeft=0;render();};
  window.addEventListener('resize',resize);
  window.qnTrackDialog?.(dialog,()=>openPDFPreview(kind,id,exportSnapshot));
  select('[data-pdf-close]').focus({preventScroll:true});
  try{
    // Let the visible loading state paint before generating the document.
    await new Promise(resolve=>requestAnimationFrame(()=>resolve()));
    if(closed)return;
    built=kind==='photo-report'?exportSnapshot?.photoPDF:kind==='inspection'?exportSnapshot?.inspectionPDF:buildPDF(kind,id,exportSnapshot);
    if(!built)throw Error('PDF generation unavailable');
    const bytes=built.pdf.output('arraybuffer');
    const blob=new Blob([bytes],{type:'application/pdf'});
    select('#qn-pdf-preview-title').textContent=kind==='photo-report'?(exportSnapshot?.title||'Project photo report'):(kind==='inspection'?'Inspection Report ':kind==='q'?'Quote ':'Invoice ')+(exportSnapshot?.doc?.number||'PDF');
    const download=select('[data-pdf-download]'),share=select('[data-pdf-share]');
    download.disabled=false;share.disabled=false;
    download.onclick=()=>{
      const url=URL.createObjectURL(blob),a=document.createElement('a');
      a.href=url;a.download=built.filename;document.body.appendChild(a);a.click();a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),60000);
    };
    share.onclick=async()=>{
      try{
        const file=new File([blob],built.filename,{type:'application/pdf'});
        if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:select('#qn-pdf-preview-title').textContent});}
        else download.click();
      }catch(error){if(error.name!=='AbortError')fail(error);}
    };
    if(!qnPdfViewerLibrary)qnPdfViewerLibrary=import('/vendor/pdfjs/pdf.mjs').catch(error=>{qnPdfViewerLibrary=null;throw error;});
    const pdfjs=await qnPdfViewerLibrary;
    if(closed)return;
    pdfjs.GlobalWorkerOptions.workerSrc='/vendor/pdfjs/pdf.worker.mjs';
    loadingTask=pdfjs.getDocument({data:new Uint8Array(bytes),standardFontDataUrl:'/vendor/pdfjs/standard_fonts/'});
    pdfDoc=await loadingTask.promise;
    if(closed)return;
    await render();
  }catch(error){fail(error);}
}
