/* Payments sorting (10/10 fixes, chunk 4).
   The one feature the audit found fully MISSING: money that lands in the
   bank (e-transfer, cash, cheque) before it is tied to any invoice. The
   owner sorts each payment once — Income or Not income — so tax-time
   numbers stay clean.

   Bolt-on module in the money.js style: it creates its own view section
   (#view-payments) next to #view-more, wraps showView the same way
   money.js does, and is opened from a More menu item via the delegated
   [data-payments-open] click, again like money.js / [data-money-open].

   Data: a standalone collection, DB.paymentsInbox, kept completely
   separate from invoice payments (inv.payments[]) and job deposits.
   Records are added by hand, tagged once, and NEVER fed into the
   money-in, sales or HST figures in home-dashboard.js, tax-reports.js
   or money-model.js — invoice payments are already counted there, so
   counting these too would double-count. Their only tax-time surface
   is a separate standalone-payments.csv in the year-end export
   (money.js exportYear), listed for review only.

   Record shape:
   { id, date 'YYYY-MM-DD', fromName, amount (cents), method,
     note, tag: null | 'income' | 'not-income',
     notIncomeReason: null | 'own-money' | 'gas-materials' |
       'owed-back' | 'other',
     clientId: null | client id, jobId: null | job id,
     createdAt: ISO timestamp }
   The collection is seeded in seedDB() and normalised after load in
   both app pages, exactly like DB.expenses; ensure() below also
   creates it lazily so older saved data (or any page copy that missed
   the normalisation line) loads fine. */
