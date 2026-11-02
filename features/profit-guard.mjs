/** Quote.Noble Profit Guard: optional, private, tax-exclusive profit calculations. */
export function calculateProfitGuard({ revenue, materials = 0, labour = 0, other = 0 } = {}) {
  const values = [revenue, materials, labour, other].map(Number);
  if (values.some(value => !Number.isFinite(value) || value < 0)) {
    throw new RangeError('Revenue and costs must be finite non-negative numbers');
  }
  const [sales, materialCost, labourCost, otherCost] = values;
  const costs = materialCost + labourCost + otherCost;
  const profit = sales - costs;
  return {
    revenue: sales,
    costs,
    profit,
    marginPercent: sales === 0 ? 0 : (profit / sales) * 100,
    isLoss: profit < 0
  };
}
