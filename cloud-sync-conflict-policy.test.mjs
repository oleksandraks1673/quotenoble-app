import test from 'node:test';
import assert from 'node:assert/strict';
import { conditionalWrite } from './cloud-sync-conflict-policy.mjs';
test('second device cannot overwrite newer first-device save', () => {
  const initial={updated_at:'t1',payload:{quotes:[{id:'Q1',total:100}]}};
  const first=conditionalWrite(initial,'t1',{quotes:[{id:'Q1',total:200}]},'t2');
  assert.equal(first.ok,true);
  const second=conditionalWrite(first.row,'t1',{quotes:[{id:'Q1',total:150}]},'t3');
  assert.equal(second.ok,false);
  assert.equal(second.reason,'stale');
  assert.equal(second.row.payload.quotes[0].total,200);
});
test('first-write race rejects second insert', () => {
  const first=conditionalWrite(null,null,{quotes:[{id:'Q1'}]},'t1');
  assert.equal(first.ok,true);
  const second=conditionalWrite(first.row,null,{quotes:[{id:'Q2'}]},'t2');
  assert.equal(second.ok,false);
});
test('matching timestamp permits next save', () => {
  const row={updated_at:'t1',payload:{quotes:[]}};
  assert.equal(conditionalWrite(row,'t1',{quotes:[{id:'Q3'}]},'t2').ok,true);
});
