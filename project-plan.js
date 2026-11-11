/* Internal project drawings share the job's existing save/sync lifecycle. */
(() => {
  'use strict';
  const M=window.QNPlanModel;
  const W=900,H=600;
  window.qnOpenProjectPlan=function(jobId){
    if(!window.qnRequirePro?.("Project plans"))return;
    const source=DB,workspace=LS_KEY,job=DB.jobs.find(j=>j.id===jobId);if(!job)return;
    const quote=DB.quotes.find(q=>q.id===job.quoteId);
    const matches=DB.clients.filter(c=>c.name===job.client);
    const customer=DB.clients.find(c=>c.id===(job.clientId||quote?.clientId))||(matches.length===1?matches[0]:null);
    const plan=M.normalize(job.projectPlan||{address:job.address||customer?.address||''});
    let tool='select',selected=null,gesture=null,undo=[],redo=[],uploading=false,revision=0,pitchMode='ratio',propertyDraft=false;
    const body=openModal('Project plan',`<div class="qn-plan">
      <p><strong>${esc(job.title)}</strong>${job.client?' · '+esc(job.client):''}</p>
      <div class="qn-plan-tools" role="group" aria-label="Drawing tools">
      <button type="button" data-plan-tool="select" aria-pressed="true"><b aria-hidden="true">↖</b>Select</button>
      <button type="button" data-plan-tool="line" aria-pressed="false"><b aria-hidden="true">╱</b>Line</button>
      <button type="button" data-plan-tool="rect" aria-pressed="false"><b aria-hidden="true">□</b>Rectangle</button>
      <button type="button" data-plan-tool="dimension" aria-pressed="false"><b aria-hidden="true">↔</b>Dimension</button></div>
      <p id="plan-help">Select an element to edit its size. Drag empty space to move the view.</p>
      <canvas class="qn-plan-canvas" id="plan-canvas" width="900" height="600" tabindex="0" aria-label="Scaled top-down project drawing. Use the element list below for keyboard editing."></canvas>
      <div class="qn-plan-bar"><button type="button" id="plan-out" aria-label="Zoom out">−</button><button type="button" id="plan-in" aria-label="Zoom in">+</button><button type="button" id="plan-fit">Fit</button><button type="button" id="plan-undo" aria-label="Undo drawing change">↶</button><button type="button" id="plan-redo" aria-label="Redo drawing change">↷</button><select id="plan-unit" class="qn-plan-unit" aria-label="Dimension unit"><option value="ft">ft</option><option value="in">in</option><option value="cm">cm</option></select><small id="plan-grid-label"></small></div>
      <div class="qn-plan-properties" id="plan-properties" hidden>
        <label for="plan-label">Element name</label><input id="plan-label" maxlength="80" placeholder="Roof, skylight, ridge…">
        <p>Plan dimensions are horizontal, viewed from above. Decimal feet: 10.5 ft = 10 ft 6 in.</p><div class="qn-plan-grid"><div><label id="plan-a-label" for="plan-a">Width</label><input id="plan-a" type="number" inputmode="decimal" min="0.001" step="any"></div><div><label id="plan-b-label" for="plan-b">Height</label><input id="plan-b" type="number" inputmode="decimal" step="any"></div></div>
        <div id="plan-roof-settings" hidden><label for="plan-kind">Element type</label><select id="plan-kind"><option value="roof">Roof section</option><option value="skylight">Skylight</option><option value="other">Other rectangle</option></select><div id="plan-pitch-settings"><div class="qn-plan-grid"><div><label for="plan-pitch">Roof slope</label><input id="plan-pitch" type="number" inputmode="decimal" min="0" step="any" placeholder="Not measured"></div><div><label for="plan-pitch-mode">Slope unit</label><select id="plan-pitch-mode"><option value="ratio">Rise per 12</option><option value="degrees">Degrees</option></select></div></div><div id="plan-pitch-visual"></div><p id="plan-area"></p><p>One rectangular section with a constant slope. No deductions for openings or overlaps; waste is not included.</p></div></div>
        <div class="qn-plan-bar"><button type="button" id="plan-apply" class="qn-plan-primary">Apply size</button><button type="button" id="plan-delete">Delete element</button></div>
      </div>
      <p id="plan-save" class="qn-plan-save" role="status" aria-live="polite">Changes save with this job.</p>
      <button type="button" id="plan-retry" hidden>Retry saving</button>
      <details><summary>Elements &amp; drawing settings</summary><p>Use rectangles for roof sections and skylights. Join lines for irregular roof outlines.</p><div class="qn-plan-bar"><button type="button" id="plan-add-roof">+ Roof section</button><button type="button" id="plan-add-window">+ Skylight</button><button type="button" id="plan-add-line">+ Line</button></div><label><input id="plan-snap" type="checkbox" style="width:20px;min-height:20px;vertical-align:middle"> Snap to grid</label><div id="plan-elements" class="qn-plan-list"></div></details>
      <details><summary>Photo, address &amp; notes</summary><label for="plan-address">Site address</label><input id="plan-address" maxlength="500" autocomplete="street-address"><p>Reference photo — dimensions come from your site measurements.</p><label for="plan-file">Add a site photo</label><input id="plan-file" type="file" accept="image/jpeg,image/png,image/webp"><img id="plan-photo" class="qn-plan-photo" alt="Site reference photo" hidden><button type="button" id="plan-remove-photo" hidden>Remove photo</button><label for="plan-notes" style="margin-top:14px">Project notes</label><textarea id="plan-notes" rows="4" maxlength="6000" placeholder="Materials, access details, flashing, reminders…"></textarea></details>
      <p>Draw each roof section in plan view, then enter its measured slope to estimate its surface area.</p>
      <div class="qn-plan-footer"><button type="button" id="plan-download">Download plan</button><button type="button" id="plan-done" class="qn-plan-primary">Done</button></div>
    </div>`,{key:'project-plan:'+jobId,reopen:()=>window.qnOpenProjectPlan(jobId)});
    const $=id=>body.querySelector('#'+id),canvas=$('plan-canvas'),ctx=canvas.getContext('2d');
    $('plan-unit').value=plan.unit;$('plan-address').value=plan.address;$('plan-notes').value=plan.notes;$('plan-snap').checked=plan.snap;
    function active(){return window.qnHasPro?.()===true&&DB===source&&LS_KEY===workspace&&DB.jobs.find(j=>j.id===jobId)===job;}
    function status(text,error=false){$('plan-save').textContent=text;$('plan-save').dataset.error=String(error);}
    function persist(){
      if(!active()){status('Your account or saved copy changed. Reopen this job before editing.',true);return false;}
      plan.updatedAt=new Date().toISOString();job.projectPlan=M.clone(plan);job.updatedAtTime=plan.updatedAt;save();
      $('plan-retry').hidden=!window.qnSaveFailed;
      if(window.qnSaveFailed){status('Not saved on this device. Download the plan or free storage, then retry.',true);return false;}
      status('Saved on this device · cloud status is shown in the app.');return true;
    }
    function checkpoint(){undo.push(M.clone(plan.shapes));if(undo.length>40)undo.shift();redo=[];revision++;}
    function chosen(){return plan.shapes.find(s=>s.id===selected);}
    function controls(){
      propertyDraft=false;const s=chosen();$('plan-properties').hidden=!s;
      if(s){const z=M.size(s);$('plan-label').value=s.label;$('plan-a').value=+(z.a/M.factor(plan.unit)).toFixed(5);$('plan-b').value=+(s.type==='rect'?z.b/M.factor(plan.unit):z.b).toFixed(5);$('plan-a-label').textContent=(s.type==='rect'?'Width':'Length')+' ('+plan.unit+')';$('plan-b-label').textContent=s.type==='rect'?'Height ('+plan.unit+')':'Angle (°)';
        $('plan-roof-settings').hidden=s.type!=='rect';if(s.type==='rect'){$('plan-kind').value=s.kind||'roof';$('plan-pitch-settings').hidden=s.kind!=='roof';$('plan-pitch').value=s.pitch==null?'':+(pitchMode==='degrees'?Math.atan(s.pitch/12)*180/Math.PI:s.pitch).toFixed(5);$('plan-pitch-mode').value=pitchMode;}slopeVisual(s);}
      $('plan-undo').disabled=!undo.length;$('plan-redo').disabled=!redo.length;
      $('plan-grid-label').textContent='Grid '+M.format(gridStep(plan.view),plan.unit)+' · '+(plan.snap?(plan.unit==='cm'?'snap 10 cm':'snap 6 in'):'snap off');
      const list=$('plan-elements');list.replaceChildren();
      plan.shapes.forEach(s=>{const b=document.createElement('button');b.type='button';const z=M.size(s);b.textContent=(s.label||({rect:'Rectangle',dimension:'Dimension',line:'Line'}[s.type]))+' · '+M.format(z.a,plan.unit)+(s.type==='rect'?' × '+M.format(z.b,plan.unit):'');b.onclick=()=>{if(propertyDraft&&!applyProperties())return;selected=s.id;setTool('select');render();controls();$('plan-properties').scrollIntoView?.({block:'nearest'});};list.appendChild(b);});
      if(!plan.shapes.length){const p=document.createElement('p');p.className='qn-plan-empty';p.textContent='Start with a roof section, or draw on the grid.';list.appendChild(p);}
    }
    function slopeVisual(s){
      const area=M.roof(s),holder=$('plan-pitch-visual');holder.replaceChildren();
      if(!area){$('plan-area').textContent='Enter a measured slope to calculate surface area. Use 0 for a flat roof.';return;}
      const rise=s.pitch,run=12,scale=Math.min(200/run,90/Math.max(rise,.01)),x=36,y=120,right=x+run*scale,top=y-rise*scale;
      const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 320 160');svg.setAttribute('role','img');svg.setAttribute('aria-label','Slope '+(+rise.toFixed(2))+':12, '+area.degrees.toFixed(1)+' degrees');svg.style.cssText='width:100%;max-height:150px';
      const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',`M${x},${y} L${right},${y} L${right},${top} Z`);path.setAttribute('fill','#ffe7cb');path.setAttribute('stroke','#c96817');path.setAttribute('stroke-width','3');svg.appendChild(path);
      for(const [text,tx,ty] of [['Run 12',(x+right)/2-25,148],['Rise '+(+rise.toFixed(2)),right+7,(top+y)/2],[(+area.degrees.toFixed(1))+'°',x+25,y-12]]){const t=document.createElementNS(svg.namespaceURI,'text');t.setAttribute('x',tx);t.setAttribute('y',ty);t.setAttribute('font-size','14');t.setAttribute('fill','#493d31');t.textContent=text;svg.appendChild(t);}holder.appendChild(svg);
      $('plan-area').textContent=plan.unit==='cm'?'Estimated section surface: '+area.surfaceSqM.toFixed(2)+' m² · slope '+(+rise.toFixed(2))+':12':'Estimated section surface: '+area.surfaceSqFt.toFixed(1)+' sq ft · '+(area.surfaceSqFt/100).toFixed(2)+' roofing squares · slope '+(+rise.toFixed(2))+':12';
    }
    function point(p,view=plan.view){return M.screen(p.x,p.y,view,W);}
    function label(c,text,x,y,color='#34302c'){
      c.font='600 18px system-ui, sans-serif';const width=c.measureText(text).width;
      x=Math.min(W-width/2-8,Math.max(width/2+8,x));y=Math.min(H-14,Math.max(22,y));
      c.fillStyle='rgba(255,252,248,.95)';c.fillRect(x-width/2-5,y-16,width+10,24);c.fillStyle=color;c.textAlign='center';c.fillText(text,x,y+2);
    }
    function drawShape(c,s,view,highlight){
      const a=point(s,view),b=point({x:s.type==='rect'?s.x+s.w:s.x2,y:s.type==='rect'?s.y+s.h:s.y2},view),color=highlight?'#d96b12':s.type==='dimension'?'#77532b':'#393631';
      c.strokeStyle=color;c.lineWidth=highlight?4:2.5;c.lineCap='round';c.setLineDash(s.type==='dimension'?[7,5]:[]);c.beginPath();
      if(s.type==='rect'){c.fillStyle=highlight?'rgba(234,138,42,.15)':'rgba(217,202,180,.1)';c.fillRect(a.x,a.y,b.x-a.x,b.y-a.y);c.rect(a.x,a.y,b.x-a.x,b.y-a.y);}else{c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);}c.stroke();c.setLineDash([]);
      if(s.type==='dimension'){const angle=Math.atan2(b.y-a.y,b.x-a.x);for(const [p,d] of [[a,1],[b,-1]]){c.beginPath();c.moveTo(p.x,p.y);c.lineTo(p.x+d*14*Math.cos(angle+.45),p.y+d*14*Math.sin(angle+.45));c.moveTo(p.x,p.y);c.lineTo(p.x+d*14*Math.cos(angle-.45),p.y+d*14*Math.sin(angle-.45));c.stroke();}}
      if(highlight){c.fillStyle=color;for(const p of [a,b]){c.beginPath();c.arc(p.x,p.y,6,0,2*Math.PI);c.fill();}}
      const z=M.size(s);
      if(s.type==='rect'){label(c,M.format(z.a,plan.unit),(a.x+b.x)/2,a.y-13,color);label(c,M.format(z.b,plan.unit),b.x+10,(a.y+b.y)/2,color);if(s.label)label(c,s.label,(a.x+b.x)/2,(a.y+b.y)/2,color);const area=M.roof(s);if(area)label(c,(+s.pitch.toFixed(2))+':12 · '+(plan.unit==='cm'?area.surfaceSqM.toFixed(1)+' m²':area.surfaceSqFt.toFixed(1)+' sq ft'),(a.x+b.x)/2,(a.y+b.y)/2+26,color);}
      else label(c,(s.label?s.label+' · ':'')+M.format(z.a,plan.unit),(a.x+b.x)/2,(a.y+b.y)/2-15,color);
    }
    function gridStep(view){let grid=plan.unit==='cm'?50/2.54:12;while(grid*W/view.width<20)grid*=2;return grid;}
    function renderTo(c,view,selection=true){
      c.clearRect(0,0,W,H);c.fillStyle='#fffcf8';c.fillRect(0,0,W,H);
      const grid=gridStep(view);
      c.strokeStyle='#e8e1d8';c.lineWidth=1;c.beginPath();
      for(let x=Math.ceil(view.x/grid)*grid;x<view.x+view.width;x+=grid){const p=point({x,y:0},view);c.moveTo(p.x,0);c.lineTo(p.x,H);}
      for(let y=Math.ceil(view.y/grid)*grid;y<view.y+view.width*H/W;y+=grid){const p=point({x:0,y},view);c.moveTo(0,p.y);c.lineTo(W,p.y);}c.stroke();
      plan.shapes.forEach(s=>drawShape(c,s,view,selection&&s.id===selected));
      if(gesture?.preview&&selection)drawShape(c,gesture.preview,view,true);
      if(!plan.shapes.length&&!gesture?.preview){label(c,'Draw a roof or add a roof section below',W/2,H/2);}
      // A dynamic scale bar remains correct at every zoom level.
      const scale=grid,pixels=scale*W/view.width;c.strokeStyle='#665b4e';c.lineWidth=2;c.beginPath();c.moveTo(24,H-35);c.lineTo(24+pixels,H-35);c.stroke();label(c,M.format(scale,plan.unit),24+pixels/2,H-15);
    }
    function render(){renderTo(ctx,plan.view);$('plan-grid-label').textContent='Grid '+M.format(gridStep(plan.view),plan.unit)+' · '+(plan.snap?(plan.unit==='cm'?'snap 10 cm':'snap 6 in'):'snap off');}
    function setTool(next){if(propertyDraft&&!applyProperties())return;tool=next;gesture=null;body.querySelectorAll('[data-plan-tool]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.planTool===next)));$('plan-help').textContent=next==='select'?'Select an element to edit its size. Drag empty space to move the view.':next==='rect'?'Drag a rectangle for a roof section or skylight, then enter its exact size.':'Drag a line, then enter its exact length and angle.';}
    body.querySelectorAll('[data-plan-tool]').forEach(b=>b.onclick=()=>setTool(b.dataset.planTool));
    function eventPoint(e,snapped=true){const r=canvas.getBoundingClientRect(),p=M.world((e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height,plan.view);return snapped?M.snap(p,plan.unit,plan.snap):p;}
    const identifier=()=>('plan-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8));
    canvas.addEventListener('pointerdown',e=>{
      if(e.button!==0||gesture||!active())return;if(propertyDraft&&!applyProperties())return;e.preventDefault();const p=eventPoint(e),raw=eventPoint(e,false);canvas.setPointerCapture?.(e.pointerId);
      if(tool==='select'){const s=[...plan.shapes].reverse().find(s=>M.hit(s,raw,plan.view.width*16/W));selected=s?.id||null;gesture={pointer:e.pointerId,start:p,raw,client:{x:e.clientX,y:e.clientY},before:M.clone(plan.shapes),shape:s?M.clone(s):null,view:{...plan.view},moved:false};controls();}
      else{if(plan.shapes.length>=400){status('This plan has 400 elements. Remove one before adding more.',true);return;}gesture={pointer:e.pointerId,start:p,preview:null};}render();
    });
    canvas.addEventListener('pointermove',e=>{
      if(!gesture||gesture.pointer!==e.pointerId)return;e.preventDefault();const p=eventPoint(e),g=gesture;
      if(tool==='select'){
        if(g.shape){const dx=p.x-g.start.x,dy=p.y-g.start.y,s=chosen();if(!s)return;s.x=g.shape.x+dx;s.y=g.shape.y+dy;if(s.type!=='rect'){s.x2=g.shape.x2+dx;s.y2=g.shape.y2+dy;}g.moved=g.moved||dx!==0||dy!==0;}
        else{const r=canvas.getBoundingClientRect();plan.view.x=g.view.x-(e.clientX-g.client.x)*g.view.width/r.width;plan.view.y=g.view.y-(e.clientY-g.client.y)*g.view.width/r.width;g.moved=true;}
      }else g.preview={id:identifier(),type:tool,x:tool==='rect'?Math.min(g.start.x,p.x):g.start.x,y:tool==='rect'?Math.min(g.start.y,p.y):g.start.y,...(tool==='rect'?{w:Math.abs(p.x-g.start.x),h:Math.abs(p.y-g.start.y),kind:'roof',pitch:null}:{x2:p.x,y2:p.y}),label:''};
      render();
    });
    function finish(e,cancel=false){
      if(!gesture||e.pointerId!==gesture.pointer)return;const g=gesture;gesture=null;
      if(cancel){if(g.before)plan.shapes=g.before;if(g.view)plan.view=g.view;render();controls();return;}
      if(tool==='select'){if(g.moved&&g.shape){undo.push(g.before);if(undo.length>40)undo.shift();redo=[];revision++;}if(g.moved)persist();}
      else if(g.preview&&M.size(g.preview).a>.01&&(g.preview.type!=='rect'||g.preview.h>.01)){checkpoint();plan.shapes.push(g.preview);selected=g.preview.id;persist();setTool('select');}
      render();controls();
    }
    canvas.addEventListener('pointerup',e=>finish(e));canvas.addEventListener('pointercancel',e=>finish(e,true));canvas.addEventListener('lostpointercapture',e=>finish(e,true));
    function update(){render();controls();persist();}
    function add(type,label,a,b){if(!active()||plan.shapes.length>=400)return;if(propertyDraft&&!applyProperties())return;checkpoint();const center=M.snap({x:plan.view.x+plan.view.width*.25,y:plan.view.y+plan.view.width*.18},plan.unit,plan.snap);const s={id:identifier(),type,label,...center,...(type==='rect'?{w:a,h:b,kind:label==='Skylight'?'skylight':'roof',pitch:null}:{x2:center.x+a,y2:center.y})};plan.shapes.push(s);selected=s.id;setTool('select');update();$('plan-properties').scrollIntoView?.({block:'nearest'});}
    $('plan-add-roof').onclick=()=>add('rect','Roof section',240,180);$('plan-add-window').onclick=()=>add('rect','Skylight',24,48);$('plan-add-line').onclick=()=>add('line','Roof edge',120);
    function applyProperties(){const s=chosen();if(!s)return true;if(!active())return false;try{const next=M.resize(s,$('plan-a').value,$('plan-b').value,plan.unit);next.label=$('plan-label').value.trim().slice(0,80);if(s.type==='rect'){next.kind=$('plan-kind').value;next.pitch=next.kind==='roof'?M.pitch($('plan-pitch').value,pitchMode):null;}checkpoint();Object.assign(s,next);update();return !window.qnSaveFailed;}catch(e){status(e.message,true);return false;}}
    $('plan-apply').onclick=applyProperties;
    for(const id of ['plan-label','plan-a','plan-b','plan-pitch'])$(id).addEventListener('input',()=>{propertyDraft=true;status('Size changes pending · tap Apply size or Done.');});
    $('plan-kind').onchange=()=>{propertyDraft=true;$('plan-pitch-settings').hidden=$('plan-kind').value!=='roof';};
    $('plan-pitch-mode').onchange=()=>{try{const value=M.pitch($('plan-pitch').value,pitchMode);pitchMode=$('plan-pitch-mode').value;$('plan-pitch').value=value===null?'':+(pitchMode==='degrees'?Math.atan(value/12)*180/Math.PI:value).toFixed(5);}catch(e){$('plan-pitch-mode').value=pitchMode;status(e.message,true);}};
    $('plan-delete').onclick=()=>{if(!chosen()||!active())return;checkpoint();plan.shapes=plan.shapes.filter(s=>s.id!==selected);selected=null;update();};
    $('plan-undo').onclick=()=>{if(!undo.length||!active())return;redo.push(M.clone(plan.shapes));plan.shapes=undo.pop();selected=null;revision++;update();};
    $('plan-redo').onclick=()=>{if(!redo.length||!active())return;undo.push(M.clone(plan.shapes));plan.shapes=redo.pop();selected=null;revision++;update();};
    function zoom(multiplier){if(propertyDraft&&!applyProperties())return;const old=plan.view.width,next=Math.max(24,Math.min(24000,old*multiplier));plan.view.x+=(old-next)/2;plan.view.y+=(old-next)*H/W/2;plan.view.width=next;render();persist();}
    $('plan-in').onclick=()=>zoom(.75);$('plan-out').onclick=()=>zoom(1/.75);$('plan-fit').onclick=()=>{if(propertyDraft&&!applyProperties())return;plan.view=M.fit(plan.shapes);render();persist();};
    $('plan-unit').onchange=()=>{if(propertyDraft&&!applyProperties()){$('plan-unit').value=plan.unit;return;}plan.unit=$('plan-unit').value;update();};$('plan-snap').onchange=()=>{plan.snap=$('plan-snap').checked;update();};
    $('plan-address').addEventListener('input',()=>{plan.address=$('plan-address').value;persist();});$('plan-notes').addEventListener('input',()=>{plan.notes=$('plan-notes').value;persist();});
    function photo(){const img=$('plan-photo');img.hidden=!plan.photo;$('plan-remove-photo').hidden=!plan.photo;if(plan.photo)img.src=plan.photo;else img.removeAttribute('src');}
    $('plan-file').onchange=async()=>{
      const file=$('plan-file').files?.[0];if(!file||uploading)return;
      if(!/^image\/(jpeg|png|webp)$/.test(file.type)||file.size>20000000){status('Choose a JPG, PNG or WebP photo under 20 MB.',true);return;}
      uploading=true;$('plan-file').disabled=true;status('Preparing photo…');const url=URL.createObjectURL(file);
      try{
        const img=new Image();await new Promise((ok,no)=>{img.onload=ok;img.onerror=()=>no(Error('Could not read this photo. Try a JPG.'));img.src=url;});
        if(!active()||!body.isConnected)return;const c=document.createElement('canvas');let ratio=Math.min(1,1200/Math.max(img.naturalWidth,img.naturalHeight));c.width=Math.max(1,Math.round(img.naturalWidth*ratio));c.height=Math.max(1,Math.round(img.naturalHeight*ratio));const cx=c.getContext('2d');cx.fillStyle='#fff';cx.fillRect(0,0,c.width,c.height);cx.drawImage(img,0,0,c.width,c.height);let data=c.toDataURL('image/jpeg',.72);if(data.length>500000)data=c.toDataURL('image/jpeg',.45);if(data.length>500000)throw Error('This photo is too detailed to store. Choose a smaller photo.');plan.photo=data;photo();persist();
      }catch(e){status(e.message,true);}finally{URL.revokeObjectURL(url);uploading=false;$('plan-file').disabled=false;$('plan-file').value='';}
    };
    $('plan-remove-photo').onclick=async()=>{if(!await qnConfirm('Remove this reference photo?'))return;plan.photo='';photo();persist();};
    $('plan-retry').onclick=persist;
    $('plan-done').onclick=()=>{if(uploading){status('Wait for the photo to finish before closing.',true);return;}if(propertyDraft&&!applyProperties())return;if(persist())closeModal();};
    $('plan-download').onclick=()=>{
      if(!window.qnRequirePro?.('Project plans'))return;
      if(propertyDraft&&!applyProperties())return;
      if(!plan.shapes.length){status('Add a roof section or draw an element first.',true);return;}
      const out=document.createElement('canvas');out.width=W;out.height=H+160;const c=out.getContext('2d');c.fillStyle='#fff';c.fillRect(0,0,W,H+160);c.fillStyle='#292723';c.font='bold 25px system-ui';c.fillText((job.title||'Project plan').slice(0,65),24,36);c.font='17px system-ui';c.fillText(plan.address.slice(0,95),24,65);c.save();c.translate(0,85);renderTo(c,M.fit(plan.shapes),false);c.restore();c.fillStyle='#60584e';c.font='15px system-ui';c.fillText('Quote.Noble · Top-down plan · Dimensions from site measurements · Print size varies',24,H+117);c.fillText('Roof surface estimates: entered slope, no openings / overlap deductions, no waste.',24,H+143);
      const link=document.createElement('a');link.download='QuoteNoble-Project-Plan-'+String(job.id).replace(/[^a-zA-Z0-9_-]/g,'')+'.png';link.href=out.toDataURL('image/png');document.body.appendChild(link);link.click();link.remove();
    };
    photo();controls();render();
  };
})();
