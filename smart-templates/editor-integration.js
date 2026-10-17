/* Smart Templates: native quote editor integration, no saved-template feature. */
(function(){
"use strict";
function init(){
 const items=document.getElementById("items-wrap"),add=document.getElementById("add-item");
 if(!items||!add||document.getElementById("qn-service-library"))return;
 const lib=window.QuoteNobleSmartTemplates;if(!lib)return;
 const open=document.createElement("button");open.type="button";open.id="qn-service-library";open.className="btn btn-outline btn-small";open.textContent="✦ Smart Service Library";open.style.cssText="margin:8px 8px 0 0;border-color:#d97706;color:#a35412;font-weight:700";
 add.parentNode.insertBefore(open,add);
 open.addEventListener("click",()=>{
   const overlay=document.createElement("div");overlay.style.cssText="position:fixed;inset:0;z-index:999999;background:#0009;display:flex;align-items:flex-end;justify-content:center";
   const panel=document.createElement("section");panel.style.cssText="box-sizing:border-box;width:100%;max-width:620px;height:88vh;background:#fff;color:#26313f;border-radius:20px 20px 0 0;padding:20px;display:flex;flex-direction:column;gap:12px";
   const heading=document.createElement("div");heading.style.cssText="display:flex;justify-content:space-between;align-items:center";heading.innerHTML='<strong style="font-size:19px">Smart Service Library</strong>';
   const close=document.createElement("button");close.type="button";close.textContent="✕";close.style.cssText="border:0;background:transparent;font-size:22px";close.onclick=()=>overlay.remove();heading.append(close);
   const search=document.createElement("input");search.placeholder="Search services";search.style.cssText="padding:13px;border:1px solid #ccc;border-radius:9px;width:100%;box-sizing:border-box";
   const trade=document.createElement("select");trade.style.cssText=search.style.cssText;trade.add(new Option("All trades",""));lib.trades.forEach(t=>trade.add(new Option(t,t)));
   const results=document.createElement("div");results.style.cssText="flex:1;overflow:auto";
   const hint=document.createElement("small");hint.textContent="Descriptions are editable. Set your own quantities and prices.";
   panel.append(heading,search,trade,results,hint);overlay.append(panel);document.body.append(overlay);
   overlay.onclick=e=>{if(e.target===overlay)overlay.remove()};
   function render(){
     results.replaceChildren();
     const list=lib.search(search.value,trade.value);
     for(const t of list){
       const card=document.createElement("article");card.style.cssText="border-bottom:1px solid #e5e7eb;padding:12px 0";
       const category=document.createElement("small");category.textContent=t.trade;category.style.color="#c56b19";
       const name=document.createElement("strong");name.textContent=t.name;name.style.display="block";
       const desc=document.createElement("p");desc.textContent=t.description;desc.style.cssText="font-size:13px;line-height:1.45";
       const btn=document.createElement("button");btn.type="button";btn.textContent="Insert into quote";btn.style.cssText="background:#cf741d;color:white;border:0;border-radius:9px;padding:11px 16px;font-weight:700";
       btn.onclick=()=>{
         const rows=[...items.querySelectorAll(".item-row")];
         let row=rows.find(r=>!r.querySelector(".service")?.value.trim()&&!r.querySelector(".desc")?.value.trim());
         if(!row){add.click();row=[...items.querySelectorAll(".item-row")].at(-1)}
         if(!row)return;
         const fields={".service":t.name,".desc":t.description,".qty":"1",".price":"0.00"};
         for(const [selector,value] of Object.entries(fields)){const el=row.querySelector(selector);if(!el)continue;el.value=value;el.dispatchEvent(new Event("input",{bubbles:true}));el.dispatchEvent(new Event("change",{bubbles:true}))}
         overlay.remove();row.querySelector(".desc")?.focus();
       };
       card.append(category,name,desc,btn);results.append(card);
     }
     if(!list.length)results.textContent="No matching services";
   }
   search.oninput=render;trade.onchange=render;render();search.focus();
 });
}
new MutationObserver(init).observe(document.documentElement,{childList:true,subtree:true});init();
})();