(function () {
  "use strict";

  var METHODS = ["E-transfer", "Cash", "Cheque", "Card", "Other"];
  var REASONS = [
    { id: "own-money", label: "My own money moved" },
    { id: "gas-materials", label: "Gas / materials money" },
    { id: "owed-back", label: "Money owed back to me" },
    { id: "other", label: "Other" },
  ];
  function reasonLabel(id) {
    var r = REASONS.find(function (x) { return x.id === id; });
    return r ? r.label : "Other";
  }

  /* ---------- data layer ---------- */

  function dbReady() {
    try {
      return typeof DB !== "undefined" && !!DB && typeof DB === "object";
    } catch (e) { return false; }
  }

  function ensure() {
    if (!dbReady()) return [];
    if (!Array.isArray(DB.paymentsInbox)) DB.paymentsInbox = [];
    return DB.paymentsInbox;
  }

  function validDate(s) {
    if (window.QNMoneyModel && typeof window.QNMoneyModel.validDate === "function") {
      return window.QNMoneyModel.validDate(s);
    }
    return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) &&
      Number.isFinite(Date.parse(s)) && new Date(s).toISOString().slice(0, 10) === s;
  }

  /* Same rule as money-model.js cents(): dollars string -> integer cents. */
  function parseCents(s) {
    if (window.QNMoneyModel && typeof window.QNMoneyModel.cents === "function") {
      return window.QNMoneyModel.cents(s);
    }
    s = String(s == null ? "" : s).trim();
    if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
    var n = Math.round(Number(s) * 100);
    return Number.isSafeInteger(n) ? n : null;
  }

  function newId() {
    try { if (typeof uid === "function") return uid("pay"); } catch (e) {}
    return "pay-" + Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);
  }

  /* Validate + build a record. input.amount is integer cents. */
  function makeRecord(input) {
    input = input || {};
    var fromName = String(input.fromName || "").trim().slice(0, 150);
    var amount = Math.round(Number(input.amount));
    var method = METHODS.indexOf(input.method) >= 0 ? input.method : "Other";
    var date = String(input.date || "");
    if (!fromName) throw Error("Add who the money came from.");
    if (!Number.isSafeInteger(amount) || amount <= 0 || amount > 100000000) throw Error("Check the amount.");
    if (!validDate(date)) throw Error("Check the date.");
    return {
      id: newId(),
      date: date,
      fromName: fromName,
      amount: amount,
      method: method,
      note: String(input.note || "").trim().slice(0, 2000),
      tag: null,
      notIncomeReason: null,
      clientId: null,
      jobId: null,
      createdAt: new Date().toISOString(),
    };
  }

  /* Mutate the collection and persist through the app's own save()
     (localStorage + cloud sync trigger), rolling back on failure —
     the same pattern money.js uses for expenses. */
  function persist(mutator) {
    var list = ensure();
    var before = structuredClone(list);
    mutator(list);
    try {
      save();
    } catch (e) {
      DB.paymentsInbox = before;
      throw e;
    }
    refresh();
  }

  function addPayment(input) {
    var rec = makeRecord(input);
    persist(function (list) { list.push(rec); });
    return rec;
  }

  function findRec(list, id) {
    return list.find(function (r) { return r && r.id === id; }) || null;
  }

  function tagIncome(id) {
    persist(function (list) {
      var r = findRec(list, id);
      if (r) { r.tag = "income"; r.notIncomeReason = null; }
    });
  }

  function tagNotIncome(id, reason) {
    if (!REASONS.some(function (x) { return x.id === reason; })) throw Error("Pick a reason.");
    persist(function (list) {
      var r = findRec(list, id);
      if (r) { r.tag = "not-income"; r.notIncomeReason = reason; }
    });
  }

  function untag(id) {
    persist(function (list) {
      var r = findRec(list, id);
      if (r) { r.tag = null; r.notIncomeReason = null; }
    });
  }

  function linkClient(id, clientId) {
    persist(function (list) {
      var r = findRec(list, id);
      if (r) r.clientId = clientId || null;
    });
  }

  /* Newest first: by date, then by when it was added. */
  function newestFirst(a, b) {
    var d = String(b.date || "").localeCompare(String(a.date || ""));
    if (d) return d;
    return String(b.createdAt || "").localeCompare(String(a.createdAt || ""));
  }

  function unsorted() {
    return ensure().filter(function (r) { return r && !r.tag; }).sort(newestFirst);
  }

  function sorted() {
    return ensure().filter(function (r) { return r && r.tag; }).sort(newestFirst);
  }

  /* Review totals only — never used by any money-in or tax figure.
     year: 'YYYY' string to limit to one calendar year, or null for all. */
  function totals(year) {
    var t = { income: 0, incomeCount: 0, notIncome: 0, notIncomeCount: 0, open: 0, openCount: 0 };
    ensure().forEach(function (r) {
      if (!r || !Number.isFinite(r.amount)) return;
      if (year && String(r.date || "").slice(0, 4) !== String(year)) return;
      if (r.tag === "income") { t.income += r.amount; t.incomeCount += 1; }
      else if (r.tag === "not-income") { t.notIncome += r.amount; t.notIncomeCount += 1; }
      else { t.open += r.amount; t.openCount += 1; }
    });
    return t;
  }

  /* ---------- view layer ---------- */

  function fmtDay(s) {
    try { if (typeof fmtDate === "function") return fmtDate(s); } catch (e) {}
    return s || "";
  }

  function clientOptions(selectedId) {
    var clients = (dbReady() && Array.isArray(DB.clients)) ? DB.clients : [];
    var html = '<option value="">Not linked</option>';
    clients.forEach(function (c) {
      if (!c || !c.id) return;
      html += '<option value="' + esc(c.id) + '"' + (c.id === selectedId ? " selected" : "") + ">" +
        esc(c.name || "Unnamed customer") + "</option>";
    });
    return html;
  }

  function hasClients() {
    return dbReady() && Array.isArray(DB.clients) && DB.clients.length > 0;
  }

  function headHtml(r) {
    var sub = fmtDay(r.date) + " · " + (r.method || "Other") + (r.note ? " · " + r.note : "");
    return '<div class="qn-pay-head"><span><strong>' + esc(r.fromName) + "</strong><small>" +
      esc(sub) + '</small></span><strong class="qn-pay-amount">' + esc(money(r.amount)) + "</strong></div>";
  }

  function unsortedHtml(r) {
    return '<div class="qn-pay-item">' + headHtml(r) +
      '<div class="qn-pay-actions">' +
      '<button type="button" class="btn btn-primary" data-pay-income="' + esc(r.id) + '">Income</button>' +
      '<button type="button" class="btn btn-outline" data-pay-not="' + esc(r.id) + '">Not income</button>' +
      "</div></div>";
  }

  function sortedHtml(r) {
    var chip = r.tag === "income"
      ? '<span class="qn-pay-chip qn-pay-chip-in">Income</span>'
      : '<span class="qn-pay-chip qn-pay-chip-out">Not income · ' + esc(reasonLabel(r.notIncomeReason)) + "</span>";
    var html = '<div class="qn-pay-item">' + headHtml(r) +
      '<div class="qn-pay-meta">' + chip +
      '<button type="button" class="btn btn-outline qn-pay-undo" data-pay-undo="' + esc(r.id) + '">Undo</button></div>';
    if (r.tag === "income" && hasClients()) {
      html += '<label class="qn-pay-link">Customer (optional)<select data-pay-client="' + esc(r.id) + '">' +
        clientOptions(r.clientId) + "</select></label>";
    } else if (r.tag === "income" && r.clientId) {
      var name = "";
      try { if (typeof clientName === "function") name = clientName(r.clientId); } catch (e) {}
      if (name) html += '<p class="qn-money-note">Customer: ' + esc(name) + "</p>";
    }
    return html + "</div>";
  }

  function viewHtml() {
    var open = unsorted();
    var done = sorted();
    var all = ensure();
    var html = '<button type="button" class="qn-more-back" data-pay-back>\u2039 More</button>' +
      "<h2>Payments</h2>" +
      "<p>Money that landed in your account but is not on an invoice yet. " +
      "Sort each payment once \u2014 income, or not income \u2014 so your tax-time numbers stay clean. " +
      "These payments are kept separate from invoice money and are never counted twice.</p>" +
      '<div class="qn-money-toolbar"><button class="btn btn-primary" type="button" data-pay-add>+ Add payment</button></div>';
    html += '<div class="qn-pay-list"><h3>To sort' + (open.length ? " · " + open.length : "") + "</h3>";
    if (!all.length) {
      html += '<p class="qn-pay-empty">No payments yet. When money lands in your account outside an invoice, add it here and sort it.</p>';
    } else if (!open.length) {
      html += '<p class="qn-pay-empty">All sorted. Nothing waiting.</p>';
    } else {
      html += open.map(unsortedHtml).join("");
    }
    html += "</div>";
    if (done.length) {
      html += '<div class="qn-pay-list"><h3>Sorted</h3>' + done.map(sortedHtml).join("") + "</div>";
    }
    return html;
  }

  var section = document.getElementById("view-payments") || document.createElement("section");
  section.id = "view-payments";
  section.classList.add("view", "qn-money", "qn-payments");
  if (!section.isConnected) {
    var more = document.getElementById("view-more");
    if (more) more.after(section);
  }

  function render() {
    if (!dbReady()) return;
    section.innerHTML = viewHtml();
    var back = section.querySelector("[data-pay-back]");
    if (back) back.onclick = function () { showView("more"); };
  }

  function updateBadge() {
    var badge = document.querySelector("[data-payments-badge]");
    if (!badge) return;
    var n = dbReady() ? unsorted().length : 0;
    badge.hidden = !n;
    badge.textContent = n ? String(n) : "";
  }

  function refresh() {
    try { render(); } catch (e) {}
    try { updateBadge(); } catch (e) {}
  }

  /* ---------- dialogs ---------- */

  function reasonDialog(id) {
    var r = findRec(ensure(), id);
    if (!r) return;
    var body = openModal("Not income",
      '<p class="qn-money-note">Why is this ' + esc(money(r.amount)) + " from " +
      esc(r.fromName) + " not income?</p>" +
      REASONS.map(function (x) {
        return '<button type="button" class="btn btn-outline qn-pay-reason" data-pay-reason="' +
          esc(x.id) + '">' + esc(x.label) + "</button>";
      }).join("") +
      '<button type="button" class="btn btn-outline" id="modal-cancel">Cancel</button>');
    body.querySelectorAll("[data-pay-reason]").forEach(function (b) {
      b.onclick = function () {
        try { tagNotIncome(id, b.dataset.payReason); closeModal(); }
        catch (e) { try { qnAlert(e.message); } catch (err) {} }
      };
    });
    var cancel = body.querySelector("#modal-cancel");
    if (cancel) cancel.onclick = function () { closeModal(); };
  }

  function addForm() {
    var body = openModal("Add payment",
      '<form class="qn-money-form" data-pay-form>' +
      '<label>From<input data-pay-from required maxlength="150" autocomplete="off" placeholder="Name on the e-transfer, cheque or receipt"></label>' +
      '<label>Amount (CAD)<input data-pay-amount type="number" inputmode="decimal" min="0.01" step="0.01" max="1000000" required></label>' +
      '<label>How did it arrive?<select data-pay-method>' +
      METHODS.map(function (m) { return "<option>" + esc(m) + "</option>"; }).join("") + "</select></label>" +
      '<label>Date received<input data-pay-date type="date" required value="' + esc(todayStr()) + '"></label>' +
      '<label>Note (optional)<textarea data-pay-note rows="2" maxlength="2000"></textarea></label>' +
      '<p role="status" data-pay-error></p>' +
      '<button type="submit" class="btn btn-primary">Save payment</button></form>' +
      '<button type="button" class="btn btn-outline" id="modal-cancel">Close</button>');
    var msg = function (s) { body.querySelector("[data-pay-error]").textContent = s; };
    var cancel = body.querySelector("#modal-cancel");
    if (cancel) cancel.onclick = function () { closeModal(); };
    body.querySelector("form").onsubmit = function (e) {
      e.preventDefault();
      try {
        addPayment({
          fromName: body.querySelector("[data-pay-from]").value,
          amount: parseCents(body.querySelector("[data-pay-amount]").value),
          method: body.querySelector("[data-pay-method]").value,
          date: body.querySelector("[data-pay-date]").value,
          note: body.querySelector("[data-pay-note]").value,
        });
        closeModal();
      } catch (err) { msg(err.message); }
    };
  }

  /* ---------- wiring (same shape as money.js) ---------- */

  section.addEventListener("click", function (e) {
    var add = e.target.closest("[data-pay-add]");
    if (add) { addForm(); return; }
    var inc = e.target.closest("[data-pay-income]");
    if (inc) {
      try { tagIncome(inc.dataset.payIncome); }
      catch (err) { try { qnAlert(err.message); } catch (x) {} }
      return;
    }
    var not = e.target.closest("[data-pay-not]");
    if (not) { reasonDialog(not.dataset.payNot); return; }
    var undo = e.target.closest("[data-pay-undo]");
    if (undo) {
      try { untag(undo.dataset.payUndo); }
      catch (err) { try { qnAlert(err.message); } catch (x) {} }
    }
  });
  section.addEventListener("change", function (e) {
    var sel = e.target.closest("[data-pay-client]");
    if (!sel) return;
    try { linkClient(sel.dataset.payClient, sel.value || null); }
    catch (err) { try { qnAlert(err.message); } catch (x) {} }
  });

  var baseShow = showView;
  showView = function (name) {
    baseShow(name);
    if (name === "payments") {
      document.querySelectorAll("#tabbar button").forEach(function (b) {
        var active = b.dataset.view === "more";
        b.classList.toggle("active", active);
        if (active) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
      });
      render();
    }
    try { updateBadge(); } catch (e) {}
  };
  document.addEventListener("click", function (e) {
    if (e.target.closest("[data-payments-open]")) showView("payments");
  });
  try { updateBadge(); } catch (e) {}

  window.QNPayments = {
    methods: METHODS,
    reasons: REASONS,
    records: function () { return ensure().slice(); },
    unsorted: unsorted,
    sorted: sorted,
    totals: totals,
    add: addPayment,
    tagIncome: tagIncome,
    tagNotIncome: tagNotIncome,
    untag: untag,
    linkClient: linkClient,
    viewHtml: viewHtml,
    render: render,
  };
})();
