(function(){
"use strict";
const style=document.createElement("style");
style.textContent="#qn-library-overlay{position:fixed;inset:0;z-index:2147483646;background:#0009;display:flex;align-items:flex-end;justify-content:center}#qn-library-overlay .qn-sheet{width:100%;max-width:620px;height:min(88vh,800px);background:#fff;border-radius:20px 20px 0 0;padding:18px;display:flex;flex-direction:column;gap:12px;color:#1f2937}#qn-library-overlay input,#qn-library-overlay select{width:100%;padding:12px;border:1px solid #d1d5db;border-radius:9px}#qn-library-overlay .qn-result{padding:12px 0;border-bottom:1px solid #e5e7eb}#qn-library-overlay .qn-result p{font-size:13px;line-height:1.5;color:#4b5563}#qn-library-overlay button.qn-insert,#qn-library-open{background:#d97706;color:white;border:0;border-radius:9px;padding:12px;font-weight:700;cursor:pointer}#qn-library-open{margin:9px 8px 9px 0}#qn-library-overlay .qn-close{border:0;background:transparent;font-size:26px;cursor:pointer}";
document.head.appendChild(style);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function mount(){
const add=document.querySelector("#add-item"),wrap=document.querySelector("#items-wrap");
if(!add||!wrap||document.querySelector("#qn-library-open")||!window.QuoteNobleSmartTemplates)return;
const btn=document.createElement("button");btn.type="button";btn.id="qn-library-open";btn.textContent="✦ Smart Service Library (40)";add.before(btn);
btn.onclick=()=>{
if(document.querySelector("#qn-library-overlay"))return;
const all=window.QuoteNobleSmartTemplates.templates;
const overlay=document.createElement("div");overlay.id="qn-library-overlay";
overlay.innerHTML='<section class="qn-sheet" role="dialog" aria-modal="true" aria-label="Smart Service Library"><header style="display:flex;justify-content:space-between;align-items:center"><strong style="font-size:20px">Smart Service Library</strong><button type="button" class="qn-close" aria-label="Close">×</button></header><input id="qn-lib-search" placeholder="Search services" aria-label="Search services"><select id="qn-lib-trade" aria-label="Trade"><option value="">All trades</option>'+window.QuoteNobleSmartTemplates.trades.map(t=>'<option>'+esc(t)+'</option>').join("")+'</select><div id="qn-lib-results" style="overflow:auto;flex:1"></div><small>Descriptions are editable. Set your own quantities and prices.</small></section>';
document.body.appendChild(overlay);
const close=()=>overlay.remove();overlay.querySelector(".qn-close").onclick=close;overlay.addEventListener("click",e=>{if(e.target===overlay)close()});
const results=overlay.querySelector("#qn-lib-results");
function render(){const q=overlay.querySelector("#qn-lib-search").value,t=overlay.querySelector("#qn-lib-trade").value;const items=window.QuoteNobleSmartTemplates.search(q,t);
results.innerHTML=items.map(item=>'<div class="qn-result"><small style="color:#b45309">'+esc(item.trade)+'</small><div><strong>'+esc(item.name)+'</strong></div><p>'+esc(item.description)+'</p><button type="button" class="qn-insert" data-template="'+esc(item.id)+'">Insert into quote</button></div>').join("")||"<p>No matching services.</p>"}
results.onclick=e=>{const target=e.target.closest("[data-template]");if(!target)return;const item=all.find(x=>x.id===target.dataset.template);if(!item)return;
let row=[...wrap.querySelectorAll(".item-row")].find(r=>!r.querySelector(".service")?.value.trim()&&!r.querySelector(".desc")?.value.trim());
if(!row){add.click();row=[...wrap.querySelectorAll(".item-row")].at(-1)}
if(!row)return;
for(const [selector,value] of [[".service",item.name],[".desc",item.description],[".qty","1"],[".price",""]]){const input=row.querySelector(selector);if(input){input.value=value;input.dispatchEvent(new Event("input",{bubbles:true}));input.dispatchEvent(new Event("change",{bubbles:true}))}}
close();row.querySelector(".desc")?.focus();
};
overlay.querySelector("#qn-lib-search").addEventListener("input",render);overlay.querySelector("#qn-lib-trade").addEventListener("change",render);render();
};
}
new MutationObserver(mount).observe(document.body,{subtree:true,childList:true});mount();
})();