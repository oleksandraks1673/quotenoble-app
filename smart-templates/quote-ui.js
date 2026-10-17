(function(){'use strict';
function init(){
const wrap=document.querySelector('#items-wrap'),add=document.querySelector('#add-item');
if(!wrap||!add||document.querySelector('#qn-smart-picker'))return;
const btn=document.createElement('button');btn.id='qn-smart-picker';btn.type='button';btn.className='btn btn-outline btn-small';btn.textContent='Smart Service Library';btn.style.margin='8px';add.before(btn);
btn.onclick=()=>{
const lib=window.QuoteNobleSmartTemplates;if(!lib)return alert('Templates unavailable');
const modal=document.createElement('div');modal.style.cssText='position:fixed;inset:0;z-index:999999;background:#0009;display:grid;place-items:end center';
modal.innerHTML='<div style="background:white;color:#222;padding:20px;width:100%;max-width:600px;max-height:85vh;overflow:auto;border-radius:20px 20px 0 0"><button type="button" id="qn-close">Close</button><h3>Smart Service Library</h3><input id="qn-search" placeholder="Search services" style="width:100%;padding:12px"><select id="qn-trade" style="width:100%;padding:12px"><option value="">All trades</option></select><div id="qn-results"></div></div>';
document.body.append(modal);modal.querySelector('#qn-close').onclick=()=>modal.remove();
const trade=modal.querySelector('#qn-trade'),results=modal.querySelector('#qn-results');
lib.trades.forEach(t=>{const o=document.createElement('option');o.value=t;o.textContent=t;trade.append(o)});
function render(){results.replaceChildren();lib.search(modal.querySelector('#qn-search').value,trade.value).forEach(t=>{
const box=document.createElement('article');box.style.cssText='padding:12px;border-bottom:1px solid #ddd';
const name=document.createElement('strong');name.textContent=t.name;const desc=document.createElement('p');desc.textContent=t.description;
const insert=document.createElement('button');insert.type='button';insert.textContent='Insert into quote';insert.style.cssText='background:#c76b26;color:white;padding:10px;border:0;border-radius:8px';
insert.onclick=()=>{const w=document.querySelector('#items-wrap'),a=document.querySelector('#add-item');if(!w||!a)return;
let row=[...w.querySelectorAll('.item-row')].find(r=>!r.querySelector('.service').value.trim()&&!r.querySelector('.desc').value.trim());
if(!row){a.click();row=[...w.querySelectorAll('.item-row')].at(-1)}if(!row)return;
for(const [cls,value] of [['service',t.name],['desc',t.description],['qty','1'],['price','']]){const el=row.querySelector('.'+cls);if(el){el.value=value;el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}))}}
modal.remove();row.querySelector('.price')?.focus()};
box.append(name,desc,insert);results.append(box)})}
modal.querySelector('#qn-search').oninput=render;trade.onchange=render;render();
};
}
new MutationObserver(init).observe(document.documentElement,{childList:true,subtree:true});init();
})();