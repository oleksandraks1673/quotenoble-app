/* Quote.Noble production-based Smart Templates UI */
(function(){
"use strict";
const lib=()=>window.QuoteNobleSmartTemplates;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function attach(){
 const wrap=document.querySelector("#items-wrap"), add=document.querySelector("#add-item");
 if(!wrap||!add||document.querySelector("#qn-library-open")||!lib())return;
 const button=document.createElement("button");button.type="button";button.id="qn-library-open";button.className="btn btn-outline btn-small";
 button.style.cssText="margin:8px 8px 0 0;background:#fff7ed;color:#9a3412;border:1px solid #e4a66a;font-weight:750";
 button.textContent="✦ Smart Service Library (40)";
 add.parentNode.insertBefore(button,add);
 button.addEventListener("click",()=>openPicker(wrap,add));
}
function openPicker(wrap,add){
 if(document.querySelector("#qn-library-overlay"))return;
 const all=lib().templates;
 const overlay=document.createElement("div");overlay.id="qn-library-overlay";
 overlay.style.cssText="position:fixed;inset:0;z-index:2147483646;background:#172233a6;display:flex;align-items:flex-end;justify-content:center";
 overlay.innerHTML='<section role="dialog" aria-modal="true" aria-label="Smart Service Library" style="background:#fff;color:#172233;width:100%;max-width:600px;max-height:88dvh;border-radius:22px 22px 0 0;display:flex;flex-direction:column;padding:20px;gap:12px"><header style="display:flex;justify-content:space-between;align-items:center"><strong style="font-size:20px">Smart Service Library</strong><button type="button" id="qn-lib-close" aria-label="Close" style="border:0;background:transparent;font-size:28px">×</button></header><input id="qn-lib-search" placeholder="Search services" aria-label="Search services" style="padding:13px;border:1px solid #ddd;border-radius:12px;width:100%"><select id="qn-lib-trade" aria-label="Trade" style="padding:12px;border:1px solid #ddd;border-radius:12px;width:100%"><option value="">All trades</option>'+[...new Set(all.map(x=>x.trade))].map(x=>'<option>'+esc(x)+'</option>').join("")+'</select><div id="qn-lib-list" style="overflow:auto;min-height:120px"></div><small style="color:#667085">Edit descriptions and enter your own prices after inserting.</small></section>';
 document.body.appendChild(overlay);
 const close=()=>overlay.remove();
 overlay.querySelector("#qn-lib-close").onclick=close;
 overlay.addEventListener("click",e=>{if(e.target===overlay)close()});
 const list=overlay.querySelector("#qn-lib-list");
 function render(){
  const q=overlay.querySelector("#qn-lib-search").value.toLowerCase(),t=overlay.querySelector("#qn-lib-trade").value;
  const matches=all.filter(x=>(!t||x.trade===t)&&(!q||(x.name+" "+x.description).toLowerCase().includes(q)));
  list.innerHTML=matches.map(x=>'<article style="padding:13px 0;border-bottom:1px solid #e5e7eb"><small style="color:#bd6c23;font-weight:700">'+esc(x.trade)+'</small><div style="font-weight:750;margin:4px 0">'+esc(x.name)+'</div><p style="font-size:13px;line-height:1.5;color:#475467">'+esc(x.description)+'</p><button type="button" data-template="'+esc(x.id)+'" style="border:0;background:#d97706;color:white;padding:12px 18px;border-radius:10px;font-weight:700">Insert into quote</button></article>').join("")||"<p>No services found.</p>";
 }
 list.addEventListener("click",e=>{
  const b=e.target.closest("[data-template]");if(!b)return;
  const item=all.find(x=>x.id===b.dataset.template);if(!item)return;
  let row=[...wrap.querySelectorAll(".item-row")].find(r=>!r.querySelector(".service")?.value.trim()&&!r.querySelector(".desc")?.value.trim());
  if(!row){add.click();row=[...wrap.querySelectorAll(".item-row")].at(-1)}
  if(!row)return;
  const set=(sel,value)=>{const el=row.querySelector(sel);if(el){el.value=value;el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}))}};
  set(".service",item.name);set(".desc",item.description);set(".qty","1");set(".price","");
  close();
 });
 overlay.querySelector("#qn-lib-search").addEventListener("input",render);
 overlay.querySelector("#qn-lib-trade").addEventListener("change",render);
 render();
}
new MutationObserver(attach).observe(document.documentElement,{childList:true,subtree:true});attach();
})();