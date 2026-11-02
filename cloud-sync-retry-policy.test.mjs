import test from 'node:test';
import assert from 'node:assert/strict';
import { retryDelayMs, shouldRetryCloudWrite } from './cloud-sync-retry-policy.mjs';
test('retry delays back off and cap at one minute', () => {
  assert.deepEqual([1,2,3,4,5,6,7].map(retryDelayMs), [5000,10000,20000,40000,60000,60000,60000]);
});
test('invalid retry counts are rejected', () => {
  for (const n of [0,-1,1.5,NaN,Infinity]) assert.throws(() => retryDelayMs(n), RangeError);
});
test('retries only for current generation with connection ready', () => {
  const base = {online:true,ready:true,running:false,generation:3,currentGeneration:3};
  assert.equal(shouldRetryCloudWrite(base),true);
  for (const patch of [{online:false},{ready:false},{running:true},{currentGeneration:4}]) {
    assert.equal(shouldRetryCloudWrite({...base,...patch}),false);
  }
});
