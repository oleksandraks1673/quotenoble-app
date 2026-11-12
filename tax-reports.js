/* Tax reports (10/10 fixes, chunk 3).
   Bolt-on layer in the same style as home-dashboard.js: two report panels
   painted into the existing Money & Taxes view (#view-money), right after the
   content money.js itself paints — an HST filing-period report and a
   profit-by-job list. No backend calls; every figure is computed client-side
   from the already-loaded local DB with the app's own helpers (invoiceTotals,
   money, esc, todayStr). The panels sit outside [data-money-content], so
   money.js paint() leaves them alone; when render() rebuilds the section, a
   MutationObserver puts them back.

   Data rules (same money model as chunks 1-2):
   - HST collected for a period: per invoice, invoiceTotals(inv).tax prorated
     over the payments dated in the period (payment x tax / total, rounded),
     capped at the invoice's tax. Dateless depositPaid carries no tax share.
   - HST paid: expense.tax summed over DB.expenses rows dated in the period,
     soft-deleted rows excluded.
   - Receipts captured in Purchases live behind the purchases API and are NOT
     in the local DB, so the tax-paid figure covers locally saved expenses
     only — the panel says so.
   - Profit by job: money in = invoiceTotals(job's invoice).paid when the job
     has an invoice, otherwise its uninvoiced deposits. Money out = the job's
     entered materialCost + labourCost (the same basis as the combined
     "Estimated profit" in Business insights). Local expenses carry no job
     link at all, so they are reported once, as unassigned costs, instead of
     being silently dropped. */
