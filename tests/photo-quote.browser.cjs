// UI integration fixture: real photo storage and feature; simulated native
// quote form and AI responses. Never reads or writes a real customer account.
const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
  const browser=await chromium.launch({headless:true});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}});
    const errors=[];page.on('pageerror',e=>errors.push(e.message));
    const fixture=`<!doctype html><html><body class="qn-authenticated"><div id="view-quotes"></div><div id="modal-body"></div><script>
    var LS_KEY='photo-quote-test';var DB=JSON.parse(localStorage.getItem(LS_KEY)||'{"clients":[],"quotes":[],"smartTemplates":[]}');
    window.qnApprovalSession={client:{auth:{getSession:async()=>({data:{session:{access_token:'fixture-token'}}})}}};
    window.qnAlert=message=>{window.lastAlert=message};
    function save(){localStorage.setItem(LS_KEY,QNInspectionPhotos.stringify(DB,LS_KEY));}
    function readItems(body){return [...body.querySelectorAll('.item-row')].filter(r=>r.querySelector('.service').value.trim()).map(r=>({service:r.querySelector('.service').value}));}
    function itemRowsHTML(items){return items.map(i=>'<div class="item-row"><input class="service" value="'+i.service+'"><textarea class="desc">'+i.desc+'</textarea><input class="qty" type="number" value="1"><input class="price" type="number" value="0"></div>').join('');}
    function updateLiveTotals(){}
    function openQuoteForm(){document.getElementById('modal-body').innerHTML='<div id="items-wrap"></div><textarea id="f-notes"></textarea><button id="f-save">Save</button>';document.getElementById('f-save').onclick=()=>{DB.quotes.push({id:'fixture-quote',photoQuote:document.getElementById('modal-body').qnPhotoQuote});save();};}
    </script><script src="/inspection-photo-store.js"></script><script src="/photo-quote.js"></script></body></html>`;
    await page.route('http://photo.test/**',async route=>{
      const url=new URL(route.request().url());
      if(url.pathname==='/api/photo-quote'){
        const data=route.request().postDataJSON();return route.fulfill({json:data.action==='status'?{ready:true}:{draft:{items:[{service:'Gutter cleaning',desc:'Confirm gutters and access',qty:null,price:null}],questions:['Confirm height and access.'],observations:['Leaves visible.']}}});
      }
      if(url.pathname==='/')return route.fulfill({contentType:'text/html',body:fixture});
      const source=url.pathname==='/inspection-photo-store.js'?path.resolve('../inspection-photo-store.js'):path.resolve('.'+url.pathname);
      return route.fulfill({contentType:'application/javascript',body:fs.readFileSync(source,'utf8')});
    });
    await page.goto('http://photo.test/');
    await page.getByRole('button',{name:'Photo to Quote',exact:true}).click();
    await page.waitForFunction(()=>document.querySelector('[data-status]').textContent==='Ready to draft.');
    const bytes=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=20;c.height=20;c.getContext('2d').fillRect(0,0,20,20);return c.toDataURL('image/jpeg').split(',')[1];});
    await page.locator('[data-gallery-input]').setInputFiles({name:'job.jpg',mimeType:'image/jpeg',buffer:Buffer.from(bytes,'base64')});
    await page.waitForFunction(()=>document.querySelector('[data-save]').textContent.startsWith('Saved on this device'));
    await page.locator('#qn-photo-notes').fill('Rear gutter cleaning.');
    await page.waitForFunction(()=>document.querySelector('[data-save]').textContent.startsWith('Saved on this device'));
    await page.reload();await page.getByRole('button',{name:'Photo to Quote',exact:true}).click();
    await page.waitForFunction(()=>!document.querySelector('[data-build]').disabled);
    assert.equal(await page.locator('#qn-photo-notes').inputValue(),'Rear gutter cleaning.');assert.equal(await page.locator('[data-gallery] img').count(),1);
    await page.getByRole('button',{name:'Draft my quote'}).click();
    await page.getByRole('button',{name:'Open quote editor'}).click();
    assert.equal(await page.locator('.qty').inputValue(),'');assert.equal(await page.locator('.price').inputValue(),'');
    await page.locator('#f-save').click();assert.equal(await page.evaluate(()=>DB.quotes.length),0);
    await page.locator('.qty').fill('1');await page.locator('.price').fill('250');
    await page.locator('#f-save').click();assert.equal(await page.evaluate(()=>DB.quotes.length),0);
    await page.locator('[data-photo-confirm]').check();await page.locator('#f-save').click();
    assert.equal(await page.evaluate(()=>DB.quotes.length),1);assert.equal(await page.evaluate(()=>DB.quotes[0].photoQuote.photos.length),1);
    assert.deepEqual(errors,[]);console.log('Mobile fixture passed: upload, IndexedDB reload recovery, draft review, missing-value guards, photo transfer.');
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
