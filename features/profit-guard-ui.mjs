import { calculateProfitGuard } from './profit-guard.mjs';

/**
 * Optional contractor-only calculator.
 * Mount ONLY in an authenticated contractor view. Never render in customer
 * previews or PDFs. No persistence or quote mutations are performed here.
 */
export function mountProfitGuard(container, getRevenue) {
  if (!container || typeof container.append !== 'function' || typeof getRevenue !== 'function') {
    throw new TypeError('Missing host container or revenue provider');
  }
  const doc = container.ownerDocument || document;
  const details = doc.createElement('details');
  details.className = 'qn-profit-guard';
  const summary = doc.createElement('summary');
  summary.textContent = 'Profit Guard (optional, private)';
  details.append(summary);
  const fields = {};
  for (const [key, title] of [['materials', 'Materials'], ['labour', 'Labour'], ['other', 'Other costs']]) {
    const label = doc.createElement('label');
    label.textContent = title;
    const input = doc.createElement('input');
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
  const result = doc.createElement('output');
  result.setAttribute('aria-live', 'polite');
  details.append(result);
  const money = value => new Intl.NumberFormat('en-CA', {
    style: 'currency', currency: 'CAD'
  }).format(value);

  function render() {
    try {
      const revenue = getRevenue();
      const costs = Object.fromEntries(Object.entries(fields).map(([key, input]) => {
        // Number('') is zero, but incomplete and malformed values must not
        // silently become zero and display a misleading profit.
        if (input.validity?.badInput || input.validity?.rangeUnderflow || input.validity?.stepMismatch) {
          throw new RangeError('Invalid cost');
        }
        const raw = input.value.trim();
        if (raw !== '' && !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(raw)) {
          throw new RangeError('Invalid cost');
        }
        return [key, raw === '' ? 0 : Number(raw)];
      }));
      const p = calculateProfitGuard({ revenue, ...costs });
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
