import { calculateProfitGuard } from './profit-guard.mjs';

/**
 * Optional, contractor-only profit calculator.
 * This component never modifies a quote, saves costs, or exposes them in a PDF.
 * The host quote editor must explicitly mount it inside an authenticated owner view.
 */
export function mountProfitGuard(container, getRevenue) {
  if (!container || typeof getRevenue !== 'function') throw new TypeError('Missing host container or revenue provider');
  const details = document.createElement('details');
  details.className = 'qn-profit-guard';
  const summary = document.createElement('summary');
  summary.textContent = 'Profit Guard (optional · private)';
  details.append(summary);
  const fields = {};
  for (const [key, title] of [['materials', 'Materials'], ['labour', 'Labour'], ['other', 'Other costs']]) {
    const label = document.createElement('label');
    label.textContent = title;
    const input = document.createElement('input');
    input.type = 'number';
    input.min = '0';
    input.step = '0.01';
    input.inputMode = 'decimal';
    input.placeholder = '0.00';
    input.autocomplete = 'off';
    label.append(input);
    details.append(label);
    fields[key] = input;
  }
  const result = document.createElement('output');
  result.setAttribute('aria-live', 'polite');
  details.append(result);
  function render() {
    try {
      const revenue = getRevenue();
      const values = Object.fromEntries(Object.entries(fields).map(([key, input]) => [key, input.value.trim() === '' ? 0 : Number(input.value)]));
      const p = calculateProfitGuard({ revenue, ...values });
      const money = n => new Intl.NumberFormat('en-CA', { style: 'currency', currency: 'CAD' }).format(n);
      result.textContent = `Estimated profit: ${money(p.profit)} · Margin: ${p.marginPercent.toFixed(1)}%`;
    } catch {
      result.textContent = 'Enter valid quote revenue and non-negative costs';
    }
  }
  details.addEventListener('toggle', () => { if (details.open) render(); });
  for (const input of Object.values(fields)) input.addEventListener('input', render);
  container.append(details);
  return { element: details, refresh: render, destroy: () => details.remove() };
}
