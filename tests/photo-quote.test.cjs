const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const M=require('../lib/photo-quote');
const jpeg='data:image/jpeg;base64,'+Buffer.from([255,216,255,224,0,0,255,217]).toString('base64');
const request={trade:'Roofing repairs',notes:'Check this roof',photos:[jpeg]};
test('accepts bounded image inputs and rejects external URLs and fake JPEGs',()=>{
  assert.equal(M.input(request).photos.length,1);
  for(const photos of [[],Array(7).fill(jpeg),['https://example.com/photo.jpg'],['data:image/jpeg;base64,YWJjZA==']])assert.throws(()=>M.input({...request,photos}));
  assert.throws(()=>M.input({...request,notes:'x'.repeat(4001)}));
  assert.throws(()=>M.input({...request,photos:Array(6).fill(jpeg+'A'.repeat(600000))}));
});
test('model cannot set quantities or prices; invalid outputs do not become quotes',()=>{
  const result=M.clean({items:[{service:'Gutter cleaning',scope:'Confirm scope',qty:250,price:100}],questions:[],observations:[]});
  assert.equal(result.items[0].qty,null);assert.equal(result.items[0].price,null);
  assert.throws(()=>M.clean({items:[{service:'',scope:''}],questions:[],observations:[]}));
});
test('saved prices require exact unambiguous service matches; cents stay cents',()=>{
  const items=[{service:'Gutter cleaning',qty:null,price:null}];
  assert.equal(M.applyRates(items,[{service:'gutter cleaning',price:25000}])[0].price,25000);
  assert.equal(M.applyRates(items,[{service:'Gutter repair',price:25000}])[0].price,null);
  assert.equal(M.applyRates(items,[{service:'Gutter cleaning',price:25000},{service:'Gutter cleaning',price:35000}])[0].price,null);
});
test('API rejects unauthenticated requests and does not call AI without configuration',async()=>{
  let authed=false,calls=0;
  const sandbox={require:n=>n.includes('approvals')?{auth:async()=>{if(!authed)throw M.fail(401,'Sign in required');return{id:'u'};},pro:async()=>true}:M,module:{exports:{}},process:{env:{}},Map,Date,JSON,fetch:async()=>{calls++;},AbortSignal};
  vm.runInNewContext(fs.readFileSync(require.resolve('../api/photo-quote.js'),'utf8'),sandbox);
  const res={code:200,setHeader(){},status(n){this.code=n;return this;},json(v){this.body=v;return this;}};
  await sandbox.module.exports({method:'POST',body:request},res);assert.equal(res.code,401);
  authed=true;res.code=200;await sandbox.module.exports({method:'POST',body:request},res);assert.equal(res.code,503);assert.equal(calls,0);
  res.code=200;await sandbox.module.exports({method:'POST',body:{action:'status'}},res);assert.equal(res.body.ready,false);
});
test('integration refuses older app versions before any overwrite',()=>{
  assert.throws(()=>require('../scripts/install-photo-quote.cjs').app('<body>old app</body>'));
});
