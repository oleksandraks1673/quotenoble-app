/* Home money dashboard (10/10 fixes, chunk 2).
   Bolt-on layer in the same style as noble-flagship.js: wraps renderDashboard and
   paints a "Your money" panel into the Home view from the same local DB the app
   already loaded. No backend calls; every figure is computed client-side with the
   app's own helpers (invoiceTotals, invoiceStatus, money, esc, todayStr,
   clientName, qnUninvoicedJobDeposits). */
(function () {
  "use strict";

  function dbReady() {
    try {
      return typeof DB !== "undefined" && !!DB && Array.isArray(DB.invoices);
    } catch (e) { return false; }
  }

  /* Money in this month — mirrors the "Paid this month" total computed by
     qnRenderBusinessSummary in app.html: dated invoice payments plus uninvoiced
     job deposits, plus each invoice's dateless depositPaid counted in the month
     the invoice was created. */
  function moneyInThisMonth() {
    const m = todayStr().slice(0, 7);
    let paid = 0;
    (DB.invoices || []).forEach((inv) => {
      (inv.payments || []).forEach((p) => { if ((p.date || "").slice(0, 7) === m) paid += Math.round(p.amount); });
      if ((inv.createdAt || "").slice(0, 7) === m) paid += Math.round(inv.depositPaid || 0);
    });
    if (typeof qnUninvoicedJobDeposits === "function") {
      qnUninvoicedJobDeposits().forEach((p) => { if ((p.date || "").slice(0, 7) === m) paid += p.amount; });
    }
    return paid;
  }

  /* Money out this month — the manual expenses saved in DB.expenses (total is
     cents, tax included; soft-deleted rows excluded). Receipts captured in
     Purchases live behind the purchases API and are not part of the local DB,
     so they are not counted here; Money & Taxes stays the full expense picture. */
  function moneyOutThisMonth() {
    const m = todayStr().slice(0, 7);
    let out = 0;
    (DB.expenses || []).forEach((r) => {
      if (!r.deletedAt && (r.date || "").slice(0, 7) === m && Number.isFinite(r.total)) out += r.total;
    });
    return out;
  }

  function quarterMonths() {
    const t = todayStr();
    const start = Math.floor((Number(t.slice(5, 7)) - 1) / 3) * 3 + 1;
    const ym = (n) => t.slice(0, 4) + "-" + String(n).padStart(2, "0");
    return [ym(start), ym(start + 2)];
  }
  function inQuarter(dateStr) {
    const ym = (dateStr || "").slice(0, 7);
    if (!/^\d{4}-\d{2}$/.test(ym)) return false;
    const range = quarterMonths();
    return ym >= range[0] && ym <= range[1];
  }

  /* Tax owing for the current calendar quarter so far (an estimate).
     Collected: every invoice already tracks its own tax through
     invoiceTotals(inv).tax, computed from the document's rate — which itself
     defaults from the business profile tax settings (qnDocumentTax). A payment
     received this quarter carries its share of that tax:
     payment × invoice tax ÷ invoice total, capped at the invoice's tax.
     Dateless depositPaid and not-yet-invoiced job deposits carry no tax
     breakdown, so they count only once the money lands on an invoice payment —
     the same dated-payments rule money-model.js uses for its year reports.
     Paid: the tax entered on this quarter's expenses (expense.tax, cents). */
  function taxOwingThisQuarter() {
    let collected = 0;
    (DB.invoices || []).forEach((inv) => {
      const t = invoiceTotals(inv);
      if (!(t.total > 0) || !(t.tax > 0)) return;
      let share = 0;
      (inv.payments || []).forEach((p) => {
        if (inQuarter(p.date)) share += Math.round((Math.round(p.amount) * t.tax) / t.total);
      });
      collected += Math.min(share, t.tax);
    });
    let paidTax = 0;
    (DB.expenses || []).forEach((r) => {
      if (!r.deletedAt && inQuarter(r.date) && Number.isFinite(r.tax)) paidTax += r.tax;
    });
    return collected - paidTax;
  }

  /* Who owes you: unpaid invoice balances grouped by customer — overdue groups
     first, then largest balance first. */
  function whoOwes() {
    const groups = new Map();
    (DB.invoices || []).forEach((inv) => {
      const t = invoiceTotals(inv);
      if (t.balance <= 0) return;
      let g = groups.get(inv.clientId);
      if (!g) {
        g = { clientId: inv.clientId, name: clientName(inv.clientId), balance: 0, count: 0, overdue: false, biggest: inv, biggestBalance: 0 };
        groups.set(inv.clientId, g);
      }
      g.balance += t.balance;
      g.count += 1;
      if (invoiceStatus(inv) === "overdue") g.overdue = true;
      if (t.balance > g.biggestBalance) { g.biggestBalance = t.balance; g.biggest = inv; }
    });
    return Array.from(groups.values()).sort((a, b) => (Number(b.overdue) - Number(a.overdue)) || (b.balance - a.balance));
  }

  function statCard(label, value, cls, note) {
    return '<div class="stat ' + cls + '"><div class="label">' + esc(label) + '</div><div class="value">' + esc(value) + "</div>" +
      (note ? '<div class="qn-home-money-note">' + esc(note) + "</div>" : "") + "</div>";
  }

  function paint() {
    const home = document.getElementById("view-home");
    if (!home || !dbReady()) return;
    let panel = document.getElementById("qn-home-money");
    if (!panel) {
      panel = document.createElement("section");
      panel.id = "qn-home-money";
      panel.className = "card qn-home-money";
      const recent = home.querySelector(".qn-recent-documents");
      if (recent) recent.insertAdjacentElement("beforebegin", panel);
      else home.appendChild(panel);
      panel.addEventListener("click", (event) => {
        if (event.target.closest("[data-qn-owes-more]")) { showView("invoices"); return; }
        const row = event.target.closest("[data-qn-owes]");
        if (!row) return;
        if (row.dataset.qnOwesInvoice) { showView("invoices"); openInvoiceDetail(row.dataset.qnOwesInvoice); }
        else if (row.dataset.qnOwesClient) { showView("clients"); openClientDetail(row.dataset.qnOwesClient); }
      });
    }
    const taxLabel = (DB.profile && DB.profile.taxLabel) || "HST";
    const owing = taxOwingThisQuarter();
    const owes = whoOwes();
    const shown = owes.slice(0, 5);
    let html = "<h2>Your money</h2>";
    html += '<div class="stat-grid qn-home-money-grid">' +
      statCard("Money in · this month", money(moneyInThisMonth()), "ok", "") +
      statCard("Money out · this month", money(moneyOutThisMonth()), "", "") +
      statCard(taxLabel + " owing", money(owing), owing > 0 ? "warn" : "", "For this quarter · estimate") +
      "</div>";
    html += "<h3>Who owes you</h3>";
    if (!owes.length) {
      html += '<p class="qn-home-money-empty">No unpaid invoices right now.</p>';
    } else {
      html += shown.map((g) => {
        const detail = g.count === 1
          ? (g.biggest.number || "Invoice") + " · " + money(g.balance) + " outstanding"
          : g.count + " invoices · " + money(g.balance) + " outstanding";
        const attrs = g.count === 1
          ? ' data-qn-owes data-qn-owes-invoice="' + esc(g.biggest.id) + '"'
          : ' data-qn-owes data-qn-owes-client="' + esc(g.clientId) + '"';
        return '<button type="button" class="qn-attention-item"' + attrs + "><span><strong>" + esc(g.name) + "</strong><small>" + esc(detail) + "</small></span>" +
          (g.overdue ? '<span class="qn-task-tag">Overdue</span>' : "") + "</button>";
      }).join("");
      if (owes.length > shown.length) {
        html += '<button type="button" class="qn-attention-item" data-qn-owes-more><span><strong>See all invoices</strong><small>' +
          (owes.length - shown.length) + " more customers owe you</small></span></button>";
      }
    }
    panel.innerHTML = html;
  }

  function hookDashboard() {
    if (typeof window.renderDashboard !== "function" || window.renderDashboard.qnHomeMoney) return;
    const original = window.renderDashboard;
    const wrapped = function () {
      const result = original.apply(this, arguments);
      try { paint(); } catch (e) {}
      return result;
    };
    wrapped.qnHomeMoney = true;
    window.renderDashboard = wrapped;
  }

  function boot() {
    hookDashboard();
    if (document.getElementById("view-home")?.classList.contains("active")) {
      try { paint(); } catch (e) {}
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  window.addEventListener("load", boot);
})();
