/* Quote.Noble unified quote/invoice document preview — presentation only. */
(function(){
"use strict";
const css=`
.qn-document-preview{background:#fffaf5!important;border-radius:22px!important;box-shadow:0 22px 70px #17203335!important;overflow:hidden!important}
.qn-document-preview .qn-document-header{display:flex;align-items:center;gap:12px;padding:16px 18px;background:#fff4e9;color:#263142;border-bottom:2px solid #df7a20}
.qn-document-preview .qn-document-header .qn-document-icon{width:44px;height:44px;border-radius:12px;background:#ffead7;display:grid;place-items:center;color:#cc6209;font-size:23px}
.qn-document-preview .qn-document-header strong{display:block;font-size:17px}
.qn-document-preview .qn-document-header small{display:block;color:#6b7280;margin-top:3px}
.qn-document-preview .qn-document-actions{display:flex!important;gap:10px!important;flex-wrap:wrap!important;padding:12px 16px!important;background:#fffaf5!important;border-top:1px solid #f0dcca!important;position:sticky!important;bottom:0!important;z-index:2!important}
.qn-document-preview .qn-document-actions button{flex:1 1 110px!important;min-height:46px!important;border-radius:12px!important;font-weight:700!important;white-space:nowrap!important}
.qn-document-preview .qn-document-actions button.qn-download{background:#df7909!important;color:white!important;border:0!important}
@media(max-width:600px){.qn-document-preview{width:calc(100vw - 20px)!important;max-width:100%!important;max-height:92dvh!important;overflow:auto!important}.qn-document-preview .qn-document-actions{padding-bottom:max(12px,env(safe-area-inset-bottom))!important}}
`;
const style=document.createElement("style");style.id="qn-document-preview-style";style.textContent=css;document.head.append(style);
function enhance(){
  for(const root of document.querySelectorAll('[role="dialog"],.modal,.modal-content,.dialog')){
    if(root.classList.contains("qn-document-preview"))continue;
    const buttons=[...root.querySelectorAll("button")];
    const share=buttons.find(b=>/^\s*(?:↗\s*)?share\s*$/i.test(b.textContent||""));
    const pdf=buttons.find(b=>/^(?:↓\s*)?pdf$|download pdf/i.test((b.textContent||"").trim()));
    const close=buttons.find(b=>/^close$/i.test((b.textContent||"").trim()));
    if(!share||!pdf||!close)continue;
    const bar=share.parentElement;
    if(!bar||bar!==pdf.parentElement||bar!==close.parentElement)continue;
    root.classList.add("qn-document-preview");
    bar.classList.add("qn-document-actions");
    pdf.classList.add("qn-download");
    pdf.textContent="↓ Download PDF";
    if(!root.querySelector(".qn-document-header")){
      const header=document.createElement("div");header.className="qn-document-header";
      const icon=document.createElement("span");icon.className="qn-document-icon";icon.textContent="▤";
      const label=document.createElement("span");
      const title=document.createElement("strong");title.textContent="Document preview";
      const subtitle=document.createElement("small");subtitle.textContent="Review before sharing or downloading";
      label.append(title,subtitle);header.append(icon,label);root.prepend(header);
    }
  }
}
const ready=()=>{enhance();new MutationObserver(enhance).observe(document.body,{childList:true,subtree:true})};
if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ready,{once:true});else ready();
})();