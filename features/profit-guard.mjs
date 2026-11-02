/** Quote.Noble Profit Guard: optional, private, tax-exclusive profit calculations. */
export function calculateProfitGuard({ revenue, materials = 0, labour = 0, other = 0 } = {}) {
  const raw = [revenue, materials, labour, other];
  const cents = raw.map(value => {
    if (typeof value !== 'number' && typeof value !== 'string') {
      throw new RangeError('Revenue and costs must be valid non-negative amounts');
    }
    if (typeof value === 'string' && (value.trim() === '' || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()))) {
      throw new RangeError('Revenue and costs must be valid non-negative amounts');
    }
    const amount = Number(value);
    if (!Number.isFinite(amount) || amount < 0 || amount > Number.MAX_SAFE_INTEGER / 100) {
      throw new RangeError('Revenue and costs must be finite non-negative safe amounts');
    }
    const rounded = Math.round((amount + Number.EPSILON) * 100);
    if (!Number.isSafeInteger(rounded)) throw new RangeError('Amount is too large');
    return rounded;
  });
  const [sales, materialCost, labourCost, otherCost] = cents;
  const totalCosts = materialCost + labourCost + otherCost;
  const profitCents = sales - totalCosts;
  if (!Number.isSafeInteger(totalCosts) || !Number.isSafeInteger(profitCents)) {
    throw new RangeError('Amounts exceed the supported numeric range');
  }
  return {
    revenue: sales / 100,
    costs: totalCosts / 100,
    profit: profitCents / 100,
    marginPercent: sales === 0 ? 0 : (profitCents / sales) * 100,
    isLoss: profitCents < 0
  };
}
