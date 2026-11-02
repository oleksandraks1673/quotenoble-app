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
test('rejects malformed, missing and unsafe amounts', () => {
  for (const invalid of [-1, 'bad', '', '  ', null, NaN, Infinity, {}, true, '12,000']) {
    assert.throws(() => calculateProfitGuard({ revenue: 100, materials: invalid }), RangeError);
  }
  assert.throws(() => calculateProfitGuard({}), RangeError);
  assert.throws(() => calculateProfitGuard({ revenue: 1e308, materials: 1e308 }), RangeError);
});
test('accepts valid decimal strings and zero costs', () => {
  const result = calculateProfitGuard({ revenue: '125.50', materials: '25.25', labour: 0 });
  assert.equal(result.profit, 100.25);
});

test('uses cent arithmetic for typical currency amounts', () => {
  const result = calculateProfitGuard({ revenue: '0.30', materials: '0.10', labour: '0.20' });
  assert.equal(result.costs, 0.3);
  assert.equal(result.profit, 0);
});
test('rounds fractional cents at input boundary', () => {
  const result = calculateProfitGuard({ revenue: '10.009', materials: '0.004' });
  assert.equal(result.revenue, 10.01);
  assert.equal(result.costs, 0);
  assert.equal(result.profit, 10.01);
});
