/** Quote.Noble Profit Guard: optional, private, tax-exclusive profit calculations. */
export function calculateProfitGuard({ revenue, materials = 0, labour = 0, other = 0 } = {}) {
  const raw = [revenue, materials, labour, other];
  const values = raw.map(value => {
    if (typeof value !== 'number' && typeof value !== 'string') {
      throw new RangeError('Revenue and costs must be valid non-negative amounts');
    }
    if (typeof value === 'string' && (value.trim() === '' || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(value.trim()))) {
      throw new RangeError('Revenue and costs must be valid non-negative amounts');
    }
    const number = Number(value);
    if (!Number.isFinite(number) || number < 0) {
      throw new RangeError('Revenue and costs must be finite non-negative amounts');
    }
    return number;
  });
  const [sales, materialCost, labourCost, otherCost] = values;
  const costs = materialCost + labourCost + otherCost;
  const profit = sales - costs;
  if (!Number.isFinite(costs) || !Number.isFinite(profit)) {
    throw new RangeError('Amounts exceed the supported numeric range');
  }
  return {
    revenue: sales,
    costs,
    profit,
    marginPercent: sales === 0 ? 0 : (profit / sales) * 100,
    isLoss: profit < 0
  };
}
