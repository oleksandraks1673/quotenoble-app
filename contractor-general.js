/* Contractor-first Quote.Noble, retaining every existing feature and record. */
(()=>{
'use strict';
if(window.QNContractorGeneralInstalled)return;window.QNContractorGeneralInstalled=true;
const $=s=>document.querySelector(s);
const cats=[['General Construction & Renovations','General contracting & renovations'],['Roofing','Roofing'],['Eavestrough & Gutters','Eavestrough & gutters'],['Plumbing','Plumbing'],['Electrical','Electrical'],['HVAC','Heating & air conditioning'],['Painting','Painting'],['Drywall & Insulation','Drywall & insulation'],['Landscaping','Landscaping'],['Fencing & Decking','Fencing & decking'],['Flooring','Flooring'],['Tiling','Tiling'],['Carpentry','Carpentry'],['Cleaning','Cleaning'],['Handyman','Handyman & maintenance'],['Window & Door','Windows & doors'],['Other / Multiple Trades','Other / multiple trades']];
const db=()=>{try{return typeof DB==='object'?DB:null}catch(_){return null}};
const trade=()=>db()?.profile?.tradeCategory||'Other / Multiple Trades';
const selected=()=>{const p=db()?.profile||{};const many=Array.isArray(p.tradeCategories)?p.tradeCategories:[];const unique=[...new Set([...many,p.tradeCategory].filter(Boolean))];return unique.length?unique:['Other / Multiple Trades'];};
const saveTrades=(root,id)=>{const p=db()?.profile,control=root.querySelector('#'+id);if(!p||!control)return;let picked=[...root.querySelectorAll('[data-qn-trade-choice]:checked')].map(n=>n.value);if(!picked.length)picked=[control.value];picked=[...new Set(picked.filter(Boolean))];p.tradeCategories=picked;p.tradeCategory=picked[0]||'Other / Multiple Trades';};
const isRoof=()=>selected().some(s=>s==='Roofing'||s==='Eavestrough & Gutters');

function field(id){
 const div=document.createElement('div');div.className='field qn-trade-field';
 const group=document.createElement('fieldset');group.className='qn-trade-picker';
 const legend=document.createElement('legend');legend.textContent='Choose your trade';
 const intro=document.createElement('p');intro.className='qn-trade-intro';intro.id=id+'-help';intro.textContent='Tailor your workspace to the work you do. You can choose more than one.';group.setAttribute('aria-describedby',intro.id);
 const legacy=document.createElement('select');legacy.id=id;legacy.hidden=true;legacy.setAttribute('aria-hidden','true');legacy.tabIndex=-1;
 for(const [v,l]of cats){const opt=document.createElement('option');opt.value=v;opt.textContent=l;legacy.append(opt)}
 const chosen=selected();legacy.value=chosen[0];
 const search=document.createElement('input');search.type='search';search.className='qn-trade-search';search.placeholder='Search trades';search.setAttribute('aria-label','Search trades');search.autocomplete='off';
 const options=document.createElement('div');options.className='qn-trade-choices';
 const count=document.createElement('p');count.className='qn-trade-count';count.setAttribute('role','status');
 const more=document.createElement('button');more.type='button';more.className='qn-trade-more';more.setAttribute('aria-expanded','false');let expanded=false;
 const empty=document.createElement('p');empty.className='qn-trade-no-results';empty.textContent='No matching trade. Choose Other / multiple trades.';empty.hidden=true;
 const preview=document.createElement('div');preview.className='qn-trade-workspace';preview.setAttribute('aria-live','polite');
 function refresh(){
  const picked=[...options.querySelectorAll('input:checked')].map(c=>c.value),query=search.value.trim().toLowerCase();let matches=0;
  [...options.children].forEach((row,i)=>{const match=!query||row.textContent.toLowerCase().includes(query);row.hidden=!match||(!query&&!expanded&&i>=6&&!row.querySelector('input').checked);if(!row.hidden)matches++;});
  empty.hidden=matches>0;more.hidden=!!query;more.textContent=expanded?'Show fewer trades':'View all '+cats.length+' trades';more.setAttribute('aria-expanded',String(expanded));
  count.textContent=picked.length===0?'Choose a trade, or continue with a general workspace.':picked.length+' '+(picked.length===1?'trade':'trades')+' selected';
  legacy.value=picked[0]||'Other / Multiple Trades';preview.replaceChildren();const title=document.createElement('strong');title.textContent='Your workspace';const shared=document.createElement('p');shared.textContent='Quotes, invoices, customers, jobs, inspections and photo reports.';preview.append(title,shared);
  const items=[];if(picked.includes('Roofing'))items.push('Roof Designer and saved roof drawings');if(picked.some(v=>v==='Roofing'||v==='Eavestrough & Gutters'))items.push('Gutter Estimator');if(picked.some(v=>v!=='Other / Multiple Trades'))items.push('Quote templates matched to your trade');
  if(items.length){const list=document.createElement('ul');for(const text of items){const li=document.createElement('li');li.textContent=text;list.append(li);}preview.append(list);}
  const note=document.createElement('small');note.textContent='Plan access still applies. Change your trades anytime in My Business.';preview.append(note);
 }
 for(const [v,l]of cats){const row=document.createElement('label');row.className='qn-trade-option';const check=document.createElement('input');check.type='checkbox';check.value=v;check.checked=chosen.includes(v);check.dataset.qnTradeChoice='';const name=document.createElement('span');name.textContent=l;row.append(check,name);options.append(row);check.addEventListener('change',()=>{if(v==='Other / Multiple Trades'&&check.checked)options.querySelectorAll('input').forEach(c=>{if(c!==check)c.checked=false;});else if(check.checked){const other=[...options.querySelectorAll('input')].find(c=>c.value==='Other / Multiple Trades');if(other)other.checked=false;}refresh();});}
 search.addEventListener('input',refresh);more.onclick=()=>{expanded=!expanded;refresh();};group.append(legend,intro,legacy,search,count,options,empty,more,preview);div.append(group);refresh();return div;
}
function setupTrade(){
 const input=$('#setup-name');if(!input||$('#qn-setup-trade'))return;
 input.closest('.field')?.after(field('qn-setup-trade'));
}
function bindProfileForm(){
 if(typeof window.openProfileForm!=='function'||window.openProfileForm.qnTradeDone)return;
 const original=window.openProfileForm;
 const wrapped=function(){const r=original.apply(this,arguments);const body=$('#modal-body'),input=body?.querySelector('#f-name');if(input&&!body.querySelector('#qn-profile-trade'))input.closest('.field')?.after(field('qn-profile-trade'));return r};
 wrapped.qnTradeDone=true;window.openProfileForm=wrapped;
}
function captureSave(e){
 const id=e.target?.id,profile=db()?.profile;if(!profile)return;
 if(id==='setup-save'&&$('#setup-name')?.value.trim()&&$('#setup-address')?.value.trim()&&$('#qn-setup-trade'))saveTrades(document,'qn-setup-trade');
 if(id==='f-save'&&$('#modal-body #qn-profile-trade')&&$('#modal-body #f-business-address')?.value.trim()){
  const f=$('#modal-body #f-logo')?.files?.[0];
  if(!f||(f.size<=2097152&&['image/jpeg','image/png'].includes(f.type)))saveTrades($('#modal-body'),'qn-profile-trade');
 }
}
function templates(){
 if(typeof QN_TRADE_TEMPLATES==='undefined')return;
 const extras={
 'General Construction & Renovations':{'Kitchen renovation':['Protect adjacent areas and confirm agreed scope','Remove specified fixtures and finishes','Install agreed materials and complete finishing','Clean and review work'],'Bathroom renovation':['Protect access and confirm measurements','Remove agreed existing fixtures and finishes','Install specified waterproofing and finishes','Test fixtures and clean the site'],'General renovation':['Confirm scope and site conditions','Prepare work area and remove specified items','Perform agreed construction and finishes','Inspect and clear the site']},
 'HVAC':{'Furnace installation':['Confirm equipment specification','Remove and dispose of old unit as agreed','Install equipment and specified connections','Test operation and hand over'],'Air conditioner service':['Inspect the reported issue','Perform agreed cleaning or servicing','Check accessible components','Test operation and report results']},
 'Drywall & Insulation':{'Drywall installation':['Protect finishes and prepare the area','Install agreed gypsum board','Tape and finish joints','Sand and clean the area']},
 'Fencing & Decking':{'Fence installation':['Confirm layout and boundaries','Install specified posts and footings','Install rails, panels and gates','Clean and inspect work'],'Deck repair':['Inspect agreed repair areas','Remove damaged parts within scope','Install replacement materials','Inspect and clean work']},
 'Tiling':{'Tile installation':['Prepare substrate and work area','Apply waterproofing where specified','Install agreed tiles and grout','Clean and inspect']},
 'Window & Door':{'Door installation':['Verify opening dimensions','Remove old unit and prepare opening','Install door, flashing and hardware','Check operation and cleanup']}
 };
 for(const [key,content]of Object.entries(extras))if(!QN_TRADE_TEMPLATES[key])QN_TRADE_TEMPLATES[key]=content;
 if(typeof window.qnBindTradeTemplates==='function'&&!window.qnBindTradeTemplates.qnGeneralDone){
  const old=window.qnBindTradeTemplates;const fn=function(body){const out=old.apply(this,arguments),sel=body?.querySelector('#qn-trade'),preferred=selected().find(s=>[...sel?.options||[]].some(o=>o.value===s))||trade();
   if(sel&&[...sel.options].some(o=>o.value===preferred)){sel.value=preferred;sel.dispatchEvent(new Event('change',{bubbles:true}))}return out};
  fn.qnGeneralDone=true;window.qnBindTradeTemplates=fn;
 }
}
function tools(){
 const view=$('#view-more'),roof=view?.querySelector('[data-qn-roof-designer]'),saved=view?.querySelector('[data-roof-saved]'),menu=view?.querySelector('.qn-more-menu');
 if(!roof||!menu)return;
 let group=$('#qn-specialized-tools');
 if(!group){
  group=document.createElement('details');group.id='qn-specialized-tools';group.className='qn-simple-section';
  const header=document.createElement('summary');header.textContent='Your trade tools';
  const body=document.createElement('div');body.className='qn-simple-section-body';group.append(header,body);menu.after(group);
 }
 const list=group.querySelector('.qn-simple-section-body');
 const sub=roof.querySelector('small');if(sub)sub.textContent='Roofing · 2D/3D drawings, measurements and PDF';
 // Do not move elements already inside Specialized Tools: doing so creates an endless MutationObserver loop.
 if(roof.parentElement!==list)list.append(roof);
 if(saved&&saved.parentElement!==list)list.append(saved);
 group.hidden=!isRoof();
 const roofing=selected().includes('Roofing');roof.hidden=!roofing;if(saved)saved.hidden=!roofing;
 let gutter=group.querySelector('[data-qn-gutter-tool]');
 if(!gutter){gutter=document.createElement('button');gutter.type='button';gutter.className='qn-more-item';gutter.dataset.qnGutterTool='';gutter.innerHTML='<span class="qn-more-item-icon">▰</span><span><strong>Gutter Estimator</strong><small>Measurements, materials and pricing</small></span><b>›</b>';list.append(gutter);}
 gutter.onclick=()=>{window.location.href='/gutter-estimator.html';};
 gutter.hidden=!selected().some(s=>s==='Eavestrough & Gutters'||s==='Roofing');
}
function neutral(){
 document.querySelectorAll('#view-home [data-qn-roof-designer]').forEach(n=>n.remove());
 const intro=$('#view-home .qn-simple-intro');if(intro)intro.textContent='Quotes, jobs, customers and invoices. Everything together.';
 const company=$('#setup-name');if(company)company.placeholder='e.g. Your Company Inc.';
 for(const item of document.querySelectorAll('#modal-body input.service'))if(item.placeholder?.includes('Roof vent'))item.placeholder='Service name (e.g. Install a new door)';
 const banner=$('#view-more .qn-more-business-banner div:nth-child(2)');
 if(banner){let b=banner.querySelector('.qn-trade-caption');if(!b){b=document.createElement('small');b.className='qn-trade-caption';banner.append(b)}
 b.textContent='Trades: '+selected().map(s=>cats.find(c=>c[0]===s)?.[1]||s).join(', ');}
}
function init(){
 const style=document.createElement('style');style.textContent='#view-home [data-qn-roof-designer]{display:none!important}#qn-specialized-tools{margin:14px 0;padding:2px 10px;border:1px solid var(--border,#dce2e9);border-radius:12px}#qn-specialized-tools>summary{padding:14px 4px;font-size:16px;font-weight:750;cursor:pointer}#qn-specialized-tools .qn-more-item{width:100%}.qn-trade-field select{width:100%;min-height:44px}.qn-trade-choices{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px;max-height:270px;overflow:auto;padding:8px 2px}.qn-trade-option{display:flex;align-items:center;gap:9px;border:1px solid #dcc8b2;border-radius:10px;background:#fffdf9;padding:11px 9px;font-weight:600;font-size:14px}.qn-trade-option:has(input:checked){background:#fff0dc;border-color:#c76b14}.qn-trade-option input{width:18px;height:18px;accent-color:#c76b14;flex-shrink:0}.qn-trade-caption{display:block;font-size:11px;color:var(--muted,#8795a4);margin-top:4px}';style.textContent+='#qn-specialized-tools[hidden],#qn-specialized-tools [hidden]{display:none!important}.qn-trade-picker{margin:0;padding:0;border:0;min-width:0}.qn-trade-picker legend{padding:0;font-size:20px;line-height:1.3;font-weight:750;color:var(--text,#202834)}.qn-trade-intro{margin:8px 0 16px;font-size:14px;line-height:1.55;color:var(--muted,#657182)}.qn-trade-search{box-sizing:border-box;width:100%;min-height:48px;padding:12px 14px;border:1px solid #d9dde3;border-radius:12px;font:inherit;background:#fff}.qn-trade-count{font-size:12px;color:#657182;margin:12px 0 6px}.qn-trade-picker .qn-trade-choices{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px;max-height:none;overflow:visible;padding:4px 0}.qn-trade-picker .qn-trade-option{box-sizing:border-box;display:flex;align-items:center;gap:10px;min-height:56px;margin:0;padding:13px 12px;border:1px solid #dce0e5;border-radius:12px;background:#fff;font-size:14px;line-height:1.35;font-weight:600;color:#344050;cursor:pointer}.qn-trade-picker .qn-trade-option[hidden]{display:none!important}.qn-trade-picker .qn-trade-option:has(input:checked){border-color:#b97229;background:#fff8ef;box-shadow:inset 0 0 0 1px #b97229}.qn-trade-picker .qn-trade-option:focus-within{outline:3px solid #e4c19b;outline-offset:2px}.qn-trade-picker .qn-trade-option input{width:18px!important;height:18px!important;margin:0;accent-color:#a96320}.qn-trade-more{display:block;width:100%;padding:12px;margin:6px 0 12px;border:0;background:transparent;color:#94551d;font:inherit;font-size:14px;font-weight:650;cursor:pointer}.qn-trade-more[hidden]{display:none}.qn-trade-workspace{margin-top:12px;padding:16px;border:1px solid #e3e7eb;border-radius:14px;background:#f7f8fa;font-size:13px;line-height:1.55;color:#475568}.qn-trade-workspace strong{display:block;font-size:14px;color:#243244}.qn-trade-workspace p{margin:6px 0}.qn-trade-workspace ul{padding-left:19px;margin:8px 0}.qn-trade-workspace small{display:block;margin-top:10px;color:#657182;font-size:12px}.qn-trade-no-results{font-size:13px;color:#657182}@media(max-width:340px){.qn-trade-picker .qn-trade-choices{grid-template-columns:1fr}}';document.head.append(style);
 templates();bindProfileForm();setupTrade();tools();neutral();
 document.addEventListener('click',captureSave,true);
 const view=$('#view-more');if(view)new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&(n.matches?.('[data-qn-roof-designer],[data-roof-saved]')||n.querySelector?.('[data-qn-roof-designer],[data-roof-saved]')))))tools()}).observe(view,{childList:true,subtree:true});
 document.addEventListener('qn-language-changed',neutral);
 document.addEventListener('click',e=>{if(e.target?.id==='setup-save'||e.target?.id==='f-save')queueMicrotask(()=>{neutral();tools();});});
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();

(function(){const script=document.createElement('script');script.src='/project-sharing.js?v=20261031';document.head.append(script);})();
