/* Quote.Noble in-app PDF viewer and editable Smart Template scope formatting. */
(function(){
"use strict";
const css=document.createElement("style");
css.textContent='#qn-pdf-overlay{position:fixed;inset:0;z-index:2147483645;background:#f4eee8;display:flex;flex-direction:column;color:#263142}#qn-pdf-overlay .qn-pdf-top{background:#fff7ef;border-bottom:2px solid #d97706;display:flex;align-items:center;gap:12px;padding:12px 16px;padding-top:max(12px,env(safe-area-inset-top))}#qn-pdf-overlay .qn-pdf-top strong{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#qn-pdf-overlay .qn-pdf-top button,#qn-pdf-overlay .qn-pdf-bottom button{border:1px solid #e8c7a5;border-radius:12px;background:white;color:#263142;padding:12px;font-weight:700;min-height:45px}#qn-pdf-overlay .qn-pdf-bottom{background:#fff7ef;display:flex;gap:10px;padding:12px;padding-bottom:max(12px,env(safe-area-inset-bottom))}#qn-pdf-overlay .qn-pdf-bottom button{flex:1}#qn-pdf-overlay .qn-pdf-bottom .primary{background:#d97706;color:white;border-color:#d97706}#qn-pdf-overlay .qn-pdf-pages{flex:1;overflow:auto;padding:3px 0;background:#fff;display:block;overflow:auto;overscroll-behavior:contain}#qn-pdf-overlay canvas{display:block;max-width:none;height:auto;background:white;margin:0 auto 6px;box-shadow:none}#qn-pdf-overlay .qn-pdf-loading{margin:auto;text-align:center;color:#475569;padding:24px}';
document.head.append(css);
const sentences=s=>String(s||"").replace(/^\s*[•-]\s*/gm,"").trim().split(/(?<=[.!?])\s+(?=[A-Z])/).map(x=>x.trim()).filter(Boolean);
function format(s){const lines=sentences(s);return lines.length>1?lines.map(x=>"• "+x).join("\n"):s}
document.addEventListener("click",e=>{
 const b=e.target.closest("button");if(!b)return;
 if(!/add to quote|insert into quote/i.test(b.textContent||""))return;
 const before=new Map([...document.querySelectorAll("textarea.desc,input.desc")].map(x=>[x,x.value]));
 setTimeout(()=>{
  for(const field of document.querySelectorAll("textarea.desc,input.desc")){
   if(field.value&&field.value!==before.get(field)&&!/^\s*•/m.test(field.value)){
    const updated=format(field.value);
    if(updated!==field.value){field.value=updated;field.dispatchEvent(new Event("input",{bubbles:true}));field.dispatchEvent(new Event("change",{bubbles:true}))}
   }
  }
 },80);
},true);
window.qnOpenPDFPreview=function(kind,id){
 if(typeof window.buildPDF!=="function"){alert("PDF preview is unavailable. Please reload and try again.");return}
 const b=window.buildPDF(kind,id);if(!b)return;
 document.querySelector("#qn-pdf-overlay")?.remove();
 const url=URL.createObjectURL(b.pdf.output("blob"));
 const layer=document.createElement("section");layer.id="qn-pdf-overlay";layer.setAttribute("role","dialog");layer.setAttribute("aria-modal","true");layer.setAttribute("aria-label","PDF preview");
 const top=document.createElement("header");top.className="qn-pdf-top";
 const back=document.createElement("button");back.textContent="← Back";back.type="button";
 const title=document.createElement("strong");title.textContent=b.filename;
 const zoomOut=document.createElement("button");zoomOut.type="button";zoomOut.textContent="−";zoomOut.setAttribute("aria-label","Make PDF text smaller");
 const zoomIn=document.createElement("button");zoomIn.type="button";zoomIn.textContent="+";zoomIn.setAttribute("aria-label","Make PDF text larger");
 top.append(back,title,zoomOut,zoomIn);
 const pages=document.createElement("main");pages.className="qn-pdf-pages";
 const loading=document.createElement("div");loading.className="qn-pdf-loading";loading.textContent="Rendering document preview…";pages.append(loading);
 let zoom=1.3;
 let renderSerial=0;
 const render=async()=>{
   const serial=++renderSerial;
   try{
     if(!window.pdfjsLib){
       await new Promise((resolve,reject)=>{
         const script=document.createElement("script");script.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";
         script.onload=resolve;script.onerror=()=>reject(new Error("PDF preview library could not load"));document.head.append(script);
       });
     }
     const pdfjs=window.pdfjsLib;
     pdfjs.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
     const data=new Uint8Array(b.pdf.output("arraybuffer"));
     const documentTask=pdfjs.getDocument({data});
     const doc=await documentTask.promise;
     if(!pages.isConnected)return;
     if(serial!==renderSerial)return;
     pages.replaceChildren();
     for(let n=1;n<=doc.numPages;n++){
       const page=await doc.getPage(n);
       if(!pages.isConnected||serial!==renderSerial)return;
       const original=page.getViewport({scale:1});
       const scale=Math.min(3.5,Math.max(.7,pages.clientWidth/original.width*zoom));
       const viewport=page.getViewport({scale});
       const canvas=document.createElement("canvas");
       const ctx=canvas.getContext("2d");
       canvas.width=Math.round(viewport.width*devicePixelRatio);
       canvas.height=Math.round(viewport.height*devicePixelRatio);
       canvas.style.width=Math.round(viewport.width)+"px";
       canvas.style.height=Math.round(viewport.height)+"px";
       pages.append(canvas);
       await page.render({canvasContext:ctx,viewport,transform:[devicePixelRatio,0,0,devicePixelRatio,0,0]}).promise;
     }
   }catch(error){loading.textContent="Preview could not render. You can still download or share this PDF.";pages.replaceChildren(loading);console.error("Quote.Noble PDF preview",error)}
 };
 zoomOut.onclick=()=>{zoom=Math.max(1,Math.round((zoom-.2)*10)/10);render()};
 zoomIn.onclick=()=>{zoom=Math.min(2.6,Math.round((zoom+.2)*10)/10);render()};
 const bottom=document.createElement("footer");bottom.className="qn-pdf-bottom";
 const share=document.createElement("button");share.textContent="↗ Share";
 const download=document.createElement("button");download.className="primary";download.textContent="↓ Download PDF";
 const close=()=>{layer.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)};
 back.onclick=close;
 share.onclick=async()=>{try{const file=new File([b.pdf.output("blob")],b.filename,{type:"application/pdf"});if(navigator.canShare?.({files:[file]})){await navigator.share({files:[file],title:b.filename});return}}catch(e){if(e.name==="AbortError")return}alert("Sharing this PDF is not supported in this browser. Use Download PDF instead.")};
 download.onclick=()=>{
   const a=document.createElement("a");
   const suffix=new Date().toISOString().replace(/[-:TZ.]/g,"").slice(0,14);
   const stem=b.filename.replace(/\.pdf$/i,"");
   a.href=url;
   a.download=stem+"-"+suffix+".pdf";
   document.body.append(a);a.click();a.remove();
 };
 bottom.append(share,download);layer.append(top,pages,bottom);document.body.append(layer);render();
};
})();