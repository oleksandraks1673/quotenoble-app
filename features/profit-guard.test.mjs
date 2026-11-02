import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateProfitGuard } from './profit-guard.mjs';

test('calculates costs and profit without sales tax', () => {
  const result = calculateProfitGuard({ revenue: 5000, materials: 1200, labour: 1500, other: 500 });
  assert.equal(result.costs, 3200);
  assert.equal(result.profit, 1800);
  assert.equal(result.marginPercent, 36);
  assert.equal(result.isLoss, false);
});
test('handles zero revenue', () => {
  assert.equal(calculateProfitGuard({ revenue: 0 }).marginPercent, 0);
});
test('flags a loss', () => {
  assert.equal(calculateProfitGuard({ revenue: 100, labour: 150 }).isLoss, true);
});
test('rejects invalid costs', () => {
  assert.throws(() => calculateProfitGuard({ revenue: 100, materials: -1 }), RangeError);
  assert.throws(() => calculateProfitGuard({ revenue: 'bad' }), RangeError);
});