(function () {
  "use strict";

  function dbReady() {
    try {
      return typeof DB !== "undefined" && !!DB && Array.isArray(DB.invoices);
    } catch (e) { return false; }
  }

  function taxLabel() {
    return (dbReady() && DB.profile && DB.profile.taxLabel) || "HST";
  }

  /* ---------- periods (calendar quarters / years) ---------- */

  function pad2(n) { return String(n).padStart(2, "0"); }

  function periods() {
    const t = todayStr();
    const y = Number(t.slice(0, 4));
    const m = Number(t.slice(5, 7));
    const q = Math.floor((m - 1) / 3); // 0-based current quarter
    const qStart = (yy, qq) => yy + "-" + pad2(qq * 3 + 1) + "-01";
    const qEnd = (yy, qq) => {
      const em = qq * 3 + 3;
      const last = new Date(Date.UTC(yy, em, 0)).getUTCDate();
      return yy + "-" + pad2(em) + "-" + pad2(last);
    };
    const lq = q === 0 ? { y: y - 1, q: 3 } : { y: y, q: q - 1 };
    return [
      { id: "this-quarter", label: "This quarter", start: qStart(y, q), end: qEnd(y, q) },
      { id: "last-quarter", label: "Last quarter", start: qStart(lq.y, lq.q), end: qEnd(lq.y, lq.q) },
      { id: "this-year", label: "This year", start: y + "-01-01", end: y + "-12-31" },
      { id: "last-year", label: "Last year", start: (y - 1) + "-01-01", end: (y - 1) + "-12-31" },
    ];
  }

  function fmtDay(s) {
    try { if (typeof fmtDate === "function") return fmtDate(s); } catch (e) {}
    return s;
  }

  function inRange(dateStr, per) {
    const d = (dateStr || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
    return d >= per.start && d <= per.end;
  }

  /* ---------- HST report ---------- */

  function taxReport(per) {
    let collected = 0;
    (DB.invoices || []).forEach((inv) => {
      const t = invoiceTotals(inv);
      if (!(t.total > 0) || !(t.tax > 0)) return;
      let share = 0;
      (inv.payments || []).forEach((pay) => {
        if (inRange(pay.date, per)) share += Math.round((Math.round(pay.amount) * t.tax) / t.total);
      });
      collected += Math.min(share, t.tax);
    });
    let paid = 0;
    (DB.expenses || []).forEach((r) => {
      if (!r.deletedAt && inRange(r.date, per) && Number.isFinite(r.tax)) paid += r.tax;
    });
    return { collected: collected, paid: paid, net: collected - paid };
  }

  /* ---------- profit by job ---------- */

  function jobInvoice(job) {
    try { if (typeof qnJobInvoice === "function") return qnJobInvoice(job) || null; } catch (e) {}
    return (DB.invoices || []).find((i) =>
      i.id === job.invoiceId || i.jobId === job.id || (job.quoteId && i.quoteId === job.quoteId)) || null;
  }

  function jobDeposits(job) {
    try { if (typeof qnJobDepositEntries === "function") return qnJobDepositEntries(job); } catch (e) {}
    return (Array.isArray(job.deposits) ? job.deposits : [])
      .filter((d) => d && !d.voidedAt && Number.isFinite(d.amount) && d.amount > 0);
  }

  function jobCustomer(job) {
    if (job.client) return job.client;
    try { if (job.clientId && typeof clientName === "function") return clientName(job.clientId); } catch (e) {}
    return "";
  }

  function profitByJob() {
    const rows = [];
    (DB.jobs || []).forEach((job) => {
      if (!job || job.deletedAt) return;
      const inv = jobInvoice(job);
      const deposits = jobDeposits(job);
      const moneyIn = inv
        ? invoiceTotals(inv).paid
        : deposits.reduce((s, d) => s + Math.round(d.amount), 0);
      const costs = Math.round(job.materialCost || 0) + Math.round(job.labourCost || 0);
      const hasCosts = !!(job.materialCost || job.labourCost);
      if (!inv && !deposits.length && !hasCosts && !Number.isFinite(job.agreedTotal)) return;
      rows.push({
        id: job.id,
        title: job.title || "Untitled job",
        customer: jobCustomer(job),
        moneyIn: moneyIn,
        costs: costs,
        hasCosts: hasCosts,
        profit: hasCosts ? moneyIn - costs : null,
      });
    });
    rows.sort((a, b) => {
      if (a.profit === null && b.profit === null) return b.moneyIn - a.moneyIn;
      if (a.profit === null) return 1;
      if (b.profit === null) return -1;
      return (b.profit - a.profit) || (b.moneyIn - a.moneyIn);
    });
    return rows;
  }

  /* Local expenses never carry a job link in this data model, so none of them
     can be assigned to a job's profit. Total them once, openly. */
  function unassignedCosts() {
    let total = 0, count = 0;
    (DB.expenses || []).forEach((r) => {
      if (!r.deletedAt && Number.isFinite(r.total)) { total += r.total; count += 1; }
    });
    return { total: total, count: count };
  }

  /* ---------- painting ---------- */

  let periodId = "this-quarter";

  function card(label, value, small, cls) {
    return '<div class="qn-money-card' + (cls ? " " + cls : "") + '"><span>' + esc(label) + "</span><strong>" +
      esc(value) + "</strong><small>" + esc(small) + "</small></div>";
  }

  function taxPanelHtml() {
    const label = taxLabel();
    const list = periods();
    const per = list.find((x) => x.id === periodId) || list[0];
    const r = taxReport(per);
    let html = "<h3>" + esc(label) + " report</h3>";
    html += '<label class="qn-tax-period">Period<select id="qn-tax-period">' +
      list.map((x) => '<option value="' + esc(x.id) + '"' + (x.id === per.id ? " selected" : "") + ">" + esc(x.label) + "</option>").join("") +
      "</select></label>";
    html += '<div class="qn-money-cards">' +
      card(label + " collected", money(r.collected), "On payments received") +
      card(label + " paid", money(r.paid), "Tax entered on expenses") +
      card("Net " + label + " owing", money(r.net), "Collected minus paid", "qn-tax-net") +
      "</div>";
    html += '<p class="qn-money-note">' + esc(fmtDay(per.start)) + " – " + esc(fmtDay(per.end)) +
      " · Estimate for filing, not a tax bill. Your accountant reviews eligibility and adjustments.</p>";
    html += '<p class="qn-money-note">This report uses payments and expenses saved on this device. ' +
      "Receipts captured in Purchases are kept separately and are not included, so the " + esc(label) +
      " paid amount can be lower than your full records.</p>";
    return html;
  }

  function profitPanelHtml() {
    const rows = profitByJob();
    let html = "<h3>Profit by job</h3>";
    html += '<p class="qn-tax-sub">Money in is what customers have paid on each job\u2019s invoice ' +
      "(or deposits on jobs not invoiced yet). Costs are the material and labour amounts entered on the job.</p>";
    if (!rows.length) {
      html += '<p class="qn-tax-empty">No jobs with money or costs yet.</p>';
    } else {
      html += rows.map((r) => {
        const sub = (r.customer ? esc(r.customer) + " · " : "") +
          "In " + esc(money(r.moneyIn)) + " · Costs " + esc(money(r.costs));
        const right = r.profit === null
          ? '<strong>\u2014</strong><small>No costs entered yet</small>'
          : "<strong>" + esc(money(r.profit)) + "</strong>";
        return '<button type="button" class="qn-money-row qn-tax-job-row" data-qn-job-profit="' + esc(r.id) +
          '"><span><strong>' + esc(r.title) + "</strong><small>" + sub + "</small></span>" +
          '<span class="qn-tax-job-profit">' + right + "</span></button>";
      }).join("");
    }
    const un = unassignedCosts();
    if (un.count) {
      html += '<p class="qn-money-note">Not in these numbers: ' + esc(money(un.total)) + " in expenses (" +
        un.count + ") that are not tied to a job. Expenses saved in Money &amp; Taxes do not carry a job link, " +
        "so they stay out of job profit.</p>";
    }
    return html;
  }

  function paintReports() {
    const wrap = document.getElementById("qn-tax-reports");
    if (!wrap || !dbReady()) return;
    wrap.innerHTML = taxPanelHtml() + profitPanelHtml();
  }

  function ensurePanels() {
    const section = document.getElementById("view-money");
    if (!section || !dbReady()) return;
    const content = section.querySelector("[data-money-content]");
    if (!content || !content.childElementCount) return; // money.js has not painted yet
    if (document.getElementById("qn-tax-reports")) return;
    const wrap = document.createElement("div");
    wrap.id = "qn-tax-reports";
    content.insertAdjacentElement("afterend", wrap);
    wrap.addEventListener("change", (event) => {
      if (event.target && event.target.id === "qn-tax-period") {
        periodId = event.target.value;
        try { paintReports(); } catch (e) {}
      }
    });
    wrap.addEventListener("click", (event) => {
      const row = event.target.closest("[data-qn-job-profit]");
      if (!row) return;
      try { showView("jobs"); openJobDetail(row.dataset.qnJobProfit); } catch (e) {}
    });
    try { paintReports(); } catch (e) {}
  }

  /* ---------- wiring ---------- */

  function watch() {
    const section = document.getElementById("view-money");
    if (!section) return false;
    if (!section.__qnTaxWatched) {
      section.__qnTaxWatched = true;
      new MutationObserver(() => { try { ensurePanels(); } catch (e) {} })
        .observe(section, { childList: true, subtree: true });
    }
    try { ensurePanels(); } catch (e) {}
    return true;
  }

  function boot() {
    if (watch()) return;
    if (document.body && typeof MutationObserver === "function") {
      const bodyObserver = new MutationObserver(() => { if (watch()) bodyObserver.disconnect(); });
      bodyObserver.observe(document.body, { childList: true, subtree: true });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  window.addEventListener("load", boot);

  window.QNTaxReports = { periods: periods, taxReport: taxReport, profitByJob: profitByJob, unassignedCosts: unassignedCosts };
})();